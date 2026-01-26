import React, { useState, useEffect, useRef } from 'react';
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
  History,
  Weight,
  Ruler,
  ChevronDown,
  Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Part, Supplier } from '../types';

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
  // Markup percentages
  internalUsageMarkupPercentage: number;
  wholesaleMarkupPercentage: number;
  tradeMarkupPercentage: number;
  retailMarkupPercentage: number;
  // Weight and dimensions
  actualWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  dimFactor: number;
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
    internalUsageMarkupPercentage: 0,
    wholesaleMarkupPercentage: 0,
    tradeMarkupPercentage: 0,
    retailMarkupPercentage: 0,
    actualWeightKg: 0,
    lengthCm: 0,
    widthCm: 0,
    heightCm: 0,
    dimFactor: 5000
  });

  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'history'>('basic');
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Supplier dropdown state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchSuppliers();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const { data, error } = await supabase
        .from('part_categories')
        .select('name')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const categoryNames = (data || []).map(cat => cat.name);
      setCategories(categoryNames);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setCategories(['Uncategorized']);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchSuppliers = async () => {
    setIsLoadingSuppliers(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      setSuppliers(data || []);
    } catch (err: any) {
      console.error('Error fetching suppliers:', err);
      setSuppliers([]);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

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
        internalUsageMarkupPercentage: part.internalUsageMarkupPercentage || 0,
        wholesaleMarkupPercentage: part.wholesaleMarkupPercentage || 0,
        tradeMarkupPercentage: part.tradeMarkupPercentage || 0,
        retailMarkupPercentage: part.retailMarkupPercentage || 0,
        actualWeightKg: part.actualWeightKg || 0,
        lengthCm: part.lengthCm || 0,
        widthCm: part.widthCm || 0,
        heightCm: part.heightCm || 0,
        dimFactor: part.dimFactor || 5000
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
        part_number: formData.partNumber.trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        specifications: formData.specifications,
        current_stock: formData.currentStock,
        min_stock: formData.minStock,
        updated_at: new Date().toISOString(),
        internal_usage_markup_percentage: formData.internalUsageMarkupPercentage,
        wholesale_markup_percentage: formData.wholesaleMarkupPercentage,
        trade_markup_percentage: formData.tradeMarkupPercentage,
        retail_markup_percentage: formData.retailMarkupPercentage,
        actual_weight_kg: formData.actualWeightKg || null,
        length_cm: formData.lengthCm || null,
        width_cm: formData.widthCm || null,
        height_cm: formData.heightCm || null,
        dim_factor: formData.dimFactor || 5000
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
        internalUsageMarkupPercentage: formData.internalUsageMarkupPercentage,
        wholesaleMarkupPercentage: formData.wholesaleMarkupPercentage,
        tradeMarkupPercentage: formData.tradeMarkupPercentage,
        retailMarkupPercentage: formData.retailMarkupPercentage,
        priceHistory: formData.newPrice && formData.newSupplier && formData.priceUpdateReason 
          ? [...part.priceHistory, {
              date: new Date().toISOString().split('T')[0],
              price: formData.newPrice,
              supplier: formData.newSupplier.trim(),
              quantity: 1
            }]
          : [...part.priceHistory],
        // Recalculate derived prices based on potentially new current price and updated markups
        internalUsagePrice: (() => {
          const currentPrice = formData.newPrice || getCurrentPrice();
          return currentPrice * (1 + formData.internalUsageMarkupPercentage / 100);
        })(),
        wholesalePrice: (() => {
          const currentPrice = formData.newPrice || getCurrentPrice();
          return currentPrice * (1 + formData.wholesaleMarkupPercentage / 100);
        })(),
        tradePrice: (() => {
          const currentPrice = formData.newPrice || getCurrentPrice();
          return currentPrice * (1 + formData.tradeMarkupPercentage / 100);
        })(),
        retailPrice: (() => {
          const currentPrice = formData.newPrice || getCurrentPrice();
          return currentPrice * (1 + formData.retailMarkupPercentage / 100);
        })()
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

  // Supplier dropdown handlers
  const toggleSupplierDropdown = () => {
    setIsSupplierDropdownOpen(!isSupplierDropdownOpen);
    if (!isSupplierDropdownOpen) {
      setSupplierSearchTerm('');
    }
  };

  const selectSupplier = (supplier: Supplier) => {
    setFormData(prev => ({ ...prev, newSupplier: supplier.name }));
    setIsSupplierDropdownOpen(false);
    setSupplierSearchTerm('');

    // Clear error when valid supplier selected
    if (errors.newSupplier) {
      setErrors(prev => ({ ...prev, newSupplier: '' }));
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  );

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSupplierDropdownOpen(false);
        setSupplierSearchTerm('');
      }
    };

    if (isSupplierDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSupplierDropdownOpen]);

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

              {/* Weight & Dimensions Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <Weight className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
                  Weight & Dimensions (for Freight Calculation)
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Actual Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={formData.actualWeightKg || ''}
                        onChange={(e) => handleInputChange('actualWeightKg', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="0.000"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Physical weight of the item</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Dim Factor
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={formData.dimFactor || 5000}
                        onChange={(e) => handleInputChange('dimFactor', parseFloat(e.target.value) || 5000)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="5000"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Default: 5000 for air freight</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <Ruler className="h-4 w-4 mr-1 text-orange-600 dark:text-orange-400" />
                      Dimensions (cm)
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.lengthCm || ''}
                          onChange={(e) => handleInputChange('lengthCm', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                          placeholder="Length"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">Length</p>
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.widthCm || ''}
                          onChange={(e) => handleInputChange('widthCm', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                          placeholder="Width"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">Width</p>
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.heightCm || ''}
                          onChange={(e) => handleInputChange('heightCm', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                          placeholder="Height"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">Height</p>
                      </div>
                    </div>
                  </div>

                  {/* Calculated Weight Display */}
                  {(formData.actualWeightKg > 0 || (formData.lengthCm > 0 && formData.widthCm > 0 && formData.heightCm > 0)) && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Volumetric Weight</p>
                          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            {formData.lengthCm > 0 && formData.widthCm > 0 && formData.heightCm > 0 && formData.dimFactor > 0
                              ? ((formData.lengthCm * formData.widthCm * formData.heightCm) / formData.dimFactor).toFixed(3)
                              : '0.000'} kg
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Actual Weight</p>
                          <p className="text-lg font-bold text-gray-700 dark:text-gray-300">
                            {formData.actualWeightKg.toFixed(3)} kg
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Chargeable Weight</p>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">
                            {(() => {
                              const volWeight = formData.lengthCm > 0 && formData.widthCm > 0 && formData.heightCm > 0 && formData.dimFactor > 0
                                ? (formData.lengthCm * formData.widthCm * formData.heightCm) / formData.dimFactor
                                : 0;
                              return Math.max(formData.actualWeightKg, volWeight).toFixed(3);
                            })()} kg
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
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
    
                {/* Pricing Tiers Markup Section */}
                <div className="mb-8">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                    Pricing Tiers Markups (%)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Internal Usage Markup (10%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="10"
                        value={formData.internalUsageMarkupPercentage || 10}
                        onChange={(e) => handleInputChange('internalUsageMarkupPercentage', parseFloat(e.target.value) || 10)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Wholesale Markup (&gt;20%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="20"
                        value={formData.wholesaleMarkupPercentage || 20}
                        onChange={(e) => handleInputChange('wholesaleMarkupPercentage', parseFloat(e.target.value) || 20)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Trade Markup (&gt;30%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="30"
                        value={formData.tradeMarkupPercentage || 30}
                        onChange={(e) => handleInputChange('tradeMarkupPercentage', parseFloat(e.target.value) || 30)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Retail Markup (&gt;50%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="50"
                        value={formData.retailMarkupPercentage || 50}
                        onChange={(e) => handleInputChange('retailMarkupPercentage', parseFloat(e.target.value) || 50)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="50"
                      />
                    </div>
                  </div>
                  
                  {/* Live Preview of Calculated Prices */}
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Calculated Pricing Preview (With GST)</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400">Internal Usage</p>
                        <p className="font-bold text-blue-600 dark:text-blue-400">
                          ${(currentPrice * (1 + (formData.internalUsageMarkupPercentage || 10)/ 100)*1.1).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400">Wholesale</p>
                        <p className="font-bold text-green-600 dark:text-green-400">
                          ${(currentPrice * (1 + (formData.wholesaleMarkupPercentage || 20)/ 100)*1.1).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400">Trade</p>
                        <p className="font-bold text-purple-600 dark:text-purple-400">
                          ${(currentPrice * (1 + (formData.tradeMarkupPercentage || 30)/ 100)*1.1).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400">Retail</p>
                        <p className="font-bold text-orange-600 dark:text-orange-400">
                          ${(currentPrice * (1 + (formData.retailMarkupPercentage || 50) / 100)*1.1).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

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
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={toggleSupplierDropdown}
                        disabled={isLoadingSuppliers}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left flex items-center justify-between ${
                          errors.newSupplier ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                          isLoadingSuppliers ? 'cursor-wait' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        <span className={formData.newSupplier ? '' : 'text-gray-500 dark:text-gray-400'}>
                          {isLoadingSuppliers ? 'Loading suppliers...' : formData.newSupplier || 'Select supplier...'}
                        </span>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isSupplierDropdownOpen ? 'transform rotate-180' : ''}`} />
                      </button>

                      {isSupplierDropdownOpen && !isLoadingSuppliers && (
                        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden flex flex-col">
                          {/* Search Input */}
                          <div className="p-3 border-b border-gray-200 dark:border-gray-600">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                value={supplierSearchTerm}
                                onChange={(e) => setSupplierSearchTerm(e.target.value)}
                                placeholder="Search suppliers..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          {/* Suppliers List */}
                          <div className="overflow-y-auto">
                            {filteredSuppliers.length > 0 ? (
                              filteredSuppliers.map((supplier) => (
                                <button
                                  key={supplier.id}
                                  type="button"
                                  onClick={() => selectSupplier(supplier)}
                                  className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                                >
                                  <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {supplier.name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {supplier.contactPerson} • {supplier.email}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                {suppliers.length === 0 ? (
                                  <>
                                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">No active suppliers found</p>
                                    <p className="text-xs mt-1">Add suppliers in the Suppliers tab</p>
                                  </>
                                ) : (
                                  <>
                                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">No suppliers match your search</p>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
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