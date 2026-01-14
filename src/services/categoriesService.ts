import { supabase } from '../lib/supabase';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithStats extends Category {
  part_count: number;
  total_inventory_value: number;
  average_stock_level: number;
  low_stock_count: number;
}

export interface CategoryStatistics {
  total_categories: number;
  active_categories: number;
  total_parts_categorized: number;
  category_distribution: {
    category_name: string;
    percentage: number;
  }[];
}

export const categoriesService = {
  async getAllCategories(includeInactive = false): Promise<CategoryWithStats[]> {
    try {
      let query = supabase
        .from('part_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data: categories, error: categoriesError } = await query;

      if (categoriesError) throw categoriesError;

      const categoriesWithStats = await Promise.all(
        (categories || []).map(async (category) => {
          const stats = await this.getCategoryStats(category.id);
          return {
            ...category,
            part_count: stats.part_count,
            total_inventory_value: stats.total_inventory_value,
            average_stock_level: stats.average_stock_level,
            low_stock_count: stats.low_stock_count,
          };
        })
      );

      return categoriesWithStats;
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      throw new Error(error.message || 'Failed to fetch categories');
    }
  },

  async getCategoryStats(categoryId: string): Promise<{
    part_count: number;
    total_inventory_value: number;
    average_stock_level: number;
    low_stock_count: number;
  }> {
    try {
      const { data: category } = await supabase
        .from('part_categories')
        .select('name')
        .eq('id', categoryId)
        .single();

      if (!category) {
        return {
          part_count: 0,
          total_inventory_value: 0,
          average_stock_level: 0,
          low_stock_count: 0,
        };
      }

      const { data: parts, error } = await supabase
        .from('parts')
        .select('id, current_stock, min_stock, category')
        .eq('category', category.name)
        .eq('is_archived', false);

      if (error) throw error;

      if (!parts || parts.length === 0) {
        return {
          part_count: 0,
          total_inventory_value: 0,
          average_stock_level: 0,
          low_stock_count: 0,
        };
      }

      let totalInventoryValue = 0;
      let totalStock = 0;
      let lowStockCount = 0;

      for (const part of parts) {
        const { data: priceData } = await supabase.rpc('get_latest_part_price', {
          p_part_id: part.id
        });

        const unitPrice = priceData && priceData.length > 0 ? parseFloat(priceData[0].unit_price) : 0;
        totalInventoryValue += unitPrice * part.current_stock;
        totalStock += part.current_stock;

        if (part.current_stock <= part.min_stock) {
          lowStockCount++;
        }
      }

      const averageStockLevel = parts.length > 0 ? totalStock / parts.length : 0;

      return {
        part_count: parts.length,
        total_inventory_value: totalInventoryValue,
        average_stock_level: averageStockLevel,
        low_stock_count: lowStockCount,
      };
    } catch (error: any) {
      console.error('Error fetching category stats:', error);
      return {
        part_count: 0,
        total_inventory_value: 0,
        average_stock_level: 0,
        low_stock_count: 0,
      };
    }
  },

  async getCategoryStatistics(): Promise<CategoryStatistics> {
    try {
      const { data: categories, error: categoriesError } = await supabase
        .from('part_categories')
        .select('id, name, is_active');

      if (categoriesError) throw categoriesError;

      const { data: parts, error: partsError } = await supabase
        .from('parts')
        .select('category')
        .eq('is_archived', false);

      if (partsError) throw partsError;

      const totalCategories = categories?.length || 0;
      const activeCategories = categories?.filter(c => c.is_active).length || 0;
      const totalPartsCategorized = parts?.length || 0;

      const categoryCounts = (parts || []).reduce((acc, part) => {
        acc[part.category] = (acc[part.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const categoryDistribution = Object.entries(categoryCounts).map(([name, count]) => ({
        category_name: name,
        percentage: totalPartsCategorized > 0 ? (count / totalPartsCategorized) * 100 : 0,
      }));

      return {
        total_categories: totalCategories,
        active_categories: activeCategories,
        total_parts_categorized: totalPartsCategorized,
        category_distribution: categoryDistribution,
      };
    } catch (error: any) {
      console.error('Error fetching category statistics:', error);
      throw new Error(error.message || 'Failed to fetch category statistics');
    }
  },

  async createCategory(category: {
    name: string;
    description?: string;
    display_order?: number;
  }): Promise<Category> {
    try {
      const { data: existingCategory } = await supabase
        .from('part_categories')
        .select('id')
        .eq('name', category.name)
        .maybeSingle();

      if (existingCategory) {
        throw new Error('A category with this name already exists');
      }

      let displayOrder = category.display_order;
      if (displayOrder === undefined) {
        const { data: maxOrderCategory } = await supabase
          .from('part_categories')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        displayOrder = maxOrderCategory ? maxOrderCategory.display_order + 1 : 1;
      }

      const { data, error } = await supabase
        .from('part_categories')
        .insert({
          name: category.name,
          description: category.description || null,
          display_order: displayOrder,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error creating category:', error);
      throw new Error(error.message || 'Failed to create category');
    }
  },

  async updateCategory(
    categoryId: string,
    updates: Partial<Pick<Category, 'name' | 'description' | 'display_order' | 'is_active'>>
  ): Promise<Category> {
    try {
      if (updates.name) {
        const { data: existingCategory } = await supabase
          .from('part_categories')
          .select('id')
          .eq('name', updates.name)
          .neq('id', categoryId)
          .maybeSingle();

        if (existingCategory) {
          throw new Error('A category with this name already exists');
        }
      }

      const { data, error } = await supabase
        .from('part_categories')
        .update(updates)
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error updating category:', error);
      throw new Error(error.message || 'Failed to update category');
    }
  },

  async deleteCategory(categoryId: string): Promise<void> {
    try {
      const stats = await this.getCategoryStats(categoryId);

      if (stats.part_count > 0) {
        throw new Error(
          `Cannot delete category with ${stats.part_count} parts. Please reassign or remove all parts first.`
        );
      }

      const { error } = await supabase
        .from('part_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting category:', error);
      throw new Error(error.message || 'Failed to delete category');
    }
  },

  async deactivateCategory(categoryId: string): Promise<Category> {
    try {
      return await this.updateCategory(categoryId, { is_active: false });
    } catch (error: any) {
      console.error('Error deactivating category:', error);
      throw new Error(error.message || 'Failed to deactivate category');
    }
  },

  async reactivateCategory(categoryId: string): Promise<Category> {
    try {
      return await this.updateCategory(categoryId, { is_active: true });
    } catch (error: any) {
      console.error('Error reactivating category:', error);
      throw new Error(error.message || 'Failed to reactivate category');
    }
  },

  async reorderCategories(categories: { id: string; display_order: number }[]): Promise<void> {
    try {
      for (const category of categories) {
        const { error } = await supabase
          .from('part_categories')
          .update({ display_order: category.display_order })
          .eq('id', category.id);

        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Error reordering categories:', error);
      throw new Error(error.message || 'Failed to reorder categories');
    }
  },

  async mergeCategories(
    sourceCategoryId: string,
    targetCategoryId: string
  ): Promise<{ parts_moved: number }> {
    try {
      const { data: sourceCategory } = await supabase
        .from('part_categories')
        .select('name')
        .eq('id', sourceCategoryId)
        .single();

      const { data: targetCategory } = await supabase
        .from('part_categories')
        .select('name')
        .eq('id', targetCategoryId)
        .single();

      if (!sourceCategory || !targetCategory) {
        throw new Error('Source or target category not found');
      }

      const { data: parts, error: partsError } = await supabase
        .from('parts')
        .select('id')
        .eq('category', sourceCategory.name);

      if (partsError) throw partsError;

      const partCount = parts?.length || 0;

      if (partCount > 0) {
        const { error: updateError } = await supabase
          .from('parts')
          .update({ category: targetCategory.name })
          .eq('category', sourceCategory.name);

        if (updateError) throw updateError;
      }

      await this.deactivateCategory(sourceCategoryId);

      return { parts_moved: partCount };
    } catch (error: any) {
      console.error('Error merging categories:', error);
      throw new Error(error.message || 'Failed to merge categories');
    }
  },

  async bulkReassignParts(
    partIds: string[],
    targetCategoryId: string
  ): Promise<{ parts_updated: number }> {
    try {
      const { data: targetCategory } = await supabase
        .from('part_categories')
        .select('name')
        .eq('id', targetCategoryId)
        .single();

      if (!targetCategory) {
        throw new Error('Target category not found');
      }

      const { error } = await supabase
        .from('parts')
        .update({ category: targetCategory.name })
        .in('id', partIds);

      if (error) throw error;

      return { parts_updated: partIds.length };
    } catch (error: any) {
      console.error('Error bulk reassigning parts:', error);
      throw new Error(error.message || 'Failed to bulk reassign parts');
    }
  },

  async getPartsByCategory(categoryId: string): Promise<Array<{
    id: string;
    part_number: string;
    name: string;
    current_stock: number;
  }>> {
    try {
      const { data: category } = await supabase
        .from('part_categories')
        .select('name')
        .eq('id', categoryId)
        .single();

      if (!category) {
        throw new Error('Category not found');
      }

      const { data: parts, error } = await supabase
        .from('parts')
        .select('id, part_number, name, current_stock')
        .eq('category', category.name)
        .eq('is_archived', false)
        .order('part_number', { ascending: true });

      if (error) throw error;

      return parts || [];
    } catch (error: any) {
      console.error('Error fetching parts by category:', error);
      throw new Error(error.message || 'Failed to fetch parts by category');
    }
  },
};
