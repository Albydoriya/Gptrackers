import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Ship,
  DollarSign,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  ChevronRight,
  Loader2,
  X
} from 'lucide-react';
import { SeaFreightPriceListItem } from '../types';
import { supabase } from '../lib/supabase';

interface PriceListSelectorProps {
  onSelect: (item: SeaFreightPriceListItem) => void;
  onClear: () => void;
  selectedItemId?: string;
  className?: string;
}

const SHIPPING_TYPES = ['FCL 20ft', 'FCL 40ft', 'LCL', 'Air Freight', 'Express'];

const PriceListSelector: React.FC<PriceListSelectorProps> = ({
  onSelect,
  onClear,
  selectedItemId,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [priceList, setPriceList] = useState<SeaFreightPriceListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [shippingTypeFilter, setShippingTypeFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<SeaFreightPriceListItem | null>(null);

  const categories = ['all', ...new Set(priceList.map(item => item.category))];

  useEffect(() => {
    if (isOpen) {
      fetchPriceList();
    }

    // Set up real-time subscription to monitor sea freight price changes
    const channel = supabase
      .channel('sea-freight-price-list-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sea_freight_price_list'
        },
        (payload) => {
          console.log('Sea freight price list changed:', payload);
          // Refetch price list when any change occurs
          if (isOpen) {
            fetchPriceList();
          }
        }
      )
      .subscribe();

    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  useEffect(() => {
    if (selectedItemId && priceList.length > 0) {
      const item = priceList.find(p => p.id === selectedItemId);
      if (item) {
        setSelectedItem(item);
      }
    }
  }, [selectedItemId, priceList]);

  const fetchPriceList = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sea_freight_price_list')
        .select('*')
        .eq('is_active', true)
        .lte('effective_date', new Date().toISOString())
        .or('expiration_date.is.null,expiration_date.gt.' + new Date().toISOString())
        .order('item_name');

      if (error) throw error;

      const transformedData: SeaFreightPriceListItem[] = (data || []).map(item => ({
        id: item.id,
        partId: item.part_id,
        itemName: item.item_name,
        itemDescription: item.item_description,
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
    } catch (error) {
      console.error('Error fetching price list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPriceList = priceList.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemDescription.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesShippingType = shippingTypeFilter === 'all' || item.shippingType === shippingTypeFilter;
    return matchesSearch && matchesCategory && matchesShippingType;
  });

  const handleSelectItem = (item: SeaFreightPriceListItem) => {
    setSelectedItem(item);
    onSelect(item);
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedItem(null);
    onClear();
  };

  const calculateProfitMargin = (supplierCost: number, customerPrice: number) => {
    if (customerPrice === 0) return 0;
    return ((customerPrice - supplierCost) / customerPrice * 100);
  };

  return (
    <div className={className}>
      {/* Selected Item Display or Trigger Button */}
      {selectedItem ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Ship className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{selectedItem.itemName}</h4>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs rounded">
                  From Price List
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{selectedItem.itemDescription}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Category:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.category}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Shipping Type:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.shippingType}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Supplier Cost:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">${selectedItem.totalSupplierCost.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Customer Price:</span>
                  <p className="font-medium text-green-600 dark:text-green-400">${selectedItem.customerPrice.toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1 text-purple-600 dark:text-purple-400">
                  <TrendingUp className="h-3 w-3" />
                  <span>Markup: {selectedItem.markupPercentage.toFixed(1)}%</span>
                </div>
                <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                  <DollarSign className="h-3 w-3" />
                  <span>Margin: {calculateProfitMargin(selectedItem.totalSupplierCost, selectedItem.customerPrice).toFixed(1)}%</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={() => setIsOpen(true)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
              >
                Change
              </button>
              <button
                onClick={handleClearSelection}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
        >
          <div className="flex items-center justify-center space-x-2">
            <Ship className="h-5 w-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            <span className="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
              Select from Price List
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Use standardized shipping pricing or enter manually below
          </p>
        </button>
      )}

      {/* Price List Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Select Sea Freight Pricing</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Choose a standardized price list item to apply to this quote
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Filters */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
                <select
                  value={shippingTypeFilter}
                  onChange={(e) => setShippingTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">All Shipping Types</option>
                  {SHIPPING_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price List Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
              ) : filteredPriceList.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No active price list items found</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPriceList.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{item.itemName}</h4>
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                              {item.shippingType}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{item.itemDescription}</p>

                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400 text-xs">Parts Cost</span>
                              <p className="font-medium text-gray-900 dark:text-gray-100">${item.supplierPartsCost.toFixed(2)}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400 text-xs">Other Fees</span>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                ${(item.supplierPackingFee + item.supplierBankingFee + item.supplierOtherFees).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400 text-xs">Total Cost</span>
                              <p className="font-medium text-gray-900 dark:text-gray-100">${item.totalSupplierCost.toFixed(2)}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400 text-xs">Customer Price</span>
                              <p className="font-semibold text-green-600 dark:text-green-400">${item.customerPrice.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 ml-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{filteredPriceList.length} items available</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceListSelector;
