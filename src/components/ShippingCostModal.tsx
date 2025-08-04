import React, { useState, useEffect } from 'react';
import { 
  X, 
  Truck, 
  Calculator, 
  Package, 
  DollarSign, 
  Scale,
  Ruler,
  Globe,
  Save,
  AlertCircle,
  TrendingUp,
  Info,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { Order, OrderPart } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ShippingCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onShippingUpdate: (orderId: string, shippingData: ShippingData) => void;
}

interface ShippingData {
  exchangeRate: number;
  shippingCostJPY: number;
  shippingCostAUD: number;
  totalWeightKg: number;
  totalVolumeM3: number;
  shippingMethod: string;
  estimatedDelivery: string;
  trackingNumber?: string;
  notes?: string;
  partDetails: PartShippingDetail[];
}

interface PartShippingDetail {
  partId: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumeM3: number;
  priceJPY: number;
  priceAUD: number;
  unitCostPerKg: number;
  unitCostPerM3: number;
}

const ShippingCostModal: React.FC<ShippingCostModalProps> = ({ 
  isOpen, 
  onClose, 
  order, 
  onShippingUpdate 
}) => {
  const { user } = useAuth();
  const [exchangeRate, setExchangeRate] = useState(0.0095); // Default JPY to AUD rate
  const [shippingCostJPY, setShippingCostJPY] = useState(0);
  const [shippingMethod, setShippingMethod] = useState('air_freight');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [partDetails, setPartDetails] = useState<PartShippingDetail[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'conversion' | 'shipping' | 'breakdown'>('conversion');

  useEffect(() => {
    if (order) {
      // Initialize part details with default values
      const initialPartDetails: PartShippingDetail[] = order.parts.map(orderPart => ({
        partId: orderPart.part.id,
        weightKg: 0.5, // Default weight
        lengthCm: 10,   // Default dimensions
        widthCm: 10,
        heightCm: 5,
        volumeM3: 0,
        priceJPY: orderPart.unitPrice * 100, // Assuming current prices are in AUD, convert to JPY
        priceAUD: orderPart.unitPrice,
        unitCostPerKg: 0,
        unitCostPerM3: 0
      }));
      
      setPartDetails(initialPartDetails);
      calculateTotals(initialPartDetails);
      setError(null);
    }
  }, [order, exchangeRate]);

  const calculateTotals = (details: PartShippingDetail[]) => {
    const updatedDetails = details.map(detail => {
      const volumeM3 = (detail.lengthCm * detail.widthCm * detail.heightCm) / 1000000; // Convert cm³ to m³
      const priceAUD = detail.priceJPY * exchangeRate;
      const unitCostPerKg = detail.weightKg > 0 ? priceAUD / detail.weightKg : 0;
      const unitCostPerM3 = volumeM3 > 0 ? priceAUD / volumeM3 : 0;
      
      return {
        ...detail,
        volumeM3,
        priceAUD,
        unitCostPerKg,
        unitCostPerM3
      };
    });
    
    setPartDetails(updatedDetails);
  };

  const updatePartDetail = (partId: string, field: keyof PartShippingDetail, value: number) => {
    const updatedDetails = partDetails.map(detail => 
      detail.partId === partId ? { ...detail, [field]: value } : detail
    );
    calculateTotals(updatedDetails);
  };

  const getTotalWeight = () => {
    return partDetails.reduce((sum, detail) => sum + detail.weightKg, 0);
  };

  const getTotalVolume = () => {
    return partDetails.reduce((sum, detail) => sum + detail.volumeM3, 0);
  };

  const getTotalPriceJPY = () => {
    return partDetails.reduce((sum, detail) => sum + detail.priceJPY, 0);
  };

  const getTotalPriceAUD = () => {
    return partDetails.reduce((sum, detail) => sum + detail.priceAUD, 0);
  };

  const getShippingCostAUD = () => {
    return shippingCostJPY * exchangeRate;
  };

  const getGrandTotalAUD = () => {
    return getTotalPriceAUD() + getShippingCostAUD();
  };

  const getAverageUnitCostPerKg = () => {
    const totalWeight = getTotalWeight();
    return totalWeight > 0 ? getGrandTotalAUD() / totalWeight : 0;
  };

  const getAverageUnitCostPerM3 = () => {
    const totalVolume = getTotalVolume();
    return totalVolume > 0 ? getGrandTotalAUD() / totalVolume : 0;
  };

  const shippingMethods = [
    { value: 'air_freight', label: 'Air Freight', days: '5-7 days' },
    { value: 'sea_freight', label: 'Sea Freight', days: '20-30 days' },
    { value: 'express', label: 'Express Delivery', days: '2-3 days' },
    { value: 'standard', label: 'Standard Shipping', days: '10-14 days' }
  ];

  const handleSubmit = async () => {
    if (!order) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
      // Construct the shipping data object for the shipping_data JSONB column
      const shippingData: ShippingData = {
        exchangeRate,
        shippingCostJPY,
        shippingCostAUD: getShippingCostAUD(),
        totalWeightKg: getTotalWeight(),
        totalVolumeM3: getTotalVolume(),
        shippingMethod,
        estimatedDelivery,
        trackingNumber: trackingNumber || undefined,
        notes: notes || undefined,
        partDetails
      };

      // Update the orders table with shipping data and new total amount
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          shipping_data: shippingData,
          total_amount: getGrandTotalAUD()
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // Success - call callback and close modal
      onShippingUpdate(order.id, shippingData);
      onClose();
    } catch (error: any) {
      console.error('Error updating shipping data:', error);
      setError(error.message || 'Failed to update shipping information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Truck className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Shipping & Currency Conversion</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{order.orderNumber} - {order.supplier.name} (Delivered)</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Order delivered - Enter actual shipment data</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="mt-6 flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('conversion')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'conversion'
                  ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>Currency Conversion</span>
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'shipping'
                  ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Truck className="h-4 w-4" />
              <span>Shipping Details</span>
            </button>
            <button
              onClick={() => setActiveTab('breakdown')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'breakdown'
                  ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Calculator className="h-4 w-4" />
              <span>Cost Breakdown</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-800 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}

          {activeTab === 'conversion' && (
            <div className="space-y-6">
              {/* Information Banner */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Order Delivered - Enter Actual Data</h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      This order has been delivered. Please enter the actual measurements, weights, and costs from the received shipment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Exchange Rate Section */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <Globe className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
                    Currency Exchange Rate
                  </h3>
                  <button className="flex items-center space-x-2 text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 text-sm">
                    <RefreshCw className="h-4 w-4" />
                    <span>Update Rate</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      JPY to AUD Exchange Rate
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.0001"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="0.0095"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">AUD</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Conversion Preview</p>
                    <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">¥1,000 = ${(1000 * exchangeRate).toFixed(2)} AUD</p>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rate Status</p>
                    <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">Current Rate</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parts Pricing Conversion */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Actual Parts Data (As Received)
                </h3>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Instructions:</strong> Enter the actual pricing (in JPY), weights, and dimensions as received in the shipment. 
                    This data will be used to calculate true unit costs and update the parts catalog.
                  </p>
                </div>
                
                <div className="space-y-4">
                  {order.parts.map((orderPart, index) => {
                    const detail = partDetails.find(d => d.partId === orderPart.part.id);
                    if (!detail) return null;
                    
                    return (
                      <div key={orderPart.part.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{orderPart.part.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{orderPart.part.partNumber}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Quantity: {orderPart.quantity}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Actual Price (JPY)
                            </label>
                            <input
                              type="number"
                              value={detail.priceJPY}
                              onChange={(e) => updatePartDetail(detail.partId, 'priceJPY', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                              placeholder="Actual JPY price"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Converted (AUD)
                            </label>
                            <div className="px-2 py-1 text-sm bg-gray-50 dark:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100">
                              ${detail.priceAUD.toFixed(2)}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Actual Weight (kg)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={detail.weightKg}
                              onChange={(e) => updatePartDetail(detail.partId, 'weightKg', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                              placeholder="Measured weight"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Actual Length (cm)
                            </label>
                            <input
                              type="number"
                              value={detail.lengthCm}
                              onChange={(e) => updatePartDetail(detail.partId, 'lengthCm', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                              placeholder="Measured length"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Actual Width (cm)
                            </label>
                            <input
                              type="number"
                              value={detail.widthCm}
                              onChange={(e) => updatePartDetail(detail.partId, 'widthCm', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                              placeholder="Measured width"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Actual Height (cm)
                            </label>
                            <input
                              type="number"
                              value={detail.heightCm}
                              onChange={(e) => updatePartDetail(detail.partId, 'heightCm', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                              placeholder="Measured height"
                            />
                          </div>
                        </div>
                        
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                            <span className="text-blue-600 dark:text-blue-400 font-medium">Actual Volume: </span>
                            <span className="text-gray-900 dark:text-gray-100">{detail.volumeM3.toFixed(4)} m³</span>
                          </div>
                          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                            <span className="text-green-600 dark:text-green-400 font-medium">Unit Cost/kg: </span>
                            <span className="text-gray-900 dark:text-gray-100">${detail.unitCostPerKg.toFixed(2)}</span>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                            <span className="text-purple-600 dark:text-purple-400 font-medium">Unit Cost/m³: </span>
                            <span className="text-gray-900 dark:text-gray-100">${detail.unitCostPerM3.toFixed(2)}</span>
                          </div>
                          <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                            <span className="text-orange-600 dark:text-orange-400 font-medium">Part Total: </span>
                            <span className="text-gray-900 dark:text-gray-100">${(detail.priceAUD * orderPart.quantity).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-6">
              {/* Shipping Method */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <Truck className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
                  Actual Shipping Information
                </h3>
                
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    Enter the actual shipping method used and delivery date as received.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Shipping Method
                    </label>
                    <select
                      value={shippingMethod}
                      onChange={(e) => setShippingMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {shippingMethods.map(method => (
                        <option key={method.value} value={method.value}>
                          {method.label} ({method.days})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Estimated Delivery Date
                    </label>
                    <input
                      type="date"
                      value={estimatedDelivery}
                      onChange={(e) => setEstimatedDelivery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Costs */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                  Actual Shipping Costs
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Actual Shipping Cost (JPY)
                    </label>
                    <input
                      type="number"
                      value={shippingCostJPY}
                      onChange={(e) => setShippingCostJPY(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Enter actual shipping cost in JPY"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Converted Shipping Cost (AUD)
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-md">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        ${getShippingCostAUD().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Final Tracking Number
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Final delivery tracking number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Delivery Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Notes about the actual delivery, condition, etc..."
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'breakdown' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-blue-800 dark:text-blue-300">Total Weight</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{getTotalWeight().toFixed(2)} kg</p>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <Ruler className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-purple-800 dark:text-purple-300">Total Volume</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{getTotalVolume().toFixed(4)} m³</p>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-800 dark:text-green-300">Parts Total</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">${getTotalPriceAUD().toFixed(2)}</p>
                </div>
                
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <Truck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <span className="font-medium text-orange-800 dark:text-orange-300">Shipping</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">${getShippingCostAUD().toFixed(2)}</p>
                </div>
              </div>

              {/* Cost Analysis */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <Calculator className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Final Cost Analysis (Delivered Order)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Final Total Cost (AUD)</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">${getGrandTotalAUD().toFixed(2)}</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Final Unit Cost per kg</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">${getAverageUnitCostPerKg().toFixed(2)}</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Final Unit Cost per m³</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">${getAverageUnitCostPerM3().toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Final Delivered Order Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Part</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actual Weight (kg)</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actual Volume (m³)</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Final Price (AUD)</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Unit Cost/kg</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Unit Cost/m³</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {partDetails.map((detail, index) => {
                        const orderPart = order.parts.find(p => p.part.id === detail.partId);
                        if (!orderPart) return null;
                        
                        return (
                          <tr key={detail.partId}>
                            <td className="px-4 py-2 text-sm">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{orderPart.part.name}</p>
                                <p className="text-gray-600 dark:text-gray-400">{orderPart.part.partNumber}</p>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{detail.weightKg.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{detail.volumeM3.toFixed(4)}</td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">${detail.priceAUD.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400">${detail.unitCostPerKg.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-purple-600 dark:text-purple-400">${detail.unitCostPerM3.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Info className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span>Exchange rate: ¥1 = ${exchangeRate.toFixed(4)} AUD</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex items-center space-x-2 px-6 py-2 rounded-md ${
                  isSubmitting
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-orange-600 dark:bg-orange-700 text-white hover:bg-orange-700 dark:hover:bg-orange-600'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Calculating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Final Order Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingCostModal;