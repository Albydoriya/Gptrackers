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
  // Weight and dimensions for freight calculation
  actualWeightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  dimFactor?: number;
  volumetricWeightKg?: number;
  chargeableWeightKg?: number;
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

export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  customer: Customer;
  status: QuoteStatus;
  parts: QuotePart[];
  totalBidItemsCost: number;
  shippingCosts: {
    sea: number;
    air: number;
    selected: 'sea' | 'air';
  };
  agentFees: number;
  localShippingFees: number;
  subtotalAmount: number;
  gstAmount: number;
  grandTotalAmount: number;
  quoteDate: string;
  expiryDate: string;
  notes?: string;
  createdBy: string;
  convertedToOrderId?: string;
  convertedToOrderNumber?: string;
  seaFreightPriceListId?: string;
  priceListAppliedAt?: string;
  manualPriceOverride?: boolean;
  priceListSnapshot?: SeaFreightPriceListItem;
}

export interface QuotePart {
  id: string;
  part?: Part; // For existing parts from catalog
  customPartName?: string; // For custom items
  customPartDescription?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isCustomPart: boolean;
}

export type QuoteStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'converted_to_order'
  | 'expired';

export interface SeaFreightPricingRecord {
  id: string;
  quoteId: string;
  partsCost: number;
  agentServiceFee: number;
  supplierPackingFee: number;
  bankingFee: number;
  totalSeaFreightCost: number;
  currency: string;
  recordedDate: string;
  createdBy: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeaFreightPricingAnalytics {
  totalRecords: number;
  averageTotalCost: number;
  averagePartsCost: number;
  averageAgentFee: number;
  averageSupplierPackingFee: number;
  averageBankingFee: number;
  latestTotalCost: number;
  minTotalCost: number;
  maxTotalCost: number;
  costTrendDirection: 'increasing' | 'decreasing' | 'stable';
}

export interface SeaFreightCostBreakdown {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

export interface SeaFreightPriceListItem {
  id: string;
  partId?: string;
  itemName: string;
  itemDescription: string;
  category: string;
  shippingType: string;
  supplierPartsCost: number;
  supplierPackingFee: number;
  supplierBankingFee: number;
  supplierOtherFees: number;
  totalSupplierCost: number;
  markupPercentage: number;
  customerPrice: number;
  currency: string;
  isActive: boolean;
  effectiveDate: string;
  expirationDate?: string;
  notes?: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeaFreightPriceHistory {
  id: string;
  priceListId: string;
  itemName: string;
  itemDescription?: string;
  category?: string;
  shippingType?: string;
  supplierPartsCost: number;
  supplierPackingFee: number;
  supplierBankingFee: number;
  supplierOtherFees: number;
  totalSupplierCost: number;
  markupPercentage: number;
  customerPrice: number;
  currency: string;
  changeReason?: string;
  changedAt: string;
}

export interface SeaFreightPriceListFilters {
  category?: string;
  shippingType?: string;
  searchTerm?: string;
  isActive?: boolean;
}

export interface AirFreightCarrier {
  id: string;
  carrierName: string;
  costRatePerKg: number;
  chargeRatePerKg: number;
  profitPerKg: number;
  profitMarginPercentage: number;
  currency: string;
  isActive: boolean;
  effectiveDate: string;
  expirationDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AirFreightCarrierHistory {
  id: string;
  carrierId: string;
  carrierName: string;
  costRatePerKg: number;
  chargeRatePerKg: number;
  profitPerKg: number;
  currency: string;
  changeReason?: string;
  changedAt: string;
}

export interface AgentFee {
  id: string;
  supplierId: string;
  agentName: string;
  feeAmount: number;
  feeType: 'percentage' | 'fixed';
  currency: string;
  isActive: boolean;
  effectiveDate: string;
  expirationDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier;
}

export interface AgentFeeHistory {
  id: string;
  agentFeeId: string;
  supplierId: string;
  agentName: string;
  feeAmount: number;
  feeType: string;
  currency: string;
  changeReason?: string;
  changedAt: string;
}

export interface PartCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithCount extends PartCategory {
  partCount?: number;
}