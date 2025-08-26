import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  Package,
  AlertTriangle,
  FileText,
  Save,
  User,
  AlertCircle,
  Handshake
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getStatusColor, getStatusLabel } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus, notes?: string) => void;
}

const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({ 
  isOpen, 
  onClose, 
  order, 
  onStatusUpdate 
}) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order?.status || 'draft');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  React.useEffect(() => {
    if (order) {
      setSelectedStatus((order.status === 'pending_approval' ? 'pending_customer_approval' : order.status) as OrderStatus);
      setNotes('');
      setError(null);
    }
  }, [order]);

  const statusOptions = [
    { 
      value: 'draft' as OrderStatus, 
      label: 'Draft', 
      icon: FileText,
      description: 'Order is being prepared',
      color: 'text-gray-600'
    },
    { 
      value: 'supplier_quoting' as OrderStatus, 
      label: 'Supplier Quoting', 
      icon: Handshake,
      description: 'Waiting for Supplier Quotes',
      color: 'text-yellow-900'
    },
    { 
      value: 'pending_customer_approval' as OrderStatus, 
      label: 'Pending Customer Approval', 
      icon: AlertTriangle,
      description: 'Waiting for customer approval',
      color: 'text-yellow-600'
    },
    { 
      value: 'approved' as OrderStatus, 
      label: 'Approved', 
      icon: CheckCircle,
      description: 'Approved and ready to send to supplier',
      color: 'text-blue-600'
    },
    { 
      value: 'ordered' as OrderStatus, 
      label: 'Ordered', 
      icon: Package,
      description: 'Order sent to supplier',
      color: 'text-purple-600'
    },
    { 
      value: 'in_transit' as OrderStatus, 
      label: 'In Transit', 
      icon: Truck,
      description: 'Items are being shipped',
      color: 'text-orange-600'
    },
    { 
      value: 'delivered' as OrderStatus, 
      label: 'Delivered', 
      icon: CheckCircle,
      description: 'Order has been received',
      color: 'text-green-600'
    },
    { 
      value: 'cancelled' as OrderStatus, 
      label: 'Cancelled', 
      icon: XCircle,
      description: 'Order has been cancelled',
      color: 'text-red-600'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
      // Convert legacy status to new enum value
      const statusToSubmit = selectedStatus === 'pending_approval' ? 'pending_customer_approval' : selectedStatus;
      
      // Construct the update object
      const updateObject: any = {
        status: statusToSubmit,
        updated_at: new Date().toISOString()
      };

      // Add notes if provided
      if (notes.trim()) {
        updateObject.notes = notes.trim();
      }

      // Update the order status in Supabase
      const { error: updateError } = await supabase
        .from('orders')
        .update(updateObject)
        .eq('id', order.id);

      if (updateError) throw updateError;

      // Success - call the callback and close modal
      onStatusUpdate(order.id, statusToSubmit, notes.trim() || undefined);
      onClose();
    } catch (error: any) {
      console.error('Error updating status:', error);
      setError(error.message || 'Failed to update order status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusChangeType = () => {
    if (!order) return 'update';
    
    const currentIndex = statusOptions.findIndex(s => s.value === order.status);
    const newIndex = statusOptions.findIndex(s => s.value === selectedStatus);
    
    if (newIndex > currentIndex) return 'progress';
    if (newIndex < currentIndex) return 'regress';
    return 'same';
  };

  if (!isOpen || !order) return null;

  const changeType = getStatusChangeType();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Update Order Status</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{order.orderNumber}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="h-5 w-5" />
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Status */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Status</h3>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Last updated: {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Status Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select New Status</h3>
              <div className="grid grid-cols-1 gap-3">
                {statusOptions.map((status) => {
                  const Icon = status.icon;
                  const isSelected = selectedStatus === status.value;
                  const isCurrent = order.status === status.value;
                  
                  return (
                    <div
                      key={status.value}
                      onClick={() => setSelectedStatus(status.value)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : isCurrent
                          ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          isSelected ? 'bg-blue-100 dark:bg-blue-800/50' : 'bg-gray-100 dark:bg-gray-600'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            isSelected ? 'text-blue-600 dark:text-blue-400' : status.color
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{status.label}</h4>
                            {isCurrent && (
                              <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{status.description}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Change Indicator */}
            {changeType !== 'same' && (
              <div className={`p-4 rounded-lg ${
                changeType === 'progress' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                changeType === 'regress' ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' :
                'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
              }`}>
                <div className="flex items-center space-x-2">
                  {changeType === 'progress' && (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-300">
                        Status will be advanced forward
                      </span>
                    </>
                  )}
                  {changeType === 'regress' && (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                        Status will be moved backward
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Update Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add notes about this status change (e.g., reason for change, additional information, etc.)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                These notes will be visible in the status tracking history
              </p>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Order Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Supplier:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{order.supplier.name}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">${order.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Expected Delivery:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(order.expectedDelivery).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Items:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{order.parts.length} part{order.parts.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span>Updated by: Current User</span>
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
                disabled={isSubmitting || selectedStatus === order.status}
                className={`flex items-center space-x-2 px-6 py-2 rounded-md ${
                  isSubmitting || selectedStatus === order.status
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Update Status</span>
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

export default StatusUpdateModal;