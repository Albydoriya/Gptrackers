import React, { useState } from 'react';
import {
  X,
  FileText,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Edit,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle,
  Send,
  XCircle,
  ShoppingCart,
  Receipt,
  Truck,
  Globe,
  ExternalLink
} from 'lucide-react';
import { Quote } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface QuoteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
  onEdit?: (quote: Quote) => void;
  onConvertToOrder?: (quote: Quote) => void;
  isConverting?: boolean;
}

const QuoteDetailsModal: React.FC<QuoteDetailsModalProps> = ({
  isOpen,
  onClose,
  quote,
  onEdit,
  onConvertToOrder,
  isConverting = false
}) => {
  const { hasPermission } = useAuth();

  if (!isOpen || !quote) return null;

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      converted_to_order: 'bg-purple-100 text-purple-800',
      expired: 'bg-orange-100 text-orange-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4" />;
      case 'sent':
        return <Send className="h-4 w-4" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'converted_to_order':
        return <ShoppingCart className="h-4 w-4" />;
      case 'expired':
        return <Clock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const isQuoteExpired = () => {
    return new Date(quote.expiryDate) < new Date() && quote.status !== 'accepted' && quote.status !== 'converted_to_order';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{quote.quoteNumber}</h2>
                  <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quote.status)}`}>
                    {getStatusIcon(quote.status)}
                    <span>{quote.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  </span>
                  {isQuoteExpired() && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                      <Clock className="h-3 w-3 mr-1" />
                      Expired
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Quote Details & Cost Breakdown</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {hasPermission('quotes', 'update') && (
                <button 
                  onClick={() => onEdit?.(quote)}
                  disabled={isConverting}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Quote</span>
                </button>
              )}
              {hasPermission('quotes', 'convert') && quote.status === 'accepted' && onConvertToOrder && (
                <button 
                  onClick={() => onConvertToOrder(quote)}
                  disabled={isConverting}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isConverting 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                  }`}
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      <span>Convert to Order</span>
                    </>
                  )}
                </button>
              )}
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Building className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Customer Information
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">{quote.customer.name}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">Contact:</span>
                        <span className="text-gray-900 dark:text-gray-100">{quote.customer.contactPerson}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">Email:</span>
                        <span className="text-gray-900 dark:text-gray-100">{quote.customer.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                        <span className="text-gray-900 dark:text-gray-100">{quote.customer.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Address</h4>
                    <div className="flex items-start space-x-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5" />
                      <span className="text-gray-900 dark:text-gray-100">{quote.customer.address}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quote Items */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                Quote Items ({quote.parts.length})
              </h3>
              <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-600">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unit Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                      {quote.parts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center">
                            <div className="text-gray-500 dark:text-gray-400">
                              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No items in this quote</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        quote.parts.map((quotePart, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {quotePart.isCustomPart ? quotePart.customPartName : quotePart.part?.name}
                                  </p>
                                  {quotePart.isCustomPart && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                      Custom
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {quotePart.isCustomPart ? quotePart.customPartDescription : quotePart.part?.partNumber}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {quotePart.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                              ${quotePart.unitPrice.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                              ${quotePart.totalPrice.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                Cost Breakdown
              </h3>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Bid Items Total:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">${quote.totalBidItemsCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Shipping ({quote.shippingCosts.selected}):</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        ${(quote.shippingCosts.selected === 'sea' ? quote.shippingCosts.sea : quote.shippingCosts.air).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Agent Fees:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">${quote.agentFees.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Local Shipping:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">${quote.localShippingFees.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">${quote.subtotalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">GST (10%):</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">${quote.gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-300 dark:border-gray-500 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Grand Total:</span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">${quote.grandTotalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Options Comparison */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Truck className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
                Shipping Options
              </h3>

              {/* Price List Information */}
              {quote.seaFreightPriceListId && quote.priceListSnapshot && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Ship className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">Price List Applied</h4>
                        {quote.manualPriceOverride && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs rounded">
                            Manually Adjusted
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{quote.priceListSnapshot.itemName}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Category:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{quote.priceListSnapshot.category}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Shipping Type:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{quote.priceListSnapshot.shippingType}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">List Price:</span>
                          <p className="font-medium text-green-600 dark:text-green-400">${quote.priceListSnapshot.customerPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Applied:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {quote.priceListAppliedAt ? new Date(quote.priceListAppliedAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border-2 ${
                  quote.shippingCosts.selected === 'sea' 
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Sea Freight</h4>
                    {quote.shippingCosts.selected === 'sea' && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${quote.shippingCosts.sea.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">20-30 days delivery</p>
                </div>
                <div className={`p-4 rounded-lg border-2 ${
                  quote.shippingCosts.selected === 'air' 
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Air Freight</h4>
                    {quote.shippingCosts.selected === 'air' && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${quote.shippingCosts.air.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">5-7 days delivery</p>
                </div>
              </div>
            </div>

            {/* Quote Timeline */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Quote Timeline
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg w-fit mx-auto mb-2">
                      <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Quote Date</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(quote.quoteDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-center">
                    <div className={`p-3 rounded-lg w-fit mx-auto mb-2 ${
                      isQuoteExpired() ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30'
                    }`}>
                      <Clock className={`h-6 w-6 ${
                        isQuoteExpired() ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'
                      }`} />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Expiry Date</p>
                    <p className={`font-medium ${
                      isQuoteExpired() ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {new Date(quote.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg w-fit mx-auto mb-2">
                      <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Created By</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{quote.createdBy}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
                  Notes
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-900 dark:text-gray-100">{quote.notes}</p>
                </div>
              </div>
            )}

            {/* Conversion Info */}
            {quote.convertedToOrderNumber && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <h4 className="font-medium text-purple-900 dark:text-purple-100">Quote Converted to Order</h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        This quote has been successfully converted to an order.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                    <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">{quote.convertedToOrderNumber}</span>
                    <ExternalLink className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteDetailsModal;