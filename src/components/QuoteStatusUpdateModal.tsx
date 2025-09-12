import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send, 
  FileText,
  AlertTriangle,
  Save,
  User,
  AlertCircle,
  ArrowRight,
  ShoppingCart,
  Loader2
} from 'lucide-react';
import { Quote, QuoteStatus } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface QuoteStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
  onStatusUpdate: (quoteId: string, newStatus: QuoteStatus, notes?: string) => void;
}

const QuoteStatusUpdateModal: React.FC<QuoteStatusUpdateModalProps> = ({ 
  isOpen, 
  onClose, 
  quote, 
  onStatusUpdate 
}) => {
  const [selectedStatus, setSelectedStatus] = useState<QuoteStatus>(quote?.status || 'draft');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  React.useEffect(() => {
    if (quote) {
      setSelectedStatus(quote.status);
      setNotes('');
      setError(null);
    }
  }, [quote]);

  const statusOptions = [
    { 
      value: 'draft' as QuoteStatus, 
      label: 'Draft', 
      icon: FileText,
      description: 'Quote is being prepared',
      color: 'text-gray-600'
    },
    { 
      value: 'sent' as QuoteStatus, 
      label: 'Sent', 
      icon: Send,
      description: 'Quote has been sent to customer',
      color: 'text-blue-600'
    },
    { 
      value: 'accepted' as QuoteStatus, 
      label: 'Accepted', 
      icon: CheckCircle,
      description: 'Customer has accepted the quote',
      color: 'text-green-600'
    },
    { 
      value: 'rejected' as QuoteStatus, 
      label: 'Rejected', 
      icon: XCircle,
      description: 'Customer has rejected the quote',
      color: 'text-red-600'
    },
    { 
      value: 'converted_to_order' as QuoteStatus, 
      label: 'Convert to Order', 
      icon: ShoppingCart,
      description: 'Convert this quote into an order',
      color: 'text-purple-600'
    },
    { 
      value: 'expired' as QuoteStatus, 
      label: 'Expired', 
      icon: Clock,
      description: 'Quote has expired',
      color: 'text-orange-600'
    }
  ];

  const handleConvertToOrder = async () => {
    if (!quote || !user) return;

    setIsConverting(true);
    setError(null);

    try {
      // 1. Find or create a supplier for the order
      const { data: suppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .limit(1);

      if (suppliersError) throw suppliersError;

      let supplierId = suppliers?.[0]?.id;

      // If no suppliers exist, create a generic one for quote conversions
      if (!supplierId) {
        const { data: newSupplier, error: supplierError } = await supabase
          .from('suppliers')
          .insert([{
            name: 'Quote Conversion Supplier',
            contact_person: 'To Be Assigned',
            email: 'supplier@company.com',
            phone: '+1 000 000 0000',
            address: 'To Be Updated',
            rating: 5.0,
            delivery_time: 7,
            payment_terms: 'Net 30',
            is_active: true,
            notes: 'Auto-created for quote conversion'
          }])
          .select('id')
          .single();

        if (supplierError) throw supplierError;
        supplierId = newSupplier.id;
      }

      // 2. Create the order
      const orderObject = {
        order_number: `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        supplier_id: supplierId,
        status: 'approved',
        priority: 'medium',
        total_amount: quote.grandTotalAmount,
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
        notes: `Converted from quote ${quote.quoteNumber}. Customer: ${quote.customer.name}`,
        created_by: user.id,
        shipping_data: {
          convertedFromQuote: true,
          originalQuoteId: quote.id,
          customerInfo: quote.customer,
          shippingMethod: quote.shippingCosts.selected,
          shippingCost: quote.shippingCosts.selected === 'sea' ? quote.shippingCosts.sea : quote.shippingCosts.air,
          agentFees: quote.agentFees,
          localShippingFees: quote.localShippingFees
        },
        attachments: []
      };

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderObject])
        .select('id')
        .single();

      if (orderError) throw orderError;

      // 3. Create order parts (only for catalog parts, not custom items)
      const catalogParts = quote.parts.filter(part => !part.isCustomPart && part.part);
      
      if (catalogParts.length > 0) {
        const orderPartsArray = catalogParts.map(quotePart => ({
          order_id: orderData.id,
          part_id: quotePart.part!.id,
          quantity: quotePart.quantity,
          unit_price: quotePart.unitPrice
        }));

        const { error: partsError } = await supabase
          .from('order_parts')
          .insert(orderPartsArray);

        if (partsError) throw partsError;
      }

      // 4. Update quote status and link to order
      const { error: quoteUpdateError } = await supabase
        .from('quotes')
        .update({
          status: 'converted_to_order',
          converted_to_order_id: orderData.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      if (quoteUpdateError) throw quoteUpdateError;

      // Success - call callback and close modal
      onStatusUpdate(quote.id, 'converted_to_order', `Converted to order ${orderObject.order_number}. Customer: ${quote.customer.name}`);
      onClose();

    } catch (err: any) {
      console.error('Error converting quote to order:', err);
      setError(`Failed to convert quote to order: ${err.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote) return;

    // Handle conversion to order separately
    if (selectedStatus === 'converted_to_order') {
      await handleConvertToOrder();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      // Construct the update object
      const updateObject: any = {
        status: selectedStatus,
        updated_at: new Date().toISOString()
      };

      // Add notes if provided
      if (notes.trim()) {
        updateObject.notes = notes.trim();
      }

      // Update the quote status in Supabase
      const { error: updateError } = await supabase
        .from('quotes')
        .update(updateObject)
        .eq('id', quote.id);

      if (updateError) throw updateError;

      // Success - call the callback and close modal
      onStatusUpdate(quote.id, selectedStatus, notes.trim() || undefined);
      onClose();
    } catch (error: any) {
      console.error('Error updating quote status:', error);
      setError(error.message || 'Failed to update quote status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusChangeType = () => {
    if (!quote) return 'update';
    
    const statusOrder: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'converted_to_order', 'expired'];
    const currentIndex = statusOrder.findIndex(s => s === quote.status);
    const newIndex = statusOrder.findIndex(s => s === selectedStatus);
    
    if (selectedStatus === 'converted_to_order') return 'convert';
    if (newIndex > currentIndex) return 'progress';
    if (newIndex < currentIndex) return 'regress';
    return 'same';
  };

  const getStatusColor = (status: QuoteStatus) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      converted_to_order: 'bg-purple-100 text-purple-800',
      expired: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: QuoteStatus) => {
    const labels = {
      draft: 'Draft',
      sent: 'Sent',
      accepted: 'Accepted',
      rejected: 'Rejected',
      converted_to_order: 'Converted to Order',
      expired: 'Expired',
    };
    return labels[status] || status;
  };

  if (!isOpen || !quote) return null;

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
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Update Quote Status</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{quote.quoteNumber} - {quote.customer.name}</p>
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
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quote.status)}`}>
                  {getStatusLabel(quote.status)}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Last updated: {new Date(quote.quoteDate).toLocaleDateString()}
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
                  const isCurrent = quote.status === status.value;
                  const isConvertOption = status.value === 'converted_to_order';
                  
                  return (
                    <div
                      key={status.value}
                      onClick={() => setSelectedStatus(status.value)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? isConvertOption 
                            ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : isCurrent
                          ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          isSelected 
                            ? isConvertOption 
                              ? 'bg-purple-100 dark:bg-purple-800/50' 
                              : 'bg-blue-100 dark:bg-blue-800/50' 
                            : 'bg-gray-100 dark:bg-gray-600'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            isSelected 
                              ? isConvertOption 
                                ? 'text-purple-600 dark:text-purple-400' 
                                : 'text-blue-600 dark:text-blue-400' 
                              : status.color
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
                            {isConvertOption && (
                              <span className="text-xs bg-purple-200 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                                Creates Order
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{status.description}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle className={`h-5 w-5 ${
                            isConvertOption 
                              ? 'text-purple-600 dark:text-purple-400' 
                              : 'text-blue-600 dark:text-blue-400'
                          }`} />
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
                changeType === 'convert' ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800' :
                changeType === 'progress' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                changeType === 'regress' ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' :
                'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
              }`}>
                <div className="flex items-center space-x-2">
                  {changeType === 'convert' && (
                    <>
                      <ArrowRight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                        This will convert the quote into an order and create all necessary order records
                      </span>
                    </>
                  )}
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
                Update Notes {selectedStatus === 'converted_to_order' ? '(Optional)' : '(Optional)'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder={
                  selectedStatus === 'converted_to_order' 
                    ? "Add notes about the conversion (e.g., special requirements, customer instructions, etc.)"
                    : "Add notes about this status change (e.g., reason for change, additional information, etc.)"
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {selectedStatus === 'converted_to_order' 
                  ? 'These notes will be added to the created order'
                  : 'These notes will be visible in the quote history'
                }
              </p>
            </div>

            {/* Quote Summary */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Quote Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{quote.customer.name}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">${quote.grandTotalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Quote Date:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(quote.quoteDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Items:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{quote.parts.length} item{quote.parts.length !== 1 ? 's' : ''}</p>
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
              <span>Updated by: {user?.name || 'Current User'}</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isConverting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isConverting || selectedStatus === quote.status}
                className={`flex items-center space-x-2 px-6 py-2 rounded-md ${
                  isSubmitting || isConverting || selectedStatus === quote.status
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : selectedStatus === 'converted_to_order'
                    ? 'bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-600'
                    : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                }`}
              >
                {isSubmitting || isConverting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{isConverting ? 'Converting...' : 'Updating...'}</span>
                  </>
                ) : (
                  <>
                    {selectedStatus === 'converted_to_order' ? (
                      <>
                        <ArrowRight className="h-4 w-4" />
                        <span>Convert to Order</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Update Status</span>
                      </>
                    )}
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

export default QuoteStatusUpdateModal;