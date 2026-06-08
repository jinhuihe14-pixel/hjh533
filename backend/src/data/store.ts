import {
  users, companies, processingOrders, materialOrders, payments,
  invoices, logisticsList, supplierRatings, priceQuotes, drawings,
  notifications, operationLogs, orderNodes
} from './mockData';
import {
  User, Company, ProcessingOrder, MaterialOrder, Payment, Invoice,
  Logistics, SupplierRating, PriceQuote, Drawing, Notification, OperationLog
} from '../types';

export const store = {
  users: [...users] as User[],
  companies: [...companies] as Company[],
  processingOrders: [...processingOrders] as ProcessingOrder[],
  materialOrders: [...materialOrders] as MaterialOrder[],
  payments: [...payments] as Payment[],
  invoices: [...invoices] as Invoice[],
  logistics: [...logisticsList] as Logistics[],
  supplierRatings: [...supplierRatings] as SupplierRating[],
  priceQuotes: [...priceQuotes] as PriceQuote[],
  drawings: [...drawings] as Drawing[],
  notifications: [...notifications] as Notification[],
  operationLogs: [...operationLogs] as OperationLog[],
  orderNodes: [...orderNodes]
};

export const addOperationLog = (log: Omit<OperationLog, 'id' | 'createdAt'>) => {
  const newLog: OperationLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString()
  };
  store.operationLogs.unshift(newLog);
  return newLog;
};

export const addNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
  const newNotification: Notification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  store.notifications.unshift(newNotification);
  return newNotification;
};
