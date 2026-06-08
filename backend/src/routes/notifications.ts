import { Router } from 'express';
import { store } from '../data/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { success, paginate } from '../utils/response';

const router = Router();

router.use(authMiddleware);

router.get('/', (req: AuthRequest, res) => {
  const { page = 1, pageSize = 10, isRead, type } = req.query;
  
  let notifications = store.notifications.filter(n => n.userId === req.user?.id);
  
  if (isRead !== undefined) {
    notifications = notifications.filter(n => n.isRead === (isRead === 'true'));
  }
  
  if (type) {
    notifications = notifications.filter(n => n.type === type);
  }
  
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const result = paginate(notifications, Number(page), Number(pageSize));
  
  const unreadCount = store.notifications.filter(n => n.userId === req.user?.id && !n.isRead).length;

  res.json(success({ ...result, unreadCount }));
});

router.get('/unread-count', (req: AuthRequest, res) => {
  const count = store.notifications.filter(n => n.userId === req.user?.id && !n.isRead).length;
  
  const typeCounts = {
    order: store.notifications.filter(n => n.userId === req.user?.id && !n.isRead && n.type === 'order').length,
    payment: store.notifications.filter(n => n.userId === req.user?.id && !n.isRead && n.type === 'payment').length,
    logistics: store.notifications.filter(n => n.userId === req.user?.id && !n.isRead && n.type === 'logistics').length,
    warning: store.notifications.filter(n => n.userId === req.user?.id && !n.isRead && n.type === 'warning').length,
    system: store.notifications.filter(n => n.userId === req.user?.id && !n.isRead && n.type === 'system').length
  };

  res.json(success({ total: count, byType: typeCounts }));
});

router.post('/:id/read', (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const notificationIndex = store.notifications.findIndex(n => n.id === id && n.userId === req.user?.id);
  
  if (notificationIndex === -1) {
    return res.status(404).json({ code: 404, message: '通知不存在' });
  }

  store.notifications[notificationIndex] = {
    ...store.notifications[notificationIndex],
    isRead: true
  };

  res.json(success(null, '标记已读成功'));
});

router.post('/read-all', (req: AuthRequest, res) => {
  store.notifications.forEach((n, index) => {
    if (n.userId === req.user?.id) {
      store.notifications[index] = { ...n, isRead: true };
    }
  });

  res.json(success(null, '全部标记已读成功'));
});

export default router;
