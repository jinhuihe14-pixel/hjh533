import { Router } from 'express';
import { store, addOperationLog, addNotification } from '../data/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { success, error, paginate } from '../utils/response';
import { advanceOrderNode, calculateDeduction, checkNodeTimeout } from '../utils/orderMachine';
import { ProcessingOrder, MaterialOrder, OrderStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const router = Router();

router.use(authMiddleware);

router.get('/processing', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, status, keyword, factoryId } = req.query;
  
  let orders = [...store.processingOrders];
  
  if (req.user?.role === 'demander') {
    orders = orders.filter(o => o.demanderId === req.user?.companyId);
  } else if (req.user?.role === 'factory') {
    orders = orders.filter(o => o.factoryId === req.user?.companyId);
  }
  
  if (status) {
    orders = orders.filter(o => o.status === status);
  }
  
  if (keyword) {
    const kw = String(keyword).toLowerCase();
    orders = orders.filter(o => 
      o.orderNo.toLowerCase().includes(kw) || 
      o.partName.toLowerCase().includes(kw) ||
      o.partCode.toLowerCase().includes(kw)
    );
  }
  
  if (factoryId) {
    orders = orders.filter(o => o.factoryId === factoryId);
  }
  
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const result = paginate(orders, Number(page), Number(pageSize));
  
  const enrichedRecords = result.records.map(order => {
    const factory = store.companies.find(c => c.id === order.factoryId);
    const demander = store.companies.find(c => c.id === order.demanderId);
    return { ...order, factoryName: factory?.name, demanderName: demander?.name };
  });

  res.json(success({ ...result, records: enrichedRecords }));
});

router.get('/processing/:id', (req: AuthRequest, res) => {
  const order = store.processingOrders.find(o => o.id === req.params.id);
  
  if (!order) {
    return res.status(404).json(error(404, '订单不存在'));
  }

  if (req.user?.role === 'demander' && order.demanderId !== req.user.companyId) {
    return res.status(403).json(error(403, '无权访问'));
  }
  if (req.user?.role === 'factory' && order.factoryId !== req.user.companyId) {
    return res.status(403).json(error(403, '无权访问'));
  }

  const factory = store.companies.find(c => c.id === order.factoryId);
  const demander = store.companies.find(c => c.id === order.demanderId);
  const materialOrders = store.materialOrders.filter(mo => order.materialOrderIds.includes(mo.id));
  const drawings = store.drawings.filter(d => order.drawingIds.includes(d.id));

  res.json(success({
    ...order,
    factoryName: factory?.name,
    demanderName: demander?.name,
    materialOrders,
    drawings: drawings.map(d => ({
      id: d.id,
      name: d.name,
      fileType: d.fileType,
      fileSize: d.fileSize,
      isEncrypted: d.isEncrypted
    }))
  }));
});

router.post('/processing', (req: AuthRequest, res) => {
  if (req.user?.role !== 'demander' && req.user?.role !== 'admin') {
    return res.status(403).json(error(403, '仅需求方可以创建加工订单'));
  }

  const {
    partName, partCode, quantity, unitPrice, factoryId,
    deliveryDate, processStandard, toleranceRequirement,
    lossRateThreshold, defectRateThreshold, remarks, drawingIds, materialOrders
  } = req.body;

  const orderNo = `PO-${dayjs().format('YYYY-MM')}-${String(store.processingOrders.length + 1).padStart(4, '0')}`;
  
  const now = new Date().toISOString();
  const newOrder: ProcessingOrder = {
    id: `po-${Date.now()}`,
    orderNo,
    type: 'processing',
    demanderId: req.user!.companyId,
    factoryId,
    partName,
    partCode,
    quantity,
    unitPrice,
    totalAmount: quantity * unitPrice,
    status: 'pending_review',
    deliveryDate,
    drawingIds: drawingIds || [],
    processStandard,
    toleranceRequirement,
    lossRateThreshold: lossRateThreshold || 3,
    defectRateThreshold: defectRateThreshold || 2,
    materialOrderIds: [],
    currentNode: 'pending_review',
    nodeTimeline: [
      {
        node: 'pending_review',
        status: 'processing',
        startedAt: now,
        operatorId: req.user!.id
      }
    ],
    remarks,
    createdAt: now,
    updatedAt: now
  };

  if (materialOrders && materialOrders.length > 0) {
    materialOrders.forEach((mo: any, index: number) => {
      const moNo = `MO-${dayjs().format('YYYY-MM')}-${String(store.materialOrders.length + index + 1).padStart(4, '0')}`;
      const newMo: MaterialOrder = {
        id: `mo-${Date.now()}-${index}`,
        orderNo: moNo,
        type: 'material',
        demanderId: req.user!.companyId,
        supplierId: mo.supplierId,
        processingOrderId: newOrder.id,
        materialName: mo.materialName,
        materialCode: mo.materialCode,
        specification: mo.specification,
        quantity: mo.quantity,
        unit: mo.unit || 'kg',
        unitPrice: mo.unitPrice,
        totalAmount: mo.quantity * mo.unitPrice,
        status: 'pending_review',
        deliveryDate: mo.deliveryDate,
        qualityStandard: mo.qualityStandard,
        remarks: mo.remarks,
        createdAt: now,
        updatedAt: now
      };
      store.materialOrders.push(newMo);
      newOrder.materialOrderIds.push(newMo.id);
    });
  }

  store.processingOrders.unshift(newOrder);

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '创建加工订单',
    module: '订单管理',
    targetId: newOrder.id,
    targetType: 'processing_order',
    detail: `创建加工订单 ${orderNo}，数量${quantity}件`,
    ip: req.ip
  });

  const factoryUsers = store.users.filter(u => u.companyId === factoryId);
  factoryUsers.forEach(u => {
    addNotification({
      userId: u.id,
      type: 'order',
      title: '新订单待接收',
      content: `${partName}（${orderNo}）等待贵司确认接单`,
      relatedId: newOrder.id,
      relatedType: 'processing_order'
    });
  });

  res.json(success(newOrder, '订单创建成功'));
});

router.post('/processing/:id/advance', (req: AuthRequest, res) => {
  const { id } = req.params;
  const { remark, actualLossRate, actualDefectRate } = req.body;
  
  const orderIndex = store.processingOrders.findIndex(o => o.id === id);
  
  if (orderIndex === -1) {
    return res.status(404).json(error(404, '订单不存在'));
  }

  const order = store.processingOrders[orderIndex];

  if (req.user?.role === 'factory' && order.factoryId !== req.user.companyId) {
    return res.status(403).json(error(403, '无权操作'));
  }
  if (req.user?.role === 'demander' && order.demanderId !== req.user.companyId) {
    return res.status(403).json(error(403, '无权操作'));
  }

  let updatedOrder = advanceOrderNode(order, req.user!.id, remark);

  if (actualLossRate !== undefined && actualDefectRate !== undefined) {
    const deduction = calculateDeduction(order, actualLossRate, actualDefectRate);
    updatedOrder = {
      ...updatedOrder,
      actualLossRate,
      actualDefectRate,
      deductionAmount: deduction
    };
  }

  store.processingOrders[orderIndex] = updatedOrder;

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '订单节点推进',
    module: '订单管理',
    targetId: id,
    targetType: 'processing_order',
    detail: `订单 ${order.orderNo} 推进至 ${updatedOrder.currentNode} 节点`,
    ip: req.ip
  });

  const nodeNames: Record<string, string> = {
    'pending_review': '待审核',
    'reviewed': '已接单',
    'scheduled': '排产中',
    'material_picked': '已领料',
    'processing': '加工中',
    'initial_inspection': '初检',
    'reinspection': '复检',
    'packaging': '包装中',
    'shipped': '已发货',
    'delivered': '已送达',
    'completed': '已完成'
  };

  const demanderUsers = store.users.filter(u => u.companyId === order.demanderId);
  const factoryUsers = store.users.filter(u => u.companyId === order.factoryId);

  const notifyUsers = req.user?.role === 'factory' ? demanderUsers : factoryUsers;
  notifyUsers.forEach(u => {
    addNotification({
      userId: u.id,
      type: 'order',
      title: '订单状态更新',
      content: `${order.partName}（${order.orderNo}）已更新为：${nodeNames[updatedOrder.currentNode]}`,
      relatedId: id,
      relatedType: 'processing_order'
    });
  });

  res.json(success(updatedOrder, '节点推进成功'));
});

router.get('/material', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, status, keyword, supplierId } = req.query;
  
  let orders = [...store.materialOrders];
  
  if (req.user?.role === 'demander') {
    orders = orders.filter(o => o.demanderId === req.user?.companyId);
  } else if (req.user?.role === 'supplier') {
    orders = orders.filter(o => o.supplierId === req.user?.companyId);
  }
  
  if (status) {
    orders = orders.filter(o => o.status === status);
  }
  
  if (keyword) {
    const kw = String(keyword).toLowerCase();
    orders = orders.filter(o => 
      o.orderNo.toLowerCase().includes(kw) || 
      o.materialName.toLowerCase().includes(kw) ||
      o.materialCode.toLowerCase().includes(kw)
    );
  }
  
  if (supplierId) {
    orders = orders.filter(o => o.supplierId === supplierId);
  }
  
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const result = paginate(orders, Number(page), Number(pageSize));
  
  const enrichedRecords = result.records.map(order => {
    const supplier = store.companies.find(c => c.id === order.supplierId);
    const demander = store.companies.find(c => c.id === order.demanderId);
    return { ...order, supplierName: supplier?.name, demanderName: demander?.name };
  });

  res.json(success({ ...result, records: enrichedRecords }));
});

router.get('/material/:id', (req: AuthRequest, res) => {
  const order = store.materialOrders.find(o => o.id === req.params.id);
  
  if (!order) {
    return res.status(404).json(error(404, '订单不存在'));
  }

  if (req.user?.role === 'demander' && order.demanderId !== req.user.companyId) {
    return res.status(403).json(error(403, '无权访问'));
  }
  if (req.user?.role === 'supplier' && order.supplierId !== req.user.companyId) {
    return res.status(403).json(error(403, '无权访问'));
  }

  const supplier = store.companies.find(c => c.id === order.supplierId);
  const demander = store.companies.find(c => c.id === order.demanderId);
  const logistics = order.logisticsId ? store.logistics.find(l => l.id === order.logisticsId) : null;

  res.json(success({
    ...order,
    supplierName: supplier?.name,
    demanderName: demander?.name,
    logistics
  }));
});

router.get('/nodes', (_req, res) => {
  res.json(success(store.orderNodes));
});

router.get('/warnings', (req: AuthRequest, res) => {
  let orders = [...store.processingOrders];
  
  if (req.user?.role === 'demander') {
    orders = orders.filter(o => o.demanderId === req.user?.companyId);
  } else if (req.user?.role === 'factory') {
    orders = orders.filter(o => o.factoryId === req.user?.companyId);
  }

  const warningOrders = orders.filter(order => {
    const currentNode = order.nodeTimeline.find(n => n.status === 'processing');
    if (!currentNode) return false;
    return checkNodeTimeout(currentNode, 48);
  });

  res.json(success(warningOrders));
});

export default router;
