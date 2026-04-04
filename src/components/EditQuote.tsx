import React, { useState, useEffect } from 'react';
import { X, Plus, Search, Package, User, DollarSign, Calendar, FileText, Send, Save, Trash2, ChevronLeft, ChevronRight, AlertCircle, CreditCard as Edit3, Building, Truck, Calculator, Globe, Plane, Weight, Ruler, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Quote, QuotePart, Customer, Part, QuoteStatus, SeaFreightPriceListItem } from '../types';
import PriceListSelector from './PriceListSelector';

interface EditQuoteProps {
  isOpen: boolean;
  onClose: () => void;
  onQuoteUpdated: (quote: Quote) => void;
  quote: Quote | null;
}

interface QuoteFormData {
  quoteNumber: string;
  customer: Customer | null;
  parts: QuotePart[];
  expiryDate: string;
  notes: string;
  shippingCosts: {
    sea: number;
    air: number;
    selected: 'sea' | 'air';
  };
  agentFees: number;
  localShippingFees: number;
  seaFreightPriceListId?: string;
  priceListSnapshot?: SeaFreightPriceListItem;
  manualPriceOverride: boolean;
}

const EditQuote: React.FC<EditQuoteProps> = ({ isOpen, onClose, onQuoteUpdated, quote }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddNewPart, setShowAddNewPart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [newPart, setNewPart] = useState({
    partNumber: '',
    name: '',
    description: '',
    category: '',
    price: 0,
    supplier: '',
    currentStock: 0,
    minStock: 0,
    specifications: {} as Record<string, string>,
    actualWeightKg: 0,
    lengthCm: 0,
    widthCm: 0,
    heightCm: 0,
    dimFactor: 5000,
    internalUsageMarkupPercentage: 10,
    wholesaleMarkupPercentage: 20,
    tradeMarkupPercentage: 30,
    retailMarkupPercentage: 50
  });
  const [formData, setFormData] = useState<QuoteFormData>({
    quoteNumber: '',
    customer: null,
    parts: [],
    expiryDate: '',
    notes: '',
    shippingCosts: {
      sea: 0,
      air: 0,
      selected: 'sea'
    },
    agentFees: 0,
    localShippingFees: 0,
    seaFreightPriceListId: undefined,
    priceListSnapshot: undefined,
    manualPriceOverride: false
  });
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [partCategories, setPartCategories] = useState<Array<{
    name: string;
    display_order: number;
    is_active: boolean;
  }>>([]);

  const categories = ['all', ...new Set(availableParts.map(p => p.category))];
  
  // Initialize form data when quote changes - with conditional check to prevent infinite loop
  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal is closed
      setFormData({
        quoteNumber: '',
        customer: null,
        parts: [],
        expiryDate: '',
        notes: '',
        shippingCosts: {
          sea: 0,
          air: 0,
          selected: 'sea'
        },
        agentFees: 0,
        localShippingFees: 0,
        seaFreightPriceListId: undefined,
        priceListSnapshot: undefined,
        manualPriceOverride: false
      });
      setSubmitError(null);
      setCurrentStep(1);
      return;
    }

    if (quote) {
      // Only update form data if it's different from current quote
      // This prevents infinite re-render loop
      if (formData.quoteNumber !== quote.quoteNumber || !formData.customer || formData.customer.id !== quote.customer.id) {
        setFormData({
          quoteNumber: quote.quoteNumber,
          customer: quote.customer,
          parts: [...quote.parts],
          expiryDate: quote.expiryDate,
          notes: quote.notes || '',
          shippingCosts: {
            sea: quote.shippingCosts.sea,
            air: quote.shippingCosts.air,
            selected: quote.shippingCosts.selected
          },
          agentFees: quote.agentFees,
          localShippingFees: quote.localShippingFees,
          seaFreightPriceListId: quote.seaFreightPriceListId,
          priceListSnapshot: quote.priceListSnapshot,
          manualPriceOverride: quote.manualPriceOverride || false
        });
        setSubmitError(null);
      }
    }
  }, [quote, isOpen, formData.quoteNumber, formData.customer?.id]);

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

    if (isOpen) {
      fetchParts();
    }
  }, [isOpen]);

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

    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  // Fetch part categories from Supabase
  useEffect(() => {
    const fetchPartCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('part_categories')
          .select('name, display_order, is_active')
          .order('display_order', { ascending: true });

        if (error) throw error;

        setPartCategories(data || []);
      } catch (error) {
        console.error('Error fetching part categories:', error);
        setPartCategories([{ name: 'Uncategorized', display_order: 999, is_active: true }]);
      }
    };

    if (isOpen) {
      fetchPartCategories();
    }
  }, [isOpen]);

  // Set default category when categories load
  useEffect(() => {
    if (partCategories.length > 0 && !newPart.category) {
      const firstActiveCategory = partCategories.find(cat => cat.is_active);
      if (firstActiveCategory) {
        setNewPart(prev => ({ ...prev, category: firstActiveCategory.name }));
      }
    }
  }, [partCategories]);

  const filteredParts = availableParts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.partNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || part.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addPartToQuote = (part: Part, pricingTier: 'wholesale' | 'trade' | 'retail' = 'wholesale') => {
    // Calculate price based on pricing tier
    const latestPrice = part.priceHistory.length > 0
      ? part.priceHistory[part.priceHistory.length - 1].price
      : 0;

    let unitPrice = 0;
    switch (pricingTier) {
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

    const existingPart = formData.parts.find(p => !p.isCustomPart && p.part?.id === part.id);
    if (existingPart) {
      // Update the existing part's price to the new tier price
      updatePartPrice(existingPart.id, unitPrice);
    } else {
      // Add new part with the selected tier pricing
      const newQuotePart: QuotePart = {
        id: crypto.randomUUID(),
        part,
        quantity: 1,
        unitPrice: unitPrice,
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
    if (!newPart.partNumber || !newPart.name || !newPart.description) {
      setSubmitError('Please fill in all required fields for the new part (Part Number, Name, and Description)');
      return;
    }

    if (newPart.price <= 0) {
      setSubmitError('Part price must be greater than $0.00');
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
        .maybeSingle();

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
        // Note: volumetric_weight_kg and chargeable_weight_kg are generated columns
        // and will be calculated automatically by the database
        const partObject = {
          part_number: newPart.partNumber.trim(),
          name: newPart.name.trim(),
          description: newPart.description.trim(),
          category: newPart.category,
          specifications: newPart.specifications,
          current_stock: newPart.currentStock,
          min_stock: newPart.minStock,
          preferred_suppliers: [], // Empty array for new parts
          is_archived: false,
          // Markup percentages
          internal_usage_markup_percentage: newPart.internalUsageMarkupPercentage,
          wholesale_markup_percentage: newPart.wholesaleMarkupPercentage,
          trade_markup_percentage: newPart.tradeMarkupPercentage,
          retail_markup_percentage: newPart.retailMarkupPercentage,
          // Weight and dimensions (optional fields)
          actual_weight_kg: newPart.actualWeightKg > 0 ? newPart.actualWeightKg : null,
          length_cm: newPart.lengthCm > 0 ? newPart.lengthCm : null,
          width_cm: newPart.widthCm > 0 ? newPart.widthCm : null,
          height_cm: newPart.heightCm > 0 ? newPart.heightCm : null,
          dim_factor: newPart.dimFactor > 0 ? newPart.dimFactor : null
          // volumetric_weight_kg and chargeable_weight_kg are NOT included - they are generated columns
        };

        const { data: insertedPart, error: partError } = await supabase
          .from('parts')
          .insert([partObject])
          .select('*, price_history:part_price_history(*)')
          .single();

        if (partError) {
          console.error('Error inserting part:', partError);
          setSubmitError(`Failed to create part: ${partError.message}`);
          setIsAddingPart(false);
          return;
        }

        // 3. Add initial price history for the part
        const { error: priceError } = await supabase
          .from('part_price_history')
          .insert([{
            part_id: insertedPart.id,
            price: newPart.price,
            effective_date: new Date().toISOString().split('T')[0],
            supplier_name: newPart.supplier || formData.customer?.name || 'Quote Customer',
            quantity: 1,
            reason: 'Initial entry from quote editing',
            created_by: user?.id || null
          }]);

        if (priceError) {
          console.error('Error inserting price history:', priceError);
          setSubmitError(`Part created but failed to set price: ${priceError.message}`);
          setIsAddingPart(false);
          return;
        }

        // Transform the inserted part to match Part interface
        partToUse = {
          id: insertedPart.id,
          partNumber: insertedPart.part_number,
          name: insertedPart.name,
          description: insertedPart.description,
          category: insertedPart.category,
          specifications: insertedPart.specifications || {},
          currentStock: insertedPart.current_stock || 0,
          minStock: insertedPart.min_stock || 0,
          preferredSuppliers: insertedPart.preferred_suppliers || [],
          priceHistory: [{
            date: new Date().toISOString(),
            price: newPart.price,
            supplier: newPart.supplier || undefined,
            quantity: 1
          }],
          internalUsageMarkupPercentage: insertedPart.internal_usage_markup_percentage || 10,
          wholesaleMarkupPercentage: insertedPart.wholesale_markup_percentage || 20,
          tradeMarkupPercentage: insertedPart.trade_markup_percentage || 30,
          retailMarkupPercentage: insertedPart.retail_markup_percentage || 50,
          actualWeightKg: insertedPart.actual_weight_kg ? parseFloat(insertedPart.actual_weight_kg) : undefined,
          lengthCm: insertedPart.length_cm ? parseFloat(insertedPart.length_cm) : undefined,
          widthCm: insertedPart.width_cm ? parseFloat(insertedPart.width_cm) : undefined,
          heightCm: insertedPart.height_cm ? parseFloat(insertedPart.height_cm) : undefined,
          dimFactor: insertedPart.dim_factor ? parseFloat(insertedPart.dim_factor) : undefined,
          volumetricWeightKg: insertedPart.volumetric_weight_kg ? parseFloat(insertedPart.volumetric_weight_kg) : undefined,
          chargeableWeightKg: insertedPart.chargeable_weight_kg ? parseFloat(insertedPart.chargeable_weight_kg) : undefined
        };

        // Add the new part to availableParts so it appears in the list immediately
        setAvailableParts(prev => [...prev, partToUse]);
      }

      // 4. Add the part to the quote with wholesale pricing by default
      addPartToQuote(partToUse, 'wholesale');

      // 5. Reset form and close
      setNewPart({
        partNumber: '',
        name: '',
        description: '',
        category: partCategories.length > 0 ? partCategories.find(c => c.is_active)?.name || '' : '',
        price: 0,
        supplier: '',
        currentStock: 0,
        minStock: 0,
        specifications: {},
        actualWeightKg: 0,
        lengthCm: 0,
        widthCm: 0,
        heightCm: 0,
        dimFactor: 5000,
        internalUsageMarkupPercentage: 10,
        wholesaleMarkupPercentage: 20,
        tradeMarkupPercentage: 30,
        retailMarkupPercentage: 50
      });
      setShowAddNewPart(false);
      setShowMoreOptions(false);
      setIsAddingPart(false);
      setSubmitError(null);

    } catch (error) {
      console.error('Error in addNewPartToOrder:', error);
      setSubmitError('An unexpected error occurred. Please try again.');
      setIsAddingPart(false);
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

  const calculateTotalChargeableWeight = (): number => {
    return formData.parts.reduce((total, quotePart) => {
      const weight = quotePart.part?.chargeableWeightKg || 0;
      return total + (weight * quotePart.quantity);
    }, 0);
  };

  const getSubtotalAmount = () => {
    const bidItemsCost = getTotalBidItemsCost();
    const shippingCost = formData.shippingCosts.selected === 'sea' ? formData.shippingCosts.sea : formData.shippingCosts.air;
    return bidItemsCost + shippingCost + formData.agentFees + formData.localShippingFees;
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

  const handleSubmit = (status: QuoteStatus) => {
    updateQuoteInSupabase(status);
  };

  const updateQuoteInSupabase = async (status: QuoteStatus) => {
    if (!quote) return;
    if (!formData.customer || formData.parts.length === 0 || !user) {
      setSubmitError('Please ensure all required fields are filled');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Calculate totals
      const totalBidItemsCost = getTotalBidItemsCost();
      const subtotalAmount = getSubtotalAmount();
      const gstAmount = getGSTAmount();
      const grandTotalAmount = getGrandTotalAmount();

      // Construct the updated quote object for Supabase
      const updatedQuoteObject = {
        quote_number: formData.quoteNumber,
        customer_id: formData.customer.id,
        status: status,
        total_bid_items_cost: totalBidItemsCost,
        shipping_cost_sea: formData.shippingCosts.sea,
        shipping_cost_air: formData.shippingCosts.air,
        selected_shipping_method: formData.shippingCosts.selected,
        agent_fees: formData.agentFees,
        local_shipping_fees: formData.localShippingFees,
        subtotal_amount: subtotalAmount,
        gst_amount: gstAmount,
        grand_total_amount: grandTotalAmount,
        expiry_date: formData.expiryDate,
        notes: formData.notes.trim() || null,
        updated_at: new Date().toISOString(),
        sea_freight_price_list_id: formData.seaFreightPriceListId || null,
        price_list_applied_at: formData.seaFreightPriceListId && !quote.seaFreightPriceListId ? new Date().toISOString() : quote.priceListAppliedAt,
        manual_price_override: formData.manualPriceOverride,
        price_list_snapshot: formData.priceListSnapshot || null
      };

      // Update the main quote details
      const { error: quoteError } = await supabase
        .from('quotes')
        .update(updatedQuoteObject)
        .eq('id', quote.id);

      if (quoteError) throw quoteError;

      // Delete all existing quote_parts for this quote
      const { error: deleteError } = await supabase
        .from('quote_parts')
        .delete()
        .eq('quote_id', quote.id);

      if (deleteError) throw deleteError;

      // Insert the updated quote_parts
      if (formData.parts.length > 0) {
        const quotePartsArray = formData.parts.map(quotePart => ({
          quote_id: quote.id,
          part_id: quotePart.isCustomPart ? null : quotePart.part?.id,
          custom_part_name: quotePart.isCustomPart ? quotePart.customPartName : null,
          custom_part_description: quotePart.isCustomPart ? quotePart.customPartDescription : null,
          quantity: quotePart.quantity,
          unit_price: quotePart.unitPrice,
          is_custom_part: quotePart.isCustomPart
        }));

        const { error: partsError } = await supabase
          .from('quote_parts')
          .insert(quotePartsArray);

        if (partsError) throw partsError;
      }

      // Success - notify parent component and close modal
      const updatedQuote: Quote = {
        ...quote,
        quoteNumber: formData.quoteNumber,
        customer: formData.customer,
        parts: formData.parts,
        status,
        totalBidItemsCost,
        shippingCosts: formData.shippingCosts,
        agentFees: formData.agentFees,
        localShippingFees: formData.localShippingFees,
        subtotalAmount,
        gstAmount,
        grandTotalAmount,
        expiryDate: formData.expiryDate,
        notes: formData.notes,
        createdBy: quote.createdBy
      };

      onQuoteUpdated(updatedQuote);
      onClose();
      
      // Reset to first step
      setCurrentStep(1);

    } catch (error: any) {
      console.error('Error updating quote:', error);
      setSubmitError(error.message || 'Failed to update quote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !quote) return null;

  const steps = [
    { number: 1, title: 'Edit Items', icon: Package },
    { number: 2, title: 'Customer Info', icon: Building },
    { number: 3, title: 'Quote Details', icon: FileText },
    { number: 4, title: 'Review & Update', icon: Send }
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Quote</h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">{quote.quoteNumber}</span>
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
          {/* Step 1: Edit Items */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Quote Items</h3>
                
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
                        <span>Add New Part to Catalog</span>
                      </button>
                    </div>
                    
                    {/* Add New Part Form */}
                    {showAddNewPart && (
                      <div className="mb-4 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20 max-h-[600px] overflow-y-auto">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                          <Edit3 className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                          Add New Part to Catalog
                        </h5>
                        <div className="space-y-4">
                          {/* Essential Fields */}
                          <div className="space-y-3">
                            {/* Row 1: Part Number - Full Width */}
                            <input
                              type="text"
                              placeholder="Part Number *"
                              value={newPart.partNumber}
                              onChange={(e) => setNewPart(prev => ({ ...prev, partNumber: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            />

                            {/* Row 2: Part Name - Full Width */}
                            <input
                              type="text"
                              placeholder="Part Name *"
                              value={newPart.name}
                              onChange={(e) => setNewPart(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            />

                            {/* Row 3: Description - Full Width */}
                            <textarea
                              placeholder="Description *"
                              value={newPart.description}
                              onChange={(e) => setNewPart(prev => ({ ...prev, description: e.target.value }))}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            />

                            {/* Row 4: Base Price + Category - 2 Column Layout */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <input
                                  type="number"
                                  placeholder="Base Price (required, min $0.01)"
                                  step="0.01"
                                  min="0.01"
                                  value={newPart.price || ''}
                                  onChange={(e) => setNewPart(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Must be greater than $0.00</p>
                              </div>
                              <select
                                value={newPart.category}
                                onChange={(e) => setNewPart(prev => ({ ...prev, category: e.target.value }))}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                {partCategories.length === 0 ? (
                                  <option value="">Loading...</option>
                                ) : (
                                  partCategories.map(category => (
                                    <option
                                      key={category.name}
                                      value={category.name}
                                      className={!category.is_active ? 'text-gray-400 dark:text-gray-500' : ''}
                                    >
                                      {category.name}{!category.is_active ? ' (Inactive)' : ''}
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>
                          </div>

                          {/* More Options Toggle */}
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => setShowMoreOptions(!showMoreOptions)}
                              className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors border border-blue-200 dark:border-blue-800"
                            >
                              {showMoreOptions ? (
                                <>
                                  <ChevronUp className="h-4 w-4" />
                                  <span>Hide More Options</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4" />
                                  <span>Show More Options (Stock, Weight, Markups, Supplier)</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* More Options Content */}
                          {showMoreOptions && (
                            <div className="space-y-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                              {/* Supplier */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center">
                                  <Building className="h-3 w-3 mr-1" />
                                  Supplier (optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Supplier name"
                                  value={newPart.supplier}
                                  onChange={(e) => setNewPart(prev => ({ ...prev, supplier: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                />
                              </div>

                              {/* Stock Information */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center">
                                  <Package className="h-3 w-3 mr-1" />
                                  Stock Information
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">Current Stock</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={newPart.currentStock || ''}
                                      onChange={(e) => setNewPart(prev => ({ ...prev, currentStock: parseInt(e.target.value) || 0 }))}
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">Min Stock Level</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={newPart.minStock || ''}
                                      onChange={(e) => setNewPart(prev => ({ ...prev, minStock: parseInt(e.target.value) || 0 }))}
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Weight and Dimensions */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center">
                                  <Weight className="h-3 w-3 mr-1" />
                                  Weight and Dimensions (for Air Freight)
                                </label>
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">Actual Weight (kg)</label>
                                      <input
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        value={newPart.actualWeightKg || ''}
                                        onChange={(e) => setNewPart(prev => ({ ...prev, actualWeightKg: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">DIM Factor</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={newPart.dimFactor || ''}
                                        onChange={(e) => setNewPart(prev => ({ ...prev, dimFactor: parseFloat(e.target.value) || 5000 }))}
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">Length (cm)</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={newPart.lengthCm || ''}
                                        onChange={(e) => setNewPart(prev => ({ ...prev, lengthCm: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">Width (cm)</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={newPart.widthCm || ''}
                                        onChange={(e) => setNewPart(prev => ({ ...prev, widthCm: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">Height (cm)</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={newPart.heightCm || ''}
                                        onChange={(e) => setNewPart(prev => ({ ...prev, heightCm: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                      />
                                    </div>
                                  </div>
                                  {/* Calculated Weights Display */}
                                  {(newPart.actualWeightKg > 0 || (newPart.lengthCm > 0 && newPart.widthCm > 0 && newPart.heightCm > 0)) && (
                                    <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Calculated Weights:</p>
                                      <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                          <p className="text-gray-600 dark:text-gray-400">Volumetric</p>
                                          <p className="font-bold text-gray-700 dark:text-gray-300">
                                            {(() => {
                                              const volWeight = newPart.lengthCm > 0 && newPart.widthCm > 0 && newPart.heightCm > 0 && newPart.dimFactor > 0
                                                ? (newPart.lengthCm * newPart.widthCm * newPart.heightCm) / newPart.dimFactor
                                                : 0;
                                              return volWeight.toFixed(3);
                                            })()} kg
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-gray-600 dark:text-gray-400">Actual</p>
                                          <p className="font-bold text-gray-700 dark:text-gray-300">
                                            {newPart.actualWeightKg.toFixed(3)} kg
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-gray-600 dark:text-gray-400">Chargeable</p>
                                          <p className="font-bold text-green-600 dark:text-green-400">
                                            {(() => {
                                              const volWeight = newPart.lengthCm > 0 && newPart.widthCm > 0 && newPart.heightCm > 0 && newPart.dimFactor > 0
                                                ? (newPart.lengthCm * newPart.widthCm * newPart.heightCm) / newPart.dimFactor
                                                : 0;
                                              return Math.max(newPart.actualWeightKg, volWeight).toFixed(3);
                                            })()} kg
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Markup Percentages */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center">
                                  <Calculator className="h-3 w-3 mr-1" />
                                  Markup Percentages
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">Internal Usage %</label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      value={newPart.internalUsageMarkupPercentage || ''}
                                      onChange={(e) => setNewPart(prev => ({ ...prev, internalUsageMarkupPercentage: parseFloat(e.target.value) || 0 }))}
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">Wholesale %</label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      value={newPart.wholesaleMarkupPercentage || ''}
                                      onChange={(e) => setNewPart(prev => ({ ...prev, wholesaleMarkupPercentage: parseFloat(e.target.value) || 0 }))}
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">Trade %</label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      value={newPart.tradeMarkupPercentage || ''}
                                      onChange={(e) => setNewPart(prev => ({ ...prev, tradeMarkupPercentage: parseFloat(e.target.value) || 0 }))}
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">Retail %</label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      value={newPart.retailMarkupPercentage || ''}
                                      onChange={(e) => setNewPart(prev => ({ ...prev, retailMarkupPercentage: parseFloat(e.target.value) || 0 }))}
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex space-x-2 pt-2">
                            <button
                              onClick={addNewPartToOrder}
                              disabled={!newPart.partNumber || !newPart.name || !newPart.description || isAddingPart}
                              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                newPart.partNumber && newPart.name && newPart.description && !isAddingPart
                                  ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
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
                              onClick={() => {
                                setShowAddNewPart(false);
                                setShowMoreOptions(false);
                              }}
                              disabled={isAddingPart}
                              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              Cancel
                            </button>
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
                                  <span className="text-blue-600 dark:text-blue-400">
                                    Internal: ${(latestPrice * (1 + (part.internalUsageMarkupPercentage || 10) / 100)).toFixed(2)}
                                  </span>
                                  <span className="text-green-600 dark:text-green-400">
                                    Wholesale: ${(latestPrice * (1 + (part.wholesaleMarkupPercentage || 20) / 100)).toFixed(2)}
                                  </span>
                                  <span className="text-purple-600 dark:text-purple-400">
                                    Trade: ${(latestPrice * (1 + (part.tradeMarkupPercentage || 30) / 100)).toFixed(2)}
                                  </span>
                                  <span className="text-orange-600 dark:text-orange-400">
                                    Retail: ${(latestPrice * (1 + (part.retailMarkupPercentage || 50) / 100)).toFixed(2)}
                                  </span>
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
                            Add a custom item instead
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Parts */}
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
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 mt-1">
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
                          <span className="font-medium text-gray-900 dark:text-gray-100">Items Total:</span>
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

          {/* Step 2: Customer Info */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Customer Information</h3>
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
                        <p className="text-gray-600 dark:text-gray-400">{customer.email}</p>
                        <p className="text-gray-600 dark:text-gray-400">{customer.phone}</p>
                      </div>
                    </div>
                  ))}
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
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Cost
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
                      </div>
                    </div>
                  </div>

                  {/* Basic Quote Information */}
                  <div className="space-y-6">
                    {/* Additional Fees Section */}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <Calculator className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                        Additional Fees
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Japan Agent Fees
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
                            Local Japan Shipping Fees
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

                    {/* Total Chargeable Weight Section */}
                    {formData.parts.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                          <Weight className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                          Total Chargeable Weight
                        </h4>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                              Total Weight:
                            </span>
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {calculateTotalChargeableWeight().toFixed(3)} kg
                            </span>
                          </div>
                          {formData.parts.some(p => !p.part?.chargeableWeightKg) && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Some parts are missing weight information
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
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
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Update */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Review Quote</h3>

                {/* Top Section: Quote Info and Fees */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Quote Information & Air Freight */}
                  <div className="lg:col-span-2">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-4">
                      {/* Quote Information */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Quote Information</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
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
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                            <Truck className="h-4 w-4 mr-1 text-orange-600 dark:text-orange-400" />
                            Shipping Options
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Selected Method:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                                {formData.shippingCosts.selected} Freight
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
                            <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2 text-sm">Notes & Terms</h5>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{formData.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Air Freight Details */}
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                          <Plane className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                          Air Freight Details
                        </h5>
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
                    </div>
                  </div>

                  {/* Additional Fees & Cost Summary */}
                  <div className="space-y-4">
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
                          <span className="font-medium text-gray-900 dark:text-gray-100">${getTotalBidItemsCost().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Shipping:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            ${(formData.shippingCosts.selected === 'sea' ? formData.shippingCosts.sea : formData.shippingCosts.air).toFixed(2)}
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
                        <div className="border-t border-blue-200 dark:border-blue-700 pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">${getSubtotalAmount().toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">GST (10%):</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">${getGSTAmount().toFixed(2)}</span>
                        </div>
                        <div className="border-t-2 border-blue-300 dark:border-blue-600 pt-2 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">Grand Total:</span>
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">${getGrandTotalAmount().toFixed(2)}</span>
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
                <button
                  onClick={() => handleSubmit(quote.status)}
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Update Quote</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {!canProceedToNext() && currentStep < 4 && !isSubmitting && (
            <div className="mt-3 flex items-center space-x-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              <span className="text-sm">
                {currentStep === 1 && 'Please select at least one item to continue'}
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

export default EditQuote;