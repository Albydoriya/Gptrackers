import React, { useState, useEffect, useCallback } from 'react';
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
  Receipt,
  ShoppingCart,
  Send,
  Clock,
  XCircle,
  Archive,
  RefreshCw as StatusUpdate,
  Ship,
  Plane,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Quote, Customer, QuotePart, Part } from '../types';
import { supabase } from '../lib/supabase';
import { quotesService, QuoteStatusCounts } from '../services/quotesService';
import CreateQuote from './CreateQuote';
import EditQuote from './EditQuote';
import QuoteDetailsModal from './QuoteDetailsModal';
import QuoteStatusUpdateModal from './QuoteStatusUpdateModal';
import SeaFreightPricingModal from './SeaFreightPricingModal';
import AirFreightPricingModal from './AirFreightPricingModal';
import AgentFeePricingModal from './AgentFeePricingModal';

const Quotes: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    return localStorage.getItem('quotes_status_filter') || 'sent';
  });
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'customer'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateQuoteOpen, setIsCreateQuoteOpen] = useState(false);
  const [isEditQuoteOpen, setIsEditQuoteOpen] = useState(false);
  const [isQuoteDetailsOpen, setIsQuoteDetailsOpen] = useState(false);
  const [isQuoteStatusUpdateOpen, setIsQuoteStatusUpdateOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [statusUpdateQuote, setStatusUpdateQuote] = useState<Quote | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isConverting, setIsConverting] = useState<string | null>(null);
  const [isSeaFreightPricingOpen, setIsSeaFreightPricingOpen] = useState(false);
  const [isAirFreightPricingOpen, setIsAirFreightPricingOpen] = useState(false);
  const [isAgentFeePricingOpen, setIsAgentFeePricingOpen] = useState(false);
  const [statusCounts, setStatusCounts] = useState<QuoteStatusCounts>({
    all: 0,
    draft: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    converted_to_order: 0,
    expired: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const pageSize = 25;

  const fetchQuotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await quotesService.fetchQuotes({
        status: statusFilter,
        searchTerm,
        sortBy,
        sortOrder,
        page: currentPage,
        pageSize
      });

      setQuotes(result.quotes);
      setTotalQuotes(result.total);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      console.error('Error fetching quotes:', err);
      setError(err.message || 'Failed to fetch quotes');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchTerm, sortBy, sortOrder, currentPage, pageSize]);

  const fetchStatusCounts = useCallback(async () => {
    try {
      const counts = await quotesService.fetchStatusCounts();
      setStatusCounts(counts);
    } catch (err: any) {
      console.error('Error fetching status counts:', err);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  useEffect(() => {
    fetchStatusCounts();
  }, [fetchStatusCounts]);

  useEffect(() => {
    localStorage.setItem('quotes_status_filter', statusFilter);
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchQuotes();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const displayQuotes = quotes;

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses', count: statusCounts.all, shortcut: '1' },
    { value: 'draft', label: 'Draft', count: statusCounts.draft, shortcut: '2' },
    { value: 'sent', label: 'Sent', count: statusCounts.sent, shortcut: '3' },
    { value: 'accepted', label: 'Accepted', count: statusCounts.accepted, shortcut: '4' },
    { value: 'rejected', label: 'Rejected', count: statusCounts.rejected, shortcut: '5' },
    { value: 'converted_to_order', label: 'Converted to Order', count: statusCounts.converted_to_order, shortcut: '6' },
    { value: 'expired', label: 'Expired', count: statusCounts.expired, shortcut: '7' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      const shortcutMap: { [key: string]: string } = {
        '1': 'all',
        '2': 'draft',
        '3': 'sent',
        '4': 'accepted',
        '5': 'rejected',
        '6': 'converted_to_order',
        '7': 'expired'
      };

      if (shortcutMap[e.key]) {
        e.preventDefault();
        setStatusFilter(shortcutMap[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleQuoteCreated = (newQuote: Quote) => {
    fetchQuotes();
    fetchStatusCounts();
    setIsCreateQuoteOpen(false);
  };

  const handleQuoteUpdated = (updatedQuote: Quote) => {
    fetchQuotes();
    fetchStatusCounts();
    setIsEditQuoteOpen(false);
    setEditingQuote(null);
  };

  const handleQuoteStatusUpdate = (quoteId: string, newStatus: any, notes?: string) => {
    fetchQuotes();
    fetchStatusCounts();
    setIsQuoteStatusUpdateOpen(false);
    setStatusUpdateQuote(null);
  };

  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    setIsEditQuoteOpen(true);
  };

  const handleViewQuote = (quote: Quote) => {
    setViewingQuote(quote);
    setIsQuoteDetailsOpen(true);
  };

  const handleStatusUpdateClick = (quote: Quote) => {
    setStatusUpdateQuote(quote);
    setIsQuoteStatusUpdateOpen(true);
  };

  const handleConvertToOrder = async (quote: Quote) => {
    if (!user) {
      alert('You must be logged in to convert quotes to orders.');
      return;
    }

    if (quote.status !== 'accepted') {
      alert('Only accepted quotes can be converted to orders.');
      return;
    }

    const confirmed = window.confirm(
      `Convert quote ${quote.quoteNumber} to an order?\n\nThis will create a new order with all the quote items and mark the quote as converted.`
    );

    if (!confirmed) return;

    setIsConverting(quote.id);
    setError(null);

    try {
      // 1. Find a suitable supplier for the order
      // For now, we'll use the first active supplier or create a generic one
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
        created_by: user?.id,
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
          converted_to_order_number: orderObject.order_number,
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      if (quoteUpdateError) throw quoteUpdateError;

      // 5. Refresh quotes list and status counts
      await fetchQuotes();
      await fetchStatusCounts();

      alert(`Quote ${quote.quoteNumber} has been successfully converted to order ${orderObject.order_number}!`);
      
    } catch (err: any) {
      console.error('Error converting quote to order:', err);
      setError(`Failed to convert quote to order: ${err.message}`);
    } finally {
      setIsConverting(null);
    }
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

  const isQuoteExpired = (quote: Quote) => {
    return new Date(quote.expiryDate) < new Date() && quote.status !== 'accepted' && quote.status !== 'converted_to_order';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quotes Management</h1>
          <button
            onClick={fetchQuotes}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh quotes"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        <div className="flex items-center space-x-3">
          {hasPermission('quotes', 'update') && (
            <>
              <button
                onClick={() => setIsSeaFreightPricingOpen(true)}
                className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                title="Manage sea freight pricing across all quotes"
              >
                <Ship className="h-4 w-4" />
                <span>Sea Freight Pricing</span>
              </button>
              <button
                onClick={() => setIsAirFreightPricingOpen(true)}
                className="flex items-center space-x-2 bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors"
                title="Manage air freight pricing (per kg) across all quotes"
              >
                <Plane className="h-4 w-4" />
                <span>Air Freight Pricing</span>
              </button>
              <button
                onClick={() => setIsAgentFeePricingOpen(true)}
                className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                title="Manage agent fees linked to suppliers"
              >
                <User className="h-4 w-4" />
                <span>Agent Fee Pricing</span>
              </button>
            </>
          )}
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
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error loading quotes</h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              <button
                onClick={fetchQuotes}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          {/* Search and Basic Filters */}
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
                title="Press number keys 1-7 for quick status switching"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count}) [{option.shortcut}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
              <div className="flex items-center space-x-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'customer')}
                  disabled={isLoading}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="date">Quote Date</option>
                  <option value="amount">Total Amount</option>
                  <option value="customer">Customer Name</option>
                </select>
                <button
                  onClick={toggleSortOrder}
                  disabled={isLoading}
                  className="p-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {sortOrder === 'asc' ? (
                    <SortAsc className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <SortDesc className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Results Summary */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {isLoading ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading quotes...</span>
                </span>
              ) : (
                <span>
                  Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalQuotes)} of {totalQuotes} quote{totalQuotes !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
          <div className="flex-1 relative">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Loading Quotes</h3>
            <p className="text-gray-600 dark:text-gray-400">Fetching the latest quotes data from the database...</p>
          </div>
        </div>
      )}

      {/* Quotes List */}
      {!isLoading && !error && quotes.length === 0 ? (
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
      ) : !isLoading && !error && (
        <div className="grid grid-cols-1 gap-6">
          {displayQuotes.map((quote) => {
            const isExpired = isQuoteExpired(quote);
            const isCurrentQuoteConverting = isConverting === quote.id;
            
            return (
            <div key={quote.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
              isExpired ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700'
            }`}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{quote.quoteNumber}</h3>
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quote.status)}`}>
                          {getStatusIcon(quote.status)}
                          <span>{quote.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        </span>
                        {isExpired && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                            <Clock className="h-3 w-3 mr-1" />
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Created: {new Date(quote.quoteDate).toLocaleDateString()} • 
                        Expires: <span className={isExpired ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}>
                          {new Date(quote.expiryDate).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-2">
                      <button
                        onClick={() => handleViewQuote(quote)}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View</span>
                      </button>
                      {hasPermission('quotes', 'update') && (
                        <button
                          onClick={() => handleEditQuote(quote)}
                          disabled={isCurrentQuoteConverting}
                          className="flex items-center space-x-1 px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors text-sm"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      )}
                      {hasPermission('quotes', 'update') && (
                        <button
                          onClick={() => handleStatusUpdateClick(quote)}
                          disabled={isCurrentQuoteConverting}
                          className="flex items-center space-x-1 px-3 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors text-sm"
                        >
                          <StatusUpdate className="h-3 w-3" />
                          <span>Status</span>
                        </button>
                      )}
                      {hasPermission('quotes', 'convert') && quote.status === 'accepted' && (
                        <button
                          onClick={() => handleConvertToOrder(quote)}
                          disabled={isCurrentQuoteConverting}
                          className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                            isCurrentQuoteConverting
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                              : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                          }`}
                        >
                          {isCurrentQuoteConverting ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Converting...</span>
                            </>
                          ) : (
                            <>
                              <ArrowRight className="h-3 w-3" />
                              <span>Convert to Order</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      ${quote.grandTotalAmount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Amount</div>
                  </div>
                </div>

                {/* Order Reference - Only show if quote was converted to order */}
                {quote.convertedToOrderNumber && (
                  <div className="mb-4">
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ShoppingCart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          <div>
                            <h4 className="font-medium text-purple-900 dark:text-purple-100">Converted to Order</h4>
                            <p className="text-sm text-purple-700 dark:text-purple-300">
                              This quote has been successfully converted to an order.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                          <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                            {quote.convertedToOrderNumber}
                          </span>
                          <ExternalLink className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* No Results Message */}
      {!isLoading && !error && displayQuotes.length === 0 && quotes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No matching quotes found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No quotes match your current search criteria
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            Clear filters and show all quotes
          </button>
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

      {/* Quote Details Modal */}
      <QuoteDetailsModal
        isOpen={isQuoteDetailsOpen}
        onClose={() => {
          setIsQuoteDetailsOpen(false);
          setViewingQuote(null);
        }}
        quote={viewingQuote}
        onEdit={handleEditQuote}
        onConvertToOrder={handleConvertToOrder}
        isConverting={isConverting === viewingQuote?.id}
      />

      {/* Quote Status Update Modal */}
      <QuoteStatusUpdateModal
        isOpen={isQuoteStatusUpdateOpen}
        onClose={() => {
          setIsQuoteStatusUpdateOpen(false);
          setStatusUpdateQuote(null);
        }}
        quote={statusUpdateQuote}
        onStatusUpdate={handleQuoteStatusUpdate}
      />

      {/* Sea Freight Pricing Modal */}
      <SeaFreightPricingModal
        isOpen={isSeaFreightPricingOpen}
        onClose={() => setIsSeaFreightPricingOpen(false)}
        quote={null}
      />

      {/* Air Freight Pricing Modal */}
      <AirFreightPricingModal
        isOpen={isAirFreightPricingOpen}
        onClose={() => setIsAirFreightPricingOpen(false)}
        quote={null}
      />

      {/* Agent Fee Pricing Modal */}
      <AgentFeePricingModal
        isOpen={isAgentFeePricingOpen}
        onClose={() => setIsAgentFeePricingOpen(false)}
      />
    </div>
  );
};

export default Quotes;