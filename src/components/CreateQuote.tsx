import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Search, 
  Package, 
  User, 
  DollarSign, 
  Calendar,
  FileText,
  Send,
  Save,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Edit3,
  Ship,
  Plane,
  Calculator,
  Receipt,
  Globe,
  Truck,
  Building
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Part, Customer, QuotePart, Quote } from '../types';

interface CreateQuoteProps {
  isOpen: boolean;
  onClose: () => void;
  onQuoteCreated: (quote: Quote) => void;
}

interface QuoteFormData {
  quoteNumber: string;
  customer: Customer | null;
  parts: QuotePart[];
  shippingCosts: {
    sea: number;
    air: number;
    selected: 'sea' | 'air';
  };
  agentFees: number;
  localShippingFees: number;
  expiryDate: string;
  notes: string;
  newCustomer: {
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
  };
}

const CreateQuote: React.FC<CreateQuoteProps> = ({ isOpen, onClose, onQuoteCreated }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddNewCustomer, setShowAddNewCustomer] = useState(false);
  const [showAddCustomPart, setShowAddCustomPart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [customPart, setCustomPart] = useState({
    name: '',
    description: '',
    price: 0
  });
  const [formData, setFormData] = useState<QuoteFormData>({
    quoteNumber: `QTE-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    customer: null,
    parts: [],
    shippingCosts: {
      sea: 0,
      air: 0,
      selected: 'sea'
    },
    agentFees: 0,
    localShippingFees: 0,
    expiryDate: '',
    notes: '',
    newCustomer: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: ''
    }
  });
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const categories = ['all', ...new Set(availableParts.map(p => p.category))];
  
  // Set default expiry date (30 days from now)
  useEffect(() => {
    const defaultExpiryDate = new Date();
    defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30);
    setFormData(prev => ({
      ...prev,
      expiryDate: defaultExpiryDate.toISOString().split('T')[0]
    }));
  }, []);

  // Fetch parts from Supabase
  useEffect(() => {
    const fetchParts = async () => {
      try {
        const { data, error } = await supabase
          .from('parts')
          .select('*, price_history:part_price_history(*)')
          .eq('is_archived', false);

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
          })),
          // Calculate pricing tiers
          internalUsageMarkupPercentage: part.internal_usage_markup_percentage || 10,
          wholesaleMarkupPercentage: part.wholesale_markup_percentage || 20,
          tradeMarkupPercentage: part.trade_markup_percentage || 30,
          retailMarkupPercentage: part.retail_markup_percentage || 50,
          internalUsagePrice: (() => {
            const currentPrice = (part.price_history && part.price_history.length > 0)
              ? parseFloat(part.price_history[part.price_history.length - 1].price)
              : 0;
            return currentPrice * (1 + (part.internal_usage_markup_percentage || 10) / 100) * 1.1;
          })(),
          wholesalePrice: (() => {
            const currentPrice = (part.price_history && part.price_history.length > 0)
              ? parseFloat(part.price_history[part.price_history.length - 1].price)
              : 0;
            return currentPrice * (1 + (part.wholesale_markup_percentage || 20) / 100) * 1.1;
          })(),
          tradePrice: (() => {
            const currentPrice = (part.price_history && part.price_history.length > 0)
              ? parseFloat(part.price_history[part.price_history.length - 1].price)
              : 0;
            return currentPrice * (1 + (part.trade_markup_percentage || 30) / 100) * 1.1;
          })(),
          retailPrice: (() => {
            const currentPrice = (part.price_history && part.price_history.length > 0)
              ? parseFloat(part.price_history[part.price_history.length - 1].price)
              : 0;
            return currentPrice * (1 + (part.retail_markup_percentage || 50) / 100) * 1.1;
          })()
        }));

        setAvailableParts(transformedParts);
      } catch (error) {
        console.error('Error fetching parts:', error);
      }
    };

    fetchParts();
  }, []);

  // Fetch customers from Supabase (placeholder - will need actual table)
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        // TODO: Replace with actual customers table when created
        // For now, using empty array
        setCustomers([]);
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    };

    fetchCustomers();
  }, []);

  const filteredParts = availableParts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.partNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || part.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addPartToQuote = (part: Part, pricingTier: 'internal' | 'wholesale' | 'trade' | 'retail' = 'retail') => {
    const existingPart = formData.parts.find(p => p.part?.id === part.id);
    if (existingPart) {
      updatePartQuantity(existingPart.id, existingPart.quantity + 1);
    } else {
      let unitPrice = 0;
      switch (pricingTier) {
        case 'internal':
          unitPrice = part.internalUsagePrice || 0;
          break;
        case 'wholesale':
          unitPrice = part.wholesalePrice || 0;
          break;
        case 'trade':
          unitPrice = part.tradePrice || 0;
          break;
        case 'retail':
          unitPrice = part.retailPrice || 0;
          break;
      }
      
      const newQuotePart: QuotePart = {
        id: crypto.randomUUID(),
        part,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
        isCustomPart: false
      };
      
      setFormData(prev => ({
        ...prev,
        parts: [...prev.parts, newQuotePart]
      }));
    }
  };

  const addCustomPartToQuote = () => {
    if (!customPart.name || customPart.price <= 0) {
      return;
    }

    const newQuotePart: QuotePart = {
      id: crypto.randomUUID(),
      customPartName: customPart.name,
      customPartDescription: customPart.description,
      quantity: 1,
      unitPrice: customPart.price,
      totalPrice: customPart.price,
      isCustomPart: true
    };
    
    setFormData(prev => ({
      ...prev,
      parts: [...prev.parts, newQuotePart]
    }));

    // Reset custom part form
    setCustomPart({ name: '', description: '', price: 0 });
    setShowAddCustomPart(false);
  };

  const updatePartQuantity = (partId: string, quantity: number) => {
    if (quantity <= 0) {
      removePartFromQuote(partId);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      parts: prev.parts.map(quotePart => 
        quotePart.id === partId 
          ? { 
              ...quotePart, 
              quantity, 
              totalPrice: quotePart.unitPrice * quantity 
            }
          : quotePart
      )
    }));
  };

  const updatePartPrice = (partId: string, unitPrice: number) => {
    setFormData(prev => ({
      ...prev,
      parts: prev.parts.map(quotePart => 
        quotePart.id === partId 
          ? { 
              ...quotePart, 
              unitPrice, 
              totalPrice: unitPrice * quotePart.quantity 
            }
          : quotePart
      )
    }));
  };

  const removePartFromQuote = (partId: string) => {
    setFormData(prev => ({
      ...prev,
      parts: prev.parts.filter(quotePart => quotePart.id !== partId)
    }));
  };

  const addNewCustomer = () => {
    if (!formData.newCustomer.name || !formData.newCustomer.email) {
      return;
    }

    const newCustomer: Customer = {
      id: `temp-${Date.now()}`,
      name: formData.newCustomer.name,
      contactPerson: formData.newCustomer.contactPerson,
      email: formData.newCustomer.email,
      phone: formData.newCustomer.phone,
      address: formData.newCustomer.address,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setFormData(prev => ({ ...prev, customer: newCustomer }));
    setShowAddNewCustomer(false);
  };

  // Cost calculations
  const getBidItemsTotal = () => {
    return formData.parts.reduce((sum, part) => sum + part.totalPrice, 0);
  };

  const getSelectedShippingCost = () => {
    return formData.shippingCosts.selected === 'sea' 
      ? formData.shippingCosts.sea 
      : formData.shippingCosts.air;
  };

  const getSubtotal = () => {
    return getBidItemsTotal() + getSelectedShippingCost() + formData.agentFees + formData.localShippingFees;
  };

  const getGSTAmount = () => {
    return getSubtotal() * 0.1; // 10% GST
  };

  const getGrandTotal = () => {
    return getSubtotal() + getGSTAmount();
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return formData.customer !== null;
      case 2:
        return formData.parts.length > 0;
      case 3:
        return formData.expiryDate !== '';
      default:
        return true;
    }
  };

  const handleSubmit = (status: 'draft' | 'sent') => {
    createQuoteInSupabase(status);
  };

  const createQuoteInSupabase = async (status: 'draft' | 'sent') => {
    if (!formData.customer || formData.parts.length === 0 || !user) {
      setSubmitError('Please ensure all required fields are filled');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // TODO: Implement actual Supabase insertion when tables are created
      // For now, simulate the creation
      const newQuote: Quote = {
        id: crypto.randomUUID(),
        quoteNumber: formData.quoteNumber,
        customer: formData.customer,
        status,
        parts: formData.parts,
        totalBidItemsCost: getBidItemsTotal(),
        shippingCosts: formData.shippingCosts,
        agentFees: formData.agentFees,
        localShippingFees: formData.localShippingFees,
        subtotalAmount: getSubtotal(),
        gstAmount: getGSTAmount(),
        grandTotalAmount: getGrandTotal(),
        quoteDate: new Date().toISOString().split('T')[0],
        expiryDate: formData.expiryDate,
        notes: formData.notes,
        createdBy: user.name
      };

      // Success - notify parent component and close modal
      onQuoteCreated(newQuote);
      onClose();
      
      // Reset form
      setCurrentStep(1);
      setFormData({
        quoteNumber: `QTE-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        customer: null,
        parts: [],
        shippingCosts: { sea: 0, air: 0, selected: 'sea' },
        agentFees: 0,
        localShippingFees: 0,
        expiryDate: '',
        notes: '',
        newCustomer: {
          name: '',
          contactPerson: '',
          email: '',
          phone: '',
          address: ''
        }
      });

    } catch (error: any) {
      console.error('Error creating quote:', error);
      setSubmitError(error.message || 'Failed to create quote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const steps = [
    { number: 1, title: 'Customer Details', icon: User },
    { number: 2, title: 'Add Items', icon: Package },
    { number: 3, title: 'Cost Calculations', icon: Calculator },
    { number: 4, title: 'Review & Submit', icon: Send }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Quote</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                
                return (
                  <div key={step.number} className="flex items-center">
                    <div className={`flex items-center space-x-2 ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      <div className={`p-2 rounded-lg ${
                        isActive ? 'bg-blue-100 dark:bg-blue-900/30' : isCompleted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{step.title}</span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-16 h-0.5 mx-4 ${
                        isCompleted ? 'bg-green-600 dark:bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Customer Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select or Add Customer</h3>
                
                {/* Existing Customers */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Existing Customers</h4>
                    <button
                      onClick={() => setShowAddNewCustomer(!showAddNewCustomer)}
                      className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add New Customer</span>
                    </button>
                  </div>
                  
                  {customers.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <Building className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                      <p className="text-gray-600 dark:text-gray-400">No customers found</p>
                      <button
                        onClick={() => setShowAddNewCustomer(true)}
                        className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                      >
                        Add your first customer
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {customers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => setFormData(prev => ({ ...prev, customer }))}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            formData.customer?.id === customer.id
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-700'
                          }`}
                        >
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">{customer.name}</h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{customer.contactPerson}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{customer.email}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add New Customer Form */}
                {showAddNewCustomer && (
                  <div className="p-6 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                      <Building className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                      Add New Customer
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          value={formData.newCustomer.name}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            newCustomer: { ...prev.newCustomer, name: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Customer Company Name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Contact Person *
                        </label>
                        <input
                          type="text"
                          value={formData.newCustomer.contactPerson}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            newCustomer: { ...prev.newCustomer, contactPerson: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Contact Person Name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={formData.newCustomer.email}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            newCustomer: { ...prev.newCustomer, email: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="customer@company.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.newCustomer.phone}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            newCustomer: { ...prev.newCustomer, phone: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="+61 xxx xxx xxx"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Address
                        </label>
                        <textarea
                          value={formData.newCustomer.address}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            newCustomer: { ...prev.newCustomer, address: e.target.value }
                          }))}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Customer address..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-4">
                      <button
                        onClick={() => setShowAddNewCustomer(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addNewCustomer}
                        disabled={!formData.newCustomer.name || !formData.newCustomer.email}
                        className={`px-4 py-2 rounded-md ${
                          formData.newCustomer.name && formData.newCustomer.email
                            ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Add Customer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Add Items */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add Items to Quote</h3>
                
                {/* Search and Filter */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search parts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Available Parts */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Parts Catalog</h4>
                      <button
                        onClick={() => setShowAddCustomPart(!showAddCustomPart)}
                        className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Custom Item</span>
                      </button>
                    </div>
                    
                    {/* Add Custom Part Form */}
                    {showAddCustomPart && (
                      <div className="mb-4 p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                          <Edit3 className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                          Add Custom Item
                        </h5>
                        <div className="grid grid-cols-1 gap-3">
                          <input
                            type="text"
                            placeholder="Item Name"
                            value={customPart.name}
                            onChange={(e) => setCustomPart(prev => ({ ...prev, name: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                          <textarea
                            placeholder="Description (optional)"
                            value={customPart.description}
                            onChange={(e) => setCustomPart(prev => ({ ...prev, description: e.target.value }))}
                            rows={2}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              placeholder="Unit Price"
                              step="0.01"
                              value={customPart.price || ''}
                              onChange={(e) => setCustomPart(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={addCustomPartToQuote}
                                disabled={!customPart.name || customPart.price <= 0}
                                className={`flex-1 px-3 py-2 rounded-md text-sm ${
                                  customPart.name && customPart.price > 0
                                    ? 'bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                Add
                              </button>
                              <button
                                onClick={() => setShowAddCustomPart(false)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-96 overflow-y-auto bg-white dark:bg-gray-700">
                      {filteredParts.map((part) => (
                        <div key={part.id} className="p-4 border-b border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 dark:text-gray-100">{part.name}</h5>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{part.partNumber}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{part.category}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <button
                              onClick={() => addPartToQuote(part, 'internal')}
                              className="flex flex-col items-center p-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                            >
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Internal</span>
                              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">${part.internalUsagePrice?.toFixed(2)}</span>
                            </button>
                            <button
                              onClick={() => addPartToQuote(part, 'wholesale')}
                              className="flex flex-col items-center p-2 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-md transition-colors"
                            >
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Wholesale</span>
                              <span className="text-sm font-bold text-green-700 dark:text-green-300">${part.wholesalePrice?.toFixed(2)}</span>
                            </button>
                            <button
                              onClick={() => addPartToQuote(part, 'trade')}
                              className="flex flex-col items-center p-2 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-md transition-colors"
                            >
                              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Trade</span>
                              <span className="text-sm font-bold text-purple-700 dark:text-purple-300">${part.tradePrice?.toFixed(2)}</span>
                            </button>
                            <button
                              onClick={() => addPartToQuote(part, 'retail')}
                              className="flex flex-col items-center p-2 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded-md transition-colors"
                            >
                              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Retail</span>
                              <span className="text-sm font-bold text-orange-700 dark:text-orange-300">${part.retailPrice?.toFixed(2)}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                      {filteredParts.length === 0 && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                          <p>No parts found matching your search</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Items */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Quote Items ({formData.parts.length})
                    </h4>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-96 overflow-y-auto bg-white dark:bg-gray-700">
                      {formData.parts.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                          <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                          <p>No items added to quote yet</p>
                        </div>
                      ) : (
                        formData.parts.map((quotePart) => (
                          <div key={quotePart.id} className="p-4 border-b border-gray-100 dark:border-gray-600">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h5 className="font-medium text-gray-900 dark:text-gray-100">
                                  {quotePart.isCustomPart ? quotePart.customPartName : quotePart.part?.name}
                                </h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {quotePart.isCustomPart ? quotePart.customPartDescription : quotePart.part?.partNumber}
                                </p>
                                {quotePart.isCustomPart && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 mt-1">
                                    Custom Item
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => removePartFromQuote(quotePart.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400">Quantity</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={quotePart.quantity}
                                  onChange={(e) => updatePartQuantity(quotePart.id, parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400">Unit Price</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={quotePart.unitPrice}
                                  onChange={(e) => updatePartPrice(quotePart.id, parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400">Total</label>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 py-1">
                                  ${quotePart.totalPrice.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {formData.parts.length > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900 dark:text-gray-100">Bid Items Total:</span>
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            ${getBidItemsTotal().toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Cost Calculations */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Cost Calculations</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Shipping Options */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center">
                      <Globe className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                      Shipping Options
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700">
                        <div className="flex items-center space-x-3 mb-3">
                          <Ship className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-gray-100">Sea Freight</h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400">20-30 days delivery</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer ml-auto">
                            <input
                              type="radio"
                              name="shippingMethod"
                              checked={formData.shippingCosts.selected === 'sea'}
                              onChange={() => setFormData(prev => ({
                                ...prev,
                                shippingCosts: { ...prev.shippingCosts, selected: 'sea' }
                              }))}
                              className="sr-only peer"
                            />
                            <div className="w-5 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:border-blue-600 border-2 border-gray-300"></div>
                          </label>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.shippingCosts.sea || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            shippingCosts: { ...prev.shippingCosts, sea: parseFloat(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                          placeholder="Sea freight cost"
                        />
                      </div>
                      
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700">
                        <div className="flex items-center space-x-3 mb-3">
                          <Plane className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-gray-100">Air Freight</h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400">5-7 days delivery</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer ml-auto">
                            <input
                              type="radio"
                              name="shippingMethod"
                              checked={formData.shippingCosts.selected === 'air'}
                              onChange={() => setFormData(prev => ({
                                ...prev,
                                shippingCosts: { ...prev.shippingCosts, selected: 'air' }
                              }))}
                              className="sr-only peer"
                            />
                            <div className="w-5 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:bg-orange-600 peer-checked:border-orange-600 border-2 border-gray-300"></div>
                          </label>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.shippingCosts.air || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            shippingCosts: { ...prev.shippingCosts, air: parseFloat(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                          placeholder="Air freight cost"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Costs */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                      Additional Costs
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Agent Fees
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.agentFees || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, agentFees: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Agent fees amount"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Local Shipping Fees
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.localShippingFees || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, localShippingFees: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Local delivery fees"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Quote Expiry Date
                        </label>
                        <input
                          type="date"
                          value={formData.expiryDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Summary */}
                <div className="mt-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <Calculator className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                    Quote Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-gray-600 dark:text-gray-400">Bid Items</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">${getBidItemsTotal().toFixed(2)}</p>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-gray-600 dark:text-gray-400">
                        Shipping ({formData.shippingCosts.selected === 'sea' ? 'Sea' : 'Air'})
                      </p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">${getSelectedShippingCost().toFixed(2)}</p>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-gray-600 dark:text-gray-400">Fees</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        ${(formData.agentFees + formData.localShippingFees).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-gray-600 dark:text-gray-400">GST (10%)</p>
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">${getGSTAmount().toFixed(2)}</p>
                    </div>
                    <div className="text-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg border-2 border-blue-300 dark:border-blue-600">
                      <p className="text-blue-600 dark:text-blue-400 font-medium">Grand Total</p>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-300">${getGrandTotal().toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Review Quote</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Quote Summary */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Quote Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Quote Number:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{formData.quoteNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{formData.customer?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Contact:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{formData.customer?.contactPerson}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Expiry Date:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date(formData.expiryDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Shipping Method:</span>
                          <span className={`font-medium capitalize ${
                            formData.shippingCosts.selected === 'sea' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
                          }`}>
                            {formData.shippingCosts.selected} Freight
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quote Notes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={4}
                        placeholder="Add any special terms, conditions, or notes for the customer..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Quote Items</h4>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700">
                      {formData.parts.map((quotePart, index) => (
                        <div key={quotePart.id} className={`p-4 ${index < formData.parts.length - 1 ? 'border-b border-gray-100 dark:border-gray-600' : ''}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium text-gray-900 dark:text-gray-100">
                                {quotePart.isCustomPart ? quotePart.customPartName : quotePart.part?.name}
                              </h5>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {quotePart.isCustomPart ? quotePart.customPartDescription : quotePart.part?.partNumber}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {quotePart.quantity} × ${quotePart.unitPrice.toFixed(2)}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Total: ${quotePart.totalPrice.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Cost Breakdown */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-600 border-t border-gray-200 dark:border-gray-600">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Bid Items:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">${getBidItemsTotal().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              Shipping ({formData.shippingCosts.selected}):
                            </span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">${getSelectedShippingCost().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Agent Fees:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">${formData.agentFees.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Local Shipping:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">${formData.localShippingFees.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-gray-300 dark:border-gray-500 pt-2">
                            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">${getSubtotal().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">GST (10%):</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">${getGSTAmount().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-gray-300 dark:border-gray-500 pt-2">
                            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Grand Total:</span>
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                              ${getGrandTotal().toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mx-6 mb-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-800 dark:text-red-300">{submitError}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {currentStep > 1 && (
                <button
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceedToNext() || isSubmitting}
                  className={`flex items-center space-x-2 px-6 py-2 rounded-md ${
                    canProceedToNext() && !isSubmitting
                      ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleSubmit('draft')}
                    disabled={isSubmitting}
                    className={`flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md transition-colors ${
                      isSubmitting 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save as Draft</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleSubmit('sent')}
                    disabled={isSubmitting}
                    className={`flex items-center space-x-2 px-6 py-2 rounded-md transition-colors ${
                      isSubmitting
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send Quote</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {!canProceedToNext() && currentStep < 4 && !isSubmitting && (
            <div className="mt-3 flex items-center space-x-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                {currentStep === 1 && 'Please select or add a customer to continue'}
                {currentStep === 2 && 'Please add at least one item to continue'}
                {currentStep === 3 && 'Please set a quote expiry date to continue'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateQuote;