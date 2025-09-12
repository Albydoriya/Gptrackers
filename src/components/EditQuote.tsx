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
  Building,
  Truck,
  Calculator,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { Quote, Customer, QuotePart, Part, QuoteStatus } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface EditQuoteProps {
  isOpen: boolean;
  onClose: () => void;
  onQuoteUpdated: () => void;
  quote: Quote | null;
}

interface QuoteFormData {
  quoteNumber: string;
  customer: Customer | null;
  parts: QuotePart[];
  expiryDate: string;
  notes: string;
  status: QuoteStatus;
  shippingCosts: {
    sea: number;
    air: number;
    selected: 'sea' | 'air';
  };
  agentFees: number;
  localShippingFees: number;
}

const EditQuote: React.FC<EditQuoteProps> = ({ isOpen, onClose, onQuoteUpdated, quote }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPricingTier, setSelectedPricingTier] = useState<'internal' | 'wholesale' | 'trade' | 'retail'>('wholesale');
  const [showAddNewCustomer, setShowAddNewCustomer] = useState(false);
  const [showAddCustomItem, setShowAddCustomItem] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  
  // Validation function
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.quoteNumber.trim()) {
      newErrors.quoteNumber = 'Quote number is required';
    }
    if (!formData.customer) {
      newErrors.customer = 'Customer is required';
    }
    if (formData.parts.length === 0) {
      newErrors.parts = 'At least one part is required';
    }
    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    }

    // Validate each quote part
    formData.parts.forEach((quotePart, index) => {
      if (quotePart.isCustomPart) {
        if (!quotePart.customPartName?.trim()) {
          newErrors[`part_${index}_customName`] = 'Custom part name is required';
        }
        if (!quotePart.customPartDescription?.trim()) {
          newErrors[`part_${index}_customDescription`] = 'Custom part description is required';
        }
        // For custom parts, part should be null
        if (quotePart.part) {
          newErrors[`part_${index}_customPart`] = 'Custom parts should not have a catalog part reference';
        }
      } else {
        if (!quotePart.part || !quotePart.part.id) {
          newErrors[`part_${index}_catalogPart`] = 'Catalog part is required for non-custom parts';
        }
        // For catalog parts, custom fields should be null
        if (quotePart.customPartName || quotePart.customPartDescription) {
          newErrors[`part_${index}_catalogPart`] = 'Catalog parts should not have custom part data';
        }
      }
      
      if (quotePart.quantity <= 0) {
        newErrors[`part_${index}_quantity`] = 'Quantity must be greater than 0';
      }
      if (quotePart.unitPrice <= 0) {
        newErrors[`part_${index}_unitPrice`] = 'Unit price must be greater than 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: ''
  });

  const [newCustomItem, setNewCustomItem] = useState({
    name: '',
    description: '',
    unitPrice: 0
  });

  const [formData, setFormData] = useState<QuoteFormData>({
    quoteNumber: '',
    customer: null,
    parts: [],
    expiryDate: '',
    notes: '',
    status: 'draft',
    shippingCosts: {
      sea: 0,
      air: 0,
      selected: 'sea'
    },
    agentFees: 0,
    localShippingFees: 0
  });

  // Initialize form data when quote changes
  useEffect(() => {
    if (quote) {
      setFormData({
        quoteNumber: quote.quoteNumber,
        customer: quote.customer,
        parts: [...quote.parts],
        shippingCosts: { ...quote.shippingCosts },
        agentFees: quote.agentFees,
        localShippingFees: quote.localShippingFees,
        expiryDate: quote.expiryDate,
        notes: quote.notes || '',
        status: quote.status
      });
      setSubmitError(null);
    }
  }, [quote]);

  // Fetch parts from Supabase
  useEffect(() => {
    const fetchParts = async () => {
      setIsLoadingParts(true);
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
          // Markup percentages and calculated prices
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
      } finally {
        setIsLoadingParts(false);
      }
    };

    if (isOpen) {
      fetchParts();
    }
  }, [isOpen]);

  // Fetch customers from Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoadingCustomers(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

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

        setCustomers(transformedCustomers);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  const categories = ['all', ...new Set(availableParts.map(p => p.category))];

  const filteredParts = availableParts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.partNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || part.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getPartPrice = (part: Part, tier: string) => {
    switch (tier) {
      case 'internal': return part.internalUsagePrice || 0;
      case 'wholesale': return part.wholesalePrice || 0;
      case 'trade': return part.tradePrice || 0;
      case 'retail': return part.retailPrice || 0;
      default: return part.wholesalePrice || 0;
    }
  };

  const addPartToQuote = (part: Part) => {
    const existingPart = formData.parts.find(p => !p.isCustomPart && p.part?.id === part.id);
    if (existingPart) {
      updatePartQuantity(existingPart.id, existingPart.quantity + 1);
    } else {
      const unitPrice = getPartPrice(part, selectedPricingTier);
      
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

  const addCustomItemToQuote = () => {
    if (!newCustomItem.name || newCustomItem.unitPrice <= 0) {
      return;
    }

    const customQuotePart: QuotePart = {
      id: crypto.randomUUID(),
      customPartName: newCustomItem.name,
      customPartDescription: newCustomItem.description,
      quantity: 1,
      unitPrice: newCustomItem.unitPrice,
      totalPrice: newCustomItem.unitPrice,
      isCustomPart: true
    };
    
    setFormData(prev => ({
      ...prev,
      parts: [...prev.parts, customQuotePart]
    }));

    setNewCustomItem({ name: '', description: '', unitPrice: 0 });
    setShowAddCustomItem(false);
  };

  const addNewCustomerToQuote = async () => {
    if (!newCustomer.name || !newCustomer.email) {
      return;
    }

    try {
      // Insert new customer into Supabase
      const customerObject = {
        name: newCustomer.name.trim(),
        contact_person: newCustomer.contactPerson.trim(),
        email: newCustomer.email.trim(),
        phone: newCustomer.phone.trim(),
        address: newCustomer.address.trim()
      };

      const { data: insertedCustomer, error } = await supabase
        .from('customers')
        .insert([customerObject])
        .select()
        .single();

      if (error) throw error;

      const customer: Customer = {
        id: insertedCustomer.id,
        name: insertedCustomer.name,
        contactPerson: insertedCustomer.contact_person,
        email: insertedCustomer.email,
        phone: insertedCustomer.phone,
        address: insertedCustomer.address,
        createdAt: insertedCustomer.created_at,
        updatedAt: insertedCustomer.updated_at
      };

      // Add to local customers list and select it
      setCustomers(prev => [customer, ...prev]);
      setFormData(prev => ({ ...prev, customer }));
      setShowAddNewCustomer(false);
      setNewCustomer({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: ''
      });
    } catch (error) {
      console.error('Error adding customer:', error);
      setSubmitError('Failed to add customer. Please try again.');
    }
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

  const getTotalBidItemsCost = () => {
    return formData.parts.reduce((sum, quotePart) => sum + quotePart.totalPrice, 0);
  };

  const getSelectedShippingCost = () => {
    return formData.shippingCosts.selected === 'sea' 
      ? formData.shippingCosts.sea 
      : formData.shippingCosts.air;
  };

  const getSubtotalAmount = () => {
    return getTotalBidItemsCost() + getSelectedShippingCost() + formData.agentFees + formData.localShippingFees;
  };

  const getGSTAmount = () => {
    return getSubtotalAmount() * 0.1; // 10% GST
  };

  const getGrandTotalAmount = () => {
    return getSubtotalAmount() + getGSTAmount();
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

    
    if (!validateForm()) {
      return;
    }
    
    updateQuoteInSupabase();
    updateQuoteInSupabase(status);
  };
  const updateQuoteInSupabase = async () => {
  const updateQuoteInSupabase = async (status: QuoteStatus) => {
    if (!quote || !formData.customer || formData.parts.length === 0 || !user) {
      setSubmitError('Please ensure all required fields are filled');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Update the main quote
      const quoteUpdateObject = {
        customer_id: formData.customer.id,
        status,
        total_bid_items_cost: getTotalBidItemsCost(),
        shipping_cost_sea: formData.shippingCosts.sea,
        shipping_cost_air: formData.shippingCosts.air,
        selected_shipping_method: formData.shippingCosts.selected,
        agent_fees: formData.agentFees,
        local_shipping_fees: formData.localShippingFees,
        subtotal_amount: getSubtotalAmount(),
        gst_amount: getGSTAmount(),
        grand_total_amount: getGrandTotalAmount(),
        expiry_date: formData.expiryDate,
        updated_at: new Date().toISOString()
      };

      const { error: quoteError } = await supabase
        .from('quotes')
        .update(quoteUpdateObject)
        .eq('id', quote.id);

      if (quoteError) throw quoteError;
      console.log("step 1 done")
      // 2. Delete existing quote parts
      const { error: deleteError } = await supabase
        .from('quote_parts')
        .delete()
        .eq('quote_id', quote.id);

      if (deleteError) throw deleteError;
      console.log("step 2 done")
      // 3. Insert updated quote parts
      if (formData.parts.length > 0) {
        const quotePartsArray = formData.parts.map(quotePart => ({
          quote_id: quote.id,
          part_id: quotePart.isCustomPart ? null : (quotePart.part?.id || null),
          custom_part_name: quotePart.isCustomPart ? (quotePart.customPartName || null) : null,
          custom_part_description: quotePart.isCustomPart ? (quotePart.customPartDescription || null) : null,
          quantity: quotePart.quantity,
          unit_price: quotePart.unitPrice,
          is_custom_part: quotePart.isCustomPart,
          pricing_tier: quotePart.isCustomPart ? null : 'wholesale'
        }));

        const { error: partsError } = await supabase
          .from('quote_parts')
          .insert(quotePartsArray);

        if (partsError) throw partsError;
      }
      console.log("step 3 done")
      // 4. Create updated Quote object for callback
      const updatedQuote: Quote = {
        ...quote,
        customer: formData.customer,
        status,
        parts: formData.parts,
        totalBidItemsCost: getTotalBidItemsCost(),
        shippingCosts: formData.shippingCosts,
        agentFees: formData.agentFees,
        localShippingFees: formData.localShippingFees,
        subtotalAmount: getSubtotalAmount(),
        gstAmount: getGSTAmount(),
        grandTotalAmount: getGrandTotalAmount(),
        expiryDate: formData.expiryDate,
        notes: formData.notes
      };
      
      // 5. Success - notify parent and close modal
      onQuoteUpdated(updatedQuote);
      onClose();
      setCurrentStep(1);

    } catch (error: any) {
      console.error('Error updating quote:', error);
      setSubmitError(error.message || 'Failed to update quote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertToOrder = async () => {
    if (!quote || !user) return;

    const confirmed = window.confirm(
      `Convert quote ${quote.quoteNumber} to an order?\n\nThis will create a new order for your purchasing team and mark the quote as converted.`
    );
    
    if (!confirmed) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Create order from quote
      const orderObject = {
        order_number: quote.quoteNumber.replace('QTE-', 'ORD-'),
        supplier_id: quote.parts[0]?.part?.preferredSuppliers?.[0] || null, // Use first preferred supplier or null
        status: 'draft',
        priority: 'medium',
        total_amount: quote.grandTotalAmount,
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery: null,
        notes: `Converted from quote ${quote.quoteNumber}. ${quote.notes || ''}`.trim(),
        created_by: user.id,
        shipping_data: {
          convertedFromQuote: true,
          originalQuoteId: quote.id,
          shippingCosts: quote.shippingCosts,
          agentFees: quote.agentFees,
          localShippingFees: quote.localShippingFees
        },
        attachments: []
      };

      // Note: This will only work if you have at least one supplier in your suppliers table
      // You might need to handle the case where no supplier is available
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderObject])
        .select('id')
        .single();

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Failed to create order');

      // 2. Create order parts from quote parts (only for catalog parts)
      const catalogParts = quote.parts.filter(qp => !qp.isCustomPart && qp.part);
      if (catalogParts.length > 0) {
        const orderPartsArray = catalogParts.map(quotePart => ({
          order_id: orderData.id,
          part_id: quotePart.part!.id,
          quantity: quotePart.quantity,
          unit_price: quotePart.unitPrice,
          is_custom_part: quotePart.isCustomPart
        }));

        const { error: partsError } = await supabase
          .from('order_parts')
          .insert(orderPartsArray);

        if (partsError) throw partsError;
      }

      // 3. Update quote status to converted
      const { error: quoteUpdateError } = await supabase
        .from('quotes')
        .update({ 
          status: 'converted_to_order',
          converted_to_order_id: orderData.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      if (quoteUpdateError) throw quoteUpdateError;

      // 4. Success - update local state and close
      const updatedQuote: Quote = {
        ...quote,
        status: 'converted_to_order',
        convertedToOrderId: orderData.id
      };
      
      onQuoteUpdated(updatedQuote);
      onClose();
      setCurrentStep(1);

      // Show success message
      alert(`Quote successfully converted to order! Order ID: ${orderData.id}`);

    } catch (error: any) {
      console.error('Error converting quote to order:', error);
      setSubmitError(error.message || 'Failed to convert quote to order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !quote) return null;

  const steps = [
    { number: 1, title: 'Customer Details', icon: User },
    { number: 2, title: 'Edit Items', icon: Package },
    { number: 3, title: 'Cost Calculations', icon: Calculator },
    { number: 4, title: 'Review & Update', icon: Send }
  ];

  const statusOptions: { value: QuoteStatus; label: string; color: string }[] = [
    { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-800' },
    { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-800' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
    { value: 'expired', label: 'Expired', color: 'bg-orange-100 text-orange-800' }
  ];

  const pricingTiers = [
    { value: 'internal', label: 'Internal Usage', description: 'For internal company use' },
    { value: 'wholesale', label: 'Wholesale', description: 'For wholesale customers' },
    { value: 'trade', label: 'Trade', description: 'For trade customers' },
    { value: 'retail', label: 'Retail', description: 'For retail customers' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Edit3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Quote</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{quote.quoteNumber}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    statusOptions.find(s => s.value === quote.status)?.color || 'bg-gray-100 text-gray-800'
                  }`}>
                    {quote.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              </div>
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Customer Information</h3>
                
                {/* Current Customer Display */}
                {formData.customer && (
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">Current Customer</h4>
                        <p className="text-blue-800 dark:text-blue-200">{formData.customer.name}</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">{formData.customer.email}</p>
                      </div>
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, customer: null }))}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        Change Customer
                      </button>
                    </div>
                  </div>
                )}

                {!formData.customer && (
                  <>
                    {/* Customer Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {customers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => setFormData(prev => ({ ...prev, customer }))}
                          className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
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
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-600 dark:text-gray-400">{customer.email}</p>
                            <p className="text-gray-500 dark:text-gray-400">{customer.phone}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add New Customer */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <button
                        onClick={() => setShowAddNewCustomer(!showAddNewCustomer)}
                        className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add New Customer</span>
                      </button>

                      {showAddNewCustomer && (
                        <div className="mt-4 p-6 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">New Customer Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Company Name *
                              </label>
                              <input
                                type="text"
                                value={newCustomer.name}
                                onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="Company name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Contact Person
                              </label>
                              <input
                                type="text"
                                value={newCustomer.contactPerson}
                                onChange={(e) => setNewCustomer(prev => ({ ...prev, contactPerson: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="Contact person"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email *
                              </label>
                              <input
                                type="email"
                                value={newCustomer.email}
                                onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="Email address"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Phone
                              </label>
                              <input
                                type="tel"
                                value={newCustomer.phone}
                                onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="Phone number"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Address
                              </label>
                              <textarea
                                value={newCustomer.address}
                                onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="Full address"
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
                              onClick={addNewCustomerToQuote}
                              disabled={!newCustomer.name || !newCustomer.email}
                              className={`px-4 py-2 rounded-md ${
                                newCustomer.name && newCustomer.email
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
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Edit Items */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Quote Items</h3>
                
                {/* Pricing Tier Selection */}
                <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Select Pricing Tier for Catalog Parts</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {pricingTiers.map((tier) => (
                      <button
                        key={tier.value}
                        onClick={() => setSelectedPricingTier(tier.value as any)}
                        className={`p-3 text-left border-2 rounded-lg transition-colors ${
                          selectedPricingTier === tier.value
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <p className="font-medium text-gray-900 dark:text-gray-100">{tier.label}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{tier.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

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
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Available Parts</h4>
                      <button
                        onClick={() => setShowAddCustomItem(!showAddCustomItem)}
                        className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Custom Item</span>
                      </button>
                    </div>
                    
                    {/* Add Custom Item Form */}
                    {showAddCustomItem && (
                      <div className="mb-4 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Add Custom Item</h5>
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Item name"
                            value={newCustomItem.name}
                            onChange={(e) => setNewCustomItem(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                          <textarea
                            placeholder="Description (optional)"
                            value={newCustomItem.description}
                            onChange={(e) => setNewCustomItem(prev => ({ ...prev, description: e.target.value }))}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                          <div className="flex space-x-2">
                            <input
                              type="number"
                              placeholder="Unit price"
                              step="0.01"
                              value={newCustomItem.unitPrice || ''}
                              onChange={(e) => setNewCustomItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                            <button
                              onClick={addCustomItemToQuote}
                              disabled={!newCustomItem.name || newCustomItem.unitPrice <= 0}
                              className={`px-4 py-2 rounded-md text-sm ${
                                newCustomItem.name && newCustomItem.unitPrice > 0
                                  ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              Add
                            </button>
                            <button
                              onClick={() => setShowAddCustomItem(false)}
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
                        const tierPrice = getPartPrice(part, selectedPricingTier);
                        
                        return (
                          <div key={part.id} className="p-4 border-b border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900 dark:text-gray-100">{part.name}</h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{part.partNumber}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{part.category}</p>
                                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                  ${tierPrice.toFixed(2)} ({selectedPricingTier})
                                </p>
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
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                          <p>No items selected yet</p>
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
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 mt-1">
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

          {/* Step 3: Cost Calculations */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Cost Calculations</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Cost Inputs */}
                  <div className="space-y-6">
                    {/* Shipping Options */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <Truck className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                        Shipping Options
                      </h4>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Sea Freight
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.shippingCosts.sea || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                shippingCosts: { ...prev.shippingCosts, sea: parseFloat(e.target.value) || 0 }
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              placeholder="0.00"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">20-30 days delivery</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Air Freight
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.shippingCosts.air || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                shippingCosts: { ...prev.shippingCosts, air: parseFloat(e.target.value) || 0 }
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              placeholder="0.00"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">5-7 days delivery</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Selected Shipping Method
                          </label>
                          <div className="flex space-x-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="shippingMethod"
                                value="sea"
                                checked={formData.shippingCosts.selected === 'sea'}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  shippingCosts: { ...prev.shippingCosts, selected: 'sea' }
                                }))}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Sea Freight (${formData.shippingCosts.sea.toFixed(2)})</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="shippingMethod"
                                value="air"
                                checked={formData.shippingCosts.selected === 'air'}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  shippingCosts: { ...prev.shippingCosts, selected: 'air' }
                                }))}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Air Freight (${formData.shippingCosts.air.toFixed(2)})</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Fees */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Agent Fees
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.agentFees || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, agentFees: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Local Shipping Fees
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.localShippingFees || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, localShippingFees: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Quote Details */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Quote Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as QuoteStatus }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

                  {/* Live Cost Calculation */}
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                      <Calculator className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                      Live Cost Calculation
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Bid Items:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">${getTotalBidItemsCost().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Shipping ({formData.shippingCosts.selected}):
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">${getSelectedShippingCost().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Agent Fees:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">${formData.agentFees.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Local Shipping:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">${formData.localShippingFees.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-gray-300 dark:border-gray-600 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal:</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">${getSubtotalAmount().toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">GST (10%):</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">${getGSTAmount().toFixed(2)}</span>
                      </div>
                      <div className="border-t border-gray-300 dark:border-gray-600 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Grand Total:</span>
                          <span className="text-xl font-bold text-green-600 dark:text-green-400">
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

          {/* Step 4: Review & Update */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Review Quote Changes</h3>
                
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
                          <span className="text-gray-600 dark:text-gray-400">Expiry Date:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date(formData.expiryDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Status:</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            statusOptions.find(s => s.value === formData.status)?.color || 'bg-gray-100 text-gray-800'
                          }`}>
                            {formData.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      </div>
                    </div>

                    {formData.notes && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Notes</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{formData.notes}</p>
                      </div>
                    )}

                    {/* Add Notes Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Quote Notes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={4}
                        placeholder="Add any special terms, conditions, or notes for this quote..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Updated Cost Breakdown</h4>
                    <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      {/* Items */}
                      <div className="p-4 border-b border-gray-100 dark:border-gray-600">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Quote Items ({formData.parts.length})</h5>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {formData.parts.map((quotePart) => (
                            <div key={quotePart.id} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700 dark:text-gray-300 truncate max-w-40">
                                {quotePart.isCustomPart ? quotePart.customPartName : quotePart.part?.name}
                              </span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {quotePart.quantity} × ${quotePart.unitPrice.toFixed(2)} = ${quotePart.totalPrice.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <span className="font-medium text-gray-900 dark:text-gray-100">Bid Items Total:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">${getTotalBidItemsCost().toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Cost Summary */}
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Shipping ({formData.shippingCosts.selected}):</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${getSelectedShippingCost().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Agent Fees:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${formData.agentFees.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Local Shipping:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${formData.localShippingFees.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-900 dark:text-gray-100">Subtotal:</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">${getSubtotalAmount().toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">GST (10%):</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${getGSTAmount().toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Grand Total:</span>
                            <span className="text-xl font-bold text-green-600 dark:text-green-400">
                              ${getGrandTotalAmount().toFixed(2)}
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
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save Changes</span>
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
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Update & Send</span>
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
                {currentStep === 1 && 'Please select a customer to continue'}
                {currentStep === 2 && 'Please add at least one item to continue'}
                {currentStep === 3 && 'Please set an expiry date to continue'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditQuote;