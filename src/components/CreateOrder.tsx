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
  Edit3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Part, Supplier, OrderPart } from '../types';

interface CreateOrderProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: any) => void;
}

interface OrderFormData {
  orderNumber: string;
  supplier: Supplier | null;
  parts: OrderPart[];
  expectedDelivery: string;
  notes: string;
  priority: 'low' | 'medium' | 'high';
  requestedBy: string;
}

const CreateOrder: React.FC<CreateOrderProps> = ({ isOpen, onClose, onOrderCreated }) => {
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
    specifications: {} as Record<string, string>
  });
  const [formData, setFormData] = useState<OrderFormData>({
    orderNumber: `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    supplier: null,
    parts: [],
    expectedDelivery: '',
    notes: '',
    priority: 'medium',
    requestedBy: user?.name || 'Current User'
  });
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const categories = ['all', ...new Set(availableParts.map(p => p.category))];
  
  // Fetch parts from Supabase
  useEffect(() => {
    const fetchParts = async () => {
      try {
        const { data, error } = await supabase
          .from('parts')
          .select('*, price_history:part_price_history(*)');

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

    fetchParts();
  }, []);

  // Fetch suppliers from Supabase
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;

        const transformedSuppliers: Supplier[] = (data || []).map(supplier => ({
          id: supplier.id,
          name: supplier.name,
          contactPerson: supplier.contact_person,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          rating: supplier.rating || 5.0,
          deliveryTime: supplier.delivery_time || 5,
          paymentTerms: supplier.payment_terms || 'Net 30',
          isActive: supplier.is_active,
          website: supplier.website,
          notes: supplier.notes
        }));

        setSuppliers(transformedSuppliers);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };

    fetchSuppliers();
  }, []);

  const filteredParts = availableParts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.partNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || part.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addPartToOrder = (part: Part) => {
    const existingPart = formData.parts.find(p => p.part.id === part.id);
    if (existingPart) {
      updatePartQuantity(part.id, existingPart.quantity + 1);
    } else {
      const latestPrice = part.priceHistory.length > 0 
        ? part.priceHistory[part.priceHistory.length - 1].price 
        : 0;
      
      const newOrderPart: OrderPart = {
        id: crypto.randomUUID(),
        part,
        quantity: 1,
        unitPrice: latestPrice,
        totalPrice: latestPrice
      };
      
      setFormData(prev => ({
        ...prev,
        parts: [...prev.parts, newOrderPart]
      }));
    }
  };

  const addNewPartToOrder = () => {
    if (!newPart.partNumber || !newPart.name || newPart.price <= 0) {
      return;
    }

    // Note: In production, you would typically add new parts to the database first
    // For now, we'll show a message that parts should be added through the Parts catalog
    alert('Please add new parts through the Parts Catalog first, then return to create your order.');
    setShowAddNewPart(false);
  };

  const updatePartQuantity = (partId: string, quantity: number) => {
    if (quantity <= 0) {
      removePartFromOrder(partId);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      parts: prev.parts.map(orderPart => 
        orderPart.part.id === partId 
          ? { 
              ...orderPart, 
              quantity, 
              totalPrice: orderPart.unitPrice * quantity 
            }
          : orderPart
      )
    }));
  };

  const updatePartPrice = (partId: string, unitPrice: number) => {
    setFormData(prev => ({
      ...prev,
      parts: prev.parts.map(orderPart => 
        orderPart.part.id === partId 
          ? { 
              ...orderPart, 
              unitPrice, 
              totalPrice: unitPrice * orderPart.quantity 
            }
          : orderPart
      )
    }));
  };

  const removePartFromOrder = (partId: string) => {
    setFormData(prev => ({
      ...prev,
      parts: prev.parts.filter(orderPart => orderPart.part.id !== partId)
    }));
  };

  const getTotalAmount = () => {
    return formData.parts.reduce((sum, orderPart) => sum + orderPart.totalPrice, 0);
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
        return formData.supplier !== null;
      case 3:
        return formData.expectedDelivery !== '';
      default:
        return true;
    }
  };

  const handleSubmit = (status: 'draft' | 'supplier_qouting') => {
    createOrderInSupabase(status);
  };

  const createOrderInSupabase = async (status: 'draft' | 'supplier_qouting') => {
    if (!formData.supplier || formData.parts.length === 0 || !user) {
      setSubmitError('Please ensure all required fields are filled');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Construct the order object for Supabase
      const orderObject = {
        order_number: formData.orderNumber,
        supplier_id: formData.supplier.id.trim(),
        status,
        priority: formData.priority,
        total_amount: getTotalAmount(),
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery: formData.expectedDelivery,
        notes: formData.notes.trim() || null,
        created_by: user.id,
        shipping_data: {},
        attachments: []
      };

      // Insert the main order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderObject])
        .select('id')
        .single();

      if (orderError) throw orderError;

      if (!orderData) {
        throw new Error('Failed to create order - no data returned');
      }

      // Prepare order parts for insertion
      const orderPartsArray = formData.parts.map(orderPart => ({
        order_id: orderData.id,
        part_id: orderPart.part.id,
        quantity: orderPart.quantity,
        unit_price: orderPart.unitPrice
        // total_price will be calculated automatically by the database
      }));

      // Insert order parts
      const { error: partsError } = await supabase
        .from('order_parts')
        .insert(orderPartsArray);

      if (partsError) throw partsError;

      // Success - notify parent component and close modal
      onOrderCreated({
        id: orderData.id,
        orderNumber: formData.orderNumber,
        parts: formData.parts,
        supplier: formData.supplier,
        status,
        totalAmount: getTotalAmount(),
        orderDate: new Date().toISOString().split('T')[0],
        expectedDelivery: formData.expectedDelivery,
        notes: formData.notes,
        createdBy: user.name,
        priority: formData.priority
      });
      
      onClose();
      
      // Reset form
      setCurrentStep(1);
      setFormData({
        orderNumber: `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        supplier: null,
        parts: [],
        expectedDelivery: '',
        notes: '',
        priority: 'medium',
        requestedBy: user?.name || 'Current User'
      });

    } catch (error: any) {
      console.error('Error creating order:', error);
      setSubmitError(error.message || 'Failed to create order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const steps = [
    { number: 1, title: 'Select Parts', icon: Package },
    { number: 2, title: 'Choose Supplier', icon: User },
    { number: 3, title: 'Order Details', icon: FileText },
    { number: 4, title: 'Review & Submit', icon: Send }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Create New Order</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
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
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      <div className={`p-2 rounded-lg ${
                        isActive ? 'bg-blue-100' : isCompleted ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{step.title}</span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-16 h-0.5 mx-4 ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-300'
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Parts for Order</h3>
                
                {/* Search and Filter */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search parts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <h4 className="font-medium text-gray-900">Available Parts</h4>
                      <button
                        onClick={() => setShowAddNewPart(!showAddNewPart)}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Plus className="h-3 w-3" />
                        Add to Catalog First
                      </button>
                    </div>
                    
                    {/* Add New Part Form */}
                    {showAddNewPart && (
                      <div className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                        <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                          <Edit3 className="h-4 w-4 mr-2 text-blue-600" />
                          Add New Part
                        </h5>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Part Number"
                              value={newPart.partNumber}
                              onChange={(e) => setNewPart(prev => ({ ...prev, partNumber: e.target.value }))}
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input
                              type="number"
                              placeholder="Price"
                              step="0.01"
                              value={newPart.price || ''}
                              onChange={(e) => setNewPart(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Part Name"
                            value={newPart.name}
                            onChange={(e) => setNewPart(prev => ({ ...prev, name: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={newPart.category}
                              onChange={(e) => setNewPart(prev => ({ ...prev, category: e.target.value }))}
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {categories.filter(c => c !== 'all').map(category => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                            <div className="flex space-x-2">
                              <button
                                onClick={addNewPartToOrder}
                                disabled={!newPart.partNumber || !newPart.name || newPart.price <= 0}
                                className={`flex-1 px-3 py-2 rounded-md text-sm ${
                                  newPart.partNumber && newPart.name && newPart.price > 0
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                Add
                              </button>
                              <button
                                onClick={() => setShowAddNewPart(false)}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                          <textarea
                            placeholder="Description (optional)"
                            value={newPart.description}
                            onChange={(e) => setNewPart(prev => ({ ...prev, description: e.target.value }))}
                            rows={2}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                      {filteredParts.map((part) => {
                        const latestPrice = part.priceHistory.length > 0 
                          ? part.priceHistory[part.priceHistory.length - 1].price 
                          : 0;
                        
                        return (
                          <div key={part.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900">{part.name}</h5>
                                <p className="text-sm text-gray-600">{part.partNumber}</p>
                                <p className="text-sm text-gray-500">{part.category}</p>
                                <p className="text-sm font-medium text-green-600">${latestPrice.toFixed(2)}</p>
                              </div>
                              <button
                                onClick={() => addPartToOrder(part)}
                                className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {filteredParts.length === 0 && !showAddNewPart && (
                        <div className="p-8 text-center text-gray-500">
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No parts found matching your search</p>
                          <button
                            onClick={() => setShowAddNewPart(true)}
                            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Add a new part instead
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Parts */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      Selected Parts ({formData.parts.length})
                    </h4>
                    <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                      {formData.parts.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No parts selected yet</p>
                        </div>
                      ) : (
                        formData.parts.map((orderPart) => (
                          <div key={orderPart.id} className="p-4 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h5 className="font-medium text-gray-900">{orderPart.part.name}</h5>
                                <p className="text-sm text-gray-600">{orderPart.part.partNumber}</p>
                                {orderPart.part.id.startsWith('custom-') && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                    Custom Part
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => removePartFromOrder(orderPart.part.id)}
                                className="text-red-600 hover:text-red-800 p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600">Quantity</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={orderPart.quantity}
                                  onChange={(e) => updatePartQuantity(orderPart.part.id, parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600">Unit Price</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={orderPart.unitPrice}
                                  onChange={(e) => updatePartPrice(orderPart.part.id, parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600">Total</label>
                                <p className="text-sm font-medium text-gray-900 py-1">
                                  ${orderPart.totalPrice.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {formData.parts.length > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">Total Amount:</span>
                          <span className="text-xl font-bold text-blue-600">
                            ${getTotalAmount().toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Choose Supplier */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Supplier</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suppliers.filter(s => s.isActive).map((supplier) => (
                    <div
                      key={supplier.id}
                      onClick={() => setFormData(prev => ({ ...prev, supplier }))}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        formData.supplier?.id === supplier.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{supplier.name}</h4>
                          <p className="text-sm text-gray-600">{supplier.contactPerson}</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Rating:</span>
                          <span className="font-medium">{supplier.rating}/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivery:</span>
                          <span className="font-medium">{supplier.deliveryTime} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Terms:</span>
                          <span className="font-medium">{supplier.paymentTerms}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Order Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Order Number
                      </label>
                      <input
                        type="text"
                        value={formData.orderNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expected Delivery Date
                      </label>
                      <input
                        type="date"
                        value={formData.expectedDelivery}
                        onChange={(e) => setFormData(prev => ({ ...prev, expectedDelivery: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority Level
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Requested By
                      </label>
                      <input
                        type="text"
                        value={formData.requestedBy}
                        onChange={(e) => setFormData(prev => ({ ...prev, requestedBy: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes & Special Instructions
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={8}
                      placeholder="Add any special instructions, delivery requirements, or notes for the supplier..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Order</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Order Summary */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Order Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Order Number:</span>
                          <span className="font-medium">{formData.orderNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Supplier:</span>
                          <span className="font-medium">{formData.supplier?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Expected Delivery:</span>
                          <span className="font-medium">
                            {new Date(formData.expectedDelivery).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Priority:</span>
                          <span className={`font-medium capitalize ${
                            formData.priority === 'high' ? 'text-red-600' :
                            formData.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {formData.priority}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Requested By:</span>
                          <span className="font-medium">{formData.requestedBy}</span>
                        </div>
                      </div>
                    </div>

                    {formData.notes && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                        <p className="text-sm text-gray-700">{formData.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Parts Summary */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
                    <div className="border border-gray-200 rounded-lg">
                      {formData.parts.map((orderPart, index) => (
                        <div key={orderPart.id} className={`p-4 ${index < formData.parts.length - 1 ? 'border-b border-gray-100' : ''}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium text-gray-900">{orderPart.part.name}</h5>
                              <p className="text-sm text-gray-600">{orderPart.part.partNumber}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">
                                {orderPart.quantity} × ${orderPart.unitPrice.toFixed(2)}
                              </p>
                              <p className="text-sm text-gray-600">
                                Total: ${orderPart.totalPrice.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="p-4 bg-gray-50 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                          <span className="text-xl font-bold text-blue-600">
                            ${getTotalAmount().toFixed(2)}
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

        {/* Error Message */}
        {submitError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mx-6 mb-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">{submitError}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {currentStep > 1 && (
                <button
                  onClick={handlePrevious}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
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
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
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
                    className={`flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md transition-colors ${
                      isSubmitting 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-gray-700 hover:bg-gray-50'
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
                    onClick={() => handleSubmit('supplier_quoting')}
                    disabled={isSubmitting}
                    className={`flex items-center space-x-2 px-6 py-2 rounded-md transition-colors ${
                      isSubmitting
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
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
                        <span>Submit for Approval</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {!canProceedToNext() && currentStep < 4 && !isSubmitting && (
            <div className="mt-3 flex items-center space-x-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                {currentStep === 1 && 'Please select at least one part to continue'}
                {currentStep === 2 && 'Please select a supplier to continue'}
                {currentStep === 3 && 'Please set an expected delivery date to continue'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;