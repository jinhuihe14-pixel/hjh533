import { Router } from 'express';
import { store } from '../data/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { success } from '../utils/response';
import { checkNodeTimeout } from '../utils/orderMachine';
import dayjs from 'dayjs';

const router = Router();

router.use(authMiddleware);

router.get('/stats', (req: AuthRequest, res) => {
  let processingOrders = [...store.processingOrders];
  let materialOrders = [...store.materialOrders];
  let payments = [...store.payments];
  let logisticsList = [...store.logistics];
  
  if (req.user?.role === 'demander') {
    processingOrders = processingOrders.filter(o => o.demanderId === req.user?.companyId);
    materialOrders = materialOrders.filter(o => o.demanderId === req.user?.companyId);
    payments = payments.filter(p => p.payerId === req.user?.companyId || p.payeeId === req.user?.companyId);
    logisticsList = logisticsList.filter(l => l.senderId === req.user?.companyId || l.receiverId === req.user?.companyId);
  } else if (req.user?.role === 'factory') {
    processingOrders = processingOrders.filter(o => o.factoryId === req.user?.companyId);
    payments = payments.filter(p => p.payerId === req.user?.companyId || p.payeeId === req.user?.companyId);
    logisticsList = logisticsList.filter(l => l.senderId === req.user?.companyId || l.receiverId === req.user?.companyId);
  } else if (req.user?.role === 'supplier') {
    materialOrders = materialOrders.filter(o => o.supplierId === req.user?.companyId);
    payments = payments.filter(p => p.payerId === req.user?.companyId || p.payeeId === req.user?.companyId);
    logisticsList = logisticsList.filter(l => l.senderId === req.user?.companyId || l.receiverId === req.user?.companyId);
  }

  const totalOrders = processingOrders.length + materialOrders.length;
  const pendingOrders = processingOrders.filter(o => o.status === 'pending_review').length +
                      materialOrders.filter(o => o.status === 'pending_review').length;
  const processingOrdersCount = processingOrders.filter(o => 
    ['scheduled', 'material_picked', 'processing', 'initial_inspection', 'reinspection', 'packaging'].includes(o.status)
  ).length;
  const completedOrders = processingOrders.filter(o => o.status === 'completed').length +
                         materialOrders.filter(o => o.status === 'delivered').length;

  const totalAmount = [...processingOrders, ...materialOrders].reduce((sum, o) => sum + o.totalAmount, 0);
  
  const pendingPayment = payments.filter(p => p.status !== 'paid')
    .reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);
  
  const overduePayment = payments.filter(p => 
    p.status !== 'paid' && dayjs(p.dueDate).isBefore(dayjs())
  ).reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);

  const activeLogistics = logisticsList.filter(l => 
    ['pending', 'picked_up', 'in_transit', 'delivered'].includes(l.status)
  ).length;

  const warningOrders = processingOrders.filter(order => {
    const currentNode = order.nodeTimeline.find(n => n.status === 'processing');
    if (!currentNode) return false;
    return checkNodeTimeout(currentNode, 48);
  }).length;

  res.json(success({
    totalOrders,
    pendingOrders,
    processingOrders: processingOrdersCount,
    completedOrders,
    totalAmount,
    pendingPayment,
    overduePayment,
    activeLogistics,
    warningCount: warningOrders
  }));
});

router.get('/order-trend', (req: AuthRequest, res) => {
  let processingOrders = [...store.processingOrders];
  let materialOrders = [...store.materialOrders];
  
  if (req.user?.role === 'demander') {
    processingOrders = processingOrders.filter(o => o.demanderId === req.user?.companyId);
    materialOrders = materialOrders.filter(o => o.demanderId === req.user?.companyId);
  } else if (req.user?.role === 'factory') {
    processingOrders = processingOrders.filter(o => o.factoryId === req.user?.companyId);
  } else if (req.user?.role === 'supplier') {
    materialOrders = materialOrders.filter(o => o.supplierId === req.user?.companyId);
  }

  const trendData = [];
  const now = dayjs();
  
  for (let i = 6; i >= 0; i--) {
    const date = now.subtract(i, 'day');
    const dateStr = date.format('YYYY-MM-DD');
    
    const processingCount = processingOrders.filter(o => 
      dayjs(o.createdAt).format('YYYY-MM-DD') === dateStr
    ).length;
    
    const materialCount = materialOrders.filter(o => 
      dayjs(o.createdAt).format('YYYY-MM-DD') === dateStr
    ).length;
    
    trendData.push({
      date: dateStr,
      processingOrders: processingCount,
      materialOrders: materialCount,
      total: processingCount + materialCount
    });
  }

  res.json(success(trendData));
});

router.get('/payment-trend', (req: AuthRequest, res) => {
  let payments = [...store.payments];
  
  if (req.user?.companyId) {
    payments = payments.filter(p => 
      p.payerId === req.user?.companyId || p.payeeId === req.user?.companyId
    );
  }

  const trendData = [];
  const now = dayjs();
  
  for (let i = 5; i >= 0; i--) {
    const month = now.subtract(i, 'month');
    const monthStr = month.format('YYYY-MM');
    
    const monthPayments = payments.filter(p => 
      dayjs(p.createdAt).format('YYYY-MM') === monthStr
    );
    
    const receivable = monthPayments
      .filter(p => p.type === 'receivable')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const payable = monthPayments
      .filter(p => p.type === 'payable')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const paid = monthPayments.reduce((sum, p) => sum + p.paidAmount, 0);
    
    trendData.push({
      month: monthStr,
      receivable,
      payable,
      paid
    });
  }

  res.json(success(trendData));
});

router.get('/supplier-ranking', (_req, res) => {
  const factories = store.companies.filter(c => c.type === 'factory');
  const suppliers = store.companies.filter(c => c.type === 'supplier');
  
  const allSuppliers = [...factories, ...suppliers].map(company => {
    const latestRating = store.supplierRatings
      .filter(r => r.supplierId === company.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    
    const orderCount = company.type === 'factory' 
      ? store.processingOrders.filter(o => o.factoryId === company.id).length
      : store.materialOrders.filter(o => o.supplierId === company.id).length;
    
    return {
      id: company.id,
      name: company.name,
      type: company.type,
      rating: latestRating?.overallScore || company.rating || 0,
      level: latestRating?.level || 'B',
      orderCount,
      onTimeDeliveryRate: latestRating?.onTimeDeliveryRate || 90,
      passRate: latestRating?.passRate || 95
    };
  });
  
  allSuppliers.sort((a, b) => b.rating - a.rating);

  res.json(success(allSuppliers.slice(0, 10)));
});

router.get('/recent-orders', (req: AuthRequest, res) => {
  let processingOrders = [...store.processingOrders];
  let materialOrders = [...store.materialOrders];
  
  if (req.user?.role === 'demander') {
    processingOrders = processingOrders.filter(o => o.demanderId === req.user?.companyId);
    materialOrders = materialOrders.filter(o => o.demanderId === req.user?.companyId);
  } else if (req.user?.role === 'factory') {
    processingOrders = processingOrders.filter(o => o.factoryId === req.user?.companyId);
  } else if (req.user?.role === 'supplier') {
    materialOrders = materialOrders.filter(o => o.supplierId === req.user?.companyId);
  }

  const allOrders = [...processingOrders.map(o => ({ ...o, orderType: 'processing' })), 
                     ...materialOrders.map(o => ({ ...o, orderType: 'material' }))];
  
  allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const recentOrders = allOrders.slice(0, 10).map(order => {
    const supplierOrFactory = order.orderType === 'processing'
      ? store.companies.find(c => c.id === (order as any).factoryId)
      : store.companies.find(c => c.id === (order as any).supplierId);
    
    return {
      id: order.id,
      orderNo: (order as any).orderNo,
      orderType: order.orderType,
      name: (order as any).partName || (order as any).materialName,
      amount: (order as any).totalAmount,
      status: order.status,
      partnerName: supplierOrFactory?.name,
      createdAt: order.createdAt
    };
  });

  res.json(success(recentOrders));
});

export default router;
