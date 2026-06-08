import { Router } from 'express';
import { store, addOperationLog } from '../data/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { success, error, paginate } from '../utils/response';
import dayjs from 'dayjs';

const router = Router();

router.use(authMiddleware);

router.get('/', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, type, keyword } = req.query;
  
  let companies = [...store.companies];
  
  if (type) {
    companies = companies.filter(c => c.type === type);
  }
  
  if (keyword) {
    const kw = String(keyword).toLowerCase();
    companies = companies.filter(c => 
      c.name.toLowerCase().includes(kw) ||
      c.contactPerson.toLowerCase().includes(kw)
    );
  }
  
  companies.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  
  const result = paginate(companies, Number(page), Number(pageSize));

  res.json(success(result));
});

router.get('/:id', (req: AuthRequest, res) => {
  const company = store.companies.find(c => c.id === req.params.id);
  
  if (!company) {
    return res.status(404).json(error(404, '企业不存在'));
  }

  const latestRating = store.supplierRatings
    .filter(r => r.supplierId === company.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const orderCount = company.type === 'factory' 
    ? store.processingOrders.filter(o => o.factoryId === company.id).length
    : store.materialOrders.filter(o => o.supplierId === company.id).length;

  res.json(success({
    ...company,
    latestRating,
    orderCount
  }));
});

router.get('/:id/ratings', (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const ratings = store.supplierRatings
    .filter(r => r.supplierId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(success(ratings));
});

router.get('/quotes/compare', (req: AuthRequest, res) => {
  const { partCode, partName } = req.query;
  
  let quotes = store.priceQuotes.filter(q => q.isActive);
  
  if (partCode) {
    quotes = quotes.filter(q => q.partCode === partCode);
  }
  
  if (partName) {
    const kw = String(partName).toLowerCase();
    quotes = quotes.filter(q => q.partName.toLowerCase().includes(kw));
  }

  const groupedQuotes: Record<string, typeof quotes> = {};
  quotes.forEach(q => {
    if (!groupedQuotes[q.partCode]) {
      groupedQuotes[q.partCode] = [];
    }
    groupedQuotes[q.partCode].push(q);
  });

  const result = Object.entries(groupedQuotes).map(([partCode, items]) => {
    const sortedByPrice = [...items].sort((a, b) => a.unitPrice - b.unitPrice);
    const sortedByDelivery = [...items].sort((a, b) => a.deliveryDays - b.deliveryDays);
    const sortedByQuality = [...items].sort((a, b) => a.defectRate - b.defectRate);

    return {
      partCode,
      partName: items[0].partName,
      quotes: items,
      bestPrice: sortedByPrice[0],
      fastestDelivery: sortedByDelivery[0],
      bestQuality: sortedByQuality[0],
      supplierCount: items.length
    };
  });

  res.json(success(result));
});

router.get('/quotes', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, partCode, supplierId } = req.query;
  
  let quotes = [...store.priceQuotes].filter(q => q.isActive);
  
  if (partCode) {
    quotes = quotes.filter(q => q.partCode === partCode);
  }
  
  if (supplierId) {
    quotes = quotes.filter(q => q.supplierId === supplierId);
  }
  
  quotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const result = paginate(quotes, Number(page), Number(pageSize));

  res.json(success(result));
});

router.post('/quotes', (req: AuthRequest, res) => {
  if (req.user?.role !== 'supplier' && req.user?.role !== 'factory' && req.user?.role !== 'admin') {
    return res.status(403).json(error(403, '仅供应商/加工厂可以发布报价'));
  }

  const {
    partCode, partName, unitPrice, minOrderQuantity,
    deliveryDays, qualityGrade, defectRate, validFrom, validTo
  } = req.body;

  const company = store.companies.find(c => c.id === req.user!.companyId);

  const newQuote = {
    id: `pq-${Date.now()}`,
    partCode,
    partName,
    supplierId: req.user!.companyId,
    supplierName: company?.name || '',
    unitPrice,
    minOrderQuantity: minOrderQuantity || 1,
    deliveryDays,
    qualityGrade: qualityGrade || 'A级',
    defectRate: defectRate || 2,
    validFrom: validFrom || new Date().toISOString(),
    validTo: validTo || dayjs().add(3, 'month').toISOString(),
    isActive: true,
    createdAt: new Date().toISOString()
  };

  store.priceQuotes.unshift(newQuote);

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '发布报价',
    module: '供应商管理',
    targetId: newQuote.id,
    targetType: 'price_quote',
    detail: `发布 ${partName} 报价，单价 ${unitPrice} 元`,
    ip: req.ip
  });

  res.json(success(newQuote, '报价发布成功'));
});

export default router;
