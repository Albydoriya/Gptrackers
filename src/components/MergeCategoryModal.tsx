import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, GitMerge, ArrowRight } from 'lucide-react';
import { categoriesService, CategoryWithStats } from '../services/categoriesService';

interface MergeCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMergeCompleted: () => void;
  sourceCategory: CategoryWithStats | null;
}

function MergeCategoryModal({ isOpen, onClose, onMergeCompleted, sourceCategory }: MergeCategoryModalProps) {
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const data = await categoriesService.getAllCategories(false);
      setCategories(data.filter(cat => sourceCategory && cat.id !== sourceCategory.id));
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError(err.message || 'Failed to fetch categories');
    }
  };

  if (!isOpen || !sourceCategory) return null;

  const selectedTarget = categories.find(cat => cat.id === targetCategoryId);

  const handleMerge = async () => {
    if (!targetCategoryId) {
      setError('Please select a target category');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await categoriesService.mergeCategories(sourceCategory.id, targetCategoryId);

      alert(`Successfully merged "${sourceCategory.name}" into "${selectedTarget?.name}"!\n\n${result.parts_moved} parts were moved.`);

      onMergeCompleted();
      handleClose();
    } catch (err: any) {
      console.error('Error merging categories:', err);
      setError(err.message || 'Failed to merge categories');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setTargetCategoryId('');
    setError(null);
    setShowConfirmation(false);
    onClose();
  };

  const handleProceed = () => {
    if (!targetCategoryId) {
      setError('Please select a target category');
      return;
    }
    setShowConfirmation(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <GitMerge className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Merge Category</h3>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">Error</h4>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!showConfirmation ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">About Category Merging</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This will move all parts from the source category to the target category and then deactivate
                      the source category. This operation cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-4">
                <div className="flex-1 bg-gray-50 rounded-lg p-4 border-2 border-orange-300">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Source Category</h4>
                  <p className="text-lg font-semibold text-gray-900">{sourceCategory.name}</p>
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-gray-600">
                      <strong>Parts:</strong> {sourceCategory.part_count}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Total Value:</strong> ${sourceCategory.total_inventory_value.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <ArrowRight className="h-8 w-8 text-gray-400" />
                </div>

                <div className="flex-1">
                  <label htmlFor="target-category" className="block text-sm font-medium text-gray-700 mb-2">
                    Target Category
                  </label>
                  <select
                    id="target-category"
                    value={targetCategoryId}
                    onChange={(e) => setTargetCategoryId(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select a category...</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name} ({category.part_count} parts)
                      </option>
                    ))}
                  </select>

                  {selectedTarget && (
                    <div className="mt-3 bg-green-50 rounded-lg p-3 space-y-1">
                      <p className="text-sm text-gray-600">
                        <strong>Current Parts:</strong> {selectedTarget.part_count}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>After Merge:</strong> {selectedTarget.part_count + sourceCategory.part_count} parts
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Confirm Merge Operation</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Please confirm that you want to proceed with this merge operation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Merge Summary</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">
                    <strong>Source:</strong> {sourceCategory.name}
                  </p>
                  <p className="text-gray-700">
                    <strong>Target:</strong> {selectedTarget?.name}
                  </p>
                  <p className="text-gray-700">
                    <strong>Parts to move:</strong> {sourceCategory.part_count}
                  </p>
                  <p className="text-gray-700">
                    <strong>Action:</strong> Source category will be deactivated after merge
                  </p>
                </div>
              </div>

              <p className="text-sm text-red-600 font-medium">
                ⚠️ This operation cannot be undone. Are you sure you want to continue?
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
          {showConfirmation ? (
            <>
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleMerge}
                disabled={isSubmitting}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Merging...</span>
                  </>
                ) : (
                  <>
                    <GitMerge className="h-4 w-4" />
                    <span>Confirm Merge</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceed}
                disabled={isSubmitting || !targetCategoryId}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Proceed
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MergeCategoryModal;
