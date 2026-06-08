import request from '../utils/request';
import {
  User, ProcessingOrder, MaterialOrder, Payment, Invoice, Logistics,
  Notification, DashboardStats, PageResult, Company, SupplierRating,
  PriceQuote, QualityBatch, QualityInspection, ReworkOrder,
  RatingConfig, SupplierRatingDetail, RectificationNotice,
  MobileWorkOrder, WorkOrderException, WorkOrderStats, DeductionRule
} from '../types';

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

export const qualityApi = {
  getBatches: (params?: any) => {
    return request.get<any, PageResult<QualityBatch>>('/quality/batches', { params });
  },
  getBatch: (id: string) => {
    return request.get<any, QualityBatch>(`/quality/batches/${id}`);
  },
  createBatch: (data: any) => {
    return request.post('/quality/batches', data);
  },
  getTrace: (traceCode: string) => {
    return request.get<any, any>(`/quality/trace/${traceCode}`);
  },
  getInspections: (params?: any) => {
    return request.get<any, PageResult<QualityInspection>>('/quality/inspections', { params });
  },
  getInspection: (id: string) => {
    return request.get<any, QualityInspection>(`/quality/inspections/${id}`);
  },
  createInspection: (data: any) => {
    return request.post('/quality/inspections', data);
  },
  initiateRework: (id: string, data: any) => {
    return request.post(`/quality/inspections/${id}/initiate-rework`, data);
  },
  initiateReturn: (id: string, data: any) => {
    return request.post(`/quality/inspections/${id}/initiate-return`, data);
  },
  getReworkOrders: (params?: any) => {
    return request.get<any, PageResult<ReworkOrder>>('/quality/rework-orders', { params });
  },
  startRework: (id: string) => {
    return request.post(`/quality/rework-orders/${id}/start`);
  },
  completeRework: (id: string) => {
    return request.post(`/quality/rework-orders/${id}/complete`);
  },
  batchPrint: (batchIds: string[]) => {
    return request.post('/quality/batches/batch-print', { batchIds });
  }
};

export const ratingApi = {
  getConfigs: () => {
    return request.get<any, RatingConfig[]>('/rating/configs');
  },
  updateConfig: (id: string, data: any) => {
    return request.put(`/rating/configs/${id}`, data);
  },
  getRatings: (params?: any) => {
    return request.get<any, PageResult<SupplierRatingDetail>>('/rating/ratings', { params });
  },
  getRating: (id: string) => {
    return request.get<any, SupplierRatingDetail>(`/rating/ratings/${id}`);
  },
  getSupplierRatings: (supplierId: string) => {
    return request.get<any, SupplierRatingDetail[]>(`/rating/suppliers/${supplierId}/ratings`);
  },
  calculateRatings: (period?: string) => {
    return request.post('/rating/ratings/calculate', { period });
  },
  getRectifications: (params?: any) => {
    return request.get<any, PageResult<RectificationNotice>>('/rating/rectifications', { params });
  },
  getRectification: (id: string) => {
    return request.get<any, RectificationNotice>(`/rating/rectifications/${id}`);
  },
  submitRectification: (id: string, responseContent: string) => {
    return request.post(`/rating/rectifications/${id}/submit`, { responseContent });
  },
  verifyRectification: (id: string, pass: boolean, remark?: string) => {
    return request.post(`/rating/rectifications/${id}/verify`, { pass, remark });
  }
};

export const workorderApi = {
  getWorkOrders: (params?: any) => {
    return request.get<any, PageResult<MobileWorkOrder>>('/workorder/work-orders', { params });
  },
  getWorkOrder: (id: string) => {
    return request.get<any, MobileWorkOrder>(`/workorder/work-orders/${id}`);
  },
  createWorkOrder: (data: any) => {
    return request.post('/workorder/work-orders', data);
  },
  startWorkOrder: (id: string) => {
    return request.post(`/workorder/work-orders/${id}/start`);
  },
  completeWorkOrder: (id: string, data: any) => {
    return request.post(`/workorder/work-orders/${id}/complete`, data);
  },
  reportException: (id: string, data: any) => {
    return request.post(`/workorder/work-orders/${id}/report-exception`, data);
  },
  getExceptions: (params?: any) => {
    return request.get<any, PageResult<WorkOrderException>>('/workorder/exceptions', { params });
  },
  getException: (id: string) => {
    return request.get<any, WorkOrderException>(`/workorder/exceptions/${id}`);
  },
  handleException: (id: string, data: any) => {
    return request.post(`/workorder/exceptions/${id}/handle`, data);
  },
  resolveException: (id: string, resolution: string) => {
    return request.post(`/workorder/exceptions/${id}/resolve`, { resolution });
  },
  getStats: () => {
    return request.get<any, WorkOrderStats>('/workorder/stats/dashboard');
  }
};

export const deductionApi = {
  getRules: (params?: any) => {
    return request.get<any, PageResult<DeductionRule>>('/deductions', { params });
  },
  getRule: (id: string) => {
    return request.get<any, DeductionRule>(`/deductions/${id}`);
  },
  createRule: (data: any) => {
    return request.post('/deductions', data);
  },
  updateRule: (id: string, data: any) => {
    return request.put(`/deductions/${id}`, data);
  },
  calculate: (data: any) => {
    return request.post('/deductions/calculate', data);
  }
};
