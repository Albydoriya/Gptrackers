import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Calendar,
  Save,
  Trash2,
  Edit3,
  BarChart3,
  PieChart,
  FileText,
  AlertCircle,
  Ship,
  Package,
  Users,
  Building2,
  CreditCard,
  Loader2
} from 'lucide-react';
import { Quote, SeaFreightPricingRecord, SeaFreightPricingAnalytics } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SeaFreightPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
}

interface PricingFormData {
  partsCost: number;
  agentServiceFee: number;
  supplierPackingFee: number;
  bankingFee: number;
  notes: string;
  recordedDate: string;
}

const SeaFreightPricingModal: React.FC<SeaFreightPricingModalProps> = ({
  isOpen,
  onClose,
  quote
}) => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'add' | 'history' | 'analytics'>('add');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<PricingFormData>({
    partsCost: 0,
    agentServiceFee: 0,
    supplierPackingFee: 0,
    bankingFee: 0,
    notes: '',
    recordedDate: new Date().toISOString().split('T')[0]
  });

  const [pricingRecords, setPricingRecords] = useState<SeaFreightPricingRecord[]>([]);
  const [analytics, setAnalytics] = useState<SeaFreightPricingAnalytics | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && quote) {
      fetchPricingRecords();
      fetchAnalytics();
    }
  }, [isOpen, quote]);

  const fetchPricingRecords = async () => {
    if (!quote) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('sea_freight_pricing_records')
        .select('*')
        .eq('quote_id', quote.id)
        .order('recorded_date', { ascending: false });

      if (fetchError) throw fetchError;

      const transformedRecords: SeaFreightPricingRecord[] = (data || []).map(record => ({
        id: record.id,
        quoteId: record.quote_id,
        partsCost: parseFloat(record.parts_cost),
        agentServiceFee: parseFloat(record.agent_service_fee),
        supplierPackingFee: parseFloat(record.supplier_packing_fee),
        bankingFee: parseFloat(record.banking_fee),
        totalSeaFreightCost: parseFloat(record.total_sea_freight_cost),
        currency: record.currency,
        recordedDate: record.recorded_date,
        createdBy: record.created_by,
        notes: record.notes,
        createdAt: record.created_at,
        updatedAt: record.updated_at
      }));

      setPricingRecords(transformedRecords);
    } catch (err: any) {
      console.error('Error fetching pricing records:', err);
      setError(err.message || 'Failed to fetch pricing records');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!quote) return;

    try {
      const { data, error: analyticsError } = await supabase
        .rpc('get_sea_freight_pricing_analytics', { p_quote_id: quote.id });

      if (analyticsError) throw analyticsError;

      if (data && data.length > 0) {
        const analyticsData = data[0];
        setAnalytics({
          totalRecords: parseInt(analyticsData.total_records) || 0,
          averageTotalCost: parseFloat(analyticsData.average_total_cost) || 0,
          averagePartsCost: parseFloat(analyticsData.average_parts_cost) || 0,
          averageAgentFee: parseFloat(analyticsData.average_agent_fee) || 0,
          averageSupplierPackingFee: parseFloat(analyticsData.average_supplier_packing_fee) || 0,
          averageBankingFee: parseFloat(analyticsData.average_banking_fee) || 0,
          latestTotalCost: parseFloat(analyticsData.latest_total_cost) || 0,
          minTotalCost: parseFloat(analyticsData.min_total_cost) || 0,
          maxTotalCost: parseFloat(analyticsData.max_total_cost) || 0,
          costTrendDirection: analyticsData.cost_trend_direction || 'stable'
        });
      }
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
    }
  };

  const calculateTotal = () => {
    return formData.partsCost + formData.agentServiceFee +
           formData.supplierPackingFee + formData.bankingFee;
  };

  const handleSave = async () => {
    if (!quote || !user) return;

    if (formData.partsCost < 0 || formData.agentServiceFee < 0 ||
        formData.supplierPackingFee < 0 || formData.bankingFee < 0) {
      setError('All cost values must be non-negative');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const recordData = {
        quote_id: quote.id,
        parts_cost: formData.partsCost,
        agent_service_fee: formData.agentServiceFee,
        supplier_packing_fee: formData.supplierPackingFee,
        banking_fee: formData.bankingFee,
        currency: 'AUD',
        recorded_date: formData.recordedDate,
        created_by: user.id,
        notes: formData.notes.trim() || null
      };

      if (editingRecordId) {
        const { error: updateError } = await supabase
          .from('sea_freight_pricing_records')
          .update(recordData)
          .eq('id', editingRecordId);

        if (updateError) throw updateError;
        setSuccessMessage('Pricing record updated successfully!');
        setEditingRecordId(null);
      } else {
        const { error: insertError } = await supabase
          .from('sea_freight_pricing_records')
          .insert([recordData]);

        if (insertError) throw insertError;
        setSuccessMessage('Pricing record added successfully!');
      }

      setFormData({
        partsCost: 0,
        agentServiceFee: 0,
        supplierPackingFee: 0,
        bankingFee: 0,
        notes: '',
        recordedDate: new Date().toISOString().split('T')[0]
      });

      await fetchPricingRecords();
      await fetchAnalytics();
      setActiveTab('history');

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving pricing record:', err);
      setError(err.message || 'Failed to save pricing record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (record: SeaFreightPricingRecord) => {
    setFormData({
      partsCost: record.partsCost,
      agentServiceFee: record.agentServiceFee,
      supplierPackingFee: record.supplierPackingFee,
      bankingFee: record.bankingFee,
      notes: record.notes || '',
      recordedDate: record.recordedDate.split('T')[0]
    });
    setEditingRecordId(record.id);
    setActiveTab('add');
  };

  const handleDelete = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to delete this pricing record?')) {
      return;
    }

    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('sea_freight_pricing_records')
        .delete()
        .eq('id', recordId);

      if (deleteError) throw deleteError;

      setSuccessMessage('Pricing record deleted successfully!');
      await fetchPricingRecords();
      await fetchAnalytics();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting pricing record:', err);
      setError(err.message || 'Failed to delete pricing record');
    }
  };

  const getCostBreakdown = (record: SeaFreightPricingRecord) => {
    const total = record.totalSeaFreightCost;
    return [
      {
        label: 'Parts Cost',
        value: record.partsCost,
        color: 'bg-blue-500',
        percentage: total > 0 ? (record.partsCost / total) * 100 : 0
      },
      {
        label: 'Agent Service Fee',
        value: record.agentServiceFee,
        color: 'bg-green-500',
        percentage: total > 0 ? (record.agentServiceFee / total) * 100 : 0
      },
      {
        label: 'Supplier Packing Fee',
        value: record.supplierPackingFee,
        color: 'bg-orange-500',
        percentage: total > 0 ? (record.supplierPackingFee / total) * 100 : 0
      },
      {
        label: 'Banking Fee',
        value: record.bankingFee,
        color: 'bg-purple-500',
        percentage: total > 0 ? (record.bankingFee / total) * 100 : 0
      }
    ];
  };

  const getTrendIcon = () => {
    if (!analytics) return <Minus className="h-5 w-5" />;

    switch (analytics.costTrendDirection) {
      case 'increasing':
        return <TrendingUp className="h-5 w-5 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-5 w-5 text-green-500" />;
      default:
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  if (!isOpen || !quote) return null;

  const canManage = hasPermission('quotes', 'update');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Ship className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Sea Freight Pricing Analytics
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Quote: {quote.quoteNumber}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex space-x-4 mt-6">
            <button
              onClick={() => setActiveTab('add')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'add'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>{editingRecordId ? 'Edit Record' : 'Add Record'}</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'history'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>History ({pricingRecords.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-800 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-800 dark:text-green-300">{successMessage}</span>
              </div>
            </div>
          )}

          {activeTab === 'add' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {editingRecordId ? 'Edit Pricing Record' : 'Add New Pricing Record'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>Parts Cost ($)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.partsCost || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, partsCost: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span>Agent Service Fee ($)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.agentServiceFee || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, agentServiceFee: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <span>Supplier Packing Fee ($)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.supplierPackingFee || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, supplierPackingFee: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span>Banking Fee ($)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.bankingFee || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, bankingFee: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Sea Freight Cost</p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        ${calculateTotal().toFixed(2)}
                      </p>
                    </div>
                    <DollarSign className="h-12 w-12 text-blue-400 dark:text-blue-600 opacity-50" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span>Record Date</span>
                    </label>
                    <input
                      type="date"
                      value={formData.recordedDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, recordedDate: e.target.value }))}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <FileText className="h-4 w-4" />
                      <span>Notes (Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Add any additional notes..."
                    />
                  </div>
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !canManage}
                    className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors ${
                      isSaving || !canManage
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>{editingRecordId ? 'Update Record' : 'Save Record'}</span>
                      </>
                    )}
                  </button>
                  {editingRecordId && (
                    <button
                      onClick={() => {
                        setEditingRecordId(null);
                        setFormData({
                          partsCost: 0,
                          agentServiceFee: 0,
                          supplierPackingFee: 0,
                          bankingFee: 0,
                          notes: '',
                          recordedDate: new Date().toISOString().split('T')[0]
                        });
                      }}
                      className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Pricing History
                </h3>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
              ) : pricingRecords.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Ship className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No pricing records yet</p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                  >
                    Add your first pricing record
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {pricingRecords.map((record) => {
                    const breakdown = getCostBreakdown(record);
                    return (
                      <div
                        key={record.id}
                        className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center space-x-3">
                              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                ${record.totalSeaFreightCost.toFixed(2)}
                              </p>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {record.currency}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Recorded: {new Date(record.recordedDate).toLocaleDateString()}
                            </p>
                          </div>
                          {canManage && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(record)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(record.id)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          {breakdown.map((item, index) => (
                            <div key={index} className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{item.label}</p>
                              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                ${item.value.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {item.percentage.toFixed(1)}%
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden flex">
                          {breakdown.map((item, index) => (
                            <div
                              key={index}
                              className={item.color}
                              style={{ width: `${item.percentage}%` }}
                              title={`${item.label}: ${item.percentage.toFixed(1)}%`}
                            />
                          ))}
                        </div>

                        {record.notes && (
                          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-medium">Note:</span> {record.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Cost Analytics & Insights
              </h3>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
              ) : !analytics || analytics.totalRecords === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <PieChart className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No data available for analytics
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Add pricing records to see insights and trends
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Latest Cost</p>
                        {getTrendIcon()}
                      </div>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        ${analytics.latestTotalCost.toFixed(2)}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-2 capitalize">
                        Trend: {analytics.costTrendDirection}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                      <p className="text-sm font-medium text-green-900 dark:text-green-300 mb-2">Average Cost</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        ${analytics.averageTotalCost.toFixed(2)}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                        Across {analytics.totalRecords} record{analytics.totalRecords !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
                      <p className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-2">Cost Range</p>
                      <div className="flex items-baseline space-x-2">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          ${analytics.minTotalCost.toFixed(2)}
                        </p>
                        <span className="text-purple-400 dark:text-purple-500">→</span>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          ${analytics.maxTotalCost.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-xs text-purple-700 dark:text-purple-400 mt-2">
                        Min to Max
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                      <PieChart className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                      Average Cost Breakdown
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">Parts Cost</span>
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            ${analytics.averagePartsCost.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">Agent Service Fee</span>
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            ${analytics.averageAgentFee.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">Supplier Packing Fee</span>
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            ${analytics.averageSupplierPackingFee.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">Banking Fee</span>
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            ${analytics.averageBankingFee.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-1">Insights</h4>
                        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                          <li>
                            • Total of {analytics.totalRecords} pricing record{analytics.totalRecords !== 1 ? 's' : ''} tracked
                          </li>
                          <li>
                            • Cost trend is {analytics.costTrendDirection} over time
                          </li>
                          <li>
                            • Average parts cost represents {
                              ((analytics.averagePartsCost / analytics.averageTotalCost) * 100).toFixed(1)
                            }% of total cost
                          </li>
                          <li>
                            • Variance range: ${(analytics.maxTotalCost - analytics.minTotalCost).toFixed(2)}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track detailed sea freight costs and analyze trends over time
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeaFreightPricingModal;
