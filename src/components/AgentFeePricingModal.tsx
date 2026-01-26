import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  Plus,
  Save,
  Trash2,
  Edit3,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Calendar,
  History,
  List,
  FileText,
  Eye,
  Users,
  Percent
} from 'lucide-react';
import { AgentFee, AgentFeeHistory, Supplier } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AgentFeePricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AgentFeeFormData {
  supplierId: string;
  agentName: string;
  feeAmount: number;
  feeType: 'percentage' | 'fixed';
  effectiveDate: string;
  expirationDate: string;
  notes: string;
}

const AgentFeePricingModal: React.FC<AgentFeePricingModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'history'>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [agentFees, setAgentFees] = useState<AgentFee[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredAgentFees, setFilteredAgentFees] = useState<AgentFee[]>([]);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [selectedAgentFee, setSelectedAgentFee] = useState<AgentFee | null>(null);

  const [editingAgentFeeId, setEditingAgentFeeId] = useState<string | null>(null);
  const [viewHistoryAgentFeeId, setViewHistoryAgentFeeId] = useState<string | null>(null);
  const [agentFeeHistory, setAgentFeeHistory] = useState<AgentFeeHistory[]>([]);

  const [formData, setFormData] = useState<AgentFeeFormData>({
    supplierId: '',
    agentName: '',
    feeAmount: 0,
    feeType: 'percentage',
    effectiveDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
      fetchAgentFees();
    }
  }, [isOpen]);

  useEffect(() => {
    applyFilters();
  }, [agentFees, showActiveOnly]);

  const fetchSuppliers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      const transformedData: Supplier[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        contactPerson: item.contact_person,
        email: item.email,
        phone: item.phone,
        address: item.address,
        rating: parseFloat(item.rating),
        deliveryTime: item.delivery_time,
        paymentTerms: item.payment_terms,
        isActive: item.is_active
      }));

      setSuppliers(transformedData);
    } catch (err: any) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchAgentFees = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('agent_fees')
        .select(`
          *,
          suppliers (*)
        `)
        .order('agent_name', { ascending: true });

      if (fetchError) throw fetchError;

      const transformedData: AgentFee[] = (data || []).map(item => ({
        id: item.id,
        supplierId: item.supplier_id,
        agentName: item.agent_name,
        feeAmount: parseFloat(item.fee_amount),
        feeType: item.fee_type,
        currency: item.currency,
        isActive: item.is_active,
        effectiveDate: item.effective_date,
        expirationDate: item.expiration_date,
        notes: item.notes,
        createdBy: item.created_by,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        supplier: item.suppliers ? {
          id: item.suppliers.id,
          name: item.suppliers.name,
          contactPerson: item.suppliers.contact_person,
          email: item.suppliers.email,
          phone: item.suppliers.phone,
          address: item.suppliers.address,
          rating: parseFloat(item.suppliers.rating),
          deliveryTime: item.suppliers.delivery_time,
          paymentTerms: item.suppliers.payment_terms,
          isActive: item.suppliers.is_active
        } : undefined
      }));

      setAgentFees(transformedData);
    } catch (err: any) {
      console.error('Error fetching agent fees:', err);
      setError(err.message || 'Failed to fetch agent fees');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...agentFees];

    if (showActiveOnly) {
      filtered = filtered.filter(item => item.isActive);
    }

    setFilteredAgentFees(filtered);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.supplierId) {
      setError('Please select a supplier/agent');
      return;
    }

    if (!formData.agentName.trim()) {
      setError('Agent name is required');
      return;
    }

    if (formData.feeAmount < 0) {
      setError('Fee amount must be non-negative');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const agentFeeData = {
        supplier_id: formData.supplierId,
        agent_name: formData.agentName.trim(),
        fee_amount: formData.feeAmount,
        fee_type: formData.feeType,
        currency: 'AUD',
        is_active: true,
        effective_date: formData.effectiveDate,
        expiration_date: formData.expirationDate || null,
        notes: formData.notes.trim() || null,
        created_by: user.id
      };

      if (editingAgentFeeId) {
        const { error: updateError } = await supabase
          .from('agent_fees')
          .update(agentFeeData)
          .eq('id', editingAgentFeeId);

        if (updateError) throw updateError;
        setSuccessMessage('Agent fee updated successfully!');
        setEditingAgentFeeId(null);
      } else {
        const { error: insertError } = await supabase
          .from('agent_fees')
          .insert([agentFeeData]);

        if (insertError) throw insertError;
        setSuccessMessage('Agent fee added successfully!');
      }

      resetForm();
      await fetchAgentFees();
      setActiveTab('list');

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving agent fee:', err);
      setError(err.message || 'Failed to save agent fee');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (agentFee: AgentFee) => {
    setFormData({
      supplierId: agentFee.supplierId,
      agentName: agentFee.agentName,
      feeAmount: agentFee.feeAmount,
      feeType: agentFee.feeType,
      effectiveDate: agentFee.effectiveDate.split('T')[0],
      expirationDate: agentFee.expirationDate ? agentFee.expirationDate.split('T')[0] : '',
      notes: agentFee.notes || ''
    });
    setEditingAgentFeeId(agentFee.id);
    setActiveTab('add');
  };

  const handleDelete = async (agentFeeId: string) => {
    if (!window.confirm('Are you sure you want to delete this agent fee?')) {
      return;
    }

    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('agent_fees')
        .delete()
        .eq('id', agentFeeId);

      if (deleteError) throw deleteError;

      setSuccessMessage('Agent fee deleted successfully!');
      await fetchAgentFees();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting agent fee:', err);
      setError(err.message || 'Failed to delete agent fee');
    }
  };

  const handleToggleActive = async (agentFeeId: string, currentStatus: boolean) => {
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('agent_fees')
        .update({ is_active: !currentStatus })
        .eq('id', agentFeeId);

      if (updateError) throw updateError;

      setSuccessMessage(`Agent fee ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      await fetchAgentFees();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error toggling agent fee status:', err);
      setError(err.message || 'Failed to update agent fee status');
    }
  };

  const handleViewHistory = async (agentFeeId: string) => {
    setViewHistoryAgentFeeId(agentFeeId);
    setIsLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_agent_fee_history', { p_agent_fee_id: agentFeeId });

      if (fetchError) throw fetchError;

      const transformedHistory: AgentFeeHistory[] = (data || []).map((record: any) => ({
        id: record.id,
        agentFeeId: agentFeeId,
        supplierId: record.supplier_id,
        agentName: record.agent_name,
        feeAmount: parseFloat(record.fee_amount),
        feeType: record.fee_type,
        currency: record.currency,
        changeReason: record.change_reason,
        changedAt: record.changed_at
      }));

      setAgentFeeHistory(transformedHistory);
      setActiveTab('history');
    } catch (err: any) {
      console.error('Error fetching agent fee history:', err);
      setError(err.message || 'Failed to fetch agent fee history');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      agentName: '',
      feeAmount: 0,
      feeType: 'percentage',
      effectiveDate: new Date().toISOString().split('T')[0],
      expirationDate: '',
      notes: ''
    });
    setEditingAgentFeeId(null);
  };

  if (!isOpen) return null;

  const canManage = hasPermission('quotes', 'update');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Agent Fee Pricing
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage agent fees linked to suppliers
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
              onClick={() => {
                setActiveTab('list');
                setViewHistoryAgentFeeId(null);
                setSelectedAgentFee(null);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'list'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <List className="h-4 w-4" />
              <span>Agent Fees ({filteredAgentFees.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('add');
                resetForm();
                setViewHistoryAgentFeeId(null);
                setSelectedAgentFee(null);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'add'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>{editingAgentFeeId ? 'Edit Agent Fee' : 'Add Agent Fee'}</span>
            </button>
            {viewHistoryAgentFeeId && (
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'history'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <History className="h-4 w-4" />
                <span>Fee History</span>
              </button>
            )}
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
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-800 dark:text-green-300">{successMessage}</span>
              </div>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <label className="flex items-center space-x-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <input
                    type="checkbox"
                    checked={showActiveOnly}
                    onChange={(e) => setShowActiveOnly(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active only</span>
                </label>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
                </div>
              ) : filteredAgentFees.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Users className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No agent fees found</p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="mt-4 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium"
                  >
                    Add your first agent fee
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredAgentFees.map((agentFee) => (
                    <div
                      key={agentFee.id}
                      className="bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg p-6 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                              {agentFee.agentName}
                            </h3>
                            {agentFee.isActive ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {agentFee.supplier?.name || 'Unknown Supplier'}
                          </p>
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Fee Amount:</span>
                              <div className="flex items-center space-x-2">
                                {agentFee.feeType === 'percentage' ? (
                                  <>
                                    <Percent className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                      {agentFee.feeAmount.toFixed(2)}%
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                      ${agentFee.feeAmount.toFixed(2)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {agentFee.feeType === 'percentage' ? 'Percentage-based fee' : 'Fixed fee amount'}
                            </div>
                          </div>
                          {agentFee.notes && (
                            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2">
                              {agentFee.notes}
                            </div>
                          )}
                        </div>
                        {canManage && (
                          <div className="flex flex-col space-y-2 ml-4">
                            <button
                              onClick={() => handleViewHistory(agentFee.id)}
                              className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                              title="View history"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(agentFee)}
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded"
                              title="Edit"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(agentFee.id, agentFee.isActive)}
                              className={`p-1.5 rounded ${
                                agentFee.isActive
                                  ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                                  : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                              }`}
                              title={agentFee.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {agentFee.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDelete(agentFee.id)}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {editingAgentFeeId ? 'Edit Agent Fee' : 'Add New Agent Fee'}
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Supplier/Agent *
                    </label>
                    <select
                      value={formData.supplierId}
                      onChange={(e) => {
                        const supplier = suppliers.find(s => s.id === e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          supplierId: e.target.value,
                          agentName: supplier?.name || ''
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select a supplier/agent</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Agent Name *
                    </label>
                    <input
                      type="text"
                      value={formData.agentName}
                      onChange={(e) => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="e.g., Agent Smith"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fee Type *
                      </label>
                      <select
                        value={formData.feeType}
                        onChange={(e) => setFormData(prev => ({ ...prev, feeType: e.target.value as 'percentage' | 'fixed' }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount ($)</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {formData.feeType === 'percentage' ? (
                          <Percent className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                        <span>Fee Amount *</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.feeAmount || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, feeAmount: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder={formData.feeType === 'percentage' ? '5.00' : '500.00'}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {formData.feeType === 'percentage' ? 'Percentage of order value' : 'Fixed fee in AUD'}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center space-x-3">
                      {formData.feeType === 'percentage' ? (
                        <>
                          <Percent className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Percentage Fee</p>
                            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                              {formData.feeAmount.toFixed(2)}%
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Fixed Fee</p>
                            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                              ${formData.feeAmount.toFixed(2)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Additional Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Calendar className="h-4 w-4" />
                          <span>Effective Date</span>
                        </label>
                        <input
                          type="date"
                          value={formData.effectiveDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Calendar className="h-4 w-4" />
                          <span>Expiration Date (Optional)</span>
                        </label>
                        <input
                          type="date"
                          value={formData.expirationDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, expirationDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FileText className="h-4 w-4" />
                          <span>Notes (Optional)</span>
                        </label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Add any additional notes..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-6">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !canManage}
                      className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors ${
                        isSaving || !canManage
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-emerald-600 dark:bg-emerald-700 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600'
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
                          <span>{editingAgentFeeId ? 'Update Agent Fee' : 'Save Agent Fee'}</span>
                        </>
                      )}
                    </button>
                    {editingAgentFeeId && (
                      <button
                        onClick={() => {
                          setEditingAgentFeeId(null);
                          resetForm();
                          setActiveTab('list');
                        }}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && viewHistoryAgentFeeId && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Fee Change History
                </h3>
                <button
                  onClick={() => {
                    setViewHistoryAgentFeeId(null);
                    setActiveTab('list');
                  }}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-sm font-medium"
                >
                  Back to List
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
                </div>
              ) : agentFeeHistory.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <History className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No fee changes recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {agentFeeHistory.map((record) => (
                    <div
                      key={record.id}
                      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {record.agentName}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Changed: {new Date(record.changedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Fee Amount</p>
                          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {record.feeType === 'percentage' ? `${record.feeAmount.toFixed(2)}%` : `$${record.feeAmount.toFixed(2)}`}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Fee Type</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {record.feeType === 'percentage' ? 'Percentage' : 'Fixed'}
                          </p>
                        </div>
                      </div>

                      {record.changeReason && (
                        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Reason:</span> {record.changeReason}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage agent fees linked to suppliers
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentFeePricingModal;
