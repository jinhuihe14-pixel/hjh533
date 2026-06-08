import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth';
import orderRoutes from './routes/orders';
import paymentRoutes from './routes/payments';
import invoiceRoutes from './routes/invoices';
import logisticsRoutes from './routes/logistics';
import supplierRoutes from './routes/suppliers';
import notificationRoutes from './routes/notifications';
import logRoutes from './routes/logs';
import dashboardRoutes from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({
    code: 200,
    message: '供应链协同平台API服务运行正常',
    data: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((_req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null
  });
});

app.listen(PORT, () => {
  console.log(`
===========================================
  供应链协同平台后端服务已启动
  端口: ${PORT}
  环境: 开发环境
  访问地址: http://localhost:${PORT}
===========================================
  `);
});

export default app;
