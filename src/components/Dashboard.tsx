import React from 'react';
import { 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  Clock,
  CheckCircle,
  Truck
} from 'lucide-react';
import { orders, getStatusColor, getStatusLabel } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { Part } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateOrder from './CreateOrder';
import AddPart from './AddPart';
import { useState, useEffect } from 'react';

interface DashboardProps {
  onTabChange?: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onTabChange }) => {
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const { hasPermission } = useAuth();

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

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => ['pending_approval', 'approved', 'ordered'].includes(o.status)).length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const totalValue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const lowStockParts = parts.filter(p => p.currentStock <= p.minStock).length;

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
      value: parts.length.toString(),
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
            {recentOrders.map((order) => (
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
            ))}
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
            {parts
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
              ))}
            {parts.filter(p => p.currentStock <= p.minStock).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p>All parts are adequately stocked!</p>
              </div>
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