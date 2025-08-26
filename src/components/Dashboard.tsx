import React from 'react';
import { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  Clock,
  CheckCircle,
  Truck,
  Loader2
} from 'lucide-react';
import { getStatusColor, getStatusLabel } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { Part, Order } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateOrder from './CreateOrder';
import AddPart from './AddPart';

interface DashboardProps {
  onTabChange?: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onTabChange }) => {
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [partsError, setPartsError] = useState<string | null>(null);
  const { hasPermission } = useAuth();

  // Fetch orders from Supabase
  const fetchOrdersData = async () => {
    setIsLoadingOrders(true);
    setOrdersError(null);
    
    try {
      const { data, error } = await supabase
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

      if (error) throw error;

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
        status: orderData.status === 'pending_approval' ? 'pending_customer_approval' : orderData.status,
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

      setOrders(transformedOrders);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setOrdersError(err.message || 'Failed to fetch orders');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Fetch parts from Supabase
  const fetchPartsData = async () => {
    setIsLoadingParts(true);
    setPartsError(null);
    
    try {
      const { data, error } = await supabase
        .from('parts')
        .select('*, price_history:part_price_history(*)')
        .eq('is_archived', false);

      if (error) throw error;

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
          price: parseFloat(history.price),
          supplier: history.supplier_name,
          quantity: history.quantity
        })),
        currentStock: partData.current_stock,
        minStock: partData.min_stock,
        preferredSuppliers: partData.preferred_suppliers || []
      }));

      setParts(transformedParts);
    } catch (err: any) {
      console.error('Error fetching parts:', err);
      setPartsError(err.message || 'Failed to fetch parts');
    } finally {
      setIsLoadingParts(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchOrdersData();
  }, []);

  useEffect(() => {
    fetchPartsData();
  }, []);

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => ['pending_customer_approval', 'approved', 'ordered'].includes(o.status)).length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const totalValue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const lowStockParts = parts.filter(p => p.currentStock <= p.minStock).length;
  const activeParts = parts.length;

  const recentOrders = orders.slice(0, 3);

  const handleOrderCreated = (newOrder: any) => {
    // In a real app, this would update the global state
    console.log('New order created:', newOrder);
    setIsCreateOrderOpen(false);
  };

  const handlePartAdded = (newPart: any) => {
    // In a real app, this would update the global state
    console.log('New part added:', newPart);
    setIsAddPartOpen(false);
    // Refresh parts data after adding a new part
    fetchPartsData();
  };

  const stats = [
    {
      title: 'Total Orders',
      value: totalOrders.toString(),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Pending Orders',
      value: pendingOrders.toString(),
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Delivered',
      value: deliveredOrders.toString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Value',
      value: `$${totalValue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Low Stock Items',
      value: lowStockParts.toString(),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Active Parts',
      value: activeParts.toString(),
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading and Error States */}
      {(isLoadingOrders || isLoadingParts) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-blue-800">
              Loading dashboard data...
              {isLoadingOrders && !isLoadingParts && ' (orders)'}
              {!isLoadingOrders && isLoadingParts && ' (parts)'}
            </span>
          </div>
        </div>
      )}

      {(ordersError || partsError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard data</h3>
              {ordersError && <p className="text-sm text-red-700 mt-1">Orders: {ordersError}</p>}
              {partsError && <p className="text-sm text-red-700 mt-1">Parts: {partsError}</p>}
              <button
                onClick={() => {
                  if (ordersError) fetchOrdersData();
                  if (partsError) fetchPartsData();
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View All
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {isLoadingOrders ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">Loading recent orders...</p>
              </div>
            ) : ordersError ? (
              <div className="text-center py-8 text-red-600">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                <p>Failed to load orders</p>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No orders found</p>
              </div>
            ) : (
              recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.supplier.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                  <p className="text-sm text-gray-600 mt-1">${order.totalAmount.toLocaleString()}</p>
                </div>
              </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {isLoadingParts ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">Loading stock alerts...</p>
              </div>
            ) : partsError ? (
              <div className="text-center py-8 text-red-600">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                <p>Failed to load parts</p>
              </div>
            ) : parts
              .filter(p => p.currentStock <= p.minStock)
              .length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p>All parts are adequately stocked!</p>
              </div>
            ) : (
              parts
              .filter(p => p.currentStock <= p.minStock)
              .map((part) => (
                <div key={part.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Package className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{part.name}</p>
                      <p className="text-sm text-gray-600">{part.partNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">
                      {part.currentStock} / {part.minStock}
                    </p>
                    <p className="text-xs text-gray-500">Stock Level</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {hasPermission('orders', 'create') ? (
            <button 
              onClick={() => setIsCreateOrderOpen(true)}
              className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
            >
              <ShoppingCart className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-blue-700">Create Order</span>
            </button>
          ) : (
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg opacity-50 cursor-not-allowed">
              <ShoppingCart className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-500">Create Order</span>
            </div>
          )}
          
          {hasPermission('parts', 'create') ? (
            <button 
              onClick={() => setIsAddPartOpen(true)}
              className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
            >
              <Package className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-green-700">Add Part</span>
            </button>
          ) : (
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg opacity-50 cursor-not-allowed">
              <Package className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-500">Add Part</span>
            </div>
          )}
          
          {hasPermission('analytics', 'read') ? (
            <button 
              onClick={() => onTabChange?.('analytics')}
              className="flex items-center space-x-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
            >
              <TrendingUp className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-purple-700">View Analytics</span>
            </button>
          ) : (
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg opacity-50 cursor-not-allowed">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-500">View Analytics</span>
            </div>
          )}
          
          {hasPermission('orders', 'read') ? (
            <button 
              onClick={() => onTabChange?.('tracking')}
              className="flex items-center space-x-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group"
            >
              <Truck className="h-5 w-5 text-orange-600 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-orange-700">Track Orders</span>
            </button>
          ) : (
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg opacity-50 cursor-not-allowed">
              <Truck className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-500">Track Orders</span>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateOrder
        isOpen={isCreateOrderOpen}
        onClose={() => setIsCreateOrderOpen(false)}
        onOrderCreated={handleOrderCreated}
      />

      <AddPart
        isOpen={isAddPartOpen}
        onClose={() => setIsAddPartOpen(false)}
        onPartAdded={handlePartAdded}
      />
    </div>
  );
};

export default Dashboard;