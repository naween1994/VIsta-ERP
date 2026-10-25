export type UserRole = 'admin' | 'inventory_manager' | 'sales_rep' | 'accountant';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  password?: string;
  avatar?: string;
}

export type SpiceCategory = 
  | 'Whole Spices' 
  | 'Ground Spices' 
  | 'Curry Powders' 
  | 'Herbs & Seeds' 
  | 'Specialty Blends' 
  | 'Extracts & Oils'
  | 'Other';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: SpiceCategory;
  origin: string; // e.g. Sri Lanka (Ceylon), India, Madagascar, etc.
  grade?: string; // e.g. Alba, C5 Extra, Special, Grade 1
  packageSize: string; // e.g. 50g, 100g, 250g, 500g, 1kg, 25kg sack
  stockOnHand: number;
  initialStock: number;
  reorderThreshold: number;
  batchNumber: string;
  lotValuation?: number;
  costPrice: number; // in LKR (Rs.)
  mrp: number; // Maximum Retail Price in Rs.
  wholesalePrice: number;
  distributorPrice: number;
  distributorMarkupPercent: number; // Markup % over cost
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  previousStock: number;
  adjustmentQty: number; // positive or negative
  newStock: number;
  reason: string; // 'Restock', 'Damaged', 'Expired', 'Cycle Count', 'Order deduction', 'Sample', 'Other'
  note?: string;
  createdBy: string;
  createdAt: string;
}

export type PricingTier = 'Distributor' | 'Wholesale' | 'Retail' | 'Special';
export type PaymentTerms = 'Immediate / COD' | 'Net 7' | 'Net 15' | 'Net 30' | 'Net 60';

export interface Customer {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pricingTier: PricingTier;
  paymentTerms: PaymentTerms;
  creditLimit: number;
  currentBalance: number;
  referenceNumber?: string;
  notes?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  packageSize: string;
  unitPrice: number;
  quantity: number;
  costPrice: number;
  lineTotal: number;
}

export type OrderPaymentStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit' | 'Online';

export interface CalculationBreakdown {
  itemsSubtotal: number;
  volumeTierName: string;
  volumeDiscountPercent: number;
  volumeDiscountAmount: number;
  manualDiscountPercent: number;
  manualDiscountAmount: number;
  taxAmount: number;
  netTotal: number;
  steps: string[];
}

export interface Order {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerBusiness: string;
  orderDate: string;
  dueDate: string;
  pricingTier: PricingTier;
  // Delivery Route Fields
  deliveryDate?: string; // Target future delivery date (YYYY-MM-DD)
  deliveryStatus?: 'Pending' | 'Scheduled' | 'Out for Delivery' | 'Delivered' | 'Failed';
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryCoordinates?: {
    latitude: number;
    longitude: number;
  };
  deliveryStopNumber?: number;
  driverNotes?: string;
  items: OrderItem[];
  subtotal: number;
  volumeDiscountPercent: number;
  volumeDiscountAmount: number;
  netTotal: number;
  paidAmount: number;
  paymentStatus: OrderPaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  calculationBreakdown?: CalculationBreakdown;
  createdBy: string;
  createdAt: string;
}

export interface DeliveryStop {
  stopNumber: number;
  orderId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerBusiness: string;
  phone: string;
  address: string;
  city: string;
  coordinates: { latitude: number; longitude: number };
  itemsCount: number;
  itemsSummary: string;
  totalWeightKg: number;
  invoiceAmount: number;
  paymentStatus: OrderPaymentStatus;
  deliveryStatus: 'Pending' | 'Scheduled' | 'Out for Delivery' | 'Delivered' | 'Failed';
  notes?: string;
  deliveredAt?: string;
}

export interface DeliveryRoute {
  id: string;
  routeDate: string; // YYYY-MM-DD
  routeName: string;
  driverName: string;
  vehicleNumber: string;
  warehouseOrigin: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  stops: DeliveryStop[];
  totalDistanceKm: number;
  estimatedDurationMins: number;
  totalInvoices: number;
  totalRevenue: number;
  status: 'Draft' | 'Planned' | 'In Progress' | 'Completed';
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'low_stock' | 'payment' | 'sync' | 'info';
  timestamp: string;
  read: boolean;
  linkTab?: string;
  actionId?: string;
}

export interface AccountingSyncLog {
  id: string;
  timestamp: string;
  target: 'QuickBooks' | 'Xero';
  recordsSynced: number;
  status: 'Success' | 'Failed' | 'Simulated';
  details: string;
  user: string;
}

export interface AppSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  currency: string;
  volumeDiscounts: { minTotal: number; discountPercent: number }[];
  mongoDbConnected: boolean;
  mongoDbUri?: string;
  enableSoundEffects: boolean;
  warehouseLocation?: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
}
