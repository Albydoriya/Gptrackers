import { supabase } from '../lib/supabase';
import { Quote, Customer, Part } from '../types';

export interface QuoteFilters {
  status?: string;
  searchTerm?: string;
  sortBy?: 'date' | 'amount' | 'customer';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface QuoteStatusCounts {
  all: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  converted_to_order: number;
  expired: number;
}

export interface PaginatedQuotes {
  quotes: Quote[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const quotesService = {
  async fetchQuotes(filters: QuoteFilters = {}): Promise<PaginatedQuotes> {
    const {
      status = 'all',
      searchTerm = '',
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      pageSize = 25
    } = filters;

    let query = supabase
      .from('quotes')
      .select(`
        *,
        quote_parts!quote_parts_quote_id_fkey(
          *,
          parts(*)
        )
      `, { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (searchTerm) {
      query = query.or(`quote_number.ilike.%${searchTerm}%`);
    }

    const sortColumn = sortBy === 'date' ? 'quote_date' :
                       sortBy === 'amount' ? 'grand_total_amount' :
                       'quote_date';

    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: quotesData, error: quotesError, count } = await query;

    if (quotesError) throw quotesError;

    if (!quotesData || quotesData.length === 0) {
      return {
        quotes: [],
        total: count || 0,
        page,
        pageSize,
        totalPages: 0
      };
    }

    const creatorIds = [...new Set(quotesData.map(q => q.created_by).filter(Boolean))];
    const { data: userProfilesData } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', creatorIds);

    const userProfilesMap = new Map(
      userProfilesData?.map(profile => [profile.id, profile]) || []
    );

    const customerIds = [...new Set(quotesData.map(quote => quote.customer_id).filter(Boolean))];

    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .in('id', customerIds);

    if (customersError) throw customersError;

    const customersMap = new Map();
    (customersData || []).forEach(customer => {
      customersMap.set(customer.id, customer);
    });

    if (searchTerm) {
      const matchingCustomerIds = Array.from(customersMap.values())
        .filter(customer =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map(c => c.id);

      if (matchingCustomerIds.length > 0) {
        const { data: customerQuotes } = await supabase
          .from('quotes')
          .select(`
            *,
            quote_parts!quote_parts_quote_id_fkey(
              *,
              parts(*)
            )
          `)
          .in('customer_id', matchingCustomerIds)
          .eq('status', status !== 'all' ? status : undefined);

        if (customerQuotes) {
          quotesData.push(...customerQuotes.filter(q =>
            !quotesData.some(existing => existing.id === q.id)
          ));
        }
      }
    }

    const transformedQuotes: Quote[] = quotesData.map(quoteData => {
      const customerData = customersMap.get(quoteData.customer_id);

      return {
        id: quoteData.id,
        quoteNumber: quoteData.quote_number,
        customer: customerData ? {
          id: customerData.id,
          name: customerData.name,
          contactPerson: customerData.contact_person,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address,
          createdAt: customerData.created_at,
          updatedAt: customerData.updated_at
        } : {
          id: '',
          name: 'Unknown Customer',
          contactPerson: 'Unknown',
          email: 'unknown@example.com',
          phone: 'N/A',
          address: 'N/A',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        status: quoteData.status,
        parts: (quoteData.quote_parts || []).map((quotePart: any) => ({
          id: quotePart.id,
          part: quotePart.parts ? {
            id: quotePart.parts.id,
            partNumber: quotePart.parts.part_number,
            name: quotePart.parts.name,
            description: quotePart.parts.description,
            category: quotePart.parts.category,
            specifications: quotePart.parts.specifications,
            priceHistory: [],
            currentStock: quotePart.parts.current_stock,
            minStock: quotePart.parts.min_stock,
            preferredSuppliers: quotePart.parts.preferred_suppliers
          } : undefined,
          customPartName: quotePart.custom_part_name,
          customPartDescription: quotePart.custom_part_description,
          quantity: quotePart.quantity,
          unitPrice: quotePart.unit_price,
          totalPrice: quotePart.total_price,
          isCustomPart: quotePart.is_custom_part
        })),
        totalBidItemsCost: quoteData.total_bid_items_cost,
        shippingCosts: {
          sea: quoteData.shipping_cost_sea,
          air: quoteData.shipping_cost_air,
          selected: quoteData.selected_shipping_method
        },
        agentFees: quoteData.agent_fees,
        localShippingFees: quoteData.local_shipping_fees,
        subtotalAmount: quoteData.subtotal_amount,
        gstAmount: quoteData.gst_amount,
        grandTotalAmount: quoteData.grand_total_amount,
        quoteDate: quoteData.quote_date,
        expiryDate: quoteData.expiry_date,
        notes: quoteData.notes,
        createdBy: userProfilesMap.get(quoteData.created_by)?.full_name ||
                   userProfilesMap.get(quoteData.created_by)?.email ||
                   'Unknown',
        convertedToOrderId: quoteData.converted_to_order_id,
        convertedToOrderNumber: quoteData.converted_to_order_number,
        seaFreightPriceListId: quoteData.sea_freight_price_list_id,
        priceListAppliedAt: quoteData.price_list_applied_at,
        manualPriceOverride: quoteData.manual_price_override,
        priceListSnapshot: quoteData.price_list_snapshot
      };
    });

    return {
      quotes: transformedQuotes,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  },

  async fetchStatusCounts(): Promise<QuoteStatusCounts> {
    const { data, error } = await supabase
      .from('quotes')
      .select('status');

    if (error) throw error;

    const counts: QuoteStatusCounts = {
      all: data?.length || 0,
      draft: 0,
      sent: 0,
      accepted: 0,
      rejected: 0,
      converted_to_order: 0,
      expired: 0
    };

    data?.forEach(quote => {
      if (quote.status === 'draft') counts.draft++;
      else if (quote.status === 'sent') counts.sent++;
      else if (quote.status === 'accepted') counts.accepted++;
      else if (quote.status === 'rejected') counts.rejected++;
      else if (quote.status === 'converted_to_order') counts.converted_to_order++;
      else if (quote.status === 'expired') counts.expired++;
    });

    return counts;
  },

  async getQuoteById(id: string): Promise<Quote | null> {
    const { data: quoteData, error } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_parts!quote_parts_quote_id_fkey(
          *,
          parts(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !quoteData) return null;

    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', quoteData.customer_id)
      .single();

    const { data: creatorProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('id', quoteData.created_by)
      .single();

    return {
      id: quoteData.id,
      quoteNumber: quoteData.quote_number,
      customer: customerData ? {
        id: customerData.id,
        name: customerData.name,
        contactPerson: customerData.contact_person,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        createdAt: customerData.created_at,
        updatedAt: customerData.updated_at
      } : {
        id: '',
        name: 'Unknown Customer',
        contactPerson: 'Unknown',
        email: 'unknown@example.com',
        phone: 'N/A',
        address: 'N/A',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      status: quoteData.status,
      parts: (quoteData.quote_parts || []).map((quotePart: any) => ({
        id: quotePart.id,
        part: quotePart.parts ? {
          id: quotePart.parts.id,
          partNumber: quotePart.parts.part_number,
          name: quotePart.parts.name,
          description: quotePart.parts.description,
          category: quotePart.parts.category,
          specifications: quotePart.parts.specifications,
          priceHistory: [],
          currentStock: quotePart.parts.current_stock,
          minStock: quotePart.parts.min_stock,
          preferredSuppliers: quotePart.parts.preferred_suppliers
        } : undefined,
        customPartName: quotePart.custom_part_name,
        customPartDescription: quotePart.custom_part_description,
        quantity: quotePart.quantity,
        unitPrice: quotePart.unit_price,
        totalPrice: quotePart.total_price,
        isCustomPart: quotePart.is_custom_part
      })),
      totalBidItemsCost: quoteData.total_bid_items_cost,
      shippingCosts: {
        sea: quoteData.shipping_cost_sea,
        air: quoteData.shipping_cost_air,
        selected: quoteData.selected_shipping_method
      },
      agentFees: quoteData.agent_fees,
      localShippingFees: quoteData.local_shipping_fees,
      subtotalAmount: quoteData.subtotal_amount,
      gstAmount: quoteData.gst_amount,
      grandTotalAmount: quoteData.grand_total_amount,
      quoteDate: quoteData.quote_date,
      expiryDate: quoteData.expiry_date,
      notes: quoteData.notes,
      createdBy: creatorProfile?.full_name || creatorProfile?.email || 'Unknown',
      convertedToOrderId: quoteData.converted_to_order_id,
      convertedToOrderNumber: quoteData.converted_to_order_number,
      seaFreightPriceListId: quoteData.sea_freight_price_list_id,
      priceListAppliedAt: quoteData.price_list_applied_at,
      manualPriceOverride: quoteData.manual_price_override,
      priceListSnapshot: quoteData.price_list_snapshot
    };
  }
};
