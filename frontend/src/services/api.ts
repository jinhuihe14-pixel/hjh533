import request from '../utils/request';
import { User, ProcessingOrder, MaterialOrder, Payment, Invoice, Logistics, Notification, DashboardStats, PageResult, Company, SupplierRating, PriceQuote } from '../types';

export const authApi = {
  login: (username: string, password: string) => {
    return request.post<any, { token: string; user: User }>('/auth/login', { username, password });
  },
  getProfile: () => {
    return request.get<any, User>('/auth/profile');
  },
  logout: () => {
    return request.post('/auth/logout');
  }
};

export const orderApi = {
  getProcessingOrders: (params?: any) => {
    return request.get<any, PageResult<ProcessingOrder>>('/orders/processing', { params });
  },
  getProcessingOrder: (id: string) => {
    return request.get<any, ProcessingOrder>(`/orders/processing/${id}`);
  },
  createProcessingOrder: (data: any) => {
    return request.post('/orders/processing', data);
  },
  advanceOrder: (id: string, data?: any) => {
    return request.post(`/orders/processing/${id}/advance`, data);
  },
  getMaterialOrders: (params?: any) => {
    return request.get<any, PageResult<MaterialOrder>>('/orders/material', { params });
  },
  getMaterialOrder: (id: string) => {
    return request.get<any, MaterialOrder>(`/orders/material/${id}`);
  },
  getOrderNodes: () => {
    return request.get<any, any[]>('/orders/nodes');
  },
  getWarningOrders: () => {
    return request.get<any, ProcessingOrder[]>('/orders/warnings');
  }
};

export const paymentApi = {
  getPayments: (params?: any) => {
    return request.get<any, PageResult<Payment>>('/payments', { params });
  },
  getPayment: (id: string) => {
    return request.get<any, Payment>(`/payments/${id}`);
  },
  pay: (id: string, amount: number) => {
    return request.post(`/payments/${id}/pay`, { amount });
  },
  getSummary: () => {
    return request.get<any, any>('/payments/stats/summary');
  },
  getLedger: (period?: string) => {
    return request.get<any, any[]>('/payments/ledger', { params: { period } });
  }
};

export const invoiceApi = {
  getInvoices: (params?: any) => {
    return request.get<any, PageResult<Invoice>>('/invoices', { params });
  },
  getInvoice: (id: string) => {
    return request.get<any, Invoice>(`/invoices/${id}`);
  },
  createInvoice: (data: any) => {
    return request.post('/invoices', data);
  },
  verifyInvoice: (id: string) => {
    return request.post(`/invoices/${id}/verify`);
  },
  archiveInvoice: (id: string) => {
    return request.post(`/invoices/${id}/archive`);
  }
};

export const logisticsApi = {
  getLogisticsList: (params?: any) => {
    return request.get<any, PageResult<Logistics>>('/logistics', { params });
  },
  getLogistics: (id: string) => {
    return request.get<any, Logistics>(`/logistics/${id}`);
  },
  updateTrack: (id: string, data: any) => {
    return request.post(`/logistics/${id}/track`, data);
  },
  submitDamageReport: (id: string, data: any) => {
    return request.post(`/logistics/${id}/damage-report`, data);
  },
  resolveDamage: (id: string, data: any) => {
    return request.post(`/logistics/${id}/damage-report/resolve`, data);
  }
};

export const supplierApi = {
  getSuppliers: (params?: any) => {
    return request.get<any, PageResult<Company>>('/suppliers', { params });
  },
  getSupplier: (id: string) => {
    return request.get<any, Company>(`/suppliers/${id}`);
  },
  getRatings: (id: string) => {
    return request.get<any, SupplierRating[]>(`/suppliers/${id}/ratings`);
  },
  getQuoteCompare: (params?: any) => {
    return request.get<any, any[]>('/suppliers/quotes/compare', { params });
  },
  getQuotes: (params?: any) => {
    return request.get<any, PageResult<PriceQuote>>('/suppliers/quotes', { params });
  },
  createQuote: (data: any) => {
    return request.post('/suppliers/quotes', data);
  }
};

export const notificationApi = {
  getNotifications: (params?: any) => {
    return request.get<any, any>('/notifications', { params });
  },
  getUnreadCount: () => {
    return request.get<any, { total: number; byType: Record<string, number> }>('/notifications/unread-count');
  },
  markRead: (id: string) => {
    return request.post(`/notifications/${id}/read`);
  },
  markAllRead: () => {
    return request.post('/notifications/read-all');
  }
};

export const logApi = {
  getLogs: (params?: any) => {
    return request.get<any, PageResult<any>>('/logs', { params });
  },
  getModules: () => {
    return request.get<any, string[]>('/logs/modules');
  }
};

export const dashboardApi = {
  getStats: () => {
    return request.get<any, DashboardStats>('/dashboard/stats');
  },
  getOrderTrend: () => {
    return request.get<any, any[]>('/dashboard/order-trend');
  },
  getPaymentTrend: () => {
    return request.get<any, any[]>('/dashboard/payment-trend');
  },
  getSupplierRanking: () => {
    return request.get<any, any[]>('/dashboard/supplier-ranking');
  },
  getRecentOrders: () => {
    return request.get<any, any[]>('/dashboard/recent-orders');
  }
};
