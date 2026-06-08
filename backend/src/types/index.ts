export type UserRole = 'demander' | 'supplier' | 'factory' | 'admin';

export type OrderType = 'processing' | 'material';

export type OrderStatus = 
  | 'pending_review'
  | 'reviewed'
  | 'scheduled'
  | 'material_picked'
  | 'processing'
  | 'initial_inspection'
  | 'reinspection'
  | 'packaging'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';
export type PaymentType = 'receivable' | 'payable' | 'prepaid_received' | 'prepaid_paid';

export type LogisticsStatus = 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'signed' | 'rejected' | 'damaged';

export type InvoiceStatus = 'pending' | 'issued' | 'verified' | 'archived';
export type InvoiceType = 'vat_special' | 'vat_normal' | 'electronic';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  companyId: string;
  email?: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  type: UserRole;
  contactPerson: string;
  contactPhone: string;
  address: string;
  creditLevel?: string;
  rating?: number;
  createdAt: string;
}

export interface ProcessingOrder {
  id: string;
  orderNo: string;
  type: 'processing';
  demanderId: string;
  factoryId: string;
  partName: string;
  partCode: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: OrderStatus;
  deliveryDate: string;
  drawingIds: string[];
  processStandard?: string;
  toleranceRequirement?: string;
  lossRateThreshold: number;
  defectRateThreshold: number;
  actualLossRate?: number;
  actualDefectRate?: number;
  deductionAmount?: number;
  materialOrderIds: string[];
  currentNode: string;
  nodeTimeline: OrderNodeTimeline[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialOrder {
  id: string;
  orderNo: string;
  type: 'material';
  demanderId: string;
  supplierId: string;
  processingOrderId?: string;
  materialName: string;
  materialCode: string;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  status: OrderStatus;
  deliveryDate: string;
  qualityStandard?: string;
  logisticsId?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export type Order = ProcessingOrder | MaterialOrder;

export interface OrderNodeTimeline {
  node: string;
  status: 'pending' | 'processing' | 'completed' | 'timeout';
  startedAt?: string;
  completedAt?: string;
  operatorId?: string;
  remark?: string;
}

export interface Payment {
  id: string;
  paymentNo: string;
  type: PaymentType;
  orderId: string;
  orderType: OrderType;
  payerId: string;
  payeeId: string;
  amount: number;
  paidAmount: number;
  status: PaymentStatus;
  dueDate: string;
  paymentTerm: string;
  invoiceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  invoiceCode?: string;
  type: InvoiceType;
  status: InvoiceStatus;
  payerId: string;
  payeeId: string;
  amount: number;
  taxAmount?: number;
  totalAmount: number;
  orderIds: string[];
  issuedDate?: string;
  verifiedDate?: string;
  archiveDate?: string;
  attachmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Logistics {
  id: string;
  trackingNo: string;
  orderId: string;
  orderType: OrderType;
  carrier: string;
  status: LogisticsStatus;
  senderId: string;
  receiverId: string;
  origin: string;
  destination: string;
  currentLocation?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  packageCount: number;
  weight?: number;
  volume?: number;
  trackingHistory: LogisticsTrackingItem[];
  damageReport?: DamageReport;
  createdAt: string;
  updatedAt: string;
}

export interface LogisticsTrackingItem {
  time: string;
  location: string;
  status: LogisticsStatus;
  description: string;
  operator?: string;
}

export interface DamageReport {
  id: string;
  logisticsId: string;
  reportedAt: string;
  reportedBy: string;
  damageDescription: string;
  damageQuantity: number;
  estimatedLoss: number;
  status: 'pending' | 'processing' | 'resolved' | 'rejected';
  claimAmount?: number;
  resolution?: string;
  attachments: string[];
}

export interface SupplierRating {
  id: string;
  supplierId: string;
  period: string;
  overallScore: number;
  deliveryScore: number;
  qualityScore: number;
  serviceScore: number;
  orderCount: number;
  onTimeDeliveryRate: number;
  passRate: number;
  complaintCount: number;
  level: 'A' | 'B' | 'C' | 'D';
  createdAt: string;
}

export interface PriceQuote {
  id: string;
  partCode: string;
  partName: string;
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  minOrderQuantity: number;
  deliveryDays: number;
  qualityGrade: string;
  defectRate: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  createdAt: string;
}

export interface Drawing {
  id: string;
  name: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  encryptedKey: string;
  storagePath: string;
  uploaderId: string;
  orderId?: string;
  accessFactoryIds: string[];
  isEncrypted: boolean;
  createdAt: string;
}

export interface OperationLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  targetId?: string;
  targetType?: string;
  detail: string;
  ip?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'order' | 'payment' | 'logistics' | 'system' | 'warning';
  title: string;
  content: string;
  relatedId?: string;
  relatedType?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  totalAmount: number;
  pendingPayment: number;
  overduePayment: number;
  activeLogistics: number;
  warningCount: number;
}
