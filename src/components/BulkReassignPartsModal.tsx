import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Package, Search } from 'lucide-react';
import { categoriesService, CategoryWithStats } from '../services/categoriesService';

interface BulkReassignPartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReassignCompleted: () => void;
  sourceCategory: CategoryWithStats | null;
}

interface PartForReassignment {
  id: string;
  part_number: string;
  name: string;
  current_stock: number;
}

function BulkReassignPartsModal({ isOpen, onClose, onReassignCompleted, sourceCategory }: BulkReassignPartsModalProps) {
  const [parts, setParts] = useState<PartForReassignment[]>([]);
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set());
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sourceCategory) {
      fetchData();
    }
  }, [isOpen, sourceCategory]);

  const fetchData = async () => {
    if (!sourceCategory) return;

    setIsLoading(true);
    setError(null);

    try {
      const [partsData, categoriesData] = await Promise.all([
        categoriesService.getPartsByCategory(sourceCategory.id),
        categoriesService.getAllCategories(false),
      ]);

      setParts(partsData);
      setCategories(categoriesData.filter(cat => cat.id !== sourceCategory.id));
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !sourceCategory) return null;

  const filteredParts = parts.filter(
    (part) =>
      part.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleAll = () => {
    if (selectedPartIds.size === filteredParts.length) {
      setSelectedPartIds(new Set());
    } else {
      setSelectedPartIds(new Set(filteredParts.map(p => p.id)));
    }
  };

  const handleTogglePart = (partId: string) => {
    const newSelected = new Set(selectedPartIds);
    if (newSelected.has(partId)) {
      newSelected.delete(partId);
    } else {
      newSelected.add(partId);
    }
    setSelectedPartIds(newSelected);
  };

  const handleReassign = async () => {
    if (selectedPartIds.size === 0) {
      setError('Please select at least one part to reassign');
      return;
    }

    if (!targetCategoryId) {
      setError('Please select a target category');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to reassign ${selectedPartIds.size} part(s) to the selected category?\n\nThis action will update the category for all selected parts.`
    );

    if (!confirmed) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await categoriesService.bulkReassignParts(
        Array.from(selectedPartIds),
        targetCategoryId
      );

      const targetCategory = categories.find(cat => cat.id === targetCategoryId);
      alert(`Successfully reassigned ${result.parts_updated} part(s) to "${targetCategory?.name}"!`);

      onReassignCompleted();
      handleClose();
    } catch (err: any) {
      console.error('Error reassigning parts:', err);
      setError(err.message || 'Failed to reassign parts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setSelectedPartIds(new Set());
    setTargetCategoryId('');
    setSearchTerm('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bulk Reassign Parts</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  From: <strong>{sourceCategory.name}</strong> ({parts.length} parts)
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h4>
                    <p className="text-sm text-red-700 dark:text-red-200 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search parts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <div>
                <select
                  value={targetCategoryId}
                  onChange={(e) => setTargetCategoryId(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  <option value="">Select target category...</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.part_count} parts)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPartIds.size === filteredParts.length && filteredParts.length > 0}
                  onChange={handleToggleAll}
                  disabled={isSubmitting || filteredParts.length === 0}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select All</span>
              </label>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedPartIds.size} of {filteredParts.length} selected
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="h-5 w-5 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredParts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm ? 'No parts match your search criteria' : 'No parts found in this category'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredParts.map((part) => (
                  <label
                    key={part.id}
                    className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPartIds.has(part.id)}
                      onChange={() => handleTogglePart(part.id)}
                      disabled={isSubmitting}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{part.part_number}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{part.name}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Stock: {part.current_stock}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedPartIds.size > 0 && (
              <span>
                {selectedPartIds.size} part{selectedPartIds.size !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReassign}
              disabled={isSubmitting || selectedPartIds.size === 0 || !targetCategoryId}
              className="px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Reassigning...</span>
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  <span>Reassign Parts</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BulkReassignPartsModal;
