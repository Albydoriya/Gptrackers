import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  Plus,
  Save,
  Trash2,
  Edit3,
  AlertCircle,
  Ship,
  Package,
  Building2,
  CreditCard,
  Loader2,
  Search,
  Filter,
  TrendingUp,
  CheckCircle,
  XCircle,
  Calendar,
  Tag,
  History,
  List,
  FileText,
  Eye,
  Percent,
  ArrowRight
} from 'lucide-react';
import { SeaFreightPriceListItem, SeaFreightPriceHistory } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SeaFreightPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: any | null;
}

interface PriceListFormData {
  itemName: string;
  itemDescription: string;
  category: string;
  shippingType: string;
  supplierPartsCost: number;
  supplierPackingFee: number;
  supplierBankingFee: number;
  supplierOtherFees: number;
  markupPercentage: number;
  effectiveDate: string;
  expirationDate: string;
  notes: string;
  tags: string;
}

const CATEGORIES = ['Engine', 'Transmission', 'Body Parts', 'Electronics', 'Interior', 'Exterior', 'General'];
const SHIPPING_TYPES = ['FCL 20ft', 'FCL 40ft', 'LCL', 'Air Freight', 'Express'];

const SeaFreightPricingModal: React.FC<SeaFreightPricingModalProps> = ({
  isOpen,
  onClose,
  quote
}) => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'history'>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [priceList, setPriceList] = useState<SeaFreightPriceListItem[]>([]);
  const [filteredPriceList, setFilteredPriceList] = useState<SeaFreightPriceListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [shippingTypeFilter, setShippingTypeFilter] = useState('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [viewHistoryItemId, setViewHistoryItemId] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<SeaFreightPriceHistory[]>([]);

  const [formData, setFormData] = useState<PriceListFormData>({
    itemName: '',
    itemDescription: '',
    category: 'General',
    shippingType: 'FCL 20ft',
    supplierPartsCost: 0,
    supplierPackingFee: 0,
    supplierBankingFee: 0,
    supplierOtherFees: 0,
    markupPercentage: 25,
    effectiveDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    notes: '',
    tags: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchPriceList();
    }
  }, [isOpen]);

  useEffect(() => {
    applyFilters();
  }, [priceList, searchTerm, categoryFilter, shippingTypeFilter, showActiveOnly]);

  const fetchPriceList = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('sea_freight_price_list')
        .select('*')
        .order('item_name', { ascending: true });

      if (fetchError) throw fetchError;

      const transformedData: SeaFreightPriceListItem[] = (data || []).map(item => ({
        id: item.id,
        partId: item.part_id,
        itemName: item.item_name,
        itemDescription: item.item_description || '',
        category: item.category,
        shippingType: item.shipping_type,
        supplierPartsCost: parseFloat(item.supplier_parts_cost),
        supplierPackingFee: parseFloat(item.supplier_packing_fee),
        supplierBankingFee: parseFloat(item.supplier_banking_fee),
        supplierOtherFees: parseFloat(item.supplier_other_fees),
        totalSupplierCost: parseFloat(item.total_supplier_cost),
        markupPercentage: parseFloat(item.markup_percentage),
        customerPrice: parseFloat(item.customer_price),
        currency: item.currency,
        isActive: item.is_active,
        effectiveDate: item.effective_date,
        expirationDate: item.expiration_date,
        notes: item.notes,
        tags: item.tags || [],
        createdBy: item.created_by,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));

      setPriceList(transformedData);
    } catch (err: any) {
      console.error('Error fetching price list:', err);
      setError(err.message || 'Failed to fetch price list');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...priceList];

    if (showActiveOnly) {
      filtered = filtered.filter(item => item.isActive);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    if (shippingTypeFilter !== 'all') {
      filtered = filtered.filter(item => item.shippingType === shippingTypeFilter);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.itemName.toLowerCase().includes(searchLower) ||
        item.itemDescription.toLowerCase().includes(searchLower)
      );
    }

    setFilteredPriceList(filtered);
  };

  const calculateTotalSupplierCost = () => {
    return formData.supplierPartsCost + formData.supplierPackingFee +
           formData.supplierBankingFee + formData.supplierOtherFees;
  };

  const calculateCustomerPrice = () => {
    const totalCost = calculateTotalSupplierCost();
    return totalCost * (1 + formData.markupPercentage / 100);
  };

  const calculateProfitMargin = () => {
    const customerPrice = calculateCustomerPrice();
    const totalCost = calculateTotalSupplierCost();
    if (customerPrice === 0) return 0;
    return ((customerPrice - totalCost) / customerPrice) * 100;
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.itemName.trim()) {
      setError('Item name is required');
      return;
    }

    if (formData.supplierPartsCost < 0 || formData.supplierPackingFee < 0 ||
        formData.supplierBankingFee < 0 || formData.supplierOtherFees < 0) {
      setError('All cost values must be non-negative');
      return;
    }

    if (formData.markupPercentage < 0) {
      setError('Markup percentage must be non-negative');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t);

      const itemData = {
        item_name: formData.itemName.trim(),
        item_description: formData.itemDescription.trim(),
        category: formData.category,
        shipping_type: formData.shippingType,
        supplier_parts_cost: formData.supplierPartsCost,
        supplier_packing_fee: formData.supplierPackingFee,
        supplier_banking_fee: formData.supplierBankingFee,
        supplier_other_fees: formData.supplierOtherFees,
        markup_percentage: formData.markupPercentage,
        currency: 'AUD',
        is_active: true,
        effective_date: formData.effectiveDate,
        expiration_date: formData.expirationDate || null,
        notes: formData.notes.trim() || null,
        tags: tags.length > 0 ? tags : [],
        created_by: user.id
      };

      if (editingItemId) {
        const { error: updateError } = await supabase
          .from('sea_freight_price_list')
          .update(itemData)
          .eq('id', editingItemId);

        if (updateError) throw updateError;
        setSuccessMessage('Price list item updated successfully!');
        setEditingItemId(null);
      } else {
        const { error: insertError } = await supabase
          .from('sea_freight_price_list')
          .insert([itemData]);

        if (insertError) throw insertError;
        setSuccessMessage('Price list item added successfully!');
      }

      resetForm();
      await fetchPriceList();
      setActiveTab('list');

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving price list item:', err);
      setError(err.message || 'Failed to save price list item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: SeaFreightPriceListItem) => {
    setFormData({
      itemName: item.itemName,
      itemDescription: item.itemDescription,
      category: item.category,
      shippingType: item.shippingType,
      supplierPartsCost: item.supplierPartsCost,
      supplierPackingFee: item.supplierPackingFee,
      supplierBankingFee: item.supplierBankingFee,
      supplierOtherFees: item.supplierOtherFees,
      markupPercentage: item.markupPercentage,
      effectiveDate: item.effectiveDate.split('T')[0],
      expirationDate: item.expirationDate ? item.expirationDate.split('T')[0] : '',
      notes: item.notes || '',
      tags: item.tags.join(', ')
    });
    setEditingItemId(item.id);
    setActiveTab('add');
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this price list item?')) {
      return;
    }

    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('sea_freight_price_list')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      setSuccessMessage('Price list item deleted successfully!');
      await fetchPriceList();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting price list item:', err);
      setError(err.message || 'Failed to delete price list item');
    }
  };

  const handleToggleActive = async (itemId: string, currentStatus: boolean) => {
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('sea_freight_price_list')
        .update({ is_active: !currentStatus })
        .eq('id', itemId);

      if (updateError) throw updateError;

      setSuccessMessage(`Item ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      await fetchPriceList();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error toggling item status:', err);
      setError(err.message || 'Failed to update item status');
    }
  };

  const handleViewHistory = async (itemId: string) => {
    setViewHistoryItemId(itemId);
    setIsLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_sea_freight_price_history', { p_price_list_id: itemId });

      if (fetchError) throw fetchError;

      const transformedHistory: SeaFreightPriceHistory[] = (data || []).map((record: any) => ({
        id: record.id,
        priceListId: itemId,
        itemName: record.item_name,
        itemDescription: record.item_description,
        category: record.category,
        shippingType: record.shipping_type,
        supplierPartsCost: parseFloat(record.supplier_parts_cost),
        supplierPackingFee: parseFloat(record.supplier_packing_fee),
        supplierBankingFee: parseFloat(record.supplier_banking_fee),
        supplierOtherFees: parseFloat(record.supplier_other_fees),
        totalSupplierCost: parseFloat(record.total_supplier_cost),
        markupPercentage: parseFloat(record.markup_percentage),
        customerPrice: parseFloat(record.customer_price),
        currency: record.currency,
        changeReason: record.change_reason,
        changedAt: record.changed_at
      }));

      setPriceHistory(transformedHistory);
      setActiveTab('history');
    } catch (err: any) {
      console.error('Error fetching price history:', err);
      setError(err.message || 'Failed to fetch price history');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      itemName: '',
      itemDescription: '',
      category: 'General',
      shippingType: 'FCL 20ft',
      supplierPartsCost: 0,
      supplierPackingFee: 0,
      supplierBankingFee: 0,
      supplierOtherFees: 0,
      markupPercentage: 25,
      effectiveDate: new Date().toISOString().split('T')[0],
      expirationDate: '',
      notes: '',
      tags: ''
    });
    setEditingItemId(null);
  };

  if (!isOpen) return null;

  const canManage = hasPermission('quotes', 'update');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Ship className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Sea Freight Price List
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage global pricing for sea freight parts and shipping
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex space-x-4 mt-6">
            <button
              onClick={() => {
                setActiveTab('list');
                setViewHistoryItemId(null);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'list'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <List className="h-4 w-4" />
              <span>Price List ({filteredPriceList.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('add');
                resetForm();
                setViewHistoryItemId(null);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'add'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>{editingItemId ? 'Edit Item' : 'Add New Item'}</span>
            </button>
            {viewHistoryItemId && (
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'history'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <History className="h-4 w-4" />
                <span>Price History</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-800 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-800 dark:text-green-300">{successMessage}</span>
              </div>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={shippingTypeFilter}
                  onChange={(e) => setShippingTypeFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">All Shipping Types</option>
                  {SHIPPING_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <label className="flex items-center space-x-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <input
                    type="checkbox"
                    checked={showActiveOnly}
                    onChange={(e) => setShowActiveOnly(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active only</span>
                </label>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
              ) : filteredPriceList.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No price list items found</p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                  >
                    Add your first item
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Shipping Type
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Supplier Cost
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Markup
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Customer Price
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        {canManage && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredPriceList.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-4">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {item.itemName}
                              </div>
                              {item.itemDescription && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {item.itemDescription}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                            {item.category}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                            {item.shippingType}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              ${item.totalSupplierCost.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <Percent className="h-3 w-3 text-gray-400" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {item.markupPercentage.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                              ${item.customerPrice.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {item.isActive ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300">
                                Inactive
                              </span>
                            )}
                          </td>
                          {canManage && (
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => handleViewHistory(item.id)}
                                  className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                                  title="View history"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                                  title="Edit"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleActive(item.id, item.isActive)}
                                  className={`p-1.5 rounded ${
                                    item.isActive
                                      ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                                      : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                                  }`}
                                  title={item.isActive ? 'Deactivate' : 'Activate'}
                                >
                                  {item.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
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
          )}

          {activeTab === 'add' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {editingItemId ? 'Edit Price List Item' : 'Add New Price List Item'}
                </h3>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        value={formData.itemName}
                        onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="e.g., Engine V6 3.5L"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.itemDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, itemDescription: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Enter item description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Shipping Type
                    </label>
                    <select
                      value={formData.shippingType}
                      onChange={(e) => setFormData(prev => ({ ...prev, shippingType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {SHIPPING_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Supplier Cost Breakdown
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span>Parts/Item Cost ($)</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.supplierPartsCost || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, supplierPartsCost: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span>Packing Fee ($)</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.supplierPackingFee || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, supplierPackingFee: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <CreditCard className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          <span>Banking Fee ($)</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.supplierBankingFee || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, supplierBankingFee: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <DollarSign className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          <span>Other Fees ($)</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.supplierOtherFees || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, supplierOtherFees: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Total Supplier Cost:
                        </span>
                        <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                          ${calculateTotalSupplierCost().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Customer Pricing
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Percent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span>Markup Percentage (%)</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.markupPercentage || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, markupPercentage: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="25.00"
                        />
                      </div>
                    </div>

                    <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Customer Price</p>
                          <div className="flex items-baseline space-x-2">
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                              ${calculateCustomerPrice().toFixed(2)}
                            </p>
                            <span className="text-sm text-gray-500 dark:text-gray-400">AUD</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Profit Margin</p>
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {calculateProfitMargin().toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Profit Amount:</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            ${(calculateCustomerPrice() - calculateTotalSupplierCost()).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Additional Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Calendar className="h-4 w-4" />
                          <span>Effective Date</span>
                        </label>
                        <input
                          type="date"
                          value={formData.effectiveDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Calendar className="h-4 w-4" />
                          <span>Expiration Date (Optional)</span>
                        </label>
                        <input
                          type="date"
                          value={formData.expirationDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, expirationDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Tag className="h-4 w-4" />
                          <span>Tags (comma-separated)</span>
                        </label>
                        <input
                          type="text"
                          value={formData.tags}
                          onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="popular, premium, heavy"
                        />
                      </div>

                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FileText className="h-4 w-4" />
                          <span>Notes (Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Add any additional notes..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-6">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !canManage}
                      className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors ${
                        isSaving || !canManage
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>{editingItemId ? 'Update Item' : 'Save Item'}</span>
                        </>
                      )}
                    </button>
                    {editingItemId && (
                      <button
                        onClick={() => {
                          setEditingItemId(null);
                          resetForm();
                          setActiveTab('list');
                        }}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && viewHistoryItemId && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Price Change History
                </h3>
                <button
                  onClick={() => {
                    setViewHistoryItemId(null);
                    setActiveTab('list');
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Back to List
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
              ) : priceHistory.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <History className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No price changes recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {priceHistory.map((record) => (
                    <div
                      key={record.id}
                      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {record.itemName}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Changed: {new Date(record.changedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            ${record.customerPrice.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {record.markupPercentage.toFixed(1)}% markup
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Parts Cost</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            ${record.supplierPartsCost.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Packing Fee</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            ${record.supplierPackingFee.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Banking Fee</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            ${record.supplierBankingFee.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Supplier</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            ${record.totalSupplierCost.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {record.changeReason && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Reason:</span> {record.changeReason}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage your sea freight pricing catalog for easy quoting
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeaFreightPricingModal;
