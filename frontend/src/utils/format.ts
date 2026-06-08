import dayjs from 'dayjs';
import { OrderStatus, PaymentStatus, LogisticsStatus, InvoiceStatus } from '../types';

export const formatMoney = (value: number): string => {
  if (value === undefined || value === null) return '-';
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (value: string | Date, format: string = 'YYYY-MM-DD'): string => {
  if (!value) return '-';
  return dayjs(value).format(format);
};

export const formatDateTime = (value: string | Date): string => {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const orderStatusMap: Record<OrderStatus, { text: string; color: string }> = {
  pending_review: { text: '待审核', color: 'orange' },
  reviewed: { text: '已接单', color: 'blue' },
  scheduled: { text: '排产中', color: 'cyan' },
  material_picked: { text: '已领料', color: 'geekblue' },
  processing: { text: '加工中', color: 'purple' },
  initial_inspection: { text: '初检', color: 'magenta' },
  reinspection: { text: '复检', color: 'volcano' },
  packaging: { text: '包装中', color: 'gold' },
  shipped: { text: '已发货', color: 'lime' },
  delivered: { text: '已送达', color: 'green' },
  completed: { text: '已完成', color: 'green' },
  rejected: { text: '已拒绝', color: 'red' },
  cancelled: { text: '已取消', color: 'default' }
};

export const paymentStatusMap: Record<PaymentStatus, { text: string; color: string }> = {
  unpaid: { text: '未付款', color: 'red' },
  partial: { text: '部分付款', color: 'orange' },
  paid: { text: '已付款', color: 'green' },
  overdue: { text: '已逾期', color: 'red' }
};

export const paymentTypeMap: Record<string, { text: string; color: string }> = {
  receivable: { text: '应收账款', color: 'blue' },
  payable: { text: '应付账款', color: 'orange' },
  prepaid_received: { text: '预收账款', color: 'purple' },
  prepaid_paid: { text: '预付账款', color: 'cyan' }
};

export const logisticsStatusMap: Record<LogisticsStatus, { text: string; color: string }> = {
  pending: { text: '待发货', color: 'default' },
  picked_up: { text: '已揽收', color: 'blue' },
  in_transit: { text: '运输中', color: 'cyan' },
  delivered: { text: '已到达', color: 'gold' },
  signed: { text: '已签收', color: 'green' },
  rejected: { text: '已拒收', color: 'red' },
  damaged: { text: '已破损', color: 'red' }
};

export const invoiceStatusMap: Record<InvoiceStatus, { text: string; color: string }> = {
  pending: { text: '待开具', color: 'default' },
  issued: { text: '已开具', color: 'blue' },
  verified: { text: '已验真', color: 'green' },
  archived: { text: '已归档', color: 'gray' }
};

export const invoiceTypeMap: Record<string, string> = {
  vat_special: '增值税专用发票',
  vat_normal: '增值税普通发票',
  electronic: '电子发票'
};

export const roleMap: Record<string, string> = {
  demander: '需求方',
  supplier: '供应商',
  factory: '加工厂',
  admin: '管理员'
};

export const nodeNameMap: Record<string, string> = {
  pending_review: '待审核',
  reviewed: '已接单',
  scheduled: '排产中',
  material_picked: '已领料',
  processing: '加工中',
  initial_inspection: '初检',
  reinspection: '复检',
  packaging: '包装中',
  shipped: '已发货',
  delivered: '已送达',
  completed: '已完成'
};
