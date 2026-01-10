import { supabase } from '../lib/supabase';
import { Order, OrderStatus } from '../types';
import { mapSupabaseStatusToFrontendStatus } from '../data/mockData';

export interface OrdersQueryParams {
  status?: string;
  searchTerm?: string;
  sortBy?: 'date' | 'amount' | 'supplier';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface OrdersQueryResult {
  orders: Order[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface StatusCounts {
  all: number;
  draft: number;
  supplier_quoting: number;
  pending_customer_approval: number;
  approved: number;
  ordered: number;
  in_transit: number;
  delivered: number;
  cancelled: number;
}

const transformOrderData = (orderData: any): Order => {
  return {
    id: orderData.id,
    orderNumber: orderData.order_number,
    supplier: {
      id: orderData.supplier.id,
      name: orderData.supplier.name,
      contactPerson: orderData.supplier.contact_person,
      email: orderData.supplier.email,
      phone: orderData.supplier.phone,
      address: orderData.supplier.address,
      rating: orderData.supplier.rating,
      deliveryTime: orderData.supplier.delivery_time,
      paymentTerms: orderData.supplier.payment_terms,
      isActive: orderData.supplier.is_active,
      logo: orderData.supplier.logo
    },
    parts: orderData.order_parts.map((orderPart: any) => ({
      id: orderPart.id,
      part: {
        id: orderPart.part.id,
        partNumber: orderPart.part.part_number,
        name: orderPart.part.name,
        description: orderPart.part.description,
        category: orderPart.part.category,
        specifications: orderPart.part.specifications,
        priceHistory: [],
        currentStock: orderPart.part.current_stock,
        minStock: orderPart.part.min_stock,
        preferredSuppliers: orderPart.part.preferred_suppliers
      },
      quantity: orderPart.quantity,
      unitPrice: orderPart.unit_price,
      totalPrice: orderPart.total_price
    })),
    status: mapSupabaseStatusToFrontendStatus(orderData.status),
    totalAmount: orderData.total_amount,
    orderDate: orderData.order_date,
    expectedDelivery: orderData.expected_delivery,
    actualDelivery: orderData.actual_delivery,
    notes: orderData.notes,
    createdBy: orderData.created_by || 'Unknown',
    priority: orderData.priority,
    shippingData: orderData.shipping_data,
    attachments: orderData.attachments
  };
};

export const fetchOrders = async (params: OrdersQueryParams = {}): Promise<OrdersQueryResult> => {
  const {
    status = 'all',
    searchTerm = '',
    sortBy = 'date',
    sortOrder = 'desc',
    page = 1,
    pageSize = 25
  } = params;

  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        supplier:suppliers(*),
        order_parts(
          *,
          part:parts(*)
        )
      `, { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();

      query = query.or(
        `order_number.ilike.%${searchLower}%,` +
        `notes.ilike.%${searchLower}%`
      );
    }

    switch (sortBy) {
      case 'date':
        query = query.order('order_date', { ascending: sortOrder === 'asc' });
        break;
      case 'amount':
        query = query.order('total_amount', { ascending: sortOrder === 'asc' });
        break;
      case 'supplier':
        break;
      default:
        query = query.order('order_date', { ascending: sortOrder === 'asc' });
    }

    query = query.order('created_at', { ascending: false });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    let orders = (data || []).map(transformOrderData);

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      orders = orders.filter(order => {
        const supplierMatch = order.supplier.name.toLowerCase().includes(searchLower) ||
                             order.supplier.contactPerson.toLowerCase().includes(searchLower);

        const partsMatch = order.parts.some(orderPart =>
          orderPart.part.name.toLowerCase().includes(searchLower) ||
          orderPart.part.partNumber.toLowerCase().includes(searchLower) ||
          orderPart.part.category.toLowerCase().includes(searchLower)
        );

        const createdByMatch = order.createdBy && order.createdBy.toLowerCase().includes(searchLower);

        return supplierMatch || partsMatch || createdByMatch;
      });
    }

    if (sortBy === 'supplier') {
      orders.sort((a, b) => {
        const comparison = a.supplier.name.localeCompare(b.supplier.name);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      orders,
      totalCount,
      currentPage: page,
      totalPages
    };
  } catch (err: any) {
    console.error('Error fetching orders:', err);
    throw new Error(err.message || 'Failed to fetch orders');
  }
};

export const fetchStatusCounts = async (): Promise<StatusCounts> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('status');

    if (error) throw error;

    const counts: StatusCounts = {
      all: 0,
      draft: 0,
      supplier_quoting: 0,
      pending_customer_approval: 0,
      approved: 0,
      ordered: 0,
      in_transit: 0,
      delivered: 0,
      cancelled: 0
    };

    if (data) {
      counts.all = data.length;

      data.forEach((order: any) => {
        const status = mapSupabaseStatusToFrontendStatus(order.status);
        if (status in counts) {
          counts[status as keyof StatusCounts]++;
        }
      });
    }

    return counts;
  } catch (err: any) {
    console.error('Error fetching status counts:', err);
    throw new Error(err.message || 'Failed to fetch status counts');
  }
};

export const getOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        supplier:suppliers(*),
        order_parts(
          *,
          part:parts(*)
        )
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return transformOrderData(data);
  } catch (err: any) {
    console.error('Error fetching order:', err);
    throw new Error(err.message || 'Failed to fetch order');
  }
};
