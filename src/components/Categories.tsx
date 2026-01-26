import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  GripVertical,
  RefreshCw,
  AlertTriangle,
  Package,
  DollarSign,
  TrendingUp,
  Archive,
  ArrowUpDown,
  GitMerge,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { categoriesService, CategoryWithStats, CategoryStatistics } from '../services/categoriesService';
import AddCategory from './AddCategory';
import EditCategory from './EditCategory';
import MergeCategoryModal from './MergeCategoryModal';
import BulkReassignPartsModal from './BulkReassignPartsModal';

interface CategoriesProps {
  onRefresh?: () => void;
}

function Categories({ onRefresh }: CategoriesProps) {
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission('users', 'manage');

  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [statistics, setStatistics] = useState<CategoryStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isBulkReassignModalOpen, setIsBulkReassignModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithStats | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [categoriesData, statisticsData] = await Promise.all([
        categoriesService.getAllCategories(showInactive),
        categoriesService.getCategoryStatistics(),
      ]);

      setCategories(categoriesData);
      setStatistics(statisticsData);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setIsLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleRefresh = () => {
    fetchCategories();
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleDeactivate = async (category: CategoryWithStats) => {
    const action = category.is_active ? 'deactivate' : 'reactivate';
    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${category.name}"?${
        category.is_active && category.part_count > 0
          ? `\n\nThis category has ${category.part_count} parts. They will still be associated with this category, but the category will be hidden from active lists.`
          : ''
      }`
    );

    if (!confirmed) return;

    try {
      if (category.is_active) {
        await categoriesService.deactivateCategory(category.id);
      } else {
        await categoriesService.reactivateCategory(category.id);
      }
      await fetchCategories();
    } catch (err: any) {
      console.error(`Error ${action}ing category:`, err);
      setError(err.message || `Failed to ${action} category`);
    }
  };

  const handleDelete = async (category: CategoryWithStats) => {
    if (category.part_count > 0) {
      alert(
        `Cannot delete "${category.name}" because it has ${category.part_count} parts.\n\nPlease use the "Reassign Parts" or "Merge Category" feature to move the parts to another category first.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${category.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await categoriesService.deleteCategory(category.id);
      await fetchCategories();
    } catch (err: any) {
      console.error('Error deleting category:', err);
      setError(err.message || 'Failed to delete category');
    }
  };

  const handleDragStart = (index: number) => {
    if (!isAdmin) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!isAdmin || draggedIndex === null || draggedIndex === index) return;

    const newCategories = [...categories];
    const draggedItem = newCategories[draggedIndex];
    newCategories.splice(draggedIndex, 1);
    newCategories.splice(index, 0, draggedItem);

    setCategories(newCategories);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (!isAdmin || draggedIndex === null) return;

    try {
      const reorderedCategories = categories.map((cat, index) => ({
        id: cat.id,
        display_order: index + 1,
      }));

      await categoriesService.reorderCategories(reorderedCategories);
      await fetchCategories();
    } catch (err: any) {
      console.error('Error reordering categories:', err);
      setError(err.message || 'Failed to reorder categories');
      await fetchCategories();
    } finally {
      setDraggedIndex(null);
    }
  };

  const handleEdit = (category: CategoryWithStats) => {
    setSelectedCategory(category);
    setIsEditModalOpen(true);
  };

  const handleMerge = (category: CategoryWithStats) => {
    setSelectedCategory(category);
    setIsMergeModalOpen(true);
  };

  const handleBulkReassign = (category: CategoryWithStats) => {
    setSelectedCategory(category);
    setIsBulkReassignModalOpen(true);
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Category Management</h2>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh categories"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              You are viewing categories in read-only mode. Admin access is required to manage categories.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FolderOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Categories</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{statistics.total_categories}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {statistics.active_categories} active
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Parts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{statistics.total_parts_categorized}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">across all categories</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Parts per Category</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {statistics.active_categories > 0
                    ? Math.round(statistics.total_parts_categorized / statistics.active_categories)
                    : 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">distribution</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Show inactive categories</span>
          </label>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-600 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No categories found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'No categories match your search criteria' : 'No categories have been created yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                      <ArrowUpDown className="h-4 w-4" />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Parts
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Avg Stock
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Low Stock
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCategories.map((category, index) => (
                  <tr
                    key={category.id}
                    draggable={isAdmin && category.is_active}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`${
                      draggedIndex === index ? 'opacity-50' : ''
                    } ${!category.is_active ? 'bg-gray-50 dark:bg-gray-700/50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'} transition-colors`}
                  >
                    {isAdmin && (
                      <td className="px-4 py-4">
                        {category.is_active && (
                          <GripVertical className="h-5 w-5 text-gray-400 dark:text-gray-500 cursor-move" />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`p-2 rounded-lg ${
                            category.is_active ? 'bg-blue-100' : 'bg-gray-100 dark:bg-gray-700'
                          }`}>
                            <FolderOpen className={`h-5 w-5 ${
                              category.is_active ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'
                            }`} />
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{category.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Order: {category.display_order}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {category.description || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Package className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{category.part_count}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          ${category.total_inventory_value.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {category.average_stock_level.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`text-sm font-medium ${
                        category.low_stock_count > 0 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {category.low_stock_count}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        category.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(category)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit category"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {category.part_count > 0 && (
                            <>
                              <button
                                onClick={() => handleBulkReassign(category)}
                                className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                title="Reassign parts"
                              >
                                <Package className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleMerge(category)}
                                className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                title="Merge category"
                              >
                                <GitMerge className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeactivate(category)}
                            className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                            title={category.is_active ? 'Deactivate' : 'Reactivate'}
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                          {category.part_count === 0 && (
                            <button
                              onClick={() => handleDelete(category)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete category"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddCategory
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCategoryAdded={handleRefresh}
      />

      <EditCategory
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCategory(null);
        }}
        onCategoryUpdated={handleRefresh}
        category={selectedCategory}
      />

      <MergeCategoryModal
        isOpen={isMergeModalOpen}
        onClose={() => {
          setIsMergeModalOpen(false);
          setSelectedCategory(null);
        }}
        onMergeCompleted={handleRefresh}
        sourceCategory={selectedCategory}
      />

      <BulkReassignPartsModal
        isOpen={isBulkReassignModalOpen}
        onClose={() => {
          setIsBulkReassignModalOpen(false);
          setSelectedCategory(null);
        }}
        onReassignCompleted={handleRefresh}
        sourceCategory={selectedCategory}
      />
    </div>
  );
}

export default Categories;
