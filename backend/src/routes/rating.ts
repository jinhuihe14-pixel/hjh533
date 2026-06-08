import { Router } from 'express';
import { store, addOperationLog, addNotification } from '../data/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { success, error, paginate } from '../utils/response';
import dayjs from 'dayjs';

const router = Router();

router.use(authMiddleware);

router.get('/configs', (req: AuthRequest, res) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'demander') {
    return res.status(403).json(error(403, '无权限查看评级配置'));
  }

  const configs = store.ratingConfigs.filter(c => c.isActive)
    .sort((a, b) => a.weight - b.weight);

  res.json(success(configs));
});

router.put('/configs/:id', (req: AuthRequest, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json(error(403, '无权限修改评级配置'));
  }

  const config = store.ratingConfigs.find(c => c.id === req.params.id);

  if (!config) {
    return res.status(404).json(error(404, '评级配置不存在'));
  }

  const { weight, scoringCriteria, isActive } = req.body;

  if (weight !== undefined) config.weight = weight;
  if (scoringCriteria !== undefined) config.scoringCriteria = scoringCriteria;
  if (isActive !== undefined) config.isActive = isActive;

  config.updatedAt = new Date().toISOString();

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '更新评级配置',
    module: '供应商管理',
    targetId: config.id,
    targetType: 'rating_config',
    detail: `更新 ${config.name} 评级配置`,
    ip: req.ip
  });

  res.json(success(config, '配置更新成功'));
});

router.get('/ratings', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, period, level, supplierId } = req.query;

  let ratings = [...store.supplierRatingDetails];

  if (period) {
    ratings = ratings.filter(r => r.period === period);
  }

  if (level) {
    ratings = ratings.filter(r => r.level === level);
  }

  if (supplierId) {
    ratings = ratings.filter(r => r.supplierId === supplierId);
  }

  if (req.user?.role === 'supplier' || req.user?.role === 'factory') {
    ratings = ratings.filter(r => r.supplierId === req.user!.companyId);
  }

  ratings.sort((a, b) => b.overallScore - a.overallScore);

  const result = paginate(ratings, Number(page), Number(pageSize));

  res.json(success(result));
});

router.get('/ratings/:id', (req: AuthRequest, res) => {
  const rating = store.supplierRatingDetails.find(r => r.id === req.params.id);

  if (!rating) {
    return res.status(404).json(error(404, '评级记录不存在'));
  }

  const supplier = store.companies.find(c => c.id === rating.supplierId);
  const historyRatings = store.supplierRatingDetails
    .filter(r => r.supplierId === rating.supplierId)
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-6);

  const rectifications = store.rectificationNotices.filter(
    r => r.supplierId === rating.supplierId && r.period === rating.period
  );

  res.json(success({
    ...rating,
    supplier,
    historyRatings,
    rectifications
  }));
});

router.get('/suppliers/:supplierId/ratings', (req: AuthRequest, res) => {
  const { supplierId } = req.params;

  const ratings = store.supplierRatingDetails
    .filter(r => r.supplierId === supplierId)
    .sort((a, b) => a.period.localeCompare(b.period));

  res.json(success(ratings));
});

router.post('/ratings/calculate', (req: AuthRequest, res) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'demander') {
    return res.status(403).json(error(403, '无权限计算评级'));
  }

  const { period } = req.body;
  const targetPeriod = period || dayjs().subtract(1, 'month').format('YYYY-MM');

  const suppliers = store.companies.filter(
    c => c.type === 'supplier' || c.type === 'factory'
  );

  const results: any[] = [];

  suppliers.forEach(supplier => {
    const orders = supplier.type === 'factory'
      ? store.processingOrders.filter(o => o.factoryId === supplier.id)
      : store.materialOrders.filter(o => o.supplierId === supplier.id);

    const orderCount = orders.length;
    if (orderCount === 0) return;

    const configs = store.ratingConfigs.filter(c => c.isActive);

    const onTimeRate = 85 + Math.random() * 15;
    const passRate = 90 + Math.random() * 10;
    const avgResponseTime = 2 + Math.random() * 10;
    const priceIndex = 70 + Math.random() * 30;

    const dimensions: any[] = [];
    let overallScore = 0;

    configs.forEach(config => {
      let rawValue = 0;
      let score = 0;

      switch (config.dimension) {
        case 'delivery':
          rawValue = onTimeRate;
          break;
        case 'quality':
          rawValue = passRate;
          break;
        case 'service':
          rawValue = avgResponseTime;
          break;
        case 'price':
          rawValue = priceIndex;
          break;
      }

      const sortedCriteria = [...config.scoringCriteria].sort((a, b) => b.minValue - a.minValue);
      const matched = sortedCriteria.find(c => {
        if (config.dimension === 'service' || config.dimension === 'quality') {
          return rawValue >= c.minValue && rawValue < c.maxValue;
        }
        return rawValue >= c.minValue;
      });
      score = matched?.score || 60;

      dimensions.push({
        dimension: config.dimension,
        name: config.name,
        weight: config.weight,
        score,
        rawValue: Math.round(rawValue * 10) / 10,
        unit: config.scoringCriteria[0]?.unit || ''
      });

      overallScore += score * (config.weight / 100);
    });

    overallScore = Math.round(overallScore * 10) / 10;

    let level: 'A' | 'B' | 'C' = 'C';
    if (overallScore >= 90) level = 'A';
    else if (overallScore >= 75) level = 'B';

    const existing = store.supplierRatingDetails.find(
      r => r.supplierId === supplier.id && r.period === targetPeriod
    );

    const ratingData = {
      id: existing?.id || `srd-${Date.now()}-${supplier.id}`,
      supplierId: supplier.id,
      period: targetPeriod,
      overallScore,
      level,
      dimensions,
      orderCount,
      onTimeDeliveryRate: Math.round(onTimeRate * 10) / 10,
      passRate: Math.round(passRate * 10) / 10,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      priceCompetitiveIndex: Math.round(priceIndex * 10) / 10,
      complaintCount: 0,
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    if (existing) {
      Object.assign(existing, ratingData);
    } else {
      store.supplierRatingDetails.push(ratingData as any);
    }

    results.push(ratingData);

    if (level === 'C') {
      const existingNotice = store.rectificationNotices.find(
        n => n.supplierId === supplier.id && n.period === targetPeriod
      );

      if (!existingNotice) {
        const notice = {
          id: `rn-${Date.now()}-${supplier.id}`,
          noticeNo: `RN-${targetPeriod.replace('-', '')}-${String(store.rectificationNotices.length + 1).padStart(3, '0')}`,
          supplierId: supplier.id,
          supplierName: supplier.name,
          period: targetPeriod,
          ratingLevel: level,
          score: overallScore,
          issues: ['综合评级为C级，需全面整改'],
          requirements: '请分析问题原因，制定详细整改计划，限期提交整改方案',
          deadline: dayjs().add(15, 'day').toISOString(),
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        store.rectificationNotices.push(notice);

        const supplierUsers = store.users.filter(u => u.companyId === supplier.id);
        supplierUsers.forEach(u => {
          addNotification({
            userId: u.id,
            type: 'warning',
            title: '整改通知',
            content: `贵司${targetPeriod}月评级为${level}级，请及时查看整改通知单`,
            relatedId: notice.id,
            relatedType: 'rectification_notice'
          });
        });
      }
    }
  });

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '计算供应商评级',
    module: '供应商管理',
    targetId: targetPeriod,
    targetType: 'supplier_rating',
    detail: `计算 ${targetPeriod} 月供应商评级，共 ${results.length} 家`,
    ip: req.ip
  });

  res.json(success({ count: results.length, results }, '评级计算完成'));
});

router.get('/rectifications', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, status, supplierId, period } = req.query;

  let notices = [...store.rectificationNotices];

  if (status) {
    notices = notices.filter(n => n.status === status);
  }

  if (supplierId) {
    notices = notices.filter(n => n.supplierId === supplierId);
  }

  if (period) {
    notices = notices.filter(n => n.period === period);
  }

  if (req.user?.role === 'supplier' || req.user?.role === 'factory') {
    notices = notices.filter(n => n.supplierId === req.user!.companyId);
  }

  notices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const result = paginate(notices, Number(page), Number(pageSize));

  res.json(success(result));
});

router.get('/rectifications/:id', (req: AuthRequest, res) => {
  const notice = store.rectificationNotices.find(n => n.id === req.params.id);

  if (!notice) {
    return res.status(404).json(error(404, '整改通知单不存在'));
  }

  res.json(success(notice));
});

router.post('/rectifications/:id/submit', (req: AuthRequest, res) => {
  const notice = store.rectificationNotices.find(n => n.id === req.params.id);

  if (!notice) {
    return res.status(404).json(error(404, '整改通知单不存在'));
  }

  if (req.user?.role !== 'supplier' && req.user?.role !== 'factory' &&
      notice.supplierId !== req.user?.companyId) {
    return res.status(403).json(error(403, '无权限操作此整改单'));
  }

  const { responseContent } = req.body;

  notice.status = 'submitted';
  notice.responseContent = responseContent;
  notice.responseAt = new Date().toISOString();
  notice.updatedAt = new Date().toISOString();

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '提交整改方案',
    module: '供应商管理',
    targetId: notice.id,
    targetType: 'rectification_notice',
    detail: `提交整改方案 ${notice.noticeNo}`,
    ip: req.ip
  });

  addNotification({
    userId: store.users.find(u => u.role === 'admin')?.id || '',
    type: 'warning',
    title: '整改方案待审核',
    content: `${notice.supplierName} 已提交整改方案 ${notice.noticeNo}`,
    relatedId: notice.id,
    relatedType: 'rectification_notice'
  });

  res.json(success(notice, '整改方案已提交'));
});

router.post('/rectifications/:id/verify', (req: AuthRequest, res) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'demander') {
    return res.status(403).json(error(403, '无权限审核整改方案'));
  }

  const notice = store.rectificationNotices.find(n => n.id === req.params.id);

  if (!notice) {
    return res.status(404).json(error(404, '整改通知单不存在'));
  }

  const { pass, remark } = req.body;

  notice.status = pass ? 'verified' : 'in_progress';
  notice.verifierId = req.user!.id;
  notice.verifierName = req.user!.name;
  notice.remark = remark;
  notice.updatedAt = new Date().toISOString();

  if (pass) {
    notice.status = 'closed';
  }

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: pass ? '审核通过整改' : '审核不通过整改',
    module: '供应商管理',
    targetId: notice.id,
    targetType: 'rectification_notice',
    detail: `${pass ? '通过' : '驳回'}整改方案 ${notice.noticeNo}`,
    ip: req.ip
  });

  const supplierUsers = store.users.filter(u => u.companyId === notice.supplierId);
  supplierUsers.forEach(u => {
    addNotification({
      userId: u.id,
      type: pass ? 'order' : 'warning',
      title: pass ? '整改审核通过' : '整改方案被驳回',
      content: `整改方案 ${notice.noticeNo} ${pass ? '已通过审核' : '被驳回，请修改后重新提交'}`,
      relatedId: notice.id,
      relatedType: 'rectification_notice'
    });
  });

  res.json(success(notice, pass ? '审核通过' : '已驳回'));
});

export default router;
