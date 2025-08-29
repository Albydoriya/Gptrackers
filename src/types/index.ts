export interface Order {
  id: string;
  orderNumber: string;
  parts: OrderPart[];
  supplier: Supplier;
  status: OrderStatus;
  priority?: 'low' | 'medium' | 'high';
  totalAmount: number;
  orderDate: string;
  expectedDelivery: string;
  actualDelivery?: string;
  notes?: string;
  createdBy: string;
  shippingData?: Record<string, any>;
  attachments?: any[];
}

export interface OrderPart {
  id: string;
  part: Part;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Part {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  category: string;
  specifications: Record<string, string>;
  priceHistory: PriceHistory[];
  currentStock: number;
  minStock: number;
  preferredSuppliers: string[];
  // New markup percentages
  internalUsageMarkupPercentage?: number;
  wholesaleMarkupPercentage?: number;
  tradeMarkupPercentage?: number;
  retailMarkupPercentage?: number;
  // Calculated prices
  internalUsagePrice?: number;
  wholesalePrice?: number;
  tradePrice?: number;
  retailPrice?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
  deliveryTime: number; // days
  paymentTerms: string;
  isActive: boolean;
}

export interface PriceHistory {
  date: string;
  price: number;
  supplier: string;
  quantity: number;
}

export type OrderStatus = 
  | 'draft'
  | 'supplier_quoting'
  | 'pending_customer_approval'
  | 'approved'
  | 'ordered'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export interface Notification {
  id: string;
  type: 'order_status' | 'low_stock' | 'price_change' | 'delivery' | 'approval' | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  relatedId?: string | null;
  actionUrl?: string | null;
}

interface StatusUpdate {
  id: string;
  orderId: string;
  status: OrderStatus;
  timestamp: string;
  notes?: string;
  updatedBy: string;
}