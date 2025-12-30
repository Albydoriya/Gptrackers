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
  Receipt,
  ShoppingCart,
  Send,
  Clock,
  XCircle,
  Archive,
  RefreshCw as StatusUpdate,
  Ship,
  Plane
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Quote, Customer, QuotePart, Part } from '../types';
import { supabase } from '../lib/supabase';
import CreateQuote from './CreateQuote';
import EditQuote from './EditQuote';
import QuoteDetailsModal from './QuoteDetailsModal';
import QuoteStatusUpdateModal from './QuoteStatusUpdateModal';
import SeaFreightPricingModal from './SeaFreightPricingModal';
import AirFreightPricingModal from './AirFreightPricingModal';

const Quotes: React.FC = () => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  // Fetch quotes from Supabase
  const fetchQuotes = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch quotes with quote_parts using the proper foreign key relationship
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_parts!quote_parts_quote_id_fkey(
            *,
            parts(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;

      if (!quotesData || quotesData.length === 0) {
        setQuotes([]);
        return;
      }

      // Get unique customer IDs
      const customerIds = [...new Set(quotesData.map(quote => quote.customer_id).filter(Boolean))];
      
      // Fetch customers separately
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .in('id', customerIds);

      if (customersError) throw customersError;

      // Create a map of customers for quick lookup
      const customersMap = new Map();
      (customersData || []).forEach(customer => {
        customersMap.set(customer.id, customer);
      });

      // Transform Supabase data to match Quote interface
      const transformedQuotes: Quote[] = quotesData.map(quoteData => {
        const customerData = customersMap.get(quoteData.customer_id);
        
        return {
        id: quoteData.id,
        quoteNumber: quoteData.quote_number,
        customer: customerData ? {
          id: customerData.id,
          name: customerData.name,
          contactPerson: customerData.contact_person,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address,
          createdAt: customerData.created_at,
          updatedAt: customerData.updated_at
        } : {
          id: '',
          name: 'Unknown Customer',
          contactPerson: 'Unknown',
          email: 'unknown@example.com',
          phone: 'N/A',
          address: 'N/A',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        status: quoteData.status,
        parts: quoteData.quote_parts.map((quotePart: any) => ({
          id: quotePart.id,
          part: quotePart.part ? {
            id: quotePart.part.id,
            partNumber: quotePart.part.part_number,
            name: quotePart.part.name,
            description: quotePart.part.description,
            category: quotePart.part.category,
            specifications: quotePart.part.specifications,
            priceHistory: [],
            currentStock: quotePart.part.current_stock,
            minStock: quotePart.part.min_stock,
            preferredSuppliers: quotePart.part.preferred_suppliers
          } : undefined,
          customPartName: quotePart.custom_part_name,
          customPartDescription: quotePart.custom_part_description,
          quantity: quotePart.quantity,
          unitPrice: quotePart.unit_price,
          totalPrice: quotePart.total_price,
          isCustomPart: quotePart.is_custom_part
        })),
        totalBidItemsCost: quoteData.total_bid_items_cost,
        shippingCosts: {
          sea: quoteData.shipping_cost_sea,
          air: quoteData.shipping_cost_air,
          selected: quoteData.selected_shipping_method
        },
        agentFees: quoteData.agent_fees,
        localShippingFees: quoteData.local_shipping_fees,
        subtotalAmount: quoteData.subtotal_amount,
        gstAmount: quoteData.gst_amount,
        grandTotalAmount: quoteData.grand_total_amount,
        quoteDate: quoteData.quote_date,
        expiryDate: quoteData.expiry_date,
        notes: quoteData.notes,
        createdBy: quoteData.created_by || 'Unknown',
        convertedToOrderId: quoteData.converted_to_order_id
        };
      });

      setQuotes(transformedQuotes);
    } catch (err: any) {
      console.error('Error fetching quotes:', err);
      setError(err.message || 'Failed to fetch quotes');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch quotes on component mount
  React.useEffect(() => {
    fetchQuotes();
  }, []);

  // Sort quotes
  const sortQuotes = (quotesToSort: Quote[]) => {
    return [...quotesToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.quoteDate).getTime() - new Date(b.quoteDate).getTime();
          break;
        case 'amount':
          comparison = a.grandTotalAmount - b.grandTotalAmount;
          break;
        case 'customer':
          comparison = a.customer.name.localeCompare(b.customer.name);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // Apply filters and sorting
  const getDisplayQuotes = () => {
    let filteredQuotes = quotes.filter(quote => {
      const matchesSearch = quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           quote.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           quote.customer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    
    return sortQuotes(filteredQuotes);
  };

  const displayQuotes = getDisplayQuotes();

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

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
    // Refresh quotes list after creation
    fetchQuotes();
    setIsCreateQuoteOpen(false);
  };

  const handleQuoteUpdated = (updatedQuote: Quote) => {
    // Refresh quotes list after update
    fetchQuotes();
    setIsEditQuoteOpen(false);
    setEditingQuote(null);
  };

  const handleQuoteStatusUpdate = (quoteId: string, newStatus: any, notes?: string) => {
    // Refresh quotes list after status update
    fetchQuotes();
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
        created_by: quote.createdBy,
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

      // 5. Refresh quotes list
      await fetchQuotes();

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
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
                <span>Showing {displayQuotes.length} quote{displayQuotes.length !== 1 ? 's' : ''}</span>
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
                    {quote.convertedToOrderId && (
                      <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                        Converted to Order
                      </div>
                    )}
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
            );
          })}
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
    </div>
  );
};

export default Quotes;