import { Router } from 'express';
import { store, addOperationLog, addNotification } from '../data/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { success, error, paginate } from '../utils/response';
import { Logistics, LogisticsStatus, DamageReport } from '../types';
import dayjs from 'dayjs';

const router = Router();

router.use(authMiddleware);

router.get('/', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, status, keyword } = req.query;
  
  let logisticsList = [...store.logistics];
  
  if (req.user?.role === 'demander' || req.user?.role === 'factory' || req.user?.role === 'supplier') {
    logisticsList = logisticsList.filter(l => 
      l.senderId === req.user?.companyId || l.receiverId === req.user?.companyId
    );
  }
  
  if (status) {
    logisticsList = logisticsList.filter(l => l.status === status);
  }
  
  if (keyword) {
    const kw = String(keyword).toLowerCase();
    logisticsList = logisticsList.filter(l => 
      l.trackingNo.toLowerCase().includes(kw) ||
      l.orderId.toLowerCase().includes(kw)
    );
  }
  
  logisticsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const result = paginate(logisticsList, Number(page), Number(pageSize));
  
  const enrichedRecords = result.records.map(logistics => {
    const sender = store.companies.find(c => c.id === logistics.senderId);
    const receiver = store.companies.find(c => c.id === logistics.receiverId);
    return {
      ...logistics,
      senderName: sender?.name,
      receiverName: receiver?.name
    };
  });

  res.json(success({ ...result, records: enrichedRecords }));
});

router.get('/:id', (req: AuthRequest, res) => {
  const logistics = store.logistics.find(l => l.id === req.params.id);
  
  if (!logistics) {
    return res.status(404).json(error(404, '物流信息不存在'));
  }

  const sender = store.companies.find(c => c.id === logistics.senderId);
  const receiver = store.companies.find(c => c.id === logistics.receiverId);

  res.json(success({
    ...logistics,
    senderName: sender?.name,
    receiverName: receiver?.name
  }));
});

router.post('/:id/track', (req: AuthRequest, res) => {
  const { id } = req.params;
  const { location, status, description, operator } = req.body;
  
  const logisticsIndex = store.logistics.findIndex(l => l.id === id);
  
  if (logisticsIndex === -1) {
    return res.status(404).json(error(404, '物流信息不存在'));
  }

  const logistics = store.logistics[logisticsIndex];

  const now = new Date().toISOString();
  const newTrackingItem = {
    time: now,
    location,
    status: status as LogisticsStatus,
    description,
    operator
  };

  const updatedLogistics: Logistics = {
    ...logistics,
    status: status as LogisticsStatus,
    currentLocation: location,
    trackingHistory: [...logistics.trackingHistory, newTrackingItem],
    updatedAt: now
  };

  if (status === 'signed' || status === 'delivered') {
    updatedLogistics.actualDelivery = now;
  }

  store.logistics[logisticsIndex] = updatedLogistics;

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '物流更新',
    module: '物流管理',
    targetId: id,
    targetType: 'logistics',
    detail: `更新物流 ${logistics.trackingNo} 状态为 ${status}`,
    ip: req.ip
  });

  const receiverUsers = store.users.filter(u => u.companyId === logistics.receiverId);
  receiverUsers.forEach(u => {
    addNotification({
      userId: u.id,
      type: 'logistics',
      title: '物流状态更新',
      content: `物流单号 ${logistics.trackingNo}：${description}`,
      relatedId: id,
      relatedType: 'logistics'
    });
  });

  res.json(success(updatedLogistics, '物流状态更新成功'));
});

router.post('/:id/damage-report', (req: AuthRequest, res) => {
  const { id } = req.params;
  const { damageDescription, damageQuantity, estimatedLoss } = req.body;
  
  const logisticsIndex = store.logistics.findIndex(l => l.id === id);
  
  if (logisticsIndex === -1) {
    return res.status(404).json(error(404, '物流信息不存在'));
  }

  const logistics = store.logistics[logisticsIndex];

  const damageReport: DamageReport = {
    id: `dmg-${Date.now()}`,
    logisticsId: id,
    reportedAt: new Date().toISOString(),
    reportedBy: req.user!.id,
    damageDescription,
    damageQuantity,
    estimatedLoss,
    status: 'pending',
    attachments: []
  };

  const updatedLogistics: Logistics = {
    ...logistics,
    status: 'damaged',
    damageReport,
    updatedAt: new Date().toISOString()
  };

  store.logistics[logisticsIndex] = updatedLogistics;

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '提交破损报告',
    module: '物流管理',
    targetId: id,
    targetType: 'logistics',
    detail: `提交物流 ${logistics.trackingNo} 破损报告，损失预估 ${estimatedLoss} 元`,
    ip: req.ip
  });

  const senderUsers = store.users.filter(u => u.companyId === logistics.senderId);
  senderUsers.forEach(u => {
    addNotification({
      userId: u.id,
      type: 'warning',
      title: '货物破损通知',
      content: `物流 ${logistics.trackingNo} 收到破损报告，请及时处理`,
      relatedId: id,
      relatedType: 'logistics'
    });
  });

  res.json(success(damageReport, '破损报告提交成功'));
});

router.post('/:id/damage-report/resolve', (req: AuthRequest, res) => {
  const { id } = req.params;
  const { claimAmount, resolution } = req.body;
  
  const logisticsIndex = store.logistics.findIndex(l => l.id === id);
  
  if (logisticsIndex === -1) {
    return res.status(404).json(error(404, '物流信息不存在'));
  }

  const logistics = store.logistics[logisticsIndex];
  
  if (!logistics.damageReport) {
    return res.status(400).json(error(400, '没有破损报告'));
  }

  const updatedDamageReport: DamageReport = {
    ...logistics.damageReport,
    claimAmount,
    resolution,
    status: 'resolved'
  };

  const updatedLogistics: Logistics = {
    ...logistics,
    damageReport: updatedDamageReport,
    updatedAt: new Date().toISOString()
  };

  store.logistics[logisticsIndex] = updatedLogistics;

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '处理破损理赔',
    module: '物流管理',
    targetId: id,
    targetType: 'logistics',
    detail: `处理物流 ${logistics.trackingNo} 破损理赔，赔付金额 ${claimAmount} 元`,
    ip: req.ip
  });

  const reporter = store.users.find(u => u.id === logistics.damageReport!.reportedBy);
  if (reporter) {
    addNotification({
      userId: reporter.id,
      type: 'system',
      title: '破损理赔已处理',
      content: `物流 ${logistics.trackingNo} 的破损理赔已处理，赔付金额 ${claimAmount} 元`,
      relatedId: id,
      relatedType: 'logistics'
    });
  }

  res.json(success(updatedDamageReport, '破损理赔处理成功'));
});

export default router;
