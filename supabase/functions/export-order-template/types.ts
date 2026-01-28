export interface ExportRequest {
  orderId?: string;
  orderIds?: string[];
  templateType?: string;
  options?: {
    includeImages?: boolean;
    includeTerms?: boolean;
  };
}

export interface OrderExportData {
  order: {
    id: string;
    order_number: string;
    order_date: string;
    expected_delivery: string | null;
    notes: string | null;
    priority: string;
    status: string;
  };
  supplier: {
    id: string;
    name: string;
    contact_person: string;
    email: string;
    phone: string;
    address: string;
    payment_terms: string;
    logo_url: string | null;
    export_template_type: string | null;
    template_config: Record<string, any> | null;
  };
  parts: Array<{
    id: string;
    part_number: string;
    name: string;
    description: string;
    specifications: Record<string, any>;
    quantity: number;
    unit_price: number;
  }>;
}

export interface MultiOrderExportData {
  supplier: {
    id: string;
    name: string;
    contact_person: string;
    email: string;
    phone: string;
    address: string;
    payment_terms: string;
    logo_url: string | null;
    export_template_type: string | null;
    template_config: Record<string, any> | null;
  };
  orders: Array<{
    order: {
      id: string;
      order_number: string;
      order_date: string;
      expected_delivery: string | null;
      notes: string | null;
      priority: string;
      status: string;
    };
    parts: Array<{
      id: string;
      part_number: string;
      name: string;
      description: string;
      specifications: Record<string, any>;
      quantity: number;
      unit_price: number;
    }>;
  }>;
}

export const MAX_ORDERS_PER_EXPORT = 10;

export interface ExportResponse {
  success: boolean;
  fileName?: string;
  error?: string;
}