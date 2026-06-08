import { Router } from 'express';
import { store, addOperationLog, addNotification } from '../data/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { success, error, paginate } from '../utils/response';
import { Payment, PaymentStatus } from '../types';
import dayjs from 'dayjs';

const router = Router();

router.use(authMiddleware);

router.get('/', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, status, type, keyword } = req.query;
  
  let payments = [...store.payments];
  
  if (req.user?.role === 'demander' || req.user?.role === 'factory') {
    payments = payments.filter(p => 
      p.payerId === req.user?.companyId || p.payeeId === req.user?.companyId
    );
  } else if (req.user?.role === 'supplier') {
    payments = payments.filter(p => 
      p.payerId === req.user?.companyId || p.payeeId === req.user?.companyId
    );
  }
  
  if (status) {
    payments = payments.filter(p => p.status === status);
  }
  
  if (type) {
    payments = payments.filter(p => p.type === type);
  }
  
  if (keyword) {
    const kw = String(keyword).toLowerCase();
    payments = payments.filter(p => p.paymentNo.toLowerCase().includes(kw));
  }
  
  payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const result = paginate(payments, Number(page), Number(pageSize));
  
  const enrichedRecords = result.records.map(payment => {
    const payer = store.companies.find(c => c.id === payment.payerId);
    const payee = store.companies.find(c => c.id === payment.payeeId);
    return {
      ...payment,
      payerName: payer?.name,
      payeeName: payee?.name,
      isOverdue: payment.status !== 'paid' && dayjs(payment.dueDate).isBefore(dayjs())
    };
  });

  res.json(success({ ...result, records: enrichedRecords }));
});

router.get('/:id', (req: AuthRequest, res) => {
  const payment = store.payments.find(p => p.id === req.params.id);
  
  if (!payment) {
    return res.status(404).json(error(404, '账款不存在'));
  }

  const payer = store.companies.find(c => c.id === payment.payerId);
  const payee = store.companies.find(c => c.id === payment.payeeId);
  const invoices = store.invoices.filter(i => payment.invoiceIds.includes(i.id));

  res.json(success({
    ...payment,
    payerName: payer?.name,
    payeeName: payee?.name,
    invoices,
    isOverdue: payment.status !== 'paid' && dayjs(payment.dueDate).isBefore(dayjs())
  }));
});

router.post('/:id/pay', (req: AuthRequest, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  
  const paymentIndex = store.payments.findIndex(p => p.id === id);
  
  if (paymentIndex === -1) {
    return res.status(404).json(error(404, '账款不存在'));
  }

  const payment = store.payments[paymentIndex];

  if (req.user?.role === 'demander' && payment.payerId !== req.user.companyId) {
    return res.status(403).json(error(403, '无权操作'));
  }

  const newPaidAmount = payment.paidAmount + amount;
  let newStatus: PaymentStatus = payment.status;
  
  if (newPaidAmount >= payment.amount) {
    newStatus = 'paid';
  } else if (newPaidAmount > 0) {
    newStatus = 'partial';
  }

  const updatedPayment: Payment = {
    ...payment,
    paidAmount: Math.min(newPaidAmount, payment.amount),
    status: newStatus,
    updatedAt: new Date().toISOString()
  };

  store.payments[paymentIndex] = updatedPayment;

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '付款',
    module: '财务管理',
    targetId: id,
    targetType: 'payment',
    detail: `支付账款 ${payment.paymentNo}，金额 ${amount} 元`,
    ip: req.ip
  });

  const payeeUsers = store.users.filter(u => u.companyId === payment.payeeId);
  payeeUsers.forEach(u => {
    addNotification({
      userId: u.id,
      type: 'payment',
      title: '收到付款',
      content: `账款 ${payment.paymentNo} 收到付款 ${amount} 元`,
      relatedId: id,
      relatedType: 'payment'
    });
  });

  res.json(success(updatedPayment, '付款成功'));
});

router.get('/stats/summary', (req: AuthRequest, res) => {
  let payments = store.payments;
  
  if (req.user?.companyId) {
    payments = payments.filter(p => 
      p.payerId === req.user?.companyId || p.payeeId === req.user?.companyId
    );
  }

  const totalReceivable = payments
    .filter(p => p.type === 'receivable')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalPayable = payments
    .filter(p => p.type === 'payable')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalPaid = payments.reduce((sum, p) => sum + p.paidAmount, 0);
  
  const overduePayments = payments.filter(p => 
    p.status !== 'paid' && dayjs(p.dueDate).isBefore(dayjs())
  );
  
  const overdueAmount = overduePayments.reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);

  res.json(success({
    totalReceivable,
    totalPayable,
    totalPaid,
    overdueCount: overduePayments.length,
    overdueAmount
  }));
});

router.get('/ledger', (req: AuthRequest, res) => {
  const { period = 'month' } = req.query;
  
  let payments = store.payments;
  
  if (req.user?.companyId) {
    payments = payments.filter(p => 
      p.payerId === req.user?.companyId || p.payeeId === req.user?.companyId
    );
  }

  const now = dayjs();
  const ledgerData = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = now.subtract(i, period as any);
    const monthPayments = payments.filter(p => 
      dayjs(p.createdAt).format('YYYY-MM') === date.format('YYYY-MM')
    );
    
    const receivable = monthPayments
      .filter(p => p.type === 'receivable')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const payable = monthPayments
      .filter(p => p.type === 'payable')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const paid = monthPayments.reduce((sum, p) => sum + p.paidAmount, 0);
    
    ledgerData.push({
      period: date.format('YYYY-MM'),
      receivable,
      payable,
      paid
    });
  }

  res.json(success(ledgerData));
});

export default router;
