import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  FileText,
  Calendar,
  DollarSign,
  User,
  RefreshCw,
  SortAsc,
  SortDesc,
  X,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Building,
  Receipt
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Quote } from '../types';
import CreateQuote from './CreateQuote';
import EditQuote from './EditQuote';

// Temporary placeholder component - will be fully implemented later
const Quotes: React.FC = () => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateQuoteOpen, setIsCreateQuoteOpen] = useState(false);
  const [isEditQuoteOpen, setIsEditQuoteOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'converted_to_order', label: 'Converted to Order' },
    { value: 'expired', label: 'Expired' },
  ];

  const handleQuoteCreated = (newQuote: Quote) => {
    setQuotes(prev => [newQuote, ...prev]);
    setIsCreateQuoteOpen(false);
  };

  const handleQuoteUpdated = (updatedQuote: Quote) => {
    setQuotes(prev => prev.map(quote => 
      quote.id === updatedQuote.id ? updatedQuote : quote
    ));
    setIsEditQuoteOpen(false);
    setEditingQuote(null);
  };

  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    setIsEditQuoteOpen(true);
  };

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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quotes Management</h1>
          <button
            onClick={() => {/* TODO: Implement refresh */}}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh quotes"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        {hasPermission('quotes', 'create') && (
          <button 
            onClick={() => setIsCreateQuoteOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Quote</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search quotes by number, customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={isLoading}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

      {/* Quotes List */}
      {quotes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit mx-auto mb-6">
              <FileText className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              No Quotes Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create professional quotes for customers with detailed cost calculations including shipping options, agent fees, and GST.
            </p>
            
            {hasPermission('quotes', 'create') ? (
              <button 
                onClick={() => setIsCreateQuoteOpen(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              >
                <Plus className="h-5 w-5" />
                <span>Create Your First Quote</span>
              </button>
            ) : (
              <div className="text-gray-500 dark:text-gray-400">
                Contact your administrator for quote creation permissions
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {quotes.map((quote) => (
            <div key={quote.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{quote.quoteNumber}</h3>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quote.status)}`}>
                          {quote.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Created: {new Date(quote.quoteDate).toLocaleDateString()} • 
                        Expires: {new Date(quote.expiryDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-2">
                      <button 
                        onClick={() => {/* TODO: View quote details */}}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View</span>
                      </button>
                      {hasPermission('quotes', 'update') && (
                        <button 
                          onClick={() => handleEditQuote(quote)}
                          className="flex items-center space-x-1 px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors text-sm"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      ${quote.grandTotalAmount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Amount</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Customer Information */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-white dark:bg-gray-600 rounded-lg">
                        <Building className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">Customer</h4>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{quote.customer.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{quote.customer.contactPerson}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{quote.customer.email}</p>
                    </div>
                  </div>
                  
                  {/* Items Summary */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-white dark:bg-gray-600 rounded-lg">
                        <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">Quote Items</h4>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Items:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{quote.parts.length}</span>
                      </div>
                      <div className="space-y-1">
                        {quote.parts.slice(0, 3).map((quotePart, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700 dark:text-gray-300 truncate max-w-32">
                              {quotePart.isCustomPart ? quotePart.customPartName : quotePart.part?.name}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">×{quotePart.quantity}</span>
                          </div>
                        ))}
                        {quote.parts.length > 3 && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            +{quote.parts.length - 3} more items
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Cost Breakdown */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-white dark:bg-gray-600 rounded-lg">
                        <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">Cost Breakdown</h4>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Items:</span>
                        <span className="text-gray-900 dark:text-gray-100">${quote.totalBidItemsCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Shipping:</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          ${(quote.shippingCosts.selected === 'sea' ? quote.shippingCosts.sea : quote.shippingCosts.air).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Fees:</span>
                        <span className="text-gray-900 dark:text-gray-100">${(quote.agentFees + quote.localShippingFees).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-300 dark:border-gray-500 pt-1">
                        <span className="text-gray-600 dark:text-gray-400">GST:</span>
                        <span className="text-gray-900 dark:text-gray-100">${quote.gstAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Quote Modal */}
      <CreateQuote
        isOpen={isCreateQuoteOpen}
        onClose={() => setIsCreateQuoteOpen(false)}
        onQuoteCreated={handleQuoteCreated}
      />

      {/* Edit Quote Modal */}
      <EditQuote
        isOpen={isEditQuoteOpen}
        onClose={() => {
          setIsEditQuoteOpen(false);
          setEditingQuote(null);
        }}
        onQuoteUpdated={handleQuoteUpdated}
        quote={editingQuote}
      />
    </div>
  );
};

export default Quotes;