import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { store, addOperationLog } from '../data/store';
import { generateToken, AuthRequest, authMiddleware } from '../middleware/auth';
import { success, error } from '../utils/response';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = store.users.find(u => u.username === username);
  
  if (!user) {
    return res.status(401).json(error(401, '用户名或密码错误'));
  }

  const isValid = bcrypt.compareSync(password, user.password);
  
  if (!isValid) {
    return res.status(401).json(error(401, '用户名或密码错误'));
  }

  const token = generateToken(user.id);
  const company = store.companies.find(c => c.id === user.companyId);

  addOperationLog({
    userId: user.id,
    userName: user.name,
    action: '登录',
    module: '系统',
    detail: `${user.name} 登录系统`,
    ip: req.ip
  });

  res.json(success({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: company?.name,
      email: user.email,
      phone: user.phone
    }
  }, '登录成功'));
});

router.get('/profile', authMiddleware, (req: AuthRequest, res) => {
  const user = store.users.find(u => u.id === req.user?.id);
  
  if (!user) {
    return res.status(404).json(error(404, '用户不存在'));
  }

  const company = store.companies.find(c => c.id === user.companyId);

  res.json(success({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    companyName: company?.name,
    companyType: company?.type,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar
  }));
});

router.post('/logout', authMiddleware, (req: AuthRequest, res) => {
  addOperationLog({
    userId: req.user!.id,
    userName: req.user!.name,
    action: '退出登录',
    module: '系统',
    detail: `${req.user!.name} 退出系统`,
    ip: req.ip
  });

  res.json(success(null, '退出成功'));
});

export default router;
