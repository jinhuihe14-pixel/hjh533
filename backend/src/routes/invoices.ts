import { Router } from 'express';
import { store, addOperationLog, addNotification } from '../data/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { success, error, paginate } from '../utils/response';
import { Invoice } from '../types';
import dayjs from 'dayjs';

const router = Router();

router.use(authMiddleware);

router.get('/', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, status, type, keyword } = req.query;
  
  let invoices = [...store.invoices];
  
  if (req.user?.role === 'demander' || req.user?.role === 'factory' || req.user?.role === 'supplier') {
    invoices = invoices.filter(i => 
      i.payerId === req.user?.companyId || i.payeeId === req.user?.companyId
    );
  }
  
  if (status) {
    invoices = invoices.filter(i => i.status === status);
  }
  
  if (type) {
    invoices = invoices.filter(i => i.type === type);
  }
  
  if (keyword) {
    const kw = String(keyword).toLowerCase();
    invoices = invoices.filter(i => 
      i.invoiceNo.toLowerCase().includes(kw) ||
      (i.invoiceCode && i.invoiceCode.toLowerCase().includes(kw))
    );
  }
  
  invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const result = paginate(invoices, Number(page), Number(pageSize));
  
  const enrichedRecords = result.records.map(invoice => {
    const payer = store.companies.find(c => c.id === invoice.payerId);
    const payee = store.companies.find(c => c.id === invoice.payeeId);
    return {
      ...invoice,
      payerName: payer?.name,
      payeeName: payee?.name
    };
  });

  res.json(success({ ...result, records: enrichedRecords }));
});

router.get('/:id', (req: AuthRequest, res) => {
  const invoice = store.invoices.find(i => i.id === req.params.id);
  
  if (!invoice) {
    return res.status(404).json(error(404, '发票不存在'));
  }

  const payer = store.companies.find(c => c.id === invoice.payerId);
  const payee = store.companies.find(c => c.id === invoice.payeeId);

  res.json(success({
    ...invoice,
    payerName: payer?.name,
    payeeName: payee?.name
  }));
});

router.post('/', (req: AuthRequest, res) => {
  const {
    invoiceNo, invoiceCode, type, payerId, payeeId,
    amount, taxAmount, orderIds
  } = req.body;

  const totalAmount = amount + (taxAmount || 0);

  const newInvoice: Invoice = {
    id: `inv-${Date.now()}`,
    invoiceNo,
    invoiceCode,
    type,
    status: 'issued',
    payerId,
    payeeId,
    amount,
    taxAmount: taxAmount || 0,
    totalAmount,
    orderIds: orderIds || [],
    issuedDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.invoices.unshift(newInvoice);

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '开具发票',
    module: '票据管理',
    targetId: newInvoice.id,
    targetType: 'invoice',
    detail: `开具发票 ${invoiceNo}，金额 ${totalAmount} 元`,
    ip: req.ip
  });

  const payerUsers = store.users.filter(u => u.companyId === payerId);
  payerUsers.forEach(u => {
    addNotification({
      userId: u.id,
      type: 'system',
      title: '新发票已开具',
      content: `发票 ${invoiceNo} 已开具，金额 ${totalAmount} 元`,
      relatedId: newInvoice.id,
      relatedType: 'invoice'
    });
  });

  res.json(success(newInvoice, '发票开具成功'));
});

router.post('/:id/verify', (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const invoiceIndex = store.invoices.findIndex(i => i.id === id);
  
  if (invoiceIndex === -1) {
    return res.status(404).json(error(404, '发票不存在'));
  }

  const invoice = store.invoices[invoiceIndex];

  const isVerified = invoice.invoiceCode && invoice.invoiceNo;

  if (!isVerified) {
    return res.status(400).json(error(400, '发票信息不完整，无法验真'));
  }

  const updatedInvoice: Invoice = {
    ...invoice,
    status: 'verified',
    verifiedDate: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.invoices[invoiceIndex] = updatedInvoice;

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '发票验真',
    module: '票据管理',
    targetId: id,
    targetType: 'invoice',
    detail: `验真发票 ${invoice.invoiceNo}，验真通过`,
    ip: req.ip
  });

  res.json(success(updatedInvoice, '发票验真通过'));
});

router.post('/:id/archive', (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const invoiceIndex = store.invoices.findIndex(i => i.id === id);
  
  if (invoiceIndex === -1) {
    return res.status(404).json(error(404, '发票不存在'));
  }

  const invoice = store.invoices[invoiceIndex];

  if (invoice.status !== 'verified') {
    return res.status(400).json(error(400, '发票未验真，无法归档'));
  }

  const updatedInvoice: Invoice = {
    ...invoice,
    status: 'archived',
    archiveDate: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.invoices[invoiceIndex] = updatedInvoice;

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '发票归档',
    module: '票据管理',
    targetId: id,
    targetType: 'invoice',
    detail: `归档发票 ${invoice.invoiceNo}`,
    ip: req.ip
  });

  res.json(success(updatedInvoice, '发票归档成功'));
});

export default router;
