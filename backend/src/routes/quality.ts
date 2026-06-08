import { Router } from 'express';
import { store, addOperationLog, addNotification } from '../data/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { success, error, paginate } from '../utils/response';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authMiddleware);

router.get('/batches', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, keyword, orderId, overallResult } = req.query;

  let batches = [...store.qualityBatches];

  if (keyword) {
    const kw = String(keyword).toLowerCase();
    batches = batches.filter(b =>
      b.batchNo.toLowerCase().includes(kw) ||
      b.traceCode.toLowerCase().includes(kw) ||
      b.partName.toLowerCase().includes(kw) ||
      b.partCode.toLowerCase().includes(kw)
    );
  }

  if (orderId) {
    batches = batches.filter(b => b.orderId === orderId);
  }

  if (overallResult) {
    batches = batches.filter(b => b.overallResult === overallResult);
  }

  if (req.user?.role === 'factory') {
    batches = batches.filter(b => b.factoryId === req.user!.companyId);
  } else if (req.user?.role === 'supplier') {
    batches = batches.filter(b => b.supplierId === req.user!.companyId);
  }

  batches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const result = paginate(batches, Number(page), Number(pageSize));

  res.json(success(result));
});

router.get('/batches/:id', (req: AuthRequest, res) => {
  const batch = store.qualityBatches.find(b => b.id === req.params.id);

  if (!batch) {
    return res.status(404).json(error(404, '批次不存在'));
  }

  const inspections = store.qualityInspections.filter(i => i.batchId === batch.id);
  const traceRecords = store.traceRecords.filter(t => t.batchId === batch.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const deductionRules = store.deductionRules.filter(d => d.batchId === batch.id && d.isActive);

  res.json(success({
    ...batch,
    inspections,
    traceRecords,
    deductionRules
  }));
});

router.get('/trace/:traceCode', (req: AuthRequest, res) => {
  const { traceCode } = req.params;

  const batch = store.qualityBatches.find(b => b.traceCode === traceCode);

  if (!batch) {
    return res.status(404).json(error(404, '溯源编码不存在'));
  }

  const inspections = store.qualityInspections.filter(i => i.batchId === batch.id);
  const traceRecords = store.traceRecords.filter(t => t.traceCode === traceCode)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let orderInfo: any = null;
  if (batch.orderType === 'processing') {
    orderInfo = store.processingOrders.find(o => o.id === batch.orderId);
  } else {
    orderInfo = store.materialOrders.find(o => o.id === batch.orderId);
  }

  const logistics = store.logistics.find(l => l.orderId === batch.orderId);

  res.json(success({
    batch,
    inspections,
    traceRecords,
    order: orderInfo,
    logistics
  }));
});

router.post('/batches', (req: AuthRequest, res) => {
  if (req.user?.role !== 'demander' && req.user?.role !== 'admin' && req.user?.role !== 'factory') {
    return res.status(403).json(error(403, '无权限创建批次'));
  }

  const {
    orderId, orderType, partName, partCode, quantity,
    supplierId, factoryId, materialBatchNo, processStandard, productionDate
  } = req.body;

  const dateStr = dayjs().format('YYYYMMDD');
  const seq = String(store.qualityBatches.length + 1).padStart(3, '0');
  const batchNo = `BATCH-${dateStr}-${seq}`;
  const traceCode = `TC-${dateStr}-${partCode || 'PART'}-${seq}`;

  const newBatch = {
    id: `batch-${Date.now()}`,
    batchNo,
    traceCode,
    orderId,
    orderType,
    partName,
    partCode,
    quantity,
    supplierId,
    supplierName: store.companies.find(c => c.id === supplierId)?.name || '',
    factoryId,
    factoryName: store.companies.find(c => c.id === factoryId)?.name || '',
    materialBatchNo,
    processStandard,
    productionDate,
    inspections: [] as string[],
    overallResult: 'pending' as const,
    qrCodeUrl: `/qrcodes/batch-${Date.now()}.png`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.qualityBatches.unshift(newBatch);

  const purchaseRecord = {
    id: `trace-${Date.now()}-1`,
    batchId: newBatch.id,
    traceCode: newBatch.traceCode,
    node: 'material_purchase',
    nodeName: '原料采购',
    operatorId: req.user!.id,
    operatorName: req.user!.name,
    timestamp: new Date().toISOString(),
    description: `${partName} 批次创建`,
    data: { orderId }
  };
  store.traceRecords.unshift(purchaseRecord);

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '创建质量批次',
    module: '质量管理',
    targetId: newBatch.id,
    targetType: 'quality_batch',
    detail: `创建批次 ${batchNo}，数量 ${quantity}`,
    ip: req.ip
  });

  res.json(success(newBatch, '批次创建成功'));
});

router.get('/inspections', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, type, result, batchId, orderId } = req.query;

  let inspections = [...store.qualityInspections];

  if (type) {
    inspections = inspections.filter(i => i.type === type);
  }

  if (result) {
    inspections = inspections.filter(i => i.result === result);
  }

  if (batchId) {
    inspections = inspections.filter(i => i.batchId === batchId);
  }

  if (orderId) {
    inspections = inspections.filter(i => i.orderId === orderId);
  }

  if (req.user?.role === 'factory') {
    const factoryBatches = store.qualityBatches.filter(b => b.factoryId === req.user!.companyId).map(b => b.id);
    inspections = inspections.filter(i => factoryBatches.includes(i.batchId));
  }

  inspections.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const result = paginate(inspections, Number(page), Number(pageSize));

  res.json(success(result));
});

router.get('/inspections/:id', (req: AuthRequest, res) => {
  const inspection = store.qualityInspections.find(i => i.id === req.params.id);

  if (!inspection) {
    return res.status(404).json(error(404, '质检单不存在'));
  }

  const batch = store.qualityBatches.find(b => b.id === inspection.batchId);
  const reworkOrder = inspection.reworkOrderId 
    ? store.reworkOrders.find(r => r.id === inspection.reworkOrderId)
    : null;

  res.json(success({
    ...inspection,
    batch,
    reworkOrder
  }));
});

router.post('/inspections', (req: AuthRequest, res) => {
  if (req.user?.role !== 'demander' && req.user?.role !== 'admin' && req.user?.role !== 'factory') {
    return res.status(403).json(error(403, '无权限创建质检单'));
  }

  const {
    type, orderId, orderType, batchId,
    totalQuantity, inspectedQuantity, passedQuantity, failedQuantity,
    defectRate, defectItems, result, disposition, remark, attachments
  } = req.body;

  const seq = String(store.qualityInspections.length + 1).padStart(3, '0');
  const inspectionNo = `QI-${dayjs().format('YYYYMM')}-${seq}`;

  const newInspection = {
    id: `inspect-${Date.now()}`,
    inspectionNo,
    type,
    orderId,
    orderType,
    batchId,
    inspectorId: req.user!.id,
    inspectorName: req.user!.name,
    result,
    totalQuantity,
    inspectedQuantity,
    passedQuantity,
    failedQuantity,
    defectRate,
    defectItems: defectItems || [],
    disposition,
    remark,
    attachments: attachments || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.qualityInspections.unshift(newInspection);

  const batch = store.qualityBatches.find(b => b.id === batchId);
  if (batch) {
    batch.inspections.push(newInspection.id);
    if (result === 'fail') {
      batch.overallResult = 'fail';
    } else if (result === 'pass' && batch.overallResult === 'pending') {
      batch.overallResult = 'pass';
    }
    batch.updatedAt = new Date().toISOString();

    const typeMap: Record<string, string> = {
      incoming: '来料检验',
      initial: '出厂初检',
      reinspection: '到货复检',
      spot_check: '抽检'
    };

    const traceRecord = {
      id: `trace-${Date.now()}-inspect`,
      batchId: batch.id,
      traceCode: batch.traceCode,
      node: type,
      nodeName: typeMap[type] || '质检',
      operatorId: req.user!.id,
      operatorName: req.user!.name,
      timestamp: new Date().toISOString(),
      description: `${typeMap[type]} ${result === 'pass' ? '合格' : '不合格'}，不良率 ${defectRate}%`,
      data: { inspectionNo, result, defectRate }
    };
    store.traceRecords.unshift(traceRecord);

    if (result === 'fail' && disposition === 'rework') {
      const factory = store.companies.find(c => c.id === batch.factoryId);
      const newRework = {
        id: `rework-${Date.now()}`,
        reworkNo: `RW-${dayjs().format('YYYYMM')}-${String(store.reworkOrders.length + 1).padStart(3, '0')}`,
        sourceInspectionId: newInspection.id,
        orderId,
        orderType,
        factoryId: batch.factoryId!,
        factoryName: factory?.name || '',
        quantity: failedQuantity,
        reason: defectItems?.map((d: any) => d.name).join('、') || '质检不合格',
        status: 'pending' as const,
        remark,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      store.reworkOrders.unshift(newRework);
      newInspection.reworkOrderId = newRework.id;

      const factoryUsers = store.users.filter(u => u.companyId === batch.factoryId && u.role === 'factory');
      factoryUsers.forEach(u => {
        addNotification({
          userId: u.id,
          type: 'warning',
          title: '返工工单通知',
          content: `${batch.partName} 质检不合格，已生成返工工单 ${newRework.reworkNo}`,
          relatedId: newRework.id,
          relatedType: 'rework_order'
        });
      });
    }
  }

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '创建质检单',
    module: '质量管理',
    targetId: newInspection.id,
    targetType: 'quality_inspection',
    detail: `创建质检单 ${inspectionNo}，结果 ${result === 'pass' ? '合格' : '不合格'}`,
    ip: req.ip
  });

  res.json(success(newInspection, '质检单创建成功'));
});

router.get('/rework-orders', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, status, factoryId } = req.query;

  let reworks = [...store.reworkOrders];

  if (status) {
    reworks = reworks.filter(r => r.status === status);
  }

  if (factoryId) {
    reworks = reworks.filter(r => r.factoryId === factoryId);
  }

  if (req.user?.role === 'factory') {
    reworks = reworks.filter(r => r.factoryId === req.user!.companyId);
  }

  reworks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const result = paginate(reworks, Number(page), Number(pageSize));

  res.json(success(result));
});

router.post('/rework-orders/:id/start', (req: AuthRequest, res) => {
  const rework = store.reworkOrders.find(r => r.id === req.params.id);

  if (!rework) {
    return res.status(404).json(error(404, '返工单不存在'));
  }

  if (req.user?.role !== 'factory' || rework.factoryId !== req.user!.companyId) {
    return res.status(403).json(error(403, '无权限操作此返工单'));
  }

  rework.status = 'processing';
  rework.updatedAt = new Date().toISOString();

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '开始返工',
    module: '质量管理',
    targetId: rework.id,
    targetType: 'rework_order',
    detail: `开始返工 ${rework.reworkNo}`,
    ip: req.ip
  });

  res.json(success(rework, '返工已开始'));
});

router.post('/rework-orders/:id/complete', (req: AuthRequest, res) => {
  const rework = store.reworkOrders.find(r => r.id === req.params.id);

  if (!rework) {
    return res.status(404).json(error(404, '返工单不存在'));
  }

  if (req.user?.role !== 'factory' || rework.factoryId !== req.user!.companyId) {
    return res.status(403).json(error(403, '无权限操作此返工单'));
  }

  rework.status = 'completed';
  rework.updatedAt = new Date().toISOString();

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '完成返工',
    module: '质量管理',
    targetId: rework.id,
    targetType: 'rework_order',
    detail: `完成返工 ${rework.reworkNo}`,
    ip: req.ip
  });

  addNotification({
    userId: store.users.find(u => u.role === 'demander')?.id || '',
    type: 'order',
    title: '返工完成通知',
    content: `${rework.factoryName} 已完成返工 ${rework.reworkNo}`,
    relatedId: rework.id,
    relatedType: 'rework_order'
  });

  res.json(success(rework, '返工已完成'));
});

router.post('/batches/batch-print', (req: AuthRequest, res) => {
  const { batchIds } = req.body;

  const batches = store.qualityBatches.filter(b => batchIds?.includes(b.id));

  if (batches.length === 0) {
    return res.status(400).json(error(400, '未找到有效批次'));
  }

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '批量打印溯源码',
    module: '质量管理',
    targetId: batchIds?.join(','),
    targetType: 'quality_batch',
    detail: `批量打印 ${batches.length} 个溯源码`,
    ip: req.ip
  });

  res.json(success({
    count: batches.length,
    batches: batches.map(b => ({
      id: b.id,
      batchNo: b.batchNo,
      traceCode: b.traceCode,
      partName: b.partName,
      quantity: b.quantity,
      qrCodeUrl: b.qrCodeUrl
    }))
  }, '批量打印数据已生成'));
});

export default router;
