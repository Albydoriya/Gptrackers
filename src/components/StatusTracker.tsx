import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  Package,
  AlertTriangle,
  MapPin,
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { getStatusColor, getStatusLabel } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { OrderStatus, Order } from '../types';

const StatusTracker: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch orders from Supabase
  const fetchOrders = async () => {
    setIsLoading(true);
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
            priceHistory: [],
            currentStock: orderPart.part.current_stock,
            minStock: orderPart.part.min_stock,
            preferredSuppliers: orderPart.part.preferred_suppliers
          },
          quantity: orderPart.quantity,
          unitPrice: orderPart.unit_price,
          totalPrice: orderPart.total_price
        })),
        status: orderData.status,
        totalAmount: orderData.total_amount,
        orderDate: orderData.order_date,
        expectedDelivery: orderData.expected_delivery,
        actualDelivery: orderData.actual_delivery,
        notes: orderData.notes,
        createdBy: orderData.created_by || 'Unknown',
        priority: orderData.priority,
        shippingData: orderData.shipping_data,
        attachments: orderData.attachments
      }));

      setOrdersList(transformedOrders);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch orders on component mount
  React.useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = ordersList.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const getStatusProgress = (status: OrderStatus) => {
    const statusOrder: OrderStatus[] = ['draft', 'pending_approval', 'approved', 'ordered', 'in_transit', 'delivered'];
    const currentIndex = statusOrder.indexOf(status);
    return ((currentIndex + 1) / statusOrder.length) * 100;
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'draft':
        return <Clock className="h-4 w-4" />;
      case 'pending_approval':
        return <AlertTriangle className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'ordered':
        return <Package className="h-4 w-4" />;
      case 'in_transit':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const isOverdue = (order: typeof orders[0]) => {
    if (order.status === 'delivered' || order.status === 'cancelled') return false;
    return new Date(order.expectedDelivery) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Order Status Tracking</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh orders"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <div className="text-sm text-gray-500">
            Real-time order status updates
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={isLoading}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statusOptions.slice(1).map(status => {
          const count = ordersList.filter(order => order.status === status.value).length;
          const isActive = statusFilter === status.value;
          
          return (
            <button
              key={status.value}
              onClick={() => setStatusFilter(status.value)}
              disabled={isLoading}
              className={`p-4 rounded-lg border transition-all duration-200 transform hover:scale-105 ${
                isActive 
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800' 
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
              }`}
            >
              <div className="text-center">
                <div className={`mx-auto mb-2 p-2 rounded-lg w-fit transition-colors ${
                  isActive 
                    ? 'bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-300' 
                    : getStatusColor(status.value as OrderStatus).replace('bg-', 'bg-').replace('text-', 'text-')
                }`}>
                  {getStatusIcon(status.value as OrderStatus)}
                </div>
                <p className={`text-2xl font-bold transition-colors ${
                  isActive 
                    ? 'text-blue-600 dark:text-blue-300' 
                    : 'text-gray-900 dark:text-gray-100'
                }`}>{isLoading ? '...' : count}</p>
                <p className={`text-xs transition-colors ${
                  isActive 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>{status.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Orders Timeline */}
      {/* Loading State */}
      {isLoading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Loading Orders</h3>
            <p className="text-gray-600 dark:text-gray-400">Fetching the latest order status data from the database...</p>
          </div>
        </div>
      )}

      {/* Orders Timeline */}
      {!isLoading && !error && (
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const overdue = isOverdue(order);
          const progress = getStatusProgress(order.status);
          
          return (
            <div key={order.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 ${
              overdue ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`p-2 rounded-lg ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{order.orderNumber}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{order.supplier.name}</p>
                    </div>
                    {overdue && (
                      <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Overdue</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400">Ordered:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(order.orderDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400">Expected:</span>
                      <span className={`font-medium ${overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {new Date(order.expectedDelivery).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400">Value:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">${order.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="lg:w-96">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{Math.round(progress)}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        order.status === 'delivered' ? 'bg-green-500' :
                        order.status === 'cancelled' ? 'bg-red-500' :
                        overdue ? 'bg-red-500' : 'bg-blue-500 dark:bg-blue-400'
                      }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>Draft</span>
                    <span>Approved</span>
                    <span>In Transit</span>
                    <span>Delivered</span>
                  </div>
                </div>
              </div>

              {order.notes && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Notes:</strong> {order.notes}
                  </p>
                </div>
              )}

              {order.actualDelivery && (
                <div className="mt-4 flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span>Delivered on {new Date(order.actualDelivery).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {!isLoading && !error && filteredOrders.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {ordersList.length === 0 ? 'No orders found' : 'No matching orders found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {ordersList.length === 0 
              ? 'No orders have been created yet'
              : 'Try adjusting your search criteria or status filter'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default StatusTracker;