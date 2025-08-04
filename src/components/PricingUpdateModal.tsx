import React, { useState } from 'react';
import { 
  X, 
  DollarSign, 
  Upload, 
  FileText, 
  Save, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  Package,
  Paperclip,
  Download,
  Trash2,
  Plus
} from 'lucide-react';
import { Order, OrderPart } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PricingUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onPricingUpdate: (orderId: string, updatedParts: OrderPart[], attachments: QuoteAttachment[]) => void;
}

interface QuoteAttachment {
  id: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  uploadedBy: string;
  supplier: string;
  notes?: string;
}

interface PriceUpdate {
  partId: string;
  newPrice: number;
  reason: string;
  effectiveDate: string;
  supplier: string;
}

const PricingUpdateModal: React.FC<PricingUpdateModalProps> = ({ 
  isOpen, 
  onClose, 
  order, 
  onPricingUpdate 
}) => {
  const { user } = useAuth();
  const [updatedParts, setUpdatedParts] = useState<OrderPart[]>([]);
  const [priceUpdates, setPriceUpdates] = useState<PriceUpdate[]>([]);
  const [attachments, setAttachments] = useState<QuoteAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pricing' | 'quotes'>('pricing');
  const [isDragOver, setIsDragOver] = useState(false);

  React.useEffect(() => {
    if (order) {
      setUpdatedParts([...order.parts]);
      setPriceUpdates([]);
      setAttachments([]);
      setError(null);
    }
  }, [order]);

  const updatePartPrice = (partId: string, newPrice: number, reason: string) => {
    const updatedPartsList = updatedParts.map(orderPart => {
      if (orderPart.part.id === partId) {
        const updatedOrderPart = {
          ...orderPart,
          unitPrice: newPrice,
          totalPrice: newPrice * orderPart.quantity
        };
        return updatedOrderPart;
      }
      return orderPart;
    });
    
    setUpdatedParts(updatedPartsList);
    
    // Track the price update
    const existingUpdateIndex = priceUpdates.findIndex(update => update.partId === partId);
    const newUpdate: PriceUpdate = {
      partId,
      newPrice,
      reason,
      effectiveDate: new Date().toISOString().split('T')[0],
      supplier: order?.supplier.name || ''
    };
    
    if (existingUpdateIndex >= 0) {
      const updatedPriceUpdates = [...priceUpdates];
      updatedPriceUpdates[existingUpdateIndex] = newUpdate;
      setPriceUpdates(updatedPriceUpdates);
    } else {
      setPriceUpdates([...priceUpdates, newUpdate]);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    processFiles(Array.from(files));
    // Reset the input
    event.target.value = '';
  };

  const processFiles = (files: File[]) => {
    if (!order) return;

    files.forEach(file => {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png',
        'image/jpeg',
        'image/jpg'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        console.warn(`File type ${file.type} not supported for ${file.name}`);
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        console.warn(`File ${file.name} is too large (max 10MB)`);
        return;
      }
      
      const newAttachment: QuoteAttachment = {
        id: `attachment-${Date.now()}-${Math.random()}`,
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        uploadDate: new Date().toISOString().split('T')[0],
        uploadedBy: 'Current User',
        supplier: order.supplier.name,
        notes: ''
      };
      
      setAttachments(prev => [...prev, newAttachment]);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const updateAttachmentNotes = (attachmentId: string, notes: string) => {
    setAttachments(prev => prev.map(att => 
      att.id === attachmentId ? { ...att, notes } : att
    ));
  };

  const getTotalOrderValue = () => {
    return updatedParts.reduce((sum, part) => sum + part.totalPrice, 0);
  };

  const getOriginalOrderValue = () => {
    return order?.totalAmount || 0;
  };

  const getPriceDifference = () => {
    return getTotalOrderValue() - getOriginalOrderValue();
  };

  const getPriceChangePercentage = () => {
    const original = getOriginalOrderValue();
    if (original === 0) return 0;
    return ((getPriceDifference() / original) * 100);
  };

  const handleSubmit = async () => {
    if (!order) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
      // 1. Update order_parts for changed prices
      const originalParts = order.parts;
      const priceChangePromises = [];
      
      for (const updatedPart of updatedParts) {
        const originalPart = originalParts.find(p => p.id === updatedPart.id);
        if (originalPart && originalPart.unitPrice !== updatedPart.unitPrice) {
          const updatePromise = supabase
            .from('order_parts')
            .update({
              unit_price: updatedPart.unitPrice,
              total_price: updatedPart.unitPrice * updatedPart.quantity
            })
            .eq('id', updatedPart.id);
          
          priceChangePromises.push(updatePromise);
        }
      }
      
      // Execute all order_parts updates
      if (priceChangePromises.length > 0) {
        const results = await Promise.all(priceChangePromises);
        for (const result of results) {
          if (result.error) throw result.error;
        }
      }

      // 2. Insert into part_price_history for price updates
      if (priceUpdates.length > 0) {
        const priceHistoryEntries = priceUpdates.map(update => ({
          part_id: update.partId,
          price: update.newPrice,
          supplier_name: update.supplier,
          quantity: 1, // Default quantity for price history
          effective_date: update.effectiveDate,
          reason: update.reason,
          created_by: user?.id || null
        }));

        const { error: historyError } = await supabase
          .from('part_price_history')
          .insert(priceHistoryEntries);

        if (historyError) throw historyError;
      }

      // 3. Store attachments metadata in orders table
      if (attachments.length > 0) {
        const { error: attachmentError } = await supabase
          .from('orders')
          .update({ attachments: attachments })
          .eq('id', order.id);

        if (attachmentError) throw attachmentError;
      }

      // Success - call callback and close modal
      onPricingUpdate(order.id, updatedParts, attachments);
      onClose();
    } catch (error) {
      console.error('Error updating pricing:', error);
      setError(error.message || 'Failed to update pricing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !order) return null;

  const priceDifference = getPriceDifference();
  const priceChangePercentage = getPriceChangePercentage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Update Pricing & Quotes</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{order.orderNumber} - {order.supplier.name}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="mt-6 flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('pricing')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'pricing'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span>Update Pricing</span>
            </button>
            <button
              onClick={() => setActiveTab('quotes')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'quotes'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Supplier Quotes ({attachments.length})</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-800 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-6">
              {/* Price Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Original Order Value</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${getOriginalOrderValue().toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Updated Order Value</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">${getTotalOrderValue().toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Price Change</p>
                    <div className="flex items-center justify-center space-x-2">
                      {priceDifference !== 0 && (
                        priceDifference > 0 ? (
                          <TrendingUp className="h-4 w-4 text-red-500 dark:text-red-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500 dark:text-green-400" />
                        )
                      )}
                      <p className={`text-2xl font-bold ${
                        priceDifference > 0 ? 'text-red-600 dark:text-red-400' : 
                        priceDifference < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {priceDifference > 0 ? '+' : ''}${priceDifference.toLocaleString()}
                      </p>
                    </div>
                    {priceDifference !== 0 && (
                      <p className={`text-sm ${
                        priceDifference > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      }`}>
                        ({priceChangePercentage > 0 ? '+' : ''}{priceChangePercentage.toFixed(1)}%)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Parts Pricing */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Update Part Pricing</h3>
                <div className="space-y-4">
                  {updatedParts.map((orderPart) => {
                    const originalPart = order.parts.find(p => p.part.id === orderPart.part.id);
                    const priceChanged = originalPart && originalPart.unitPrice !== orderPart.unitPrice;
                    const priceUpdate = priceUpdates.find(update => update.partId === orderPart.part.id);
                    
                    return (
                      <div key={orderPart.id} className={`p-4 border rounded-lg ${
                        priceChanged ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                      }`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                              <Package className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-gray-100">{orderPart.part.name}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{orderPart.part.partNumber}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Quantity: {orderPart.quantity}</p>
                            </div>
                          </div>
                          {priceChanged && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              Price Updated
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Current Unit Price
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                step="0.01"
                                value={orderPart.unitPrice}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e.target.value) || 0;
                                  const updatedPartsList = updatedParts.map(part => 
                                    part.part.id === orderPart.part.id 
                                      ? { ...part, unitPrice: newPrice, totalPrice: newPrice * part.quantity }
                                      : part
                                  );
                                  setUpdatedParts(updatedPartsList);
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              />
                              {originalPart && originalPart.unitPrice !== orderPart.unitPrice && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Was: ${originalPart.unitPrice.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Update Reason
                            </label>
                            <select
                              value={priceUpdate?.reason || ''}
                              onChange={(e) => updatePartPrice(orderPart.part.id, orderPart.unitPrice, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                              <option value="">Select reason...</option>
                              <option value="supplier_quote">New Supplier Quote</option>
                              <option value="market_change">Market Price Change</option>
                              <option value="volume_discount">Volume Discount</option>
                              <option value="negotiation">Price Negotiation</option>
                              <option value="correction">Price Correction</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Total Price
                            </label>
                            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                ${orderPart.totalPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="space-y-6">
              {/* Upload Section */}
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                  isDragOver 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className={`p-3 rounded-lg transition-colors ${
                    isDragOver 
                      ? 'bg-blue-200 dark:bg-blue-800' 
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    <Upload className={`h-8 w-8 transition-colors ${
                      isDragOver 
                        ? 'text-blue-700 dark:text-blue-300' 
                        : 'text-blue-600 dark:text-blue-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-medium mb-2 transition-colors ${
                      isDragOver 
                        ? 'text-blue-900 dark:text-blue-100' 
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {isDragOver ? 'Drop files here' : 'Upload Supplier Quotes'}
                    </h3>
                    <p className={`mb-4 transition-colors ${
                      isDragOver 
                        ? 'text-blue-700 dark:text-blue-300' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {isDragOver 
                        ? 'Release to upload your files' 
                        : 'Drag and drop files here, or click to browse'
                      }
                    </p>
                    <label className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                      isDragOver 
                        ? 'bg-blue-700 dark:bg-blue-600 text-white' 
                        : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                    }`}>
                      <Plus className="h-4 w-4" />
                      <span>{isDragOver ? 'Drop Files' : 'Choose Files'}</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="text-center">
                    <p className={`text-xs transition-colors ${
                      isDragOver 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      Supported formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG
                    </p>
                    <p className={`text-xs mt-1 transition-colors ${
                      isDragOver 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      Maximum file size: 10MB each
                    </p>
                  </div>
                </div>
              </div>

              {/* File Type Information */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                    <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Upload Guidelines</h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• <strong>Drag & Drop:</strong> Simply drag files from your computer into the upload area</li>
                      <li>• <strong>Multiple Files:</strong> You can upload multiple quotes at once</li>
                      <li>• <strong>File Validation:</strong> Only supported file types will be accepted</li>
                      <li>• <strong>Size Limit:</strong> Each file must be under 10MB</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Upload Progress Indicator */}
              {isDragOver && (
                <div className="fixed inset-0 bg-blue-500/10 dark:bg-blue-400/10 pointer-events-none z-40 flex items-center justify-center">
                  <div className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg">
                    <div className="flex items-center space-x-2">
                      <Upload className="h-5 w-5" />
                      <span className="font-medium">Drop files to upload</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments List */}
              {attachments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Attached Quotes ({attachments.length})
                  </h3>
                  <div className="space-y-3">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg">
                              <Paperclip className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-gray-100">{attachment.fileName}</h4>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <span className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(attachment.uploadDate).toLocaleDateString()}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <User className="h-3 w-3" />
                                  <span>{attachment.uploadedBy}</span>
                                </span>
                                <span>{attachment.fileSize}</span>
                              </div>
                              <div className="mt-2">
                                <input
                                  type="text"
                                  placeholder="Add notes about this quote..."
                                  value={attachment.notes || ''}
                                  onChange={(e) => updateAttachmentNotes(attachment.id, e.target.value)}
                                  className="w-full px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors">
                              <Download className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => removeAttachment(attachment.id)}
                              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {priceUpdates.length > 0 && (
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  <span>
                    {priceUpdates.length} price update{priceUpdates.length !== 1 ? 's' : ''} will be applied to parts catalog
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex items-center space-x-2 px-6 py-2 rounded-md ${
                  isSubmitting
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Update Pricing & Quotes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingUpdateModal;