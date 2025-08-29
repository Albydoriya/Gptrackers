import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Package, 
  TrendingUp, 
  AlertTriangle,
  Edit,
  Trash2,
  BarChart3,
  Archive,
  RefreshCw
} from 'lucide-react';
import { Part } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AddPart from './AddPart';
import EditPart from './EditPart';

function Parts() {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [isEditPartOpen, setIsEditPartOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch parts from Supabase
  const fetchParts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('parts')
        .select(`
          *,
          price_history:part_price_history(*)
        `)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform Supabase data to match Part interface
      const transformedParts: Part[] = (data || []).map(partData => ({
        id: partData.id,
        partNumber: partData.part_number,
        name: partData.name,
        description: partData.description,
        category: partData.category,
        specifications: partData.specifications || {},
        priceHistory: (partData.price_history || []).map((history: any) => ({
          date: history.effective_date,
          price: history.price,
          supplier: history.supplier_name,
          quantity: history.quantity
        })),
        currentStock: partData.current_stock,
        minStock: partData.min_stock,
        preferredSuppliers: partData.preferred_suppliers || [],
        // New markup percentages
        internalUsageMarkupPercentage: partData.internal_usage_markup_percentage || 0,
        wholesaleMarkupPercentage: partData.wholesale_markup_percentage || 0,
        tradeMarkupPercentage: partData.trade_markup_percentage || 0,
        retailMarkupPercentage: partData.retail_markup_percentage || 0,
        // Calculate pricing tiers
        internalUsagePrice: (() => {
          const currentPrice = (partData.price_history && partData.price_history.length > 0)
            ? parseFloat(partData.price_history[partData.price_history.length - 1].price)
            : 0;
          return currentPrice * (1 + (partData.internal_usage_markup_percentage || 0) / 100);
        })(),
        wholesalePrice: (() => {
          const currentPrice = (partData.price_history && partData.price_history.length > 0)
            ? parseFloat(partData.price_history[partData.price_history.length - 1].price)
            : 0;
          return currentPrice * (1 + (partData.wholesale_markup_percentage || 0) / 100);
        })(),
        tradePrice: (() => {
          const currentPrice = (partData.price_history && partData.price_history.length > 0)
            ? parseFloat(partData.price_history[partData.price_history.length - 1].price)
            : 0;
          return currentPrice * (1 + (partData.trade_markup_percentage || 0) / 100);
        })(),
        retailPrice: (() => {
          const currentPrice = (partData.price_history && partData.price_history.length > 0)
            ? parseFloat(partData.price_history[partData.price_history.length - 1].price)
            : 0;
          return currentPrice * (1 + (partData.retail_markup_percentage || 0) / 100);
        })()
        // New markup percentages
        internalUsageMarkupPercentage: partData.internal_usage_markup_percentage || 0,
        wholesaleMarkupPercentage: partData.wholesale_markup_percentage || 0,
        tradeMarkupPercentage: partData.trade_markup_percentage || 0,
        retailMarkupPercentage: partData.retail_markup_percentage || 0,
        // Calculate pricing tiers
        internalUsagePrice: (() => {
          const currentPrice = (partData.price_history && partData.price_history.length > 0)
            ? parseFloat(partData.price_history[partData.price_history.length - 1].price)
            : 0;
          return currentPrice * (1 + (partData.internal_usage_markup_percentage || 0) / 100);
        })(),
        wholesalePrice: (() => {
          const currentPrice = (partData.price_history && partData.price_history.length > 0)
            ? parseFloat(partData.price_history[partData.price_history.length - 1].price)
            : 0;
          return currentPrice * (1 + (partData.wholesale_markup_percentage || 0) / 100);
        })(),
        tradePrice: (() => {
          const currentPrice = (partData.price_history && partData.price_history.length > 0)
            ? parseFloat(partData.price_history[partData.price_history.length - 1].price)
            : 0;
          return currentPrice * (1 + (partData.trade_markup_percentage || 0) / 100);
        })(),
        retailPrice: (() => {
          const currentPrice = (partData.price_history && partData.price_history.length > 0)
            ? parseFloat(partData.price_history[partData.price_history.length - 1].price)
            : 0;
          return currentPrice * (1 + (partData.retail_markup_percentage || 0) / 100);
        })()
      }));

      setParts(transformedParts);
    } catch (err: any) {
      console.error('Error fetching parts:', err);
      setError(err.message || 'Failed to fetch parts');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch parts on component mount
  React.useEffect(() => {
    fetchParts();
  }, []);

  const handlePartAdded = (newPart: Part) => {
    fetchParts(); // Refresh the parts list from Supabase
  };

  const handlePartUpdated = (updatedPart: Part) => {
    fetchParts(); // Refresh the parts list from Supabase
    setIsEditPartOpen(false);
    setEditingPart(null);
  };

  const handleEditPart = (part: Part) => {
    setEditingPart(part);
    setIsEditPartOpen(true);
  };

  const handleArchivePart = async (partId: string, partName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to archive "${partName}"?\n\nThis will hide the part from the active catalog but preserve all data and history. You can restore it later if needed.`
    );
    
    if (!confirmed) return;

    setError(null);
    
    try {
      const { error: archiveError } = await supabase
        .from('parts')
        .update({ 
          is_archived: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', partId);

      if (archiveError) throw archiveError;

      // Refresh the parts list to remove the archived part
      await fetchParts();
      
    } catch (err: any) {
      console.error('Error archiving part:', err);
      setError(`Failed to archive part: ${err.message}`);
    }
  };

  const categories = ['all', ...new Set(parts.map(p => p.category))];

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.partNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || part.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (part: Part) => {
    if (part.currentStock <= part.minStock) {
      return { status: 'low', color: 'text-red-600 bg-red-50', label: 'Low Stock' };
    } else if (part.currentStock <= part.minStock * 1.5) {
      return { status: 'medium', color: 'text-yellow-600 bg-yellow-50', label: 'Medium Stock' };
    }
    return { status: 'good', color: 'text-green-600 bg-green-50', label: 'Good Stock' };
  };

  const getCurrentPrice = (part: Part) => {
    if (part.priceHistory.length === 0) return 0;
    return part.priceHistory[part.priceHistory.length - 1].price;
  };

  const getPriceTrend = (part: Part) => {
    if (part.priceHistory.length < 2) return { trend: 'stable', percentage: 0 };
    
    const latest = part.priceHistory[part.priceHistory.length - 1].price;
    const previous = part.priceHistory[part.priceHistory.length - 2].price;
    const percentage = ((latest - previous) / previous) * 100;
    
    if (percentage > 2) return { trend: 'up', percentage };
    if (percentage < -2) return { trend: 'down', percentage };
    return { trend: 'stable', percentage };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Parts Catalog</h1>
          <button
            onClick={fetchParts}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh parts"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        {hasPermission('parts', 'create') && (
          <button 
            onClick={() => setIsAddPartOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Part</span>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error loading parts</h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              <button
                onClick={fetchParts}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search parts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Parts Grid */}
      {/* Loading State */}
      {isLoading && !error && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Parts</h3>
            <p className="text-gray-600">Fetching the latest parts data from the database...</p>
          </div>
        </div>
      )}

      {/* Parts Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParts.map((part) => {
            const stockStatus = getStockStatus(part);
            const priceTrend = getPriceTrend(part);
            const currentPrice = getCurrentPrice(part);

            return (
              <div key={part.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{part.name}</h3>
                        <p className="text-sm text-gray-600">{part.partNumber}</p>
                      </div>
                    </div>
                    
                    {/* Action Menu */}
                    <div className="relative group">
                      <button className="flex items-center space-x-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                        <span className="text-sm font-medium">Actions</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Dropdown Menu */}
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <div className="py-2">
                          <button 
                            onClick={() => setSelectedPart(part)}
                            className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                            <span>View Details</span>
                          </button>
                          
                          {hasPermission('parts', 'update') && (
                            <button 
                              onClick={() => handleEditPart(part)}
                              className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Edit className="h-4 w-4 text-green-600" />
                              <span>Edit Part</span>
                            </button>
                          )}
                          
                          {hasPermission('parts', 'delete') && (
                            <>
                              <div className="border-t border-gray-100 my-1"></div>
                              <button 
                                onClick={() => handleArchivePart(part.id, part.name)}
                                className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Archive className="h-4 w-4" />
                                <span>Archive Part</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{part.description}</p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Category</span>
                      <span className="text-sm font-medium text-gray-900">{part.category}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Current Price</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">${currentPrice.toFixed(2)}</span>
                        {priceTrend.trend === 'up' && (
                          <TrendingUp className="h-3 w-3 text-red-500" />
                        )}
                        {priceTrend.trend === 'down' && (
                          <TrendingUp className="h-3 w-3 text-green-500 rotate-180" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Stock Level</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {part.currentStock} / {part.minStock}
                        </span>
                        {stockStatus.status === 'low' && (
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                        {stockStatus.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No Results Message */}
      {!isLoading && !error && filteredParts.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No parts found</h3>
          <p className="text-gray-600 mb-4">
            {parts.length === 0 
              ? 'No parts have been added to the catalog yet'
              : 'No parts match your current search criteria'
            }
          </p>
          {hasPermission('parts', 'create') && parts.length === 0 && (
            <button
              onClick={() => setIsAddPartOpen(true)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Add your first part
            </button>
          )}
        </div>
      )}

      {/* Part Details Modal */}
      {selectedPart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedPart.name} - Price History
                </h3>
                <button 
                  onClick={() => setSelectedPart(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Part Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Part Number:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{selectedPart.partNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Category:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{selectedPart.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Current Stock:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{selectedPart.currentStock}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Minimum Stock:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{selectedPart.minStock}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Specifications</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedPart.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Pricing Tiers</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Internal Usage:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      ${selectedPart.internalUsagePrice?.toFixed(2)} ({selectedPart.internalUsageMarkupPercentage?.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Wholesale:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      ${selectedPart.wholesalePrice?.toFixed(2)} ({selectedPart.wholesaleMarkupPercentage?.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Trade:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      ${selectedPart.tradePrice?.toFixed(2)} ({selectedPart.tradeMarkupPercentage?.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Retail:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      ${selectedPart.retailPrice?.toFixed(2)} ({selectedPart.retailMarkupPercentage?.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Price History</h4>
                <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Supplier</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                      </tr>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Pricing Tiers</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Internal Usage:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      ${selectedPart.internalUsagePrice?.toFixed(2)} ({selectedPart.internalUsageMarkupPercentage?.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Wholesale:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      ${selectedPart.wholesalePrice?.toFixed(2)} ({selectedPart.wholesaleMarkupPercentage?.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Trade:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      ${selectedPart.tradePrice?.toFixed(2)} ({selectedPart.tradeMarkupPercentage?.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Retail:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      ${selectedPart.retailPrice?.toFixed(2)} ({selectedPart.retailMarkupPercentage?.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                      {selectedPart.priceHistory.map((history, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                            {new Date(history.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                            ${history.price.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                            {history.supplier}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                            {history.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      <AddPart
        isOpen={isAddPartOpen}
        onClose={() => setIsAddPartOpen(false)}
        onPartAdded={handlePartAdded}
      />

      {/* Edit Part Modal */}
      <EditPart
        isOpen={isEditPartOpen}
        onClose={() => {
          setIsEditPartOpen(false);
          setEditingPart(null);
        }}
        onPartUpdated={handlePartUpdated}
        part={editingPart}
      />
    </div>
  );
}

export default Parts;