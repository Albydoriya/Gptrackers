import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2,
  Calendar,
  DollarSign,
  Package,
  User,
  RefreshCw,
  SortAsc,
  SortDesc,
  X,
  Receipt,
  Truck,
  Globe,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { getStatusColor, getStatusLabel } from '../data/mockData';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ProtectedRoute from './ProtectedRoute';
import CreateOrder from './CreateOrder';
import EditOrder from './EditOrder';
import StatusUpdateModal from './StatusUpdateModal';
import PricingUpdateModal from './PricingUpdateModal';
import ShippingCostModal from './ShippingCostModal';

const Orders: React.FC = () => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'supplier'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchResults, setSearchResults] = useState<{
    orders: Order[];
    searchType: string;
    totalResults: number;
  } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
  const [statusUpdateOrder, setStatusUpdateOrder] = useState<Order | null>(null);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPricingUpdateOpen, setIsPricingUpdateOpen] = useState(false);
  const [pricingUpdateOrder, setPricingUpdateOrder] = useState<Order | null>(null);
  const [isShippingCostOpen, setIsShippingCostOpen] = useState(false);
  const [shippingCostOrder, setShippingCostOrder] = useState<Order | null>(null);

  // Fetch orders from Supabase
  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          supplier:suppliers(*),
          order_parts(
            *,
            part:parts(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform Supabase data to match Order interface
      const transformedOrders: Order[] = (data || []).map(orderData => ({
        id: orderData.id,
        orderNumber: orderData.order_number,
        supplier: {
          id: orderData.supplier.id,
          name: orderData.supplier.name,
          contactPerson: orderData.supplier.contact_person,
          email: orderData.supplier.email,
          phone: orderData.supplier.phone,
          address: orderData.supplier.address,
          rating: orderData.supplier.rating,
          deliveryTime: orderData.supplier.delivery_time,
          paymentTerms: orderData.supplier.payment_terms,
          isActive: orderData.supplier.is_active
        },
        parts: orderData.order_parts.map((orderPart: any) => ({
          id: orderPart.id,
          part: {
            id: orderPart.part.id,
            partNumber: orderPart.part.part_number,
            name: orderPart.part.name,
            description: orderPart.part.description,
            category: orderPart.part.category,
            specifications: orderPart.part.specifications,
            priceHistory: [], // We'll populate this separately if needed
            currentStock: orderPart.part.current_stock,
            minStock: orderPart.part.min_stock,
            preferredSuppliers: orderPart.part.preferred_suppliers
          },
          quantity: orderPart.quantity,
          unitPrice: orderPart.unit_price,
          totalPrice: orderPart.total_price
        })),
        status: orderData.status === 'pending_approval' ? 'pending_customer_approval' : orderData.status,
        totalAmount: orderData.total_amount,
        orderDate: orderData.order_date,
        expectedDelivery: orderData.expected_delivery,
        actualDelivery: orderData.actual_delivery,
        notes: orderData.notes,
        createdBy: orderData.created_by || 'Unknown', // This will be the UUID from database
        priority: orderData.priority,
        shippingData: orderData.shipping_data,
        attachments: orderData.attachments
      }));

      setOrdersList(transformedOrders);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Fetch orders on component mount
  React.useEffect(() => {
    fetchOrders();
  }, []);

  // Enhanced search function
  const performSearch = (searchValue: string) => {
    if (!searchValue.trim()) {
      setSearchResults(null);
      return;
    }

    const searchLower = searchValue.toLowerCase();
    const results: Order[] = [];
    const searchTypes: string[] = [];

    ordersList.forEach(order => {
      let matchFound = false;
      let matchTypes: string[] = [];

      // Search order number
      if (order.orderNumber.toLowerCase().includes(searchLower)) {
        matchFound = true;
        matchTypes.push('Order Number');
      }

      // Search supplier name
      if (order.supplier.name.toLowerCase().includes(searchLower)) {
        matchFound = true;
        matchTypes.push('Supplier');
      }

      // Search supplier contact person
      if (order.supplier.contactPerson.toLowerCase().includes(searchLower)) {
        matchFound = true;
        matchTypes.push('Contact Person');
      }

      // Search part names and part numbers
      order.parts.forEach(orderPart => {
        if (orderPart.part.name.toLowerCase().includes(searchLower)) {
          matchFound = true;
          if (!matchTypes.includes('Part Name')) {
            matchTypes.push('Part Name');
          }
        }
        if (orderPart.part.partNumber.toLowerCase().includes(searchLower)) {
          matchFound = true;
          if (!matchTypes.includes('Part Number')) {
            matchTypes.push('Part Number');
          }
        }
        if (orderPart.part.category.toLowerCase().includes(searchLower)) {
          matchFound = true;
          if (!matchTypes.includes('Category')) {
            matchTypes.push('Category');
          }
        }
      });

      // Search notes
      if (order.notes && order.notes.toLowerCase().includes(searchLower)) {
        matchFound = true;
        matchTypes.push('Notes');
      }

      // Search created by
      if (order.createdBy && order.createdBy.toLowerCase().includes(searchLower)) {
        matchFound = true;
        matchTypes.push('Created By');
      }

      if (matchFound) {
        results.push({ ...order, searchMatchTypes: matchTypes });
        matchTypes.forEach(type => {
          if (!searchTypes.includes(type)) {
            searchTypes.push(type);
          }
        });
      }
    });

    setSearchResults({
      orders: results,
      searchType: searchTypes.join(', '),
      totalResults: results.length
    });
  };

  // Sort function
  const sortOrders = (orders: Order[]) => {
    return [...orders].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
          break;
        case 'amount':
          comparison = a.totalAmount - b.totalAmount;
          break;
        case 'supplier':
          comparison = a.supplier.name.localeCompare(b.supplier.name);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // Apply filters and sorting
  const getDisplayOrders = () => {
    let ordersToDisplay = searchResults ? searchResults.orders : ordersList;
    
    // Apply status filter
    ordersToDisplay = ordersToDisplay.filter(order => 
      statusFilter === 'all' || order.status === statusFilter
    );
    
    // Apply sorting
    return sortOrders(ordersToDisplay);
  };

  const displayOrders = getDisplayOrders();

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    performSearch(value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending_customer_approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const handleOrderCreated = (newOrder: Order) => {
    // Refresh orders list after creation
    fetchOrders();
  };

  const handleOrderUpdated = (updatedOrder: Order) => {
    // Refresh orders list after update
    fetchOrders();
  };

  const handleStatusUpdate = (orderId: string, newStatus: OrderStatus, notes?: string) => {
    // Refresh orders list after status update
    fetchOrders();
    setIsStatusUpdateOpen(false);
    setStatusUpdateOrder(null);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setIsEditOrderOpen(true);
  };

  const handleStatusUpdateClick = (order: Order) => {
    setStatusUpdateOrder(order);
    setIsStatusUpdateOpen(true);
  };

  const handlePricingUpdateClick = (order: Order) => {
    setPricingUpdateOrder(order);
    setIsPricingUpdateOpen(true);
  };

  const handlePricingUpdate = (orderId: string, updatedParts: any[], attachments: any[]) => {
    // Refresh orders list after pricing update
    fetchOrders();
    setIsPricingUpdateOpen(false);
    setPricingUpdateOrder(null);
  };

  const handleShippingCostClick = (order: Order) => {
    setShippingCostOrder(order);
    setIsShippingCostOpen(true);
  };

  const handleShippingUpdate = (orderId: string, shippingData: any) => {
    // Refresh orders list after shipping update
    fetchOrders();
    setIsShippingCostOpen(false);
    setShippingCostOrder(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <button
            onClick={fetchOrders}
            disabled={isLoadingOrders}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh orders"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingOrders ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        {hasPermission('orders', 'create') && (
          <button 
            onClick={() => setIsCreateOrderOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Order</span>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error loading orders</h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              <button
                onClick={fetchOrders}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          {/* Search and Basic Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search orders, suppliers, parts, part numbers..."
                value={searchTerm}
                onChange={handleSearchChange}
                disabled={isLoadingOrders}
                className="pl-10 pr-10 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={isLoadingOrders}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
              <div className="flex items-center space-x-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'supplier')}
                  disabled={isLoadingOrders}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="date">Order Date</option>
                  <option value="amount">Total Amount</option>
                  <option value="supplier">Supplier Name</option>
                </select>
                <button
                  onClick={toggleSortOrder}
                  disabled={isLoadingOrders}
                  className="p-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {sortOrder === 'asc' ? (
                    <SortAsc className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <SortDesc className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Results Summary */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {isLoadingOrders ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading orders...</span>
                </span>
              ) : (
                searchResults ? (
                  <span className="flex items-center space-x-2">
                    <span>Found {searchResults.totalResults} result{searchResults.totalResults !== 1 ? 's' : ''}</span>
                    <span className="text-blue-600 dark:text-blue-400">({searchResults.searchType})</span>
                  </span>
                ) : (
                  <span>Showing {displayOrders.length} order{displayOrders.length !== 1 ? 's' : ''}</span>
                )
              )}
            </div>
          </div>

          {/* Search Results Info */}
          {searchResults && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Search Results for "{searchTerm}"
                  </span>
                </div>
                <button
                  onClick={clearSearch}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Clear Search
                </button>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Found {searchResults.totalResults} order{searchResults.totalResults !== 1 ? 's' : ''} matching: {searchResults.searchType}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Orders Table */}
      {/* Loading State */}
      {isLoadingOrders && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Loading Orders</h3>
            <p className="text-gray-600 dark:text-gray-400">Fetching the latest order data from the database...</p>
          </div>
        </div>
      )}

      {/* Orders Grid */}
      {!isLoadingOrders && !error && (
      <div className="grid grid-cols-1 gap-6">
        {displayOrders.map((order) => (
          <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Header Row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{order.orderNumber}</h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Ordered: {new Date(order.orderDate).toLocaleDateString()} • 
                      Expected: {new Date(order.expectedDelivery).toLocaleDateString()}
                    </p>
                    {(order as any).searchMatchTypes && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(order as any).searchMatchTypes.map((type: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Menu */}
                <div className="flex items-center space-x-2">
                  <div className="text-right mr-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      ${order.totalAmount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Amount</div>
                  </div>
                  
                  {/* Primary Actions */}
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="text-sm font-medium">View</span>
                    </button>
                    
                    <div className="relative group">
                      <button className="flex items-center space-x-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <span className="text-sm font-medium">Actions</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Dropdown Menu */}
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <div className="py-2">
                          {hasPermission('pricing', 'update') && (
                            <button 
                              onClick={() => handlePricingUpdateClick(order)}
                              className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <Receipt className="h-4 w-4 text-green-600" />
                              <span>Update Pricing & Quotes</span>
                            </button>
                          )}
                          
                          {hasPermission('orders', 'update') && (
                            <button 
                              onClick={() => handleStatusUpdateClick(order)}
                              className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <RefreshCw className="h-4 w-4 text-purple-600" />
                              <span>Update Status</span>
                            </button>
                          )}
                          
                          {order.status === 'delivered' && hasPermission('shipping', 'manage') && (
                            <button 
                              onClick={() => handleShippingCostClick(order)}
                              className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <Globe className="h-4 w-4 text-orange-600" />
                              <span>Shipping & Currency Data</span>
                            </button>
                          )}
                          
                          <div className="border-t border-gray-100 my-1"></div>
                          
                          {hasPermission('orders', 'update') && (
                            <button 
                              onClick={() => handleEditOrder(order)}
                              className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                              <span>Edit Order</span>
                            </button>
                          )}
                          
                          {hasPermission('orders', 'delete') && (
                            <button 
                              className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete Order</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Content Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Supplier Information */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-white dark:bg-gray-600 rounded-lg">
                      <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Supplier</h4>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{order.supplier.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{order.supplier.contactPerson}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{order.supplier.email}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.floor(order.supplier.rating)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{order.supplier.rating}/5</span>
                    </div>
                  </div>
                </div>
                
                {/* Parts Summary */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-white dark:bg-gray-600 rounded-lg">
                      <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Parts Summary</h4>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Items:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{order.parts.length}</span>
                    </div>
                    <div className="space-y-1">
                      {order.parts.slice(0, 3).map((orderPart, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700 dark:text-gray-300 truncate max-w-32">{orderPart.part.name}</span>
                          <span className="text-gray-500 dark:text-gray-400">×{orderPart.quantity}</span>
                        </div>
                      ))}
                      {order.parts.length > 3 && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          +{order.parts.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Order Progress */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-white dark:bg-gray-600 rounded-lg">
                      <Truck className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Order Progress</h4>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Progress</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {order.status === 'delivered' ? '100%' : 
                           order.status === 'in_transit' ? '80%' :
                           order.status === 'ordered' ? '60%' :
                           order.status === 'approved' ? '40%' :
                           order.status === 'pending_customer_approval' ? '20%' : '10%'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            order.status === 'delivered' ? 'bg-green-500 w-full' :
                            order.status === 'in_transit' ? 'bg-orange-500 w-4/5' :
                            order.status === 'ordered' ? 'bg-blue-500 w-3/5' :
                            order.status === 'approved' ? 'bg-purple-500 w-2/5' :
                            order.status === 'pending_customer_approval' ? 'bg-yellow-500 w-1/5' : 'bg-gray-400 w-1/12'
                          }`}
                        ></div>
                      </div>
                    </div>
                    {order.notes && (
                      <div className="mt-2 p-2 bg-white dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300">
                        <strong>Notes:</strong> {order.notes.length > 60 ? `${order.notes.substring(0, 60)}...` : order.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* No Results Message */}
      {!isLoadingOrders && !error && displayOrders.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {searchResults ? 'No matching orders found' : 'No orders found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchResults 
              ? `No orders match your search criteria "${searchTerm}"`
              : 'Try adjusting your filters or create a new order'
            }
          </p>
          {searchResults && (
            <button
              onClick={clearSearch}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              Clear search and show all orders
            </button>
          )}
        </div>
      )}


      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Order Details - {selectedOrder.orderNumber}
                </h3>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount</label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    ${selectedOrder.totalAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order Date</label>
                  <p className="text-gray-900 dark:text-gray-100">{new Date(selectedOrder.orderDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expected Delivery</label>
                  <p className="text-gray-900 dark:text-gray-100">{new Date(selectedOrder.expectedDelivery).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier</label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{selectedOrder.supplier.name}</p>
                  <p className="text-gray-600 dark:text-gray-400">{selectedOrder.supplier.contactPerson}</p>
                  <p className="text-gray-600 dark:text-gray-400">{selectedOrder.supplier.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Order Items</label>
                <div className="space-y-2">
                  {selectedOrder.parts.map((orderPart, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{orderPart.part.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{orderPart.part.partNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {orderPart.quantity} × ${orderPart.unitPrice}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Total: ${orderPart.totalPrice.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                  <p className="mt-1 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      <CreateOrder
        isOpen={isCreateOrderOpen}
        onClose={() => setIsCreateOrderOpen(false)}
        onOrderCreated={handleOrderCreated}
      />

      {/* Edit Order Modal */}
      <EditOrder
        isOpen={isEditOrderOpen}
        onClose={() => {
          setIsEditOrderOpen(false);
          setEditingOrder(null);
        }}
        onOrderUpdated={handleOrderUpdated}
        order={editingOrder}
      />

      {/* Status Update Modal */}
      <StatusUpdateModal
        isOpen={isStatusUpdateOpen}
        onClose={() => {
          setIsStatusUpdateOpen(false);
          setStatusUpdateOrder(null);
        }}
        order={statusUpdateOrder}
        onStatusUpdate={handleStatusUpdate}
      />

      {/* Pricing Update Modal */}
      <PricingUpdateModal
        isOpen={isPricingUpdateOpen}
        onClose={() => {
          setIsPricingUpdateOpen(false);
          setPricingUpdateOrder(null);
        }}
        order={pricingUpdateOrder}
        onPricingUpdate={handlePricingUpdate}
      />

      {/* Shipping Cost Modal */}
      <ShippingCostModal
        isOpen={isShippingCostOpen}
        onClose={() => {
          setIsShippingCostOpen(false);
          setShippingCostOrder(null);
        }}
        order={shippingCostOrder}
        onShippingUpdate={handleShippingUpdate}
      />
    </div>
  );
};

export default Orders;