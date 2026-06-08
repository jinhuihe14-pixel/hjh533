import { Router } from 'express';
import { store, addOperationLog, addNotification } from '../data/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { success, error, paginate } from '../utils/response';
import dayjs from 'dayjs';

const router = Router();

router.use(authMiddleware);

router.get('/work-orders', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, status, processingOrderId } = req.query;

  let workOrders = [...store.mobileWorkOrders];

  if (status) {
    workOrders = workOrders.filter(w => w.status === status);
  }

  if (processingOrderId) {
    workOrders = workOrders.filter(w => w.processingOrderId === processingOrderId);
  }

  if (req.user?.role === 'factory') {
    workOrders = workOrders.filter(w => w.factoryId === req.user!.companyId);
  }

  workOrders.sort((a, b) => {
    if (a.processingOrderId === b.processingOrderId) {
      return a.processIndex - b.processIndex;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const result = paginate(workOrders, Number(page), Number(pageSize));

  res.json(success(result));
});

router.get('/work-orders/:id', (req: AuthRequest, res) => {
  const workOrder = store.mobileWorkOrders.find(w => w.id === req.params.id);

  if (!workOrder) {
    return res.status(404).json(error(404, '工单不存在'));
  }

  if (req.user?.role === 'factory' && workOrder.factoryId !== req.user.companyId) {
    return res.status(403).json(error(403, '无权限查看此工单'));
  }

  const processingOrder = store.processingOrders.find(o => o.id === workOrder.processingOrderId);
  const exceptions = store.workOrderExceptions.filter(e => e.workOrderId === workOrder.id);
  const drawings = store.drawings.filter(d => workOrder.drawingIds.includes(d.id));

  res.json(success({
    ...workOrder,
    processingOrder,
    exceptions,
    drawings
  }));
});

router.post('/work-orders', (req: AuthRequest, res) => {
  if (req.user?.role !== 'demander' && req.user?.role !== 'admin' && req.user?.role !== 'factory') {
    return res.status(403).json(error(403, '无权限创建工单'));
  }

  const {
    processingOrderId, partName, partCode, quantity,
    processName, processIndex, drawingIds, factoryId
  } = req.body;

  const processingOrder = store.processingOrders.find(o => o.id === processingOrderId);

  const newWorkOrder = {
    id: `wo-${Date.now()}`,
    workOrderNo: `WO-${dayjs().format('YYYYMM')}-${String(store.mobileWorkOrders.length + 1).padStart(3, '0')}`,
    processingOrderId,
    processingOrderNo: processingOrder?.orderNo || '',
    factoryId: factoryId || processingOrder?.factoryId || '',
    partName,
    partCode,
    quantity,
    processName,
    processIndex,
    status: 'pending' as const,
    drawingIds: drawingIds || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.mobileWorkOrders.unshift(newWorkOrder);

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '创建工单',
    module: '工单管理',
    targetId: newWorkOrder.id,
    targetType: 'mobile_work_order',
    detail: `创建工单 ${newWorkOrder.workOrderNo} - ${processName}`,
    ip: req.ip
  });

  res.json(success(newWorkOrder, '工单创建成功'));
});

router.post('/work-orders/:id/start', (req: AuthRequest, res) => {
  const workOrder = store.mobileWorkOrders.find(w => w.id === req.params.id);

  if (!workOrder) {
    return res.status(404).json(error(404, '工单不存在'));
  }

  if (req.user?.role !== 'factory' || workOrder.factoryId !== req.user.companyId) {
    return res.status(403).json(error(403, '无权限操作此工单'));
  }

  workOrder.status = 'in_progress';
  workOrder.assigneeId = req.user.id;
  workOrder.assigneeName = req.user.name;
  workOrder.startTime = new Date().toISOString();
  workOrder.updatedAt = new Date().toISOString();

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '开始工单',
    module: '工单管理',
    targetId: workOrder.id,
    targetType: 'mobile_work_order',
    detail: `开始加工工单 ${workOrder.workOrderNo}`,
    ip: req.ip
  });

  res.json(success(workOrder, '工单已开始'));
});

router.post('/work-orders/:id/complete', (req: AuthRequest, res) => {
  const workOrder = store.mobileWorkOrders.find(w => w.id === req.params.id);

  if (!workOrder) {
    return res.status(404).json(error(404, '工单不存在'));
  }

  if (req.user?.role !== 'factory' || workOrder.factoryId !== req.user.companyId) {
    return res.status(403).json(error(403, '无权限操作此工单'));
  }

  const { outputQuantity, defectQuantity, remark } = req.body;

  workOrder.status = 'completed';
  workOrder.outputQuantity = outputQuantity || workOrder.quantity;
  workOrder.defectQuantity = defectQuantity || 0;
  workOrder.endTime = new Date().toISOString();
  workOrder.remark = remark;
  workOrder.updatedAt = new Date().toISOString();

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '完成工单',
    module: '工单管理',
    targetId: workOrder.id,
    targetType: 'mobile_work_order',
    detail: `完成工单 ${workOrder.workOrderNo}，产出 ${outputQuantity}，不良 ${defectQuantity}`,
    ip: req.ip
  });

  if ((defectQuantity || 0) > 0) {
    const demanderUsers = store.users.filter(u => u.role === 'demander');
    demanderUsers.forEach(u => {
      addNotification({
        userId: u.id,
        type: 'warning',
        title: '工单质量提醒',
        content: `工单 ${workOrder.workOrderNo} 已完成，存在 ${defectQuantity} 件不良品`,
        relatedId: workOrder.id,
        relatedType: 'work_order'
      });
    });
  }

  res.json(success(workOrder, '工单已完成'));
});

router.post('/work-orders/:id/report-exception', (req: AuthRequest, res) => {
  const workOrder = store.mobileWorkOrders.find(w => w.id === req.params.id);

  if (!workOrder) {
    return res.status(404).json(error(404, '工单不存在'));
  }

  if (req.user?.role !== 'factory' || workOrder.factoryId !== req.user.companyId) {
    return res.status(403).json(error(403, '无权限操作此工单'));
  }

  const { type, typeName, description, severity, photos } = req.body;

  const newException = {
    id: `exc-${Date.now()}`,
    workOrderId: workOrder.id,
    processingOrderId: workOrder.processingOrderId,
    factoryId: workOrder.factoryId,
    type,
    typeName,
    description,
    severity,
    reporterId: req.user.id,
    reporterName: req.user.name,
    photos: photos || [],
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.workOrderExceptions.unshift(newException);

  workOrder.status = 'quality_issue';
  workOrder.updatedAt = new Date().toISOString();

  const demanderUsers = store.users.filter(u => u.role === 'demander' || u.role === 'admin');
  demanderUsers.forEach(u => {
    addNotification({
      userId: u.id,
      type: 'warning',
      title: '工单异常告警',
      content: `${workOrder.partName} 工单 ${workOrder.workOrderNo} 上报异常：${typeName}`,
      relatedId: newException.id,
      relatedType: 'work_order_exception'
    });
  });

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '上报异常',
    module: '工单管理',
    targetId: newException.id,
    targetType: 'work_order_exception',
    detail: `工单 ${workOrder.workOrderNo} 上报${typeName}异常`,
    ip: req.ip
  });

  res.json(success(newException, '异常已上报'));
});

router.get('/exceptions', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, status, type, severity, workOrderId } = req.query;

  let exceptions = [...store.workOrderExceptions];

  if (status) {
    exceptions = exceptions.filter(e => e.status === status);
  }

  if (type) {
    exceptions = exceptions.filter(e => e.type === type);
  }

  if (severity) {
    exceptions = exceptions.filter(e => e.severity === severity);
  }

  if (workOrderId) {
    exceptions = exceptions.filter(e => e.workOrderId === workOrderId);
  }

  if (req.user?.role === 'factory') {
    exceptions = exceptions.filter(e => e.factoryId === req.user!.companyId);
  }

  exceptions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const result = paginate(exceptions, Number(page), Number(pageSize));

  res.json(success(result));
});

router.get('/exceptions/:id', (req: AuthRequest, res) => {
  const exception = store.workOrderExceptions.find(e => e.id === req.params.id);

  if (!exception) {
    return res.status(404).json(error(404, '异常记录不存在'));
  }

  const workOrder = store.mobileWorkOrders.find(w => w.id === exception.workOrderId);

  res.json(success({
    ...exception,
    workOrder
  }));
});

router.post('/exceptions/:id/handle', (req: AuthRequest, res) => {
  if (req.user?.role !== 'demander' && req.user?.role !== 'admin') {
    return res.status(403).json(error(403, '无权限处理异常'));
  }

  const exception = store.workOrderExceptions.find(e => e.id === req.params.id);

  if (!exception) {
    return res.status(404).json(error(404, '异常记录不存在'));
  }

  const { resolution, status } = req.body;

  exception.status = status || 'processing';
  exception.handlerId = req.user.id;
  exception.handlerName = req.user.name;
  exception.resolution = resolution;
  exception.updatedAt = new Date().toISOString();

  if (status === 'resolved') {
    const workOrder = store.mobileWorkOrders.find(w => w.id === exception.workOrderId);
    if (workOrder && workOrder.status === 'quality_issue') {
      workOrder.status = 'in_progress';
    }
  }

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '处理异常',
    module: '工单管理',
    targetId: exception.id,
    targetType: 'work_order_exception',
    detail: `处理异常 ${exception.id}，状态：${status}`,
    ip: req.ip
  });

  const reporterUser = store.users.find(u => u.id === exception.reporterId);
  if (reporterUser) {
    addNotification({
      userId: reporterUser.id,
      type: status === 'resolved' ? 'order' : 'system',
      title: status === 'resolved' ? '异常已解决' : '异常处理中',
      content: `您上报的 ${exception.typeName} 异常${status === 'resolved' ? '已解决' : '正在处理中'}`,
      relatedId: exception.id,
      relatedType: 'work_order_exception'
    });
  }

  res.json(success(exception, '处理完成'));
});

router.post('/exceptions/:id/resolve', (req: AuthRequest, res) => {
  if (req.user?.role !== 'demander' && req.user?.role !== 'admin') {
    return res.status(403).json(error(403, '无权限处理异常'));
  }

  const exception = store.workOrderExceptions.find(e => e.id === req.params.id);

  if (!exception) {
    return res.status(404).json(error(404, '异常记录不存在'));
  }

  const { resolution } = req.body;

  exception.status = 'resolved';
  exception.handlerId = req.user.id;
  exception.handlerName = req.user.name;
  exception.resolution = resolution;
  exception.updatedAt = new Date().toISOString();

  const workOrder = store.mobileWorkOrders.find(w => w.id === exception.workOrderId);
  if (workOrder && workOrder.status === 'quality_issue') {
    workOrder.status = 'in_progress';
  }

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '解决异常',
    module: '工单管理',
    targetId: exception.id,
    targetType: 'work_order_exception',
    detail: `解决异常 ${exception.id}`,
    ip: req.ip
  });

  const reporterUser = store.users.find(u => u.id === exception.reporterId);
  if (reporterUser) {
    addNotification({
      userId: reporterUser.id,
      type: 'order',
      title: '异常已解决',
      content: `您上报的 ${exception.typeName} 异常已解决`,
      relatedId: exception.id,
      relatedType: 'work_order_exception'
    });
  }

  res.json(success(exception, '异常已解决'));
});

router.get('/stats/dashboard', (req: AuthRequest, res) => {
  const factoryId = req.user?.role === 'factory' ? req.user.companyId : undefined;

  let workOrders = [...store.mobileWorkOrders];
  let exceptions = [...store.workOrderExceptions];

  if (factoryId) {
    workOrders = workOrders.filter(w => w.factoryId === factoryId);
    exceptions = exceptions.filter(e => e.factoryId === factoryId);
  }

  const stats = {
    total: workOrders.length,
    pending: workOrders.filter(w => w.status === 'pending').length,
    inProgress: workOrders.filter(w => w.status === 'in_progress').length,
    completed: workOrders.filter(w => w.status === 'completed').length,
    qualityIssue: workOrders.filter(w => w.status === 'quality_issue').length,
    rework: workOrders.filter(w => w.status === 'rework').length,
    pendingExceptions: exceptions.filter(e => e.status === 'pending').length,
    processingExceptions: exceptions.filter(e => e.status === 'processing').length
  };

  res.json(success(stats));
});

export default router;
