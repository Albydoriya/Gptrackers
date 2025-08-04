import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  ShoppingCart,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react';
import { orders, suppliers } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { Part } from '../types';

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30');
  const [parts, setParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch parts from Supabase
  useEffect(() => {
    const fetchParts = async () => {
      try {
        setIsLoading(true);
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchParts();
  }, []);

  // Filter data based on selected time range
  const getFilteredOrders = () => {
    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    
    return orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= cutoffDate;
    });
  };

  const filteredOrders = getFilteredOrders();

  // Calculate metrics
  const totalSpent = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const avgOrderValue = filteredOrders.length > 0 ? totalSpent / filteredOrders.length : 0;
  const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered').length;
  const deliveryRate = filteredOrders.length > 0 ? (deliveredOrders / filteredOrders.length) * 100 : 0;

  // Spending by supplier
  const supplierSpending = suppliers.map(supplier => {
    const supplierOrders = filteredOrders.filter(order => order.supplier.id === supplier.id);
    const total = supplierOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    return {
      name: supplier.name,
      amount: total,
      orders: supplierOrders.length,
    };
  }).sort((a, b) => b.amount - a.amount);

  // Price trends for parts
  const partPriceTrends = parts.map(part => {
    if (part.priceHistory.length < 2) return null;
    
    // Filter price history based on time range
    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    
    const filteredHistory = part.priceHistory.filter(history => {
      const historyDate = new Date(history.date);
      return historyDate >= cutoffDate;
    });
    
    if (filteredHistory.length < 2) return null;
    
    const latest = filteredHistory[filteredHistory.length - 1];
    const previous = filteredHistory[filteredHistory.length - 2];
    const change = ((latest.price - previous.price) / previous.price) * 100;
    
    return {
      part: part.name,
      partNumber: part.partNumber,
      currentPrice: latest.price,
      previousPrice: previous.price,
      change,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  }).filter(Boolean);

  // Category spending
  const categorySpending = parts.reduce((acc, part) => {
    const partOrders = filteredOrders.flatMap(order => 
      order.parts.filter(op => op.part.id === part.id)
    );
    const total = partOrders.reduce((sum, op) => sum + op.totalPrice, 0);
    
    acc[part.category] = (acc[part.category] || 0) + total;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.entries(categorySpending)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Get period comparison data
  const getPeriodComparison = () => {
    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const currentPeriodStart = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    const previousPeriodStart = new Date(now.getTime() - (daysAgo * 2 * 24 * 60 * 60 * 1000));
    
    const currentPeriodOrders = orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= currentPeriodStart;
    });
    
    const previousPeriodOrders = orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= previousPeriodStart && orderDate < currentPeriodStart;
    });
    
    const currentSpent = currentPeriodOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const previousSpent = previousPeriodOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const spendingChange = previousSpent > 0 ? ((currentSpent - previousSpent) / previousSpent) * 100 : 0;
    
    const currentAvg = currentPeriodOrders.length > 0 ? currentSpent / currentPeriodOrders.length : 0;
    const previousAvg = previousPeriodOrders.length > 0 ? previousPeriodOrders.reduce((sum, order) => sum + order.totalAmount, 0) / previousPeriodOrders.length : 0;
    const avgChange = previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;
    
    const currentDeliveryRate = currentPeriodOrders.length > 0 ? (currentPeriodOrders.filter(o => o.status === 'delivered').length / currentPeriodOrders.length) * 100 : 0;
    const previousDeliveryRate = previousPeriodOrders.length > 0 ? (previousPeriodOrders.filter(o => o.status === 'delivered').length / previousPeriodOrders.length) * 100 : 0;
    const deliveryChange = previousDeliveryRate > 0 ? currentDeliveryRate - previousDeliveryRate : 0;
    
    return {
      spendingChange,
      avgChange,
      deliveryChange
    };
  };
  
  const periodComparison = getPeriodComparison();
  
  // Get time range label
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7': return 'Last 7 days';
      case '30': return 'Last 30 days';
      case '90': return 'Last 90 days';
      case '365': return 'Last year';
      default: return 'Selected period';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics & Trends</h1>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 shadow-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Period Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Period Summary</h2>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">
            {getTimeRangeLabel()}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filteredOrders.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">in selected period</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Suppliers</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {new Set(filteredOrders.map(o => o.supplier.id)).size}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">suppliers used</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Days to Delivery</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {filteredOrders.length > 0 
                ? Math.round(filteredOrders.reduce((sum, order) => {
                    const orderDate = new Date(order.orderDate);
                    const expectedDate = new Date(order.expectedDelivery);
                    const daysDiff = (expectedDate.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
                    return sum + daysDiff;
                  }, 0) / filteredOrders.length)
                : 0
              }
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">average lead time</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spending</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">${totalSpent.toLocaleString()}</p>
              <p className={`text-sm mt-1 ${
                periodComparison.spendingChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {periodComparison.spendingChange >= 0 ? '+' : ''}{periodComparison.spendingChange.toFixed(1)}% from previous period
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Order Value</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">${avgOrderValue.toLocaleString()}</p>
              <p className={`text-sm mt-1 ${
                periodComparison.avgChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {periodComparison.avgChange >= 0 ? '+' : ''}{periodComparison.avgChange.toFixed(1)}% from previous period
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivery Rate</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{deliveryRate.toFixed(1)}%</p>
              <p className={`text-sm mt-1 ${
                periodComparison.deliveryChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {periodComparison.deliveryChange >= 0 ? '+' : ''}{periodComparison.deliveryChange.toFixed(1)}% from previous period
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Suppliers</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{suppliers.filter(s => s.isActive).length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total active suppliers</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier Spending */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Spending by Supplier</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {supplierSpending.map((supplier, index) => {
                const percentage = (supplier.amount / totalSpent) * 100;
                return (
                  <div key={supplier.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-purple-500' : 'bg-gray-400'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{supplier.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{supplier.orders} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-gray-100">${supplier.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Category Spending */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Spending by Category</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {categoryData.map((category, index) => {
                const percentage = (category.amount / totalSpent) * 100;
                return (
                  <div key={category.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{category.category}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">${category.amount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          index === 0 ? 'bg-blue-500' :
                          index === 1 ? 'bg-green-500' :
                          index === 2 ? 'bg-purple-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{percentage.toFixed(1)}% of total spending</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Price Trends */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Part Price Trends</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partPriceTrends.map((trend, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700/50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{trend!.part}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{trend!.partNumber}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {trend!.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-red-500 dark:text-red-400" />
                    ) : trend!.trend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-green-500 dark:text-green-400" />
                    ) : (
                      <div className="h-4 w-4 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                    )}
                    <span className={`text-sm font-medium ${
                      trend!.trend === 'up' ? 'text-red-600 dark:text-red-400' :
                      trend!.trend === 'down' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {trend!.change > 0 ? '+' : ''}{trend!.change.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">${trend!.currentPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Previous:</span>
                  <span className="text-gray-600 dark:text-gray-400">${trend!.previousPrice.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;