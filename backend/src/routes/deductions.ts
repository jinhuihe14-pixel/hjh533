import { Router } from 'express';
import { store, addOperationLog } from '../data/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { success, error, paginate } from '../utils/response';

const router = Router();

router.use(authMiddleware);

router.get('/', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, orderId, batchId, defectType, isActive } = req.query;

  let rules = [...store.deductionRules];

  if (orderId) {
    rules = rules.filter(r => r.orderId === orderId);
  }

  if (batchId) {
    rules = rules.filter(r => r.batchId === batchId);
  }

  if (defectType) {
    rules = rules.filter(r => r.defectType === defectType);
  }

  if (isActive !== undefined) {
    rules = rules.filter(r => r.isActive === (isActive === 'true'));
  }

  rules.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const result = paginate(rules, Number(page), Number(pageSize));

  res.json(success(result));
});

router.get('/:id', (req: AuthRequest, res) => {
  const rule = store.deductionRules.find(r => r.id === req.params.id);

  if (!rule) {
    return res.status(404).json(error(404, '扣款规则不存在'));
  }

  res.json(success(rule));
});

router.post('/', (req: AuthRequest, res) => {
  if (req.user?.role !== 'demander' && req.user?.role !== 'admin') {
    return res.status(403).json(error(403, '无权限创建扣款规则'));
  }

  const {
    name, description, orderId, batchId,
    defectType, deductionType, deductionValue
  } = req.body;

  const newRule = {
    id: `deduct-${Date.now()}`,
    name,
    description,
    orderId,
    batchId,
    defectType,
    deductionType,
    deductionValue,
    isActive: true,
    createdBy: req.user!.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.deductionRules.unshift(newRule);

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '创建扣款规则',
    module: '财务管理',
    targetId: newRule.id,
    targetType: 'deduction_rule',
    detail: `创建扣款规则 ${name}，类型 ${deductionType}，值 ${deductionValue}`,
    ip: req.ip
  });

  res.json(success(newRule, '扣款规则创建成功'));
});

router.put('/:id', (req: AuthRequest, res) => {
  if (req.user?.role !== 'demander' && req.user?.role !== 'admin') {
    return res.status(403).json(error(403, '无权限修改扣款规则'));
  }

  const rule = store.deductionRules.find(r => r.id === req.params.id);

  if (!rule) {
    return res.status(404).json(error(404, '扣款规则不存在'));
  }

  const {
    name, description, defectType, deductionType, deductionValue, isActive
  } = req.body;

  if (name !== undefined) rule.name = name;
  if (description !== undefined) rule.description = description;
  if (defectType !== undefined) rule.defectType = defectType;
  if (deductionType !== undefined) rule.deductionType = deductionType;
  if (deductionValue !== undefined) rule.deductionValue = deductionValue;
  if (isActive !== undefined) rule.isActive = isActive;

  rule.updatedAt = new Date().toISOString();

  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '更新扣款规则',
    module: '财务管理',
    targetId: rule.id,
    targetType: 'deduction_rule',
    detail: `更新扣款规则 ${rule.name}`,
    ip: req.ip
  });

  res.json(success(rule, '扣款规则更新成功'));
});

router.post('/calculate', (req: AuthRequest, res) => {
  if (req.user?.role !== 'demander' && req.user?.role !== 'admin' && req.user?.role !== 'finance') {
    return res.status(403).json(error(403, '无权限计算扣款'));
  }

  const { batchId, orderId, failedQuantity, totalAmount } = req.body;

  const rules = store.deductionRules.filter(r =>
    r.isActive && (r.batchId === batchId || r.orderId === orderId)
  );

  const generalRules = store.deductionRules.filter(r =>
    r.isActive && !r.batchId && !r.orderId
  );

  const allRules = [...rules, ...generalRules];
  const deductionDetails: any[] = [];
  let totalDeduction = 0;

  allRules.forEach(rule => {
    let amount = 0;

    switch (rule.deductionType) {
      case 'percentage':
        amount = (totalAmount || 0) * (rule.deductionValue / 100);
        break;
      case 'fixed':
        amount = rule.deductionValue;
        break;
      case 'per_unit':
        amount = (failedQuantity || 0) * rule.deductionValue;
        break;
    }

    totalDeduction += amount;
    deductionDetails.push({
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.deductionType,
      value: rule.deductionValue,
      amount,
      description: rule.description
    });
  });

  res.json(success({
    totalDeduction,
    details: deductionDetails
  }, '扣款计算完成'));
});

export default router;
