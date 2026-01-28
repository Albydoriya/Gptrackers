import React, { useState, useEffect, useCallback } from 'react';
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
  AlertCircle,
  FileDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  ExternalLink
} from 'lucide-react';
import { getStatusColor, getStatusLabel } from '../data/mockData';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import CreateOrder from './CreateOrder';
import EditOrder from './EditOrder';
import StatusUpdateModal from './StatusUpdateModal';
import PricingUpdateModal from './PricingUpdateModal';
import ShippingCostModal from './ShippingCostModal';
import { exportOrderTemplate, downloadExcelFile, generateExportFilename, updateOrderStatus as updateOrderStatusService } from '../services/orderExportService';
import { fetchOrders as fetchOrdersService, fetchStatusCounts, StatusCounts } from '../services/ordersService';

const PAGE_SIZE = 25;
const STORAGE_KEY = 'orders_status_filter';

const Orders: React.FC = () => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'approved';
  });
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'supplier'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    all: 0,
    draft: 0,
    supplier_quoting: 0,
    pending_customer_approval: 0,
    approved: 0,
    ordered: 0,
    in_transit: 0,
    delivered: 0,
    cancelled: 0
  });
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
  const [selectedOrdersForExport, setSelectedOrdersForExport] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch orders using service layer
  const fetchOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    setError(null);

    try {
      const result = await fetchOrdersService({
        status: statusFilter,
        searchTerm: debouncedSearchTerm,
        sortBy,
        sortOrder,
        page: currentPage,
        pageSize: PAGE_SIZE
      });

      setOrdersList(result.orders);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setIsLoadingOrders(false);
    }
  }, [statusFilter, debouncedSearchTerm, sortBy, sortOrder, currentPage]);

  // Fetch status counts
  const loadStatusCounts = useCallback(async () => {
    try {
      const counts = await fetchStatusCounts();
      setStatusCounts(counts);
    } catch (err: any) {
      console.error('Error fetching status counts:', err);
    }
  }, []);

  // Fetch orders when dependencies change
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Load status counts on mount and after changes
  useEffect(() => {
    loadStatusCounts();
  }, [loadStatusCounts]);

  // Save status filter to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, statusFilter);
  }, [statusFilter]);

  // Keyboard shortcuts for status switching
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement) {
        return;
      }

      const statusMap: { [key: string]: string } = {
        '1': 'all',
        '2': 'draft',
        '3': 'supplier_quoting',
        '4': 'pending_customer_approval',
        '5': 'approved',
        '6': 'ordered',
        '7': 'in_transit',
        '8': 'delivered',
        '9': 'cancelled'
      };

      if (statusMap[e.key]) {
        e.preventDefault();
        setStatusFilter(statusMap[e.key]);
        setCurrentPage(1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Handle status filter change
  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses', key: '1', count: statusCounts.all },
    { value: 'draft', label: 'Draft', key: '2', count: statusCounts.draft },
    { value: 'supplier_quoting', label: 'Supplier Quoting', key: '3', count: statusCounts.supplier_quoting },
    { value: 'pending_customer_approval', label: 'Pending Approval', key: '4', count: statusCounts.pending_customer_approval },
    { value: 'approved', label: 'Approved', key: '5', count: statusCounts.approved },
    { value: 'ordered', label: 'Ordered', key: '6', count: statusCounts.ordered },
    { value: 'in_transit', label: 'In Transit', key: '7', count: statusCounts.in_transit },
    { value: 'delivered', label: 'Delivered', key: '8', count: statusCounts.delivered },
    { value: 'cancelled', label: 'Cancelled', key: '9', count: statusCounts.cancelled },
  ];

  const handleOrderCreated = (newOrder: Order) => {
    fetchOrders();
    loadStatusCounts();
  };

  const handleOrderUpdated = (updatedOrder: Order) => {
    fetchOrders();
    loadStatusCounts();
  };

  const handleStatusUpdate = (orderId: string, newStatus: OrderStatus, notes?: string) => {
    fetchOrders();
    loadStatusCounts();
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
    fetchOrders();
    loadStatusCounts();
    setIsPricingUpdateOpen(false);
    setPricingUpdateOrder(null);
  };

  const handleShippingCostClick = (order: Order) => {
    setShippingCostOrder(order);
    setIsShippingCostOpen(true);
  };

  const handleShippingUpdate = (orderId: string, shippingData: any) => {
    fetchOrders();
    loadStatusCounts();
    setIsShippingCostOpen(false);
    setShippingCostOrder(null);
  };

  // Export handler
  const handleExportSelectedOrders = async () => {
    if (selectedOrdersForExport.size === 0) return;

    setIsExporting(true);
    setExportError(null);
    let successCount = 0;
    const failedExports: Array<{ orderNumber: string; error: string }> = [];

    try {
      for (const orderId of selectedOrdersForExport) {
        const order = ordersList.find(o => o.id === orderId);
        if (!order) continue;

        try {
          const filename = generateExportFilename(order.supplier.name, order.orderNumber);
          const blob = await exportOrderTemplate(orderId);
          await downloadExcelFile(blob, filename);

          if (order.status === 'approved') {
            await updateOrderStatusService(orderId, 'supplier_quoting');
          }

          successCount++;
        } catch (error: any) {
          console.error(`Failed to export order ${order.orderNumber}:`, error);
          failedExports.push({
            orderNumber: order.orderNumber,
            error: error.message || 'Unknown error'
          });
        }
      }

      if (successCount > 0) {
        if (failedExports.length > 0) {
          const failedDetails = failedExports.map(f => `${f.orderNumber}: ${f.error}`).join('\n');
          alert(`Successfully exported ${successCount} order(s)\n\nFailed exports:\n${failedDetails}`);
        } else {
          alert(`Successfully exported ${successCount} order(s)`);
        }
        setSelectedOrdersForExport(new Set());
        await fetchOrders();
        await loadStatusCounts();
      } else {
        const errorDetails = failedExports.map(f => `• ${f.orderNumber}: ${f.error}`).join('\n');
        throw new Error(`All exports failed:\n\n${errorDetails}`);
      }
    } catch (error: any) {
      console.error('Export error:', error);
      setExportError(error.message || 'Failed to export orders');
    } finally {
      setIsExporting(false);
    }
  };

  // Checkbox handlers
  const handleSelectOrder = (orderId: string) => {
    const newSelection = new Set(selectedOrdersForExport);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrdersForExport(newSelection);
  };

  const handleSelectAll = () => {
    const exportableOrders = ordersList.filter(order =>
      ['approved', 'supplier_quoting'].includes(order.status)
    );

    if (selectedOrdersForExport.size === exportableOrders.length && exportableOrders.length > 0) {
      setSelectedOrdersForExport(new Set());
    } else {
      setSelectedOrdersForExport(new Set(exportableOrders.map(o => o.id)));
    }
  };

  const canExportOrder = (order: Order) => {
    return ['approved', 'supplier_quoting'].includes(order.status);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Orders Management</h1>
          <button
            onClick={fetchOrders}
            disabled={isLoadingOrders}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh orders"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingOrders ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        <div className="flex items-center space-x-3">
          {hasPermission('orders', 'create') && selectedOrdersForExport.size > 0 && (
            <button
              onClick={handleExportSelectedOrders}
              disabled={isExporting}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  <span>Export for Quote ({selectedOrdersForExport.size})</span>
                </>
              )}
            </button>
          )}
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
      </div>

      {/* Error Messages */}
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

      {exportError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex justify-between">
            <div className="flex space-x-3 flex-1">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Export Error</h3>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1 whitespace-pre-line">{exportError}</p>
              </div>
            </div>
            <button
              onClick={() => setExportError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          {/* Search and Basic Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
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
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                disabled={isLoadingOrders}
                title="Press 1-9 to quickly switch status filters"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count}) [{option.key}]
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
                  className="p-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
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
                <span>
                  Showing {totalCount > 0 ? ((currentPage - 1) * PAGE_SIZE + 1) : 0}-{Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} order{totalCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Search Info */}
          {searchTerm && (
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
        {ordersList.map((order) => (
          <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Header Row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  {canExportOrder(order) && (
                    <input
                      type="checkbox"
                      checked={selectedOrdersForExport.has(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                      className="h-5 w-5 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 cursor-pointer"
                      title="Select for export"
                    />
                  )}
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
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
                          
                          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                          
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
              {/* Quote Reference - Only show if order was converted from a quote */}
              {order.shippingData?.convertedFromQuote && order.notes && (
                <div className="mb-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <h4 className="font-medium text-blue-900 dark:text-blue-100">Converted from Quote</h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            This order was created from a quote.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                        <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          {order.notes.match(/quote\s+(QTE-\d{4}-\d{3})/i)?.[1] || 'Quote'}
                        </span>
                        <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                    <p className="text-sm text-gray-600 dark:text-gray-400">{order.supplier.email}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.floor(order.supplier.rating)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{order.supplier.rating}/5</span>
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
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300">
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      )}

      {/* No Results Message */}
      {!isLoadingOrders && !error && ordersList.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {searchTerm ? 'No matching orders found' : 'No orders found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm
              ? `No orders match your search criteria "${searchTerm}"`
              : 'Try adjusting your filters or create a new order'
            }
          </p>
          {searchTerm && (
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
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
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