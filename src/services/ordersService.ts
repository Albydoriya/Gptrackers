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
    let matchingSupplierIds: string[] = [];
    let matchingPartIds: string[] = [];
    let matchingOrderIdsFromParts: string[] = [];
    let matchingUserIds: string[] = [];

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();

      const suppliersResult = await supabase
        .from('suppliers')
        .select('id')
        .or(`name.ilike.%${searchLower}%,contact_person.ilike.%${searchLower}%`);

      if (suppliersResult.data) {
        matchingSupplierIds = suppliersResult.data.map((s: any) => s.id);
      }

      const partsResult = await supabase
        .from('parts')
        .select('id')
        .or(`name.ilike.%${searchLower}%,part_number.ilike.%${searchLower}%,category.ilike.%${searchLower}%`);

      if (partsResult.data) {
        matchingPartIds = partsResult.data.map((p: any) => p.id);
      }

      if (matchingPartIds.length > 0) {
        const orderPartsResult = await supabase
          .from('order_parts')
          .select('order_id')
          .in('part_id', matchingPartIds);

        if (orderPartsResult.data) {
          matchingOrderIdsFromParts = orderPartsResult.data.map((op: any) => op.order_id);
        }
      }

      const userProfilesResult = await supabase
        .from('user_profiles')
        .select('id')
        .or(`full_name.ilike.%${searchLower}%,email.ilike.%${searchLower}%`);

      if (userProfilesResult.data) {
        matchingUserIds = userProfilesResult.data.map((u: any) => u.id);
      }
    }

    let query = supabase
      .from('orders')
      .select('id, supplier_id, created_by', { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      const orConditions: string[] = [];

      orConditions.push(`order_number.ilike.%${searchLower}%`);
      orConditions.push(`notes.ilike.%${searchLower}%`);

      if (matchingSupplierIds.length > 0) {
        orConditions.push(`supplier_id.in.(${matchingSupplierIds.join(',')})`);
      }

      if (matchingOrderIdsFromParts.length > 0) {
        orConditions.push(`id.in.(${matchingOrderIdsFromParts.join(',')})`);
      }

      if (matchingUserIds.length > 0) {
        orConditions.push(`created_by.in.(${matchingUserIds.join(',')})`);
      }

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
      }
    }

    switch (sortBy) {
      case 'date':
        query = query.order('order_date', { ascending: sortOrder === 'asc' });
        break;
      case 'amount':
        query = query.order('total_amount', { ascending: sortOrder === 'asc' });
        break;
      default:
        query = query.order('order_date', { ascending: sortOrder === 'asc' });
    }

    query = query.order('created_at', { ascending: false });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: orderIds, error: idsError, count } = await query;

    if (idsError) throw idsError;

    if (!orderIds || orderIds.length === 0) {
      return {
        orders: [],
        totalCount: count || 0,
        currentPage: page,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    }

    const ids = orderIds.map((o: any) => o.id);

    let fullQuery = supabase
      .from('orders')
      .select(`
        *,
        supplier:suppliers(*),
        order_parts(
          *,
          part:parts(*)
        )
      `)
      .in('id', ids);

    switch (sortBy) {
      case 'date':
        fullQuery = fullQuery.order('order_date', { ascending: sortOrder === 'asc' });
        break;
      case 'amount':
        fullQuery = fullQuery.order('total_amount', { ascending: sortOrder === 'asc' });
        break;
      default:
        fullQuery = fullQuery.order('order_date', { ascending: sortOrder === 'asc' });
    }

    fullQuery = fullQuery.order('created_at', { ascending: false });

    const { data: fullData, error: fullError } = await fullQuery;

    if (fullError) throw fullError;

    let orders = (fullData || []).map(transformOrderData);

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
