import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { store } from '../data/store';
import { UserRole } from '../types';

const JWT_SECRET = 'supply_chain_platform_secret_key_2024';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    name: string;
    role: UserRole;
    companyId: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未提供认证令牌' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = store.users.find(u => u.id === decoded.id);
    
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户不存在' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      companyId: user.companyId
    };

    next();
  } catch (error) {
    return res.status(401).json({ code: 401, message: '认证令牌无效' });
  }
};

export const roleMiddleware = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ code: 401, message: '未登录' });
    }

    if (!roles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '权限不足' });
    }

    next();
  };
};

export const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
};
