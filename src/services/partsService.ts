import { supabase } from '../lib/supabase';
import { Part, CategoryWithCount } from '../types';
import { getCategoriesWithCount } from './categoriesService';

export interface SearchPartsOptions {
  searchTerm?: string;
  category?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'part_number' | 'current_stock' | 'price';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchPartsResult {
  parts: Part[];
  totalCount: number;
  hasMore: boolean;
  queryTime?: number;
}

export const partsService = {
  async searchParts(options: SearchPartsOptions = {}): Promise<SearchPartsResult> {
    const startTime = performance.now();

    const {
      searchTerm = '',
      category = 'all',
      page = 1,
      pageSize = 50,
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    try {
      let query = supabase
        .from('parts')
        .select('*', { count: 'exact' })
        .eq('is_archived', false);

      if (searchTerm.trim()) {
        const term = searchTerm.trim();
        query = query.or(`part_number.ilike.%${term}%,name.ilike.%${term}%`);
      }

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const orderColumn = sortBy === 'price' ? 'part_number' : sortBy;
      query = query.order(orderColumn, { ascending: sortOrder === 'asc' });

      const offset = (page - 1) * pageSize;
      query = query.range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const transformedParts: Part[] = await Promise.all(
        (data || []).map(async (partData) => {
          const latestPrice = await this.getLatestPrice(partData.id);
          const currentPrice = latestPrice?.unit_price || 0;

          return {
            id: partData.id,
            partNumber: partData.part_number,
            name: partData.name,
            description: partData.description,
            category: partData.category,
            specifications: partData.specifications || {},
            priceHistory: [],
            currentStock: partData.current_stock,
            minStock: partData.min_stock,
            preferredSuppliers: partData.preferred_suppliers || [],
            internalUsageMarkupPercentage: partData.internal_usage_markup_percentage || 10,
            wholesaleMarkupPercentage: partData.wholesale_markup_percentage || 20,
            tradeMarkupPercentage: partData.trade_markup_percentage || 30,
            retailMarkupPercentage: partData.retail_markup_percentage || 50,
            internalUsagePrice: currentPrice * (1 + (partData.internal_usage_markup_percentage || 10) / 100) * 1.1,
            wholesalePrice: currentPrice * (1 + (partData.wholesale_markup_percentage || 20) / 100) * 1.1,
            tradePrice: currentPrice * (1 + (partData.trade_markup_percentage || 30) / 100) * 1.1,
            retailPrice: currentPrice * (1 + (partData.retail_markup_percentage || 50) / 100) * 1.1,
            actualWeightKg: partData.actual_weight_kg ? parseFloat(partData.actual_weight_kg) : undefined,
            lengthCm: partData.length_cm ? parseFloat(partData.length_cm) : undefined,
            widthCm: partData.width_cm ? parseFloat(partData.width_cm) : undefined,
            heightCm: partData.height_cm ? parseFloat(partData.height_cm) : undefined,
            dimFactor: partData.dim_factor ? parseFloat(partData.dim_factor) : undefined,
            volumetricWeightKg: partData.volumetric_weight_kg ? parseFloat(partData.volumetric_weight_kg) : undefined,
            chargeableWeightKg: partData.chargeable_weight_kg ? parseFloat(partData.chargeable_weight_kg) : undefined,
          };
        })
      );

      const endTime = performance.now();
      const queryTime = endTime - startTime;

      return {
        parts: transformedParts,
        totalCount: count || 0,
        hasMore: (offset + pageSize) < (count || 0),
        queryTime,
      };
    } catch (error: any) {
      console.error('Error searching parts:', error);
      throw new Error(error.message || 'Failed to search parts');
    }
  },

  async getLatestPrice(partId: string): Promise<{ unit_price: number; effective_date: string } | null> {
    try {
      const { data, error } = await supabase.rpc('get_latest_part_price', {
        p_part_id: partId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        return data[0];
      }

      return null;
    } catch (error) {
      console.error('Error getting latest price:', error);
      return null;
    }
  },

  async getCategories(): Promise<CategoryWithCount[]> {
    try {
      return await getCategoriesWithCount();
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      throw new Error(error.message || 'Failed to fetch categories');
    }
  },

  async getPartDetails(partId: string): Promise<Part | null> {
    try {
      const { data, error } = await supabase
        .from('parts')
        .select(`
          *,
          price_history:part_price_history(*)
        `)
        .eq('id', partId)
        .single();

      if (error) throw error;
      if (!data) return null;

      const transformedPart: Part = {
        id: data.id,
        partNumber: data.part_number,
        name: data.name,
        description: data.description,
        category: data.category,
        specifications: data.specifications || {},
        priceHistory: (data.price_history || [])
          .map((history: any) => ({
            date: history.effective_date,
            price: parseFloat(history.unit_price) || 0,
            supplier: history.supplier_name || 'Unknown',
            quantity: history.quantity || 0
          }))
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        currentStock: data.current_stock,
        minStock: data.min_stock,
        preferredSuppliers: data.preferred_suppliers || [],
        internalUsageMarkupPercentage: data.internal_usage_markup_percentage || 10,
        wholesaleMarkupPercentage: data.wholesale_markup_percentage || 20,
        tradeMarkupPercentage: data.trade_markup_percentage || 30,
        retailMarkupPercentage: data.retail_markup_percentage || 50,
        internalUsagePrice: (() => {
          const currentPrice = (data.price_history && data.price_history.length > 0)
            ? parseFloat(data.price_history[data.price_history.length - 1].unit_price)
            : 0;
          return currentPrice * (1 + (data.internal_usage_markup_percentage || 10) / 100) * 1.1;
        })(),
        wholesalePrice: (() => {
          const currentPrice = (data.price_history && data.price_history.length > 0)
            ? parseFloat(data.price_history[data.price_history.length - 1].unit_price)
            : 0;
          return currentPrice * (1 + (data.wholesale_markup_percentage || 20) / 100) * 1.1;
        })(),
        tradePrice: (() => {
          const currentPrice = (data.price_history && data.price_history.length > 0)
            ? parseFloat(data.price_history[data.price_history.length - 1].unit_price)
            : 0;
          return currentPrice * (1 + (data.trade_markup_percentage || 30) / 100) * 1.1;
        })(),
        retailPrice: (() => {
          const currentPrice = (data.price_history && data.price_history.length > 0)
            ? parseFloat(data.price_history[data.price_history.length - 1].unit_price)
            : 0;
          return currentPrice * (1 + (data.retail_markup_percentage || 50) / 100) * 1.1;
        })(),
        actualWeightKg: data.actual_weight_kg ? parseFloat(data.actual_weight_kg) : undefined,
        lengthCm: data.length_cm ? parseFloat(data.length_cm) : undefined,
        widthCm: data.width_cm ? parseFloat(data.width_cm) : undefined,
        heightCm: data.height_cm ? parseFloat(data.height_cm) : undefined,
        dimFactor: data.dim_factor ? parseFloat(data.dim_factor) : undefined,
        volumetricWeightKg: data.volumetric_weight_kg ? parseFloat(data.volumetric_weight_kg) : undefined,
        chargeableWeightKg: data.chargeable_weight_kg ? parseFloat(data.chargeable_weight_kg) : undefined,
      };

      return transformedPart;
    } catch (error: any) {
      console.error('Error fetching part details:', error);
      throw new Error(error.message || 'Failed to fetch part details');
    }
  },

  async getSearchSuggestions(prefix: string, limit: number = 10): Promise<string[]> {
    if (!prefix || prefix.length < 2) return [];

    try {
      const { data, error } = await supabase
        .from('parts')
        .select('part_number')
        .eq('is_archived', false)
        .ilike('part_number', `${prefix}%`)
        .limit(limit);

      if (error) throw error;

      return (data || []).map(row => row.part_number);
    } catch (error: any) {
      console.error('Error fetching search suggestions:', error);
      return [];
    }
  }
};
