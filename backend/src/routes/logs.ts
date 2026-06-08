import { Router } from 'express';
import { store } from '../data/store';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth';
import { success, paginate } from '../utils/response';

const router = Router();

router.use(authMiddleware);

router.get('/', roleMiddleware('admin', 'demander'), (req: AuthRequest, res) => {
  const { page = 1, pageSize = 20, module, action, keyword, userId } = req.query;
  
  let logs = [...store.operationLogs];
  
  if (module) {
    logs = logs.filter(l => l.module === module);
  }
  
  if (action) {
    logs = logs.filter(l => l.action === action);
  }
  
  if (userId) {
    logs = logs.filter(l => l.userId === userId);
  }
  
  if (keyword) {
    const kw = String(keyword).toLowerCase();
    logs = logs.filter(l => 
      l.detail.toLowerCase().includes(kw) ||
      l.userName.toLowerCase().includes(kw)
    );
  }
  
  logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const result = paginate(logs, Number(page), Number(pageSize));

  res.json(success(result));
});

router.get('/modules', (_req, res) => {
  const modules = [...new Set(store.operationLogs.map(l => l.module))];
  res.json(success(modules));
});

export default router;
