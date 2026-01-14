import { supabase } from '../lib/supabase';
import type { PartCategory, CategoryWithCount } from '../types';

export async function getAllCategories(): Promise<PartCategory[]> {
  const { data, error } = await supabase
    .from('part_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }

  return data.map(cat => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    displayOrder: cat.display_order,
    isActive: cat.is_active,
    createdAt: cat.created_at,
    updatedAt: cat.updated_at,
  }));
}

export async function getAllCategoriesForAdmin(): Promise<PartCategory[]> {
  const { data, error } = await supabase
    .from('part_categories')
    .select('*')
    .order('display_order');

  if (error) {
    console.error('Error fetching all categories:', error);
    throw error;
  }

  return data.map(cat => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    displayOrder: cat.display_order,
    isActive: cat.is_active,
    createdAt: cat.created_at,
    updatedAt: cat.updated_at,
  }));
}

export async function getCategoriesWithCount(): Promise<CategoryWithCount[]> {
  const { data, error } = await supabase
    .from('part_categories')
    .select(`
      *,
      parts:parts(count)
    `)
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('Error fetching categories with count:', error);
    throw error;
  }

  return data.map(cat => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    displayOrder: cat.display_order,
    isActive: cat.is_active,
    createdAt: cat.created_at,
    updatedAt: cat.updated_at,
    partCount: cat.parts?.[0]?.count || 0,
  }));
}

export async function createCategory(
  name: string,
  description?: string
): Promise<PartCategory> {
  const { data: maxOrderData } = await supabase
    .from('part_categories')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const displayOrder = (maxOrderData?.display_order || 0) + 1;

  const { data, error } = await supabase
    .from('part_categories')
    .insert({
      name,
      description,
      display_order: displayOrder,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    displayOrder: data.display_order,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateCategory(
  id: string,
  updates: { name?: string; description?: string; isActive?: boolean }
): Promise<PartCategory> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { data, error } = await supabase
    .from('part_categories')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    displayOrder: data.display_order,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function reorderCategories(
  categoryOrders: { id: string; displayOrder: number }[]
): Promise<void> {
  const updates = categoryOrders.map(({ id, displayOrder }) =>
    supabase
      .from('part_categories')
      .update({ display_order: displayOrder })
      .eq('id', id)
  );

  const results = await Promise.all(updates);
  const errors = results.filter(r => r.error);

  if (errors.length > 0) {
    console.error('Error reordering categories:', errors);
    throw new Error('Failed to reorder some categories');
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const { data: partsCount } = await supabase
    .from('parts')
    .select('id', { count: 'exact', head: true })
    .eq('category', id);

  if (partsCount && partsCount > 0) {
    throw new Error('Cannot delete category with existing parts. Please reassign parts first.');
  }

  const { error } = await supabase
    .from('part_categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}

export async function getCategoryByName(name: string): Promise<PartCategory | null> {
  const { data, error } = await supabase
    .from('part_categories')
    .select('*')
    .eq('name', name)
    .maybeSingle();

  if (error) {
    console.error('Error fetching category by name:', error);
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    displayOrder: data.display_order,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
