import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Package, 
  ShoppingCart, 
  Users, 
  Clock,
  ArrowRight,
  Filter,
  Loader2
} from 'lucide-react';
import { orders, getGlobalSuppliers, getStatusColor, getStatusLabel } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { Order, Part, Supplier } from '../types';

interface SearchResult {
  id: string;
  type: 'order' | 'part' | 'supplier';
  title: string;
  subtitle: string;
  description: string;
  metadata: string;
  data: Order | Part | Supplier;
  matchedFields: string[];
}

interface GlobalSearchProps {
  onNavigate?: (type: string, id: string) => void;
  onTabChange?: (tab: string) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate, onTabChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState<'all' | 'orders' | 'parts' | 'suppliers'>('all');
  const [parts, setParts] = useState<Part[]>([]);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch parts from Supabase
  useEffect(() => {
    const fetchParts = async () => {
      try {
        const { data, error } = await supabase
          .from('parts')
          .select('*, price_history:part_price_history(*)');

        if (error) throw error;

        const transformedParts: Part[] = (data || []).map(part => ({
          id: part.id,
          partNumber: part.part_number,
          name: part.name,
          description: part.description,
          category: part.category,
          specifications: part.specifications || {},
          currentStock: part.current_stock || 0,
          minStock: part.min_stock || 0,
          preferredSuppliers: part.preferred_suppliers || [],
          priceHistory: (part.price_history || []).map((ph: any) => ({
            date: ph.effective_date,
            price: parseFloat(ph.price),
            supplier: ph.supplier_name,
            quantity: ph.quantity || 1
          }))
        }));

        setParts(transformedParts);
      } catch (error) {
        console.error('Error fetching parts:', error);
      }
    };

    fetchParts();
  }, []);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0) {
            handleResultClick(results[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Perform search
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    // Simulate search delay for better UX
    await new Promise(resolve => setTimeout(resolve, 150));

    const searchResults: SearchResult[] = [];
    const searchLower = query.toLowerCase();

    // Search Orders
    if (activeFilter === 'all' || activeFilter === 'orders') {
      orders.forEach(order => {
        const matchedFields: string[] = [];
        let matches = false;

        // Search order number
        if (order.orderNumber.toLowerCase().includes(searchLower)) {
          matchedFields.push('Order Number');
          matches = true;
        }

        // Search supplier name
        if (order.supplier.name.toLowerCase().includes(searchLower)) {
          matchedFields.push('Supplier');
          matches = true;
        }

        // Search notes
        if (order.notes && order.notes.toLowerCase().includes(searchLower)) {
          matchedFields.push('Notes');
          matches = true;
        }

        // Search created by
        if (order.createdBy.toLowerCase().includes(searchLower)) {
          matchedFields.push('Created By');
          matches = true;
        }

        // Search parts in order
        order.parts.forEach(orderPart => {
          if (orderPart.part.name.toLowerCase().includes(searchLower) ||
              orderPart.part.partNumber.toLowerCase().includes(searchLower)) {
            matchedFields.push('Parts');
            matches = true;
          }
        });

        if (matches) {
          searchResults.push({
            id: order.id,
            type: 'order',
            title: order.orderNumber,
            subtitle: order.supplier.name,
            description: `${order.parts.length} items • $${order.totalAmount.toLocaleString()}`,
            metadata: `${getStatusLabel(order.status)} • ${new Date(order.orderDate).toLocaleDateString()}`,
            data: order,
            matchedFields
          });
        }
      });
    }

    // Search Parts
    if (activeFilter === 'all' || activeFilter === 'parts') {
      parts.forEach(part => {
        const matchedFields: string[] = [];
        let matches = false;

        // Search part number
        if (part.partNumber.toLowerCase().includes(searchLower)) {
          matchedFields.push('Part Number');
          matches = true;
        }

        // Search part name
        if (part.name.toLowerCase().includes(searchLower)) {
          matchedFields.push('Name');
          matches = true;
        }

        // Search description
        if (part.description.toLowerCase().includes(searchLower)) {
          matchedFields.push('Description');
          matches = true;
        }

        // Search category
        if (part.category.toLowerCase().includes(searchLower)) {
          matchedFields.push('Category');
          matches = true;
        }

        // Search specifications
        Object.entries(part.specifications).forEach(([key, value]) => {
          if (key.toLowerCase().includes(searchLower) || 
              value.toLowerCase().includes(searchLower)) {
            matchedFields.push('Specifications');
            matches = true;
          }
        });

        if (matches) {
          const currentPrice = part.priceHistory.length > 0 
            ? part.priceHistory[part.priceHistory.length - 1].price 
            : 0;
          
          const stockStatus = part.currentStock <= part.minStock ? 'Low Stock' : 'In Stock';
          
          searchResults.push({
            id: part.id,
            type: 'part',
            title: part.name,
            subtitle: part.partNumber,
            description: `${part.category} • $${currentPrice.toFixed(2)}`,
            metadata: `${stockStatus} • ${part.currentStock} units`,
            data: part,
            matchedFields
          });
        }
      });
    }

    // Search Suppliers
    if (activeFilter === 'all' || activeFilter === 'suppliers') {
      getGlobalSuppliers().forEach(supplier => {
        const matchedFields: string[] = [];
        let matches = false;

        // Search supplier name
        if (supplier.name.toLowerCase().includes(searchLower)) {
          matchedFields.push('Company Name');
          matches = true;
        }

        // Search contact person
        if (supplier.contactPerson.toLowerCase().includes(searchLower)) {
          matchedFields.push('Contact Person');
          matches = true;
        }

        // Search email
        if (supplier.email.toLowerCase().includes(searchLower)) {
          matchedFields.push('Email');
          matches = true;
        }

        // Search phone
        if (supplier.phone.toLowerCase().includes(searchLower)) {
          matchedFields.push('Phone');
          matches = true;
        }

        if (matches) {
          const supplierOrders = orders.filter(order => order.supplier.id === supplier.id);
          
          searchResults.push({
            id: supplier.id,
            type: 'supplier',
            title: supplier.name,
            subtitle: supplier.contactPerson,
            description: `${supplier.email} • ${supplier.phone}`,
            metadata: `${supplier.rating}/5 rating • ${supplierOrders.length} orders`,
            data: supplier,
            matchedFields
          });
        }
      });
    }

    // Sort results by relevance (exact matches first, then partial matches)
    searchResults.sort((a, b) => {
      const aExact = a.title.toLowerCase() === searchLower || a.subtitle.toLowerCase() === searchLower;
      const bExact = b.title.toLowerCase() === searchLower || b.subtitle.toLowerCase() === searchLower;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then sort by type priority (orders, parts, suppliers)
      const typePriority = { order: 0, part: 1, supplier: 2 };
      return typePriority[a.type] - typePriority[b.type];
    });

    setResults(searchResults);
    setIsLoading(false);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedIndex(-1);
    
    if (value.trim()) {
      setIsOpen(true);
      performSearch(value);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setSearchTerm('');
    setResults([]);
    setSelectedIndex(-1);
    
    // Navigate to the appropriate tab and item
    switch (result.type) {
      case 'order':
        onTabChange?.('orders');
        break;
      case 'part':
        onTabChange?.('parts');
        break;
      case 'supplier':
        onTabChange?.('suppliers');
        break;
    }
    
    // Optional: trigger specific item view
    onNavigate?.(result.type, result.id);
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Get result icon
  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="h-4 w-4" />;
      case 'part':
        return <Package className="h-4 w-4" />;
      case 'supplier':
        return <Users className="h-4 w-4" />;
    }
  };

  // Get result color
  const getResultColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'order':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      case 'part':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'supplier':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30';
    }
  };

  const filteredResults = results.slice(0, 8); // Limit to 8 results for better UX

  return (
    <div className="relative" ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search parts, orders, suppliers..."
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={() => searchTerm && setIsOpen(true)}
          className="pl-10 pr-10 py-2 w-64 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden">
          {/* Search Header */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {isLoading ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
                </span>
              </div>
              
              {/* Filter Buttons */}
              <div className="flex items-center space-x-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'orders', label: 'Orders' },
                  { key: 'parts', label: 'Parts' },
                  { key: 'suppliers', label: 'Suppliers' }
                ].map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => {
                      setActiveFilter(filter.key as any);
                      if (searchTerm) performSearch(searchTerm);
                    }}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      activeFilter === filter.key
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Searching...</p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {searchTerm ? 'No results found' : 'Start typing to search'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {searchTerm 
                    ? `No matches for "${searchTerm}"`
                    : 'Search across orders, parts, and suppliers'
                  }
                </p>
              </div>
            ) : (
              <div className="py-2">
                {filteredResults.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selectedIndex === index ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${getResultColor(result.type)}`}>
                        {getResultIcon(result.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {result.title}
                          </h4>
                          <ArrowRight className="h-3 w-3 text-gray-400 dark:text-gray-500 ml-2" />
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {result.subtitle}
                        </p>
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                          {result.description}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {result.metadata}
                          </span>
                          
                          {result.matchedFields.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {result.matchedFields.slice(0, 2).map((field, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                                >
                                  {field}
                                </span>
                              ))}
                              {result.matchedFields.length > 2 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  +{result.matchedFields.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                
                {results.length > 8 && (
                  <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <p className="text-xs text-center text-gray-600 dark:text-gray-400">
                      Showing first 8 of {results.length} results
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search Tips */}
          {!searchTerm && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="text-center">
                  <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                  <p className="text-gray-600 dark:text-gray-400">Orders</p>
                </div>
                <div className="text-center">
                  <Package className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                  <p className="text-gray-600 dark:text-gray-400">Parts</p>
                </div>
                <div className="text-center">
                  <Users className="h-4 w-4 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                  <p className="text-gray-600 dark:text-gray-400">Suppliers</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;