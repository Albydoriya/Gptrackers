import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  DollarSign, 
  FileText, 
  Settings,
  Plus,
  Minus,
  Save,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  History
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Part } from '../types';

interface EditPartProps {
  isOpen: boolean;
  onClose: () => void;
  onPartUpdated: (part: Part) => void;
  part: Part | null;
}

interface PartFormData {
  partNumber: string;
  name: string;
  description: string;
  category: string;
  currentStock: number;
  minStock: number;
  specifications: Record<string, string>;
  newPrice?: number;
  newSupplier?: string;
  priceUpdateReason?: string;
}

const EditPart: React.FC<EditPartProps> = ({ isOpen, onClose, onPartUpdated, part }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<PartFormData>({
    partNumber: '',
    name: '',
    description: '',
    category: 'Electronics',
    currentStock: 0,
    minStock: 0,
    specifications: {},
  });

  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'history'>('basic');

  const categories = [
    'Electronics',
    'Memory',
    'Storage',
    'Processors',
    'Networking',
    'Cables',
    'Tools',
    'Hardware',
    'Software',
    'Other'
  ];

  const priceUpdateReasons = [
    'Market Price Change',
    'New Supplier Quote',
    'Volume Discount',
    'Price Negotiation',
    'Supplier Change',
    'Cost Adjustment',
    'Other'
  ];

  // Initialize form data when part changes
  useEffect(() => {
    if (part) {
      setFormData({
        partNumber: part.partNumber,
        name: part.name,
        description: part.description,
        category: part.category,
        currentStock: part.currentStock,
        minStock: part.minStock,
        specifications: { ...part.specifications },
      });
    }
  }, [part]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.partNumber.trim()) {
      newErrors.partNumber = 'Part number is required';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Part name is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (formData.minStock < 0) {
      newErrors.minStock = 'Minimum stock cannot be negative';
    }
    if (formData.currentStock < 0) {
      newErrors.currentStock = 'Current stock cannot be negative';
    }
    if (formData.newPrice && formData.newPrice <= 0) {
      newErrors.newPrice = 'Price must be greater than 0';
    }
    if (formData.newPrice && !formData.newSupplier?.trim()) {
      newErrors.newSupplier = 'Supplier is required when updating price';
    }
    if (formData.newPrice && !formData.priceUpdateReason) {
      newErrors.priceUpdateReason = 'Reason is required when updating price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addSpecification = () => {
    if (specKey.trim() && specValue.trim()) {
      setFormData(prev => ({
        ...prev,
        specifications: {
          ...prev.specifications,
          [specKey.trim()]: specValue.trim()
        }
      }));
      setSpecKey('');
      setSpecValue('');
    }
  };

  const removeSpecification = (key: string) => {
    setFormData(prev => ({
      ...prev,
      specifications: Object.fromEntries(
        Object.entries(prev.specifications).filter(([k]) => k !== key)
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !part) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Construct the updated part object for Supabase
      const updatedPartObject = {
        partNumber: formData.partNumber.trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        specifications: formData.specifications,
        current_stock: formData.currentStock,
        min_stock: formData.minStock,
        updated_at: new Date().toISOString()
      };

      // 2. Update the main part details in Supabase
      const { error: updateError } = await supabase
        .from('parts')
        .update(updatedPartObject)
        .eq('id', part.id);

      if (updateError) throw updateError;

      // 3. If price was updated, add new price history entry
      if (formData.newPrice && formData.newSupplier && formData.priceUpdateReason) {
        const newPriceHistoryEntry = {
          part_id: part.id,
          price: formData.newPrice,
          supplier_name: formData.newSupplier.trim(),
          effective_date: new Date().toISOString().split('T')[0],
          reason: formData.priceUpdateReason,
          created_by: user?.id || null,
          quantity: 1
        };

        const { error: priceError } = await supabase
          .from('part_price_history')
          .insert([newPriceHistoryEntry]);

        if (priceError) throw priceError;
      }

      // 4. Create updated Part object for callback
      const updatedPart: Part = {
        ...part,
        partNumber: formData.partNumber.trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        specifications: formData.specifications,
        currentStock: formData.currentStock,
        minStock: formData.minStock,
        priceHistory: formData.newPrice && formData.newSupplier && formData.priceUpdateReason 
          ? [...part.priceHistory, {
              date: new Date().toISOString().split('T')[0],
              price: formData.newPrice,
              supplier: formData.newSupplier.trim(),
              quantity: 1
            }]
          : [...part.priceHistory]
      };

      // 5. Notify parent component (triggers re-fetch)
      onPartUpdated(updatedPart);
      
      // 6. Close modal
      onClose();
    } catch (error) {
      console.error('Error updating part:', error);
      setError(error.message || 'Failed to update part. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof PartFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getCurrentPrice = () => {
    if (!part || part.priceHistory.length === 0) return 0;
    return part.priceHistory[part.priceHistory.length - 1].price;
  };

  const getPriceTrend = () => {
    if (!part || part.priceHistory.length < 2) return { trend: 'stable', percentage: 0 };
    
    const latest = part.priceHistory[part.priceHistory.length - 1].price;
    const previous = part.priceHistory[part.priceHistory.length - 2].price;
    const percentage = ((latest - previous) / previous) * 100;
    
    if (percentage > 2) return { trend: 'up', percentage };
    if (percentage < -2) return { trend: 'down', percentage };
    return { trend: 'stable', percentage };
  };

  if (!isOpen || !part) return null;

  const currentPrice = getCurrentPrice();
  const priceTrend = getPriceTrend();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Part</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{part.partNumber} - {part.name}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="mt-6 flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('basic')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'basic'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Basic Information</span>
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'pricing'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span>Pricing</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Price History</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-800 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}

          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-8">
              {/* Basic Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Part Number *
                    </label>
                    <input
                      type="text"
                      value={formData.partNumber}
                      onChange={(e) => handleInputChange('partNumber', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
                        errors.partNumber ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="e.g., CPU-001"
                    />
                    {errors.partNumber && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.partNumber}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Part Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.name ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400`}
                      placeholder="e.g., High-Performance Processor"
                    />
                    {errors.name && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none ${
                        errors.description ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400`}
                      placeholder="Detailed description of the part..."
                    />
                    {errors.description && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Stock Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                  Stock Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.currentStock || ''}
                      onChange={(e) => handleInputChange('currentStock', parseInt(e.target.value) || 0)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.currentStock ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400`}
                      placeholder="0"
                    />
                    {errors.currentStock && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.currentStock}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Stock Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minStock || ''}
                      onChange={(e) => handleInputChange('minStock', parseInt(e.target.value) || 0)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.minStock ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400`}
                      placeholder="0"
                    />
                    {errors.minStock && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.minStock}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Specifications */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
                  Specifications
                </h3>
                
                {/* Add Specification */}
                <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Add New Specification</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="Specification name"
                      value={specKey}
                      onChange={(e) => setSpecKey(e.target.value)}
                      className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={specValue}
                      onChange={(e) => setSpecValue(e.target.value)}
                      className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={addSpecification}
                      disabled={!specKey.trim() || !specValue.trim()}
                      className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                        specKey.trim() && specValue.trim()
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Specifications List */}
                {Object.keys(formData.specifications).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Current Specifications</h4>
                    {Object.entries(formData.specifications).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-4 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{key}:</span>
                          <span className="ml-2 text-gray-600 dark:text-gray-300">{value}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSpecification(key)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-8">
              {/* Current Pricing */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                  Current Pricing Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Price</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">${currentPrice.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Price Trend</p>
                    <div className="flex items-center justify-center space-x-2">
                      {priceTrend.trend === 'up' && (
                        <>
                          <TrendingUp className="h-5 w-5 text-red-500 dark:text-red-400" />
                          <span className="text-lg font-bold text-red-600 dark:text-red-400">+{priceTrend.percentage.toFixed(1)}%</span>
                        </>
                      )}
                      {priceTrend.trend === 'down' && (
                        <>
                          <TrendingDown className="h-5 w-5 text-green-500 dark:text-green-400" />
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">{priceTrend.percentage.toFixed(1)}%</span>
                        </>
                      )}
                      {priceTrend.trend === 'stable' && (
                        <span className="text-lg font-bold text-gray-600 dark:text-gray-400">Stable</span>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Last Updated</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {part.priceHistory.length > 0 
                        ? new Date(part.priceHistory[part.priceHistory.length - 1].date).toLocaleDateString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Update Pricing */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Update Pricing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.newPrice || ''}
                      onChange={(e) => handleInputChange('newPrice', parseFloat(e.target.value) || 0)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.newPrice ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400`}
                      placeholder="0.00"
                    />
                    {errors.newPrice && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.newPrice}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Supplier
                    </label>
                    <input
                      type="text"
                      value={formData.newSupplier || ''}
                      onChange={(e) => handleInputChange('newSupplier', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.newSupplier ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400`}
                      placeholder="Supplier name"
                    />
                    {errors.newSupplier && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.newSupplier}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Update Reason
                    </label>
                    <select
                      value={formData.priceUpdateReason || ''}
                      onChange={(e) => handleInputChange('priceUpdateReason', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.priceUpdateReason ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    >
                      <option value="">Select reason...</option>
                      {priceUpdateReasons.map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                    {errors.priceUpdateReason && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.priceUpdateReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Price History Tab */}
          {activeTab === 'history' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                <History className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                Price History
              </h3>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Supplier</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Change</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {part.priceHistory.map((history, index) => {
                        const previousPrice = index > 0 ? part.priceHistory[index - 1].price : history.price;
                        const change = index > 0 ? ((history.price - previousPrice) / previousPrice) * 100 : 0;
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {new Date(history.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                              ${history.price.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                              {history.supplier}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {index === 0 ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                                  Initial
                                </span>
                              ) : (
                                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  change > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' : 
                                  change < 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 
                                  'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                                }`}>
                                  {change > 0 && <TrendingUp className="h-3 w-3" />}
                                  {change < 0 && <TrendingDown className="h-3 w-3" />}
                                  <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-medium transition-colors ${
                isSubmitting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Update Part</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPart;