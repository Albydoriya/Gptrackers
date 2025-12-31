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
  Mail,
  Phone,
  Truck,
  Calculator,
  Loader2,
  Plane,
  Weight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Part, Customer, QuotePart, Quote, SeaFreightPriceListItem } from '../types';
import PriceListSelector from './PriceListSelector';

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
  seaFreightPriceListId?: string;
  priceListSnapshot?: SeaFreightPriceListItem;
  manualPriceOverride: boolean;
  airFreightCarrierId?: string;
}

const CreateQuote: React.FC<CreateQuoteProps> = ({ isOpen, onClose, onQuoteCreated }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddNewPart, setShowAddNewPart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newPart, setNewPart] = useState({
    partNumber: '',
    name: '',
    description: '',
    category: 'Electronics',
    price: 0,
    specifications: {} as Record<string, string>
  });
  const [formData, setFormData] = useState<QuoteFormData>({
    quoteNumber: `QUO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
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
    seaFreightPriceListId: undefined,
    priceListSnapshot: undefined,
    manualPriceOverride: false
  });
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showAddNewCustomer, setShowAddNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: ''
  });
  const [airFreightCarriers, setAirFreightCarriers] = useState<Array<{
    id: string;
    carrier_name: string;
    charge_rate_per_kg: number;
    cost_rate_per_kg: number;
    profit_per_kg: number;
    currency: string;
  }>>([]);
  const [selectedAirCarrier, setSelectedAirCarrier] = useState<string | null>(null);

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
          })),
          internalUsageMarkupPercentage: part.internal_usage_markup_percentage || 10,
          wholesaleMarkupPercentage: part.wholesale_markup_percentage || 20,
          tradeMarkupPercentage: part.trade_markup_percentage || 30,
          retailMarkupPercentage: part.retail_markup_percentage || 50,
          actualWeightKg: part.actual_weight_kg ? parseFloat(part.actual_weight_kg) : undefined,
          lengthCm: part.length_cm ? parseFloat(part.length_cm) : undefined,
          widthCm: part.width_cm ? parseFloat(part.width_cm) : undefined,
          heightCm: part.height_cm ? parseFloat(part.height_cm) : undefined,
          dimFactor: part.dim_factor ? parseFloat(part.dim_factor) : undefined,
          volumetricWeightKg: part.volumetric_weight_kg ? parseFloat(part.volumetric_weight_kg) : undefined,
          chargeableWeightKg: part.chargeable_weight_kg ? parseFloat(part.chargeable_weight_kg) : undefined
        }));

        setAvailableParts(transformedParts);
      } catch (error) {
        console.error('Error fetching parts:', error);
      }
    };

    fetchParts();
  }, []);

  // Fetch customers from Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
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
      }
    };

    fetchCustomers();
  }, []);

  // Fetch air freight carriers from Supabase
  useEffect(() => {
    const fetchAirFreightCarriers = async () => {
      try {
        const { data, error } = await supabase
          .from('air_freight_carriers')
          .select('*')
          .eq('is_active', true)
          .order('carrier_name', { ascending: true });

        if (error) throw error;

        setAirFreightCarriers(data || []);
      } catch (error) {
        console.error('Error fetching air freight carriers:', error);
      }
    };

    fetchAirFreightCarriers();
  }, []);

  // Calculate total chargeable weight of all parts in the quote
  const calculateTotalChargeableWeight = (): number => {
    return formData.parts.reduce((total, quotePart) => {
      const weight = quotePart.part?.chargeableWeightKg || 0;
      return total + (weight * quotePart.quantity);
    }, 0);
  };

  // Calculate air freight cost for a specific carrier
  const calculateAirFreightCost = (carrierId: string): number => {
    const carrier = airFreightCarriers.find(c => c.id === carrierId);
    if (!carrier) return 0;

    const totalWeight = calculateTotalChargeableWeight();
    return totalWeight * carrier.charge_rate_per_kg;
  };

  // Update air freight cost when parts change and a carrier is selected
  useEffect(() => {
    if (selectedAirCarrier && airFreightCarriers.length > 0) {
      const calculatedCost = calculateAirFreightCost(selectedAirCarrier);
      setFormData(prev => {
        if (prev.shippingCosts.air !== calculatedCost) {
          return {
            ...prev,
            shippingCosts: {
              ...prev.shippingCosts,
              air: calculatedCost
            }
          };
        }
        return prev;
      });
    }
  }, [formData.parts.length, selectedAirCarrier, airFreightCarriers.length]);

  const filteredParts = availableParts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.partNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || part.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addPartToQuote = (part: Part, pricingTier: 'internal' | 'wholesale' | 'trade' | 'retail' = 'wholesale') => {
    const existingPart = formData.parts.find(p => p.part?.id === part.id);
    if (existingPart) {
      updatePartQuantity(part.id, existingPart.quantity + 1);
    } else {
      // Calculate price based on pricing tier
      let unitPrice = 0;
      const latestPrice = part.priceHistory.length > 0 
        ? part.priceHistory[part.priceHistory.length - 1].price 
        : 0;

      switch (pricingTier) {
        case 'internal':
          unitPrice = latestPrice * (1 + (part.internalUsageMarkupPercentage || 10) / 100);
          break;
        case 'wholesale':
          unitPrice = latestPrice * (1 + (part.wholesaleMarkupPercentage || 20) / 100);
          break;
        case 'trade':
          unitPrice = latestPrice * (1 + (part.tradeMarkupPercentage || 30) / 100);
          break;
        case 'retail':
          unitPrice = latestPrice * (1 + (part.retailMarkupPercentage || 50) / 100);
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

  const addNewPartToOrder = async () => {
    if (!newPart.partNumber || !newPart.name || !newPart.description || newPart.price <= 0) {
      setSubmitError('Please fill in all required fields for the new part (Part Number, Name, Description, and Price)');
      return;
    }

    setIsAddingPart(true);
    setSubmitError(null);

    try {
      // 1. Check if a part with this part number already exists
      const { data: existingPart, error: checkError } = await supabase
        .from('parts')
        .select('*, price_history:part_price_history(*)')
        .eq('part_number', newPart.partNumber.trim())
        .eq('is_archived', false)
        .single();

      let partToUse: Part;

      if (existingPart && !checkError) {
        // Part already exists, use the existing part
        console.log('Part already exists in catalog, using existing part');
        partToUse = {
          id: existingPart.id,
          partNumber: existingPart.part_number,
          name: existingPart.name,
          description: existingPart.description,
          category: existingPart.category,
          specifications: existingPart.specifications || {},
          currentStock: existingPart.current_stock || 0,
          minStock: existingPart.min_stock || 0,
          preferredSuppliers: existingPart.preferred_suppliers || [],
          priceHistory: (existingPart.price_history || []).map((ph: any) => ({
            date: ph.effective_date,
            price: parseFloat(ph.price),
            supplier: ph.supplier_name,
            quantity: ph.quantity || 1
          })),
          internalUsageMarkupPercentage: existingPart.internal_usage_markup_percentage || 10,
          wholesaleMarkupPercentage: existingPart.wholesale_markup_percentage || 20,
          tradeMarkupPercentage: existingPart.trade_markup_percentage || 30,
          retailMarkupPercentage: existingPart.retail_markup_percentage || 50
        };
      } else {
        // Part doesn't exist, create a new one
        console.log('Creating new part in catalog');
        
        // 2. Insert the new part into the parts table
        const partObject = {
          part_number: newPart.partNumber.trim(),
          name: newPart.name.trim(),
          description: newPart.description.trim(),
          category: newPart.category,
          specifications: newPart.specifications,
          current_stock: 0, // Default stock for new parts
          min_stock: 0, // Default minimum stock
          preferred_suppliers: [], // Empty array for new parts
          is_archived: false,
          // Default markup percentages
          internal_usage_markup_percentage: 10,
          wholesale_markup_percentage: 20,
          trade_markup_percentage: 30,
          retail_markup_percentage: 50
        };

        const { data: insertedPart, error: partError } = await supabase
          .from('parts')
          .insert([partObject])
          .select('id')
          .single();

        if (partError) throw partError;

        // 3. Insert initial price history
        const priceHistoryEntry = {
          part_id: insertedPart.id,
          price: newPart.price,
          supplier_name: formData.customer?.name || 'Quote Customer',
          quantity: 1,
          effective_date: new Date().toISOString().split('T')[0],
          reason: 'Initial entry from quote creation',
          created_by: user?.id || null
        };

        const { error: priceError } = await supabase
          .from('part_price_history')
          .insert([priceHistoryEntry]);

        if (priceError) throw priceError;

        // 4. Create the Part object for the quote
        partToUse = {
          id: insertedPart.id,
          partNumber: newPart.partNumber.trim(),
          name: newPart.name.trim(),
          description: newPart.description.trim(),
          category: newPart.category,
          specifications: newPart.specifications,
          priceHistory: [{
            date: new Date().toISOString().split('T')[0],
            price: newPart.price,
            supplier: formData.customer?.name || 'Quote Customer',
            quantity: 1
          }],
          currentStock: 0,
          minStock: 0,
          preferredSuppliers: [],
          internalUsageMarkupPercentage: 10,
          wholesaleMarkupPercentage: 20,
          tradeMarkupPercentage: 30,
          retailMarkupPercentage: 50
        };

        // 5. Update the available parts list to include the new part
        setAvailableParts(prev => [...prev, partToUse]);
      }

      // 6. Add the part to the quote (using wholesale pricing by default)
      const unitPrice = newPart.price * (1 + (partToUse.wholesaleMarkupPercentage || 20) / 100);
      
      const newQuotePart: QuotePart = {
        id: crypto.randomUUID(),
        part: partToUse,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
        isCustomPart: false // Now it's a catalog part
      };
      
      setFormData(prev => ({
        ...prev,
        parts: [...prev.parts, newQuotePart]
      }));

      // 7. Reset the new part form
      setNewPart({
        partNumber: '',
        name: '',
        description: '',
        category: 'Electronics',
        price: 0,
        specifications: {}
      });
      
      setShowAddNewPart(false);
      
    } catch (error: any) {
      console.error('Error adding part to catalog:', error);
      setSubmitError(error.message || 'Failed to add part to catalog. Please try again.');
    } finally {
      setIsAddingPart(false);
    }
  };

  const addNewCustomerToDatabase = async () => {
    if (!newCustomer.name || !newCustomer.contactPerson || !newCustomer.email || !newCustomer.phone || !newCustomer.address) {
      setSubmitError('Please fill in all required fields for the new customer');
      return;
    }

    try {
      const customerObject = {
        name: newCustomer.name.trim(),
        contact_person: newCustomer.contactPerson.trim(),
        email: newCustomer.email.trim(),
        phone: newCustomer.phone.trim(),
        address: newCustomer.address.trim()
      };

      const { data: insertedCustomer, error: customerError } = await supabase
        .from('customers')
        .insert([customerObject])
        .select()
        .single();

      if (customerError) throw customerError;

      const newCustomerObj: Customer = {
        id: insertedCustomer.id,
        name: insertedCustomer.name,
        contactPerson: insertedCustomer.contact_person,
        email: insertedCustomer.email,
        phone: insertedCustomer.phone,
        address: insertedCustomer.address,
        createdAt: insertedCustomer.created_at,
        updatedAt: insertedCustomer.updated_at
      };

      setCustomers(prev => [newCustomerObj, ...prev]);
      setFormData(prev => ({ ...prev, customer: newCustomerObj }));
      
      setNewCustomer({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: ''
      });
      
      setShowAddNewCustomer(false);
    } catch (error: any) {
      console.error('Error adding customer:', error);
      setSubmitError(error.message || 'Failed to add customer. Please try again.');
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
        quotePart.part?.id === partId 
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
        quotePart.part?.id === partId 
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
      parts: prev.parts.filter(quotePart => quotePart.part?.id !== partId)
    }));
  };

  const calculateTotals = () => {
    const totalBidItemsCost = formData.parts.reduce((sum, part) => sum + part.totalPrice, 0);

    // Auto-determine which shipping method to use based on costs
    let selectedShippingCost = 0;
    let selectedMethod: 'sea' | 'air' = 'sea';

    if (formData.shippingCosts.air > 0 && formData.shippingCosts.sea === 0) {
      selectedShippingCost = formData.shippingCosts.air;
      selectedMethod = 'air';
    } else {
      // Default to sea freight (even if both are zero or both have values)
      selectedShippingCost = formData.shippingCosts.sea;
      selectedMethod = 'sea';
    }

    const subtotalAmount = totalBidItemsCost + selectedShippingCost + formData.agentFees + formData.localShippingFees;
    const gstAmount = subtotalAmount * 0.1; // 10% GST
    const grandTotalAmount = subtotalAmount + gstAmount;

    return {
      totalBidItemsCost,
      selectedShippingCost,
      selectedMethod,
      subtotalAmount,
      gstAmount,
      grandTotalAmount
    };
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
        return formData.parts.length > 0;
      case 2:
        return formData.customer !== null;
      case 3:
        return formData.expiryDate !== '';
      default:
        return true;
    }
  };

  const handlePriceListSelect = (item: SeaFreightPriceListItem) => {
    setFormData(prev => ({
      ...prev,
      shippingCosts: {
        ...prev.shippingCosts,
        sea: item.customerPrice,
        selected: 'sea'
      },
      seaFreightPriceListId: item.id,
      priceListSnapshot: item,
      manualPriceOverride: false
    }));
  };

  const handlePriceListClear = () => {
    setFormData(prev => ({
      ...prev,
      seaFreightPriceListId: undefined,
      priceListSnapshot: undefined,
      manualPriceOverride: false
    }));
  };

  const handleManualShippingChange = () => {
    if (formData.seaFreightPriceListId) {
      setFormData(prev => ({
        ...prev,
        manualPriceOverride: true
      }));
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
      const totals = calculateTotals();

      // Construct the quote object for Supabase
      const quoteObject = {
        customer_id: formData.customer.id,
        status,
        total_bid_items_cost: totals.totalBidItemsCost,
        shipping_cost_sea: formData.shippingCosts.sea,
        shipping_cost_air: formData.shippingCosts.air,
        selected_shipping_method: totals.selectedMethod,
        agent_fees: formData.agentFees,
        local_shipping_fees: formData.localShippingFees,
        subtotal_amount: totals.subtotalAmount,
        gst_amount: totals.gstAmount,
        grand_total_amount: totals.grandTotalAmount,
        quote_date: new Date().toISOString().split('T')[0],
        expiry_date: formData.expiryDate,
        notes: formData.notes.trim() || null,
        created_by: user.id,
        sea_freight_price_list_id: formData.seaFreightPriceListId || null,
        price_list_applied_at: formData.seaFreightPriceListId ? new Date().toISOString() : null,
        manual_price_override: formData.manualPriceOverride,
        price_list_snapshot: formData.priceListSnapshot || null
      };

      // Insert the main quote
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .insert([quoteObject])
        .select('id, quote_number')
        .single();

      if (quoteError) throw quoteError;

      if (!quoteData) {
        throw new Error('Failed to create quote - no data returned');
      }

      // Prepare quote parts for insertion
      const quotePartsArray = formData.parts.map(quotePart => ({
        quote_id: quoteData.id,
        part_id: quotePart.part?.id || null,
        custom_part_name: quotePart.isCustomPart ? quotePart.customPartName : null,
        custom_part_description: quotePart.isCustomPart ? quotePart.customPartDescription : null,
        quantity: quotePart.quantity,
        unit_price: quotePart.unitPrice,
        is_custom_part: quotePart.isCustomPart,
        pricing_tier: 'wholesale' // Default pricing tier
      }));

      // Insert quote parts
      const { error: partsError } = await supabase
        .from('quote_parts')
        .insert(quotePartsArray);

      if (partsError) throw partsError;

      // Success - notify parent component and close modal
      const newQuote: Quote = {
        id: quoteData.id,
        quoteNumber: quoteData.quote_number,
        customer: formData.customer,
        status,
        parts: formData.parts,
        totalBidItemsCost: totals.totalBidItemsCost,
        shippingCosts: formData.shippingCosts,
        agentFees: formData.agentFees,
        localShippingFees: formData.localShippingFees,
        subtotalAmount: totals.subtotalAmount,
        gstAmount: totals.gstAmount,
        grandTotalAmount: totals.grandTotalAmount,
        quoteDate: new Date().toISOString().split('T')[0],
        expiryDate: formData.expiryDate,
        notes: formData.notes,
        createdBy: user.name
      };
      
      onQuoteCreated(newQuote);
      onClose();
      
      // Reset form
      setCurrentStep(1);
      setFormData({
        quoteNumber: `QUO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
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
        seaFreightPriceListId: undefined,
        priceListSnapshot: undefined,
        manualPriceOverride: false
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
    { number: 1, title: 'Select Parts', icon: Package },
    { number: 2, title: 'Choose Customer', icon: User },
    { number: 3, title: 'Quote Details', icon: FileText },
    { number: 4, title: 'Review & Submit', icon: Send }
  ];

  const totals = calculateTotals();

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
          {/* Step 1: Select Parts */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select Parts for Quote</h3>
                
                {/* Search and Filter */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
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
                        <span>Add New Part</span>
                      </button>
                    </div>
                    
                    {/* Add New Part Form */}
                    {showAddNewPart && (
                      <div className="mb-4 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                          <Edit3 className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                          Add New Part to Catalog
                        </h5>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Part Number *"
                              value={newPart.partNumber}
                              onChange={(e) => setNewPart(prev => ({ ...prev, partNumber: e.target.value }))}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            />
                            <input
                              type="number"
                              placeholder="Base Price *"
                              step="0.01"
                              value={newPart.price || ''}
                              onChange={(e) => setNewPart(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Part Name *"
                            value={newPart.name}
                            onChange={(e) => setNewPart(prev => ({ ...prev, name: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                          />
                          <textarea
                            placeholder="Description *"
                            value={newPart.description}
                            onChange={(e) => setNewPart(prev => ({ ...prev, description: e.target.value }))}
                            rows={2}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={newPart.category}
                              onChange={(e) => setNewPart(prev => ({ ...prev, category: e.target.value }))}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                              {categories.filter(c => c !== 'all').map(category => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                            <div className="flex space-x-2">
                              <button
                                onClick={addNewPartToOrder}
                                disabled={!newPart.partNumber || !newPart.name || !newPart.description || newPart.price <= 0 || isAddingPart}
                                className={`flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
                                  newPart.partNumber && newPart.name && newPart.description && newPart.price > 0 && !isAddingPart
                                    ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                {isAddingPart ? (
                                  <div className="flex items-center justify-center space-x-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Adding...</span>
                                  </div>
                                ) : (
                                  'Add to Catalog'
                                )}
                              </button>
                              <button
                                onClick={() => setShowAddNewPart(false)}
                                disabled={isAddingPart}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <p className="text-sm text-green-800 dark:text-green-300">
                            <strong>Note:</strong> This part will be added to the Parts Catalog and will be available for future quotes and orders.
                          </p>
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
                                <div className="flex items-center space-x-4 mt-2 text-xs">
                                  <span className="text-blue-600 dark:text-blue-400">Internal: ${(latestPrice * 1.1).toFixed(2)}</span>
                                  <span className="text-green-600 dark:text-green-400">Wholesale: ${(latestPrice * 1.2).toFixed(2)}</span>
                                  <span className="text-purple-600 dark:text-purple-400">Trade: ${(latestPrice * 1.3).toFixed(2)}</span>
                                  <span className="text-orange-600 dark:text-orange-400">Retail: ${(latestPrice * 1.5).toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="flex flex-col space-y-1">
                                <button
                                  onClick={() => addPartToQuote(part, 'wholesale')}
                                  className="flex items-center space-x-1 bg-green-600 dark:bg-green-700 text-white px-3 py-1 rounded-md hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>Wholesale</span>
                                </button>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => addPartToQuote(part, 'trade')}
                                    className="flex items-center space-x-1 bg-purple-600 dark:bg-purple-700 text-white px-2 py-0.5 rounded text-xs hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                                  >
                                    <span>Trade</span>
                                  </button>
                                  <button
                                    onClick={() => addPartToQuote(part, 'retail')}
                                    className="flex items-center space-x-1 bg-orange-600 dark:bg-orange-700 text-white px-2 py-0.5 rounded text-xs hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors"
                                  >
                                    <span>Retail</span>
                                  </button>
                                </div>
                              </div>
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
                            Add a new part to catalog
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
                                onClick={() => removePartFromQuote(quotePart.part?.id || quotePart.id)}
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
                                  onChange={(e) => updatePartQuantity(quotePart.part?.id || quotePart.id, parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400">Unit Price</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={quotePart.unitPrice}
                                  onChange={(e) => updatePartPrice(quotePart.part?.id || quotePart.id, parseFloat(e.target.value) || 0)}
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
                          <span className="font-medium text-gray-900 dark:text-gray-100">Items Total:</span>
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            ${totals.totalBidItemsCost.toFixed(2)}
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
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Select Customer</h4>
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
                  <div className="mb-6 p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                      <Building className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                      Add New Customer
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Company Name *"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Contact Person *"
                        value={newCustomer.contactPerson}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, contactPerson: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <input
                        type="email"
                        placeholder="Email Address *"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <input
                        type="tel"
                        placeholder="Phone Number *"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Address *"
                        value={newCustomer.address}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                        className="md:col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <div className="md:col-span-2 flex space-x-2">
                        <button
                          onClick={addNewCustomerToDatabase}
                          disabled={!newCustomer.name || !newCustomer.contactPerson || !newCustomer.email || !newCustomer.phone || !newCustomer.address}
                          className={`flex-1 px-3 py-2 rounded-md text-sm ${
                            newCustomer.name && newCustomer.contactPerson && newCustomer.email && newCustomer.phone && newCustomer.address
                              ? 'bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          Add Customer
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        <div className="flex items-center space-x-2">
                          <Mail className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400 truncate">{customer.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">{customer.phone}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

      <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                        Quote Information
                      </h4>
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
                            Quote Expiry Date *
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
                            Notes & Terms
                          </label>
                          <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            rows={4}
                            placeholder="Add any special terms, conditions, or notes for the customer..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Fees Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <Calculator className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                        Additional Fees
                      </h4>
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
                    </div>
                  </div>
          )}

          {/* Step 3: Quote Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quote Details & Costs</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Basic Quote Information */}
                  

                  {/* Shipping & Costs */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <Truck className="h-4 w-4 mr-2 text-orange-600 dark:text-orange-400" />
                        Shipping Options
                      </h4>

                      {/* Price List Selector */}
                      <div className="mb-6">
                        <PriceListSelector
                          onSelect={handlePriceListSelect}
                          onClear={handlePriceListClear}
                          selectedItemId={formData.seaFreightPriceListId}
                        />
                        {formData.manualPriceOverride && (
                          <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              <span className="text-sm text-amber-800 dark:text-amber-300">
                                Manual adjustments made to price list values
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Sea Freight Section */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                          <Truck className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                          Sea Freight
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                              Cost
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.shippingCosts.sea || ''}
                              onChange={(e) => {
                                handleManualShippingChange();
                                setFormData(prev => ({
                                  ...prev,
                                  shippingCosts: {
                                    ...prev.shippingCosts,
                                    sea: parseFloat(e.target.value) || 0
                                  }
                                }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="flex items-end">
                            <p className="text-xs text-gray-500 dark:text-gray-400 pb-2">20-30 days delivery</p>
                          </div>
                        </div>
                      </div>

                      {/* Air Freight Section */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                          <Plane className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                          Air Freight
                        </h5>
                        <div>

                          {/* Total Weight Display */}
                          {formData.parts.length > 0 && (
                            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center">
                                  <Weight className="h-4 w-4 mr-1" />
                                  Total Chargeable Weight:
                                </span>
                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                  {calculateTotalChargeableWeight().toFixed(3)} kg
                                </span>
                              </div>
                              {formData.parts.some(p => !p.part?.chargeableWeightKg) && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Some parts are missing weight information
                                </p>
                              )}
                            </div>
                          )}

                          {/* Carrier Options */}
                          {airFreightCarriers.length > 0 ? (
                            <div className="space-y-2.5">
                              {airFreightCarriers.map(carrier => {
                                const calculatedCost = calculateAirFreightCost(carrier.id);
                                const isSelected = selectedAirCarrier === carrier.id;

                                return (
                                  <div
                                    key={carrier.id}
                                    onClick={() => {
                                      if (selectedAirCarrier === carrier.id) {
                                        setSelectedAirCarrier(null);
                                        setFormData(prev => ({
                                          ...prev,
                                          airFreightCarrierId: undefined,
                                          shippingCosts: {
                                            ...prev.shippingCosts,
                                            air: 0
                                          }
                                        }));
                                      } else {
                                        setSelectedAirCarrier(carrier.id);
                                        setFormData(prev => ({
                                          ...prev,
                                          airFreightCarrierId: carrier.id,
                                          shippingCosts: {
                                            ...prev.shippingCosts,
                                            air: calculatedCost
                                          }
                                        }));
                                      }
                                    }}
                                    className={`p-3.5 border rounded-lg cursor-pointer transition-all ${
                                      isSelected
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-sm'
                                    }`}
                                  >
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center flex-1">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {}}
                                          className="mr-3 cursor-pointer h-4 w-4"
                                        />
                                        <div>
                                          <span className="font-medium text-gray-900 dark:text-gray-100 text-base">
                                            {carrier.carrier_name}
                                          </span>
                                          <div className="flex items-center gap-3 mt-1">
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                              ${carrier.charge_rate_per_kg.toFixed(2)}/kg
                                            </p>
                                            <span className="text-gray-400 dark:text-gray-600">•</span>
                                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                              5-7 days
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right ml-4">
                                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                          ${calculatedCost.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {carrier.currency}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                No air freight carriers available. Add carriers in the pricing settings.
                              </p>
                            </div>
                          )}

                          {/* Manual Cost Entry (shown when no carrier selected) */}
                          {selectedAirCarrier === null && (
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                                Manual Air Freight Cost
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={formData.shippingCosts.air || ''}
                                onChange={(e) => {
                                  handleManualShippingChange();
                                  setFormData(prev => ({
                                    ...prev,
                                    shippingCosts: {
                                      ...prev.shippingCosts,
                                      air: parseFloat(e.target.value) || 0
                                    }
                                  }));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="0.00"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                5-7 days delivery
                              </p>
                            </div>
                          )}

                          {/* Helper text */}
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic">
                            Click a carrier to select, click again to deselect and use manual entry
                          </p>
                        </div>
                      </div>
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

                {/* Top Section: Quote Info and Shipping/Fees */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Quote Information with Shipping Options */}
                  <div className="lg:col-span-2">
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
                          <span className="text-gray-600 dark:text-gray-400">Requested By:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{user?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Submitted Date:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date().toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Expiry Date:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date(formData.expiryDate).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                            <Truck className="h-4 w-4 mr-1 text-orange-600 dark:text-orange-400" />
                            Shipping Options
                          </h5>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Selected Method:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                                {totals.selectedMethod} Freight
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Sea Freight Cost:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">${formData.shippingCosts.sea.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">20-30 days delivery</p>
                          </div>
                        </div>

                        {formData.notes && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Notes & Terms</h5>
                            <p className="text-gray-700 dark:text-gray-300">{formData.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Air Freight, Additional Fees & Cost Summary */}
                  <div className="space-y-4">
                    {/* Air Freight Details */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                        <Plane className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                        Air Freight Details
                      </h4>
                      <div className="space-y-3 text-sm">
                        {formData.parts.length > 0 && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center">
                                <Weight className="h-4 w-4 mr-1" />
                                Total Chargeable Weight:
                              </span>
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {calculateTotalChargeableWeight().toFixed(3)} kg
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Air Freight Cost:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${formData.shippingCosts.air.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">5-7 days delivery</p>
                      </div>
                    </div>

                    {/* Additional Fees */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                        <Calculator className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                        Additional Fees
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Agent Fees:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${formData.agentFees.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Local Shipping:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${formData.localShippingFees.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cost Summary */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Cost Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Parts:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${totals.totalBidItemsCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Shipping:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${totals.selectedShippingCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Agent Fees:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${formData.agentFees.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Local Shipping:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${formData.localShippingFees.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-blue-200 dark:border-blue-700 pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">${totals.subtotalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">GST (10%):</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${totals.gstAmount.toFixed(2)}</span>
                        </div>
                        <div className="border-t-2 border-blue-300 dark:border-blue-600 pt-2 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">Grand Total:</span>
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">${totals.grandTotalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quote Items Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Quote Items</h4>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{formData.parts.length} items</span>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                              Item
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                              Unit Price
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {formData.parts.map((quotePart, index) => (
                            <tr key={quotePart.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {quotePart.isCustomPart ? quotePart.customPartName : quotePart.part?.name}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {quotePart.isCustomPart ? quotePart.customPartDescription : quotePart.part?.partNumber}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-gray-900 dark:text-gray-100">{quotePart.quantity}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-gray-900 dark:text-gray-100">${quotePart.unitPrice.toFixed(2)}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-medium text-gray-900 dark:text-gray-100">${quotePart.totalPrice.toFixed(2)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Create & Send Quote</span>
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