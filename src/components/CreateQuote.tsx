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
  Building
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Part, Customer, QuotePart } from '../types';

interface CreateQuoteProps {
  isOpen: boolean;
  onClose: () => void;
  onQuoteCreated: (quote: any) => void;
}

interface QuoteFormData {
  quoteNumber: string;
  customer: Customer | null;
  parts: QuotePart[];
  expiryDate: string;
  notes: string;
  shippingCostSea: number;
  shippingCostAir: number;
  selectedShippingMethod: 'sea' | 'air';
  agentFees: number;
  localShippingFees: number;
}

const CreateQuote: React.FC<CreateQuoteProps> = ({ isOpen, onClose, onQuoteCreated }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddNewPart, setShowAddNewPart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newPart, setNewPart] = useState({
    partNumber: '',
    name: '',
    description: '',
    category: 'Electronics',
    price: 0,
    quantity: 1,
    specifications: {} as Record<string, string>
  });
  const [formData, setFormData] = useState<QuoteFormData>({
    quoteNumber: `QTE-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    customer: null,
    parts: [],
    expiryDate: '',
    notes: '',
    shippingCostSea: 0,
    shippingCostAir: 0,
    selectedShippingMethod: 'sea',
    agentFees: 0,
    localShippingFees: 0
  });
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: ''
  });
  const [showAddNewCustomer, setShowAddNewCustomer] = useState(false);

  const categories = ['all', ...new Set(availableParts.map(p => p.category))];
  
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
          }))
        }));

        setAvailableParts(transformedParts);
      } catch (error) {
        console.error('Error fetching parts:', error);
      }
    };

    if (isOpen) {
      fetchParts();
    }
  }, [isOpen]);

  // Fetch customers from Supabase
  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers from Supabase...');
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Supabase error fetching customers:', error);
        throw error;
      }

      console.log('Raw customer data from Supabase:', data);

      // Map snake_case to camelCase for frontend compatibility
      const transformedCustomers: Customer[] = (data || []).map(customer => ({
        id: customer.id,
        name: customer.name,
        contactPerson: customer.contact_person,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at
      }));

      console.log('Transformed customers:', transformedCustomers);
      setAvailableCustomers(transformedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setSubmitError('Failed to load customers. Please try again.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  const filteredParts = availableParts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.partNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || part.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addPartToQuote = (part: Part) => {
    const existingPart = formData.parts.find(p => p.part?.id === part.id);
    if (existingPart) {
      updateQuotePartQuantity(part.id, existingPart.quantity + 1);
    } else {
      const latestPrice = part.priceHistory.length > 0 
        ? part.priceHistory[part.priceHistory.length - 1].price 
        : 0;
      
      const newQuotePart: QuotePart = {
        id: crypto.randomUUID(),
        part,
        quantity: 1,
        unitPrice: latestPrice,
        totalPrice: latestPrice,
        isCustomPart: false
      };
      
      setFormData(prev => ({
        ...prev,
        parts: [...prev.parts, newQuotePart]
      }));
    }
  };

  const addCustomPartToQuote = () => {
    if (!newPart.name || newPart.price <= 0 || newPart.quantity <= 0) {
      alert('Please fill in custom part name, quantity, and price.');
      return;
    }

    const customQuotePart: QuotePart = {
      id: crypto.randomUUID(),
      customPartName: newPart.name,
      customPartDescription: newPart.description,
      quantity: newPart.quantity,
      unitPrice: newPart.price,
      totalPrice: newPart.quantity * newPart.price,
      isCustomPart: true
    };

    setFormData(prev => ({
      ...prev,
      parts: [...prev.parts, customQuotePart]
    }));

    setNewPart({
      partNumber: '', 
      name: '', 
      description: '', 
      category: 'Electronics', 
      price: 0, 
      quantity: 1,
      specifications: {}
    });
    setShowAddNewPart(false);
  };

  const updateQuotePartQuantity = (partId: string, quantity: number) => {
    if (quantity <= 0) {
      removeQuotePart(partId);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      parts: prev.parts.map(quotePart => 
        (quotePart.part?.id === partId || quotePart.id === partId)
          ? { 
              ...quotePart, 
              quantity, 
              totalPrice: quotePart.unitPrice * quantity 
            }
          : quotePart
      )
    }));
  };

  const updateQuotePartPrice = (partId: string, unitPrice: number) => {
    setFormData(prev => ({
      ...prev,
      parts: prev.parts.map(quotePart => 
        (quotePart.part?.id === partId || quotePart.id === partId)
          ? { 
              ...quotePart, 
              unitPrice, 
              totalPrice: unitPrice * quotePart.quantity 
            }
          : quotePart
      )
    }));
  };

  const removeQuotePart = (partId: string) => {
    setFormData(prev => ({
      ...prev,
      parts: prev.parts.filter(quotePart => quotePart.part?.id !== partId && quotePart.id !== partId)
    }));
  };

  const getTotalBidItemsCost = () => {
    return formData.parts.reduce((sum, quotePart) => sum + quotePart.totalPrice, 0);
  };

  const getSubtotalAmount = () => {
    const shippingCost = formData.selectedShippingMethod === 'sea' ? formData.shippingCostSea : formData.shippingCostAir;
    return getTotalBidItemsCost() + shippingCost + formData.agentFees + formData.localShippingFees;
  };

  const getGstAmount = () => {
    return getSubtotalAmount() * 0.10; // 10% GST
  };

  const getGrandTotalAmount = () => {
    return getSubtotalAmount() + getGstAmount();
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
      case 1: // Select Parts
        return formData.parts.length > 0;
      case 2: // Choose Customer
        return formData.customer !== null;
      case 3: // Quote Details
        return formData.expiryDate !== '';
      default:
        return true;
    }
  };

  const createQuoteInSupabase = async (status: 'draft' | 'sent') => {
    if (!formData.customer || formData.parts.length === 0 || !user) {
      setSubmitError('Please ensure all required fields are filled');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Create the main quote entry
      const quoteObject = {
        quote_number: formData.quoteNumber,
        customer_id: formData.customer.id,
        status: status,
        total_bid_items_cost: getTotalBidItemsCost(),
        shipping_cost_sea: formData.shippingCostSea,
        shipping_cost_air: formData.shippingCostAir,
        selected_shipping_method: formData.selectedShippingMethod,
        agent_fees: formData.agentFees,
        local_shipping_fees: formData.localShippingFees,
        subtotal_amount: getSubtotalAmount(),
        gst_amount: getGstAmount(),
        grand_total_amount: getGrandTotalAmount(),
        quote_date: new Date().toISOString().split('T')[0],
        expiry_date: formData.expiryDate,
        notes: formData.notes.trim() || null,
        created_by: user.id,
      };

      console.log('Creating quote with data:', quoteObject);

      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .insert([quoteObject])
        .select('id')
        .single();

      if (quoteError) throw quoteError;

      if (!quoteData) {
        throw new Error('Failed to create quote - no data returned');
      }

      console.log('Quote created successfully:', quoteData);

      // 2. Create quote parts
      const quotePartsToInsert = formData.parts.map(part => ({
        quote_id: quoteData.id,
        part_id: part.isCustomPart ? null : part.part?.id,
        custom_part_name: part.isCustomPart ? part.customPartName : null,
        custom_part_description: part.isCustomPart ? part.customPartDescription : null,
        quantity: part.quantity,
        unit_price: part.unitPrice,
        is_custom_part: part.isCustomPart
      }));

      console.log('Creating quote parts with data:', quotePartsToInsert);

      const { error: quotePartsError } = await supabase
        .from('quote_parts')
        .insert(quotePartsToInsert);

      if (quotePartsError) throw quotePartsError;

      console.log('Quote parts created successfully');

      // Success - notify parent component and close modal
      onQuoteCreated({
        id: quoteData.id,
        quoteNumber: formData.quoteNumber,
        customer: formData.customer,
        parts: formData.parts,
        status: status,
        totalBidItemsCost: getTotalBidItemsCost(),
        shippingCosts: {
          sea: formData.shippingCostSea,
          air: formData.shippingCostAir,
          selected: formData.selectedShippingMethod
        },
        agentFees: formData.agentFees,
        localShippingFees: formData.localShippingFees,
        subtotalAmount: getSubtotalAmount(),
        gstAmount: getGstAmount(),
        grandTotalAmount: getGrandTotalAmount(),
        quoteDate: new Date().toISOString().split('T')[0],
        expiryDate: formData.expiryDate,
        notes: formData.notes,
        createdBy: user.name,
      });
      
      onClose();
      
      // Reset form
      setCurrentStep(1);
      setFormData({
        quoteNumber: `QTE-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        customer: null,
        parts: [],
        expiryDate: '',
        notes: '',
        shippingCostSea: 0,
        shippingCostAir: 0,
        selectedShippingMethod: 'sea',
        agentFees: 0,
        localShippingFees: 0
      });

    } catch (error: any) {
      console.error('Error creating quote:', error);
      setSubmitError(error.message || 'Failed to create quote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCustomer = async () => {
    if (!newCustomerData.name || !newCustomerData.email) {
      setSubmitError('Customer name and email are required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.log('Adding new customer:', newCustomerData);

      const customerInsertData = {
        name: newCustomerData.name.trim(),
        contact_person: newCustomerData.contactPerson.trim(),
        email: newCustomerData.email.trim(),
        phone: newCustomerData.phone.trim(),
        address: newCustomerData.address.trim()
      };

      const { data, error } = await supabase
        .from('customers')
        .insert([customerInsertData])
        .select('*')
        .single();

      if (error) {
        console.error('Supabase error adding customer:', error);
        throw error;
      }

      console.log('Raw new customer data from Supabase:', data);

      // Map snake_case to camelCase for frontend compatibility
      const newlyAddedCustomer: Customer = {
        id: data.id,
        name: data.name,
        contactPerson: data.contact_person,
        email: data.email,
        phone: data.phone,
        address: data.address,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      console.log('Transformed new customer:', newlyAddedCustomer);

      // Update the available customers list
      setAvailableCustomers(prev => [...prev, newlyAddedCustomer]);
      
      // Set the newly added customer as selected
      setFormData(prev => ({ ...prev, customer: newlyAddedCustomer }));
      
      // Reset the new customer form
      setNewCustomerData({ name: '', contactPerson: '', email: '', phone: '', address: '' });
      setShowAddNewCustomer(false);

      console.log('Customer added successfully and selected');
    } catch (error: any) {
      console.error('Error adding new customer:', error);
      setSubmitError(error.message || 'Failed to add new customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const steps = [
    { number: 1, title: 'Select Parts', icon: Package },
    { number: 2, title: 'Choose Customer', icon: User },
    { number: 3, title: 'Quote Details', icon: FileText },
    { number: 4, title: 'Review & Submit', icon: Send }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Quote</h2>
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
          {/* Error Message */}
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-800 dark:text-red-300">{submitError}</span>
              </div>
            </div>
          )}

          {/* Step 1: Select Parts */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select Parts for Quote</h3>
                
                {/* Search and Filter */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search parts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
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
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Available Parts</h4>
                      <button
                        onClick={() => setShowAddNewPart(!showAddNewPart)}
                        className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Custom Part</span>
                      </button>
                    </div>
                    
                    {/* Add New Part Form */}
                    {showAddNewPart && (
                      <div className="mb-4 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                          <Edit3 className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                          Add Custom Part
                        </h5>
                        <div className="grid grid-cols-1 gap-3">
                          <input
                            type="text"
                            placeholder="Part Name *"
                            value={newPart.name}
                            onChange={(e) => setNewPart(prev => ({ ...prev, name: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                          />
                          <textarea
                            placeholder="Description (optional)"
                            value={newPart.description}
                            onChange={(e) => setNewPart(prev => ({ ...prev, description: e.target.value }))}
                            rows={2}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              placeholder="Quantity *"
                              min="1"
                              value={newPart.quantity || ''}
                              onChange={(e) => setNewPart(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            />
                            <input
                              type="number"
                              placeholder="Unit Price *"
                              step="0.01"
                              value={newPart.price || ''}
                              onChange={(e) => setNewPart(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={addCustomPartToQuote}
                              disabled={!newPart.name || newPart.price <= 0 || newPart.quantity <= 0}
                              className={`flex-1 px-3 py-2 rounded-md text-sm ${
                                newPart.name && newPart.price > 0 && newPart.quantity > 0
                                  ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              Add Custom Part
                            </button>
                            <button
                              onClick={() => setShowAddNewPart(false)}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-96 overflow-y-auto bg-white dark:bg-gray-700">
                      {filteredParts.map((part) => {
                        const latestPrice = part.priceHistory.length > 0 
                          ? part.priceHistory[part.priceHistory.length - 1].price 
                          : 0;
                        
                        return (
                          <div key={part.id} className="p-4 border-b border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900 dark:text-gray-100">{part.name}</h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{part.partNumber}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{part.category}</p>
                                <p className="text-sm font-medium text-green-600 dark:text-green-400">${latestPrice.toFixed(2)}</p>
                              </div>
                              <button
                                onClick={() => addPartToQuote(part)}
                                className="flex items-center space-x-1 bg-blue-600 dark:bg-blue-700 text-white px-3 py-1 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {filteredParts.length === 0 && !showAddNewPart && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                          <p>No parts found matching your search</p>
                          <button
                            onClick={() => setShowAddNewPart(true)}
                            className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                          >
                            Add a custom part instead
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Parts */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Selected Parts ({formData.parts.length})
                    </h4>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-96 overflow-y-auto bg-white dark:bg-gray-700">
                      {formData.parts.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                          <p>No parts selected yet</p>
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
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 mt-1">
                                    Custom Part
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => removeQuotePart(quotePart.id)}
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
                                  onChange={(e) => updateQuotePartQuantity(quotePart.id, parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400">Unit Price</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={quotePart.unitPrice}
                                  onChange={(e) => updateQuotePartPrice(quotePart.id, parseFloat(e.target.value) || 0)}
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
                          <span className="font-medium text-gray-900 dark:text-gray-100">Total Bid Items Cost:</span>
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            ${getTotalBidItemsCost().toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Choose Customer */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Choose Customer</h3>
                
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    Existing Customers ({availableCustomers.length})
                  </h4>
                  <button
                    onClick={() => setShowAddNewCustomer(!showAddNewCustomer)}
                    className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add New Customer</span>
                  </button>
                </div>

                {/* Add New Customer Form */}
                {showAddNewCustomer && (
                  <div className="mb-6 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                      <Building className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                      Add New Customer
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Company Name *"
                        value={newCustomerData.name}
                        onChange={(e) => setNewCustomerData(prev => ({ ...prev, name: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Contact Person"
                        value={newCustomerData.contactPerson}
                        onChange={(e) => setNewCustomerData(prev => ({ ...prev, contactPerson: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <input
                        type="email"
                        placeholder="Email *"
                        value={newCustomerData.email}
                        onChange={(e) => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={newCustomerData.phone}
                        onChange={(e) => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Address"
                        value={newCustomerData.address}
                        onChange={(e) => setNewCustomerData(prev => ({ ...prev, address: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 md:col-span-2"
                      />
                      <div className="flex space-x-2 md:col-span-2">
                        <button
                          onClick={addCustomer}
                          disabled={!newCustomerData.name || !newCustomerData.email || isSubmitting}
                          className={`flex-1 px-3 py-2 rounded-md text-sm ${
                            newCustomerData.name && newCustomerData.email && !isSubmitting
                              ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {isSubmitting ? 'Adding...' : 'Add Customer'}
                        </button>
                        <button
                          onClick={() => setShowAddNewCustomer(false)}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Selection */}
                {availableCustomers.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <Building className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No customers found</h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      No customers have been added yet. Add your first customer to continue.
                    </p>
                    <button
                      onClick={() => setShowAddNewCustomer(true)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                    >
                      Add your first customer
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => setFormData(prev => ({ ...prev, customer }))}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.customer?.id === customer.id
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg">
                            <Building className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{customer.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{customer.contactPerson}</p>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Email:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100 truncate ml-2">{customer.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{customer.phone}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Customer Display */}
                {formData.customer && (
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <h4 className="font-medium text-green-800 dark:text-green-300 mb-2 flex items-center">
                      <Building className="h-4 w-4 mr-2" />
                      Selected Customer
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{formData.customer.name}</p>
                        <p className="text-gray-600 dark:text-gray-400">{formData.customer.contactPerson}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">{formData.customer.email}</p>
                        <p className="text-gray-600 dark:text-gray-400">{formData.customer.phone}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Quote Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quote Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Quote Number
                      </label>
                      <input
                        type="text"
                        value={formData.quoteNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, quoteNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Expiry Date *
                      </label>
                      <input
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Shipping Cost (Sea)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.shippingCostSea}
                        onChange={(e) => setFormData(prev => ({ ...prev, shippingCostSea: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Shipping Cost (Air)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.shippingCostAir}
                        onChange={(e) => setFormData(prev => ({ ...prev, shippingCostAir: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Selected Shipping Method
                      </label>
                      <select
                        value={formData.selectedShippingMethod}
                        onChange={(e) => setFormData(prev => ({ ...prev, selectedShippingMethod: e.target.value as 'sea' | 'air' }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="sea">Sea Freight</option>
                        <option value="air">Air Freight</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Agent Fees
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.agentFees}
                        onChange={(e) => setFormData(prev => ({ ...prev, agentFees: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Local Shipping Fees
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.localShippingFees}
                        onChange={(e) => setFormData(prev => ({ ...prev, localShippingFees: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes & Special Instructions
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={12}
                      placeholder="Add any special instructions, delivery requirements, or notes for the customer..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
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
                          <span className="text-gray-600 dark:text-gray-400">Email:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{formData.customer?.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Expiry Date:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date(formData.expiryDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Shipping Method:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                            {formData.selectedShippingMethod} Freight
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Created By:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{user?.name || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>

                    {formData.notes && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Notes</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{formData.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Cost Breakdown */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Cost Breakdown</h4>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700">
                      {/* Quote Items */}
                      <div className="p-4 border-b border-gray-100 dark:border-gray-600">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Quote Items ({formData.parts.length})</h5>
                        <div className="space-y-2">
                          {formData.parts.map((quotePart, index) => (
                            <div key={quotePart.id} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700 dark:text-gray-300 truncate max-w-48">
                                {quotePart.isCustomPart ? quotePart.customPartName : quotePart.part?.name}
                              </span>
                              <span className="text-gray-900 dark:text-gray-100 font-medium">
                                {quotePart.quantity} × ${quotePart.unitPrice.toFixed(2)} = ${quotePart.totalPrice.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cost Summary */}
                      <div className="p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Bid Items Total:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${getTotalBidItemsCost().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Shipping ({formData.selectedShippingMethod}):</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            ${(formData.selectedShippingMethod === 'sea' ? formData.shippingCostSea : formData.shippingCostAir).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Agent Fees:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${formData.agentFees.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Local Shipping:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${formData.localShippingFees.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                          <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${getSubtotalAmount().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">GST (10%):</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${getGstAmount().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-300 dark:border-gray-500 pt-2">
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Grand Total:</span>
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            ${getGrandTotalAmount().toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

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
                    onClick={() => createQuoteInSupabase('draft')}
                    disabled={isSubmitting}
                    className={`flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md transition-colors ${
                      isSubmitting 
                        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 dark:border-gray-500"></div>
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
                    onClick={() => createQuoteInSupabase('sent')}
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
                        <span>Submitting...</span>
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
                {currentStep === 1 && 'Please select at least one part to continue'}
                {currentStep === 2 && 'Please select a customer to continue'}
                {currentStep === 3 && 'Please set an expiry date to continue'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateQuote;