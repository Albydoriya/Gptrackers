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
import { getStatusColor, getStatusLabel } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Part, Supplier, OrderPart, Order, OrderStatus } from '../types';

interface EditOrderProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: (order: Order) => void;
  order: Order | null;
}

interface OrderFormData {
  orderNumber: string;
  supplier: Supplier | null;
  parts: OrderPart[];
  expectedDelivery: string;
  notes: string;
  priority: 'low' | 'medium' | 'high';
  requestedBy: string;
  status: OrderStatus;
}

const EditOrder: React.FC<EditOrderProps> = ({ isOpen, onClose, onOrderUpdated, order }) => {
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
    orderNumber: '',
    supplier: null,
    parts: [],
    expectedDelivery: '',
    notes: '',
    priority: 'medium',
    requestedBy: '',
    status: 'draft'
  });
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const categories = ['all', ...new Set(availableParts.map(p => p.category))];
  
  // Initialize form data when order changes
  useEffect(() => {
    if (order) {
      setFormData({
        orderNumber: order.orderNumber,
        supplier: order.supplier,
        parts: [...order.parts],
        expectedDelivery: order.expectedDelivery,
        notes: order.notes || '',
        priority: order.priority || 'medium',
        requestedBy: order.createdBy,
        status: order.status
      });
      setSubmitError(null);
    }
  }, [order]);

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
    alert('Please add new parts through the Parts Catalog first, then return to edit your order.');
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

  const handleSubmit = (status: OrderStatus) => {
    updateOrderInSupabase(status);
  };

  const updateOrderInSupabase = async (status: OrderStatus) => {
    if (!order) return;
    if (!formData.supplier || formData.parts.length === 0 || !user) {
      setSubmitError('Please ensure all required fields are filled');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Construct the updated order object for Supabase
      const updatedOrderObject = {
        order_number: formData.orderNumber,
        supplier_id: formData.supplier.id.trim(),
        status,
        priority: formData.priority,
        total_amount: getTotalAmount(),
        expected_delivery: formData.expectedDelivery,
        notes: formData.notes.trim() || null,
        updated_at: new Date().toISOString()
      };

      // Update the main order details
      const { error: orderError } = await supabase
        .from('orders')
        .update(updatedOrderObject)
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Delete all existing order_parts for this order
      const { error: deleteError } = await supabase
        .from('order_parts')
        .delete()
        .eq('order_id', order.id);

      if (deleteError) throw deleteError;

      // Insert the updated order_parts
      if (formData.parts.length > 0) {
        const orderPartsArray = formData.parts.map(orderPart => ({
          order_id: order.id,
          part_id: orderPart.part.id,
          quantity: orderPart.quantity,
          unit_price: orderPart.unitPrice
          // total_price will be calculated automatically by the database
        }));

        const { error: partsError } = await supabase
          .from('order_parts')
          .insert(orderPartsArray);

        if (partsError) throw partsError;
      }

      // Success - notify parent component and close modal
      const updatedOrder: Order = {
        ...order,
        orderNumber: formData.orderNumber,
        parts: formData.parts,
        supplier: formData.supplier,
        status,
        totalAmount: getTotalAmount(),
        expectedDelivery: formData.expectedDelivery,
        notes: formData.notes,
        createdBy: formData.requestedBy,
        priority: formData.priority
      };

      onOrderUpdated(updatedOrder);
      onClose();
      
      // Reset to first step
      setCurrentStep(1);

    } catch (error: any) {
      console.error('Error updating order:', error);
      setSubmitError(error.message || 'Failed to update order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !order) return null;

  const steps = [
    { number: 1, title: 'Edit Parts', icon: Package },
    { number: 2, title: 'Change Supplier', icon: User },
    { number: 3, title: 'Order Details', icon: FileText },
    { number: 4, title: 'Review & Update', icon: Send }
  ];

  const statusOptions: { value: OrderStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Order</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
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
          {/* Step 1: Edit Parts */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Parts for Order</h3>
                
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
                        <span>Add to Catalog First</span>
                      </button>
                    </div>
                    
                    {/* Add New Part Form */}
                    {showAddNewPart && (
                      <div className="mb-4 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                          <Edit3 className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                          Add New Part
                        </h5>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Part Number"
                              value={newPart.partNumber}
                              onChange={(e) => setNewPart(prev => ({ ...prev, partNumber: e.target.value }))}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            />
                            <input
                              type="number"
                              placeholder="Price"
                              step="0.01"
                              value={newPart.price || ''}
                              onChange={(e) => setNewPart(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Part Name"
                            value={newPart.name}
                            onChange={(e) => setNewPart(prev => ({ ...prev, name: e.target.value }))}
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
                                disabled={!newPart.partNumber || !newPart.name || newPart.price <= 0}
                                className={`flex-1 px-3 py-2 rounded-md text-sm ${
                                  newPart.partNumber && newPart.name && newPart.price > 0
                                    ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                Add
                              </button>
                              <button
                                onClick={() => setShowAddNewPart(false)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                          />
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
                                onClick={() => addPartToOrder(part)}
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
                            Add a new part instead
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
                        formData.parts.map((orderPart) => (
                          <div key={orderPart.id} className="p-4 border-b border-gray-100 dark:border-gray-600">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h5 className="font-medium text-gray-900 dark:text-gray-100">{orderPart.part.name}</h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{orderPart.part.partNumber}</p>
                                {orderPart.part.id.startsWith('custom-') && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 mt-1">
                                    Custom Part
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => removePartFromOrder(orderPart.part.id)}
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
                                  value={orderPart.quantity}
                                  onChange={(e) => updatePartQuantity(orderPart.part.id, parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400">Unit Price</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={orderPart.unitPrice}
                                  onChange={(e) => updatePartPrice(orderPart.part.id, parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400">Total</label>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 py-1">
                                  ${orderPart.totalPrice.toFixed(2)}
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
                          <span className="font-medium text-gray-900 dark:text-gray-100">Total Amount:</span>
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
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

          {/* Step 2: Change Supplier */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Supplier</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suppliers.filter(s => s.isActive).map((supplier) => (
                    <div
                      key={supplier.id}
                      onClick={() => setFormData(prev => ({ ...prev, supplier }))}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        formData.supplier?.id === supplier.id
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg">
                          <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{supplier.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{supplier.contactPerson}</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Rating:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{supplier.rating}/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Delivery:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{supplier.deliveryTime} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Terms:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{supplier.paymentTerms}</span>
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Order Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Order Number
                      </label>
                      <input
                        type="text"
                        value={formData.orderNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Expected Delivery Date
                      </label>
                      <input
                        type="date"
                        value={formData.expectedDelivery}
                        onChange={(e) => setFormData(prev => ({ ...prev, expectedDelivery: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Order Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as OrderStatus }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Priority Level
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Requested By
                      </label>
                      <input
                        type="text"
                        value={formData.requestedBy}
                        onChange={(e) => setFormData(prev => ({ ...prev, requestedBy: e.target.value }))}
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
                      rows={8}
                      placeholder="Add any special instructions, delivery requirements, or notes for the supplier..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Update */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Review Changes</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Order Summary */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Order Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Order Number:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{formData.orderNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Supplier:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{formData.supplier?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Expected Delivery:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date(formData.expectedDelivery).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Status:</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(formData.status)}`}>
                            {getStatusLabel(formData.status)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                          <span className={`font-medium capitalize ${
                            formData.priority === 'high' ? 'text-red-600 dark:text-red-400' :
                            formData.priority === 'medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
                          }`}>
                            {formData.priority}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Requested By:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{formData.requestedBy}</span>
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

                  {/* Parts Summary */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Order Items</h4>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700">
                      {formData.parts.map((orderPart, index) => (
                        <div key={orderPart.id} className={`p-4 ${index < formData.parts.length - 1 ? 'border-b border-gray-100 dark:border-gray-600' : ''}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium text-gray-900 dark:text-gray-100">{orderPart.part.name}</h5>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{orderPart.part.partNumber}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {orderPart.quantity} × ${orderPart.unitPrice.toFixed(2)}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Total: ${orderPart.totalPrice.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="p-4 bg-gray-50 dark:bg-gray-600 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total Amount:</span>
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
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
                  onClick={() => handleSubmit(formData.status)}
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
                      <span>Update Order</span>
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

export default EditOrder;