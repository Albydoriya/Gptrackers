import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Star, 
  Mail, 
  Phone, 
  MapPin,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Archive
} from 'lucide-react';
import { orders } from '../data/mockData';
import { Supplier } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ProtectedRoute from './ProtectedRoute';
import AddSupplier from './AddSupplier';
import EditSupplier from './EditSupplier';

const Suppliers: React.FC = () => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isEditSupplierOpen, setIsEditSupplierOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch suppliers from Supabase
  const fetchSuppliers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform Supabase data to match Supplier interface
      const transformedSuppliers: Supplier[] = (data || []).map(supplierData => ({
        id: supplierData.id,
        name: supplierData.name,
        contactPerson: supplierData.contact_person,
        email: supplierData.email,
        phone: supplierData.phone,
        address: supplierData.address,
        rating: supplierData.rating || 5.0,
        deliveryTime: supplierData.delivery_time || 5,
        paymentTerms: supplierData.payment_terms,
        isActive: supplierData.is_active
      }));

      setSuppliers(transformedSuppliers);
    } catch (err: any) {
      console.error('Error fetching suppliers:', err);
      setError(err.message || 'Failed to fetch suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch suppliers on component mount
  React.useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSupplierAdded = (newSupplier: Supplier) => {
    // Refresh suppliers list after creation
    fetchSuppliers();
  };

  const handleSupplierUpdated = (updatedSupplier: Supplier) => {
    // Refresh suppliers list after update
    fetchSuppliers();
    setIsEditSupplierOpen(false);
    setEditingSupplier(null);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsEditSupplierOpen(true);
  };

  const handleArchiveSupplier = async (supplierId: string, supplierName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to archive "${supplierName}"?\n\nThis will hide the supplier from the active list but preserve all data and order history. You can restore it later if needed.`
    );
    
    if (!confirmed) return;

    setError(null);
    
    try {
      const { error: archiveError } = await supabase
        .from('suppliers')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', supplierId);

      if (archiveError) throw archiveError;

      // Refresh the suppliers list to remove the archived supplier
      await fetchSuppliers();
      
    } catch (err: any) {
      console.error('Error archiving supplier:', err);
      setError(`Failed to archive supplier: ${err.message}`);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSupplierStats = (supplierId: string) => {
    const supplierOrders = orders.filter(order => order.supplier.id === supplierId);
    const totalOrders = supplierOrders.length;
    const totalValue = supplierOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const deliveredOrders = supplierOrders.filter(order => order.status === 'delivered').length;
    const onTimeDeliveries = supplierOrders.filter(order => 
      order.status === 'delivered' && 
      order.actualDelivery && 
      new Date(order.actualDelivery) <= new Date(order.expectedDelivery)
    ).length;

    return {
      totalOrders,
      totalValue,
      deliveryRate: totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0,
      onTimeRate: deliveredOrders > 0 ? (onTimeDeliveries / deliveredOrders) * 100 : 0,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Suppliers Management</h1>
          <button
            onClick={fetchSuppliers}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh suppliers"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        {hasPermission('suppliers', 'create') && (
          <button 
            onClick={() => setIsAddSupplierOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Supplier</span>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error loading suppliers</h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              <button
                onClick={fetchSuppliers}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && !error && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Suppliers</h3>
            <p className="text-gray-600">Fetching the latest supplier data from the database...</p>
          </div>
        </div>
      )}

      {/* Suppliers Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => {
            const stats = getSupplierStats(supplier.id);
            
            return (
              <div key={supplier.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                        {supplier.isActive ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center space-x-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(supplier.rating)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-600 ml-1">
                          {supplier.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => setSelectedSupplier(supplier)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                      {hasPermission('suppliers', 'update') && (
                        <button 
                          onClick={() => handleEditSupplier(supplier)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit Supplier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('suppliers', 'delete') && (
                        <button 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Supplier"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{supplier.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{supplier.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{supplier.deliveryTime} days delivery</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4" />
                      <span>{supplier.paymentTerms}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{stats.totalOrders}</p>
                        <p className="text-xs text-gray-600">Total Orders</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {stats.onTimeRate.toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-600">On-Time Rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No Results Message */}
      {!isLoading && !error && filteredSuppliers.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {suppliers.length === 0 ? 'No suppliers found' : 'No matching suppliers found'}
          </h3>
          <p className="text-gray-600 mb-4">
            {suppliers.length === 0 
              ? 'No suppliers have been added yet'
              : `No suppliers match your search criteria "${searchTerm}"`
            }
          </p>
          {hasPermission('suppliers', 'create') && suppliers.length === 0 && (
            <button
              onClick={() => setIsAddSupplierOpen(true)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Add your first supplier
            </button>
          )}
        </div>
      )}

      {/* Supplier Details Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedSupplier.name} - Details
                </h3>
                <button 
                  onClick={() => setSelectedSupplier(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{selectedSupplier.email}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{selectedSupplier.phone}</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span className="text-gray-900">{selectedSupplier.address}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Business Terms</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Contact Person:</span>
                      <span className="font-medium">{selectedSupplier.contactPerson}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Time:</span>
                      <span className="font-medium">{selectedSupplier.deliveryTime} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Terms:</span>
                      <span className="font-medium">{selectedSupplier.paymentTerms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rating:</span>
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(selectedSupplier.rating)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-600 ml-1">
                          {selectedSupplier.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Performance Metrics</h4>
                {(() => {
                  const stats = getSupplierStats(selectedSupplier.id);
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{stats.totalOrders}</p>
                        <p className="text-sm text-gray-600">Total Orders</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          ${stats.totalValue.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">Total Value</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">
                          {stats.deliveryRate.toFixed(0)}%
                        </p>
                        <p className="text-sm text-gray-600">Delivery Rate</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">
                          {stats.onTimeRate.toFixed(0)}%
                        </p>
                        <p className="text-sm text-gray-600">On-Time Rate</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Recent Orders</h4>
                <div className="space-y-2">
                  {orders
                    .filter(order => order.supplier.id === selectedSupplier.id)
                    .slice(0, 5)
                    .map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{order.orderNumber}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(order.orderDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            ${order.totalAmount.toLocaleString()}
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            order.status === 'delivered' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      <AddSupplier
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        onSupplierAdded={handleSupplierAdded}
      />

      {/* Edit Supplier Modal */}
      <EditSupplier
        isOpen={isEditSupplierOpen}
        onClose={() => {
          setIsEditSupplierOpen(false);
          setEditingSupplier(null);
        }}
        onSupplierUpdated={handleSupplierUpdated}
        supplier={editingSupplier}
      />
    </div>
  );
};

export default Suppliers;