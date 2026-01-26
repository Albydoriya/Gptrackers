import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  Plus,
  Save,
  Trash2,
  Edit3,
  AlertCircle,
  Plane,
  Loader2,
  CheckCircle,
  XCircle,
  Calendar,
  History,
  List,
  FileText,
  Eye,
  TrendingUp,
  Weight
} from 'lucide-react';
import { AirFreightCarrier, AirFreightCarrierHistory } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AirFreightPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: any | null;
}

interface CarrierFormData {
  carrierName: string;
  costRatePerKg: number;
  chargeRatePerKg: number;
  effectiveDate: string;
  expirationDate: string;
  notes: string;
}

const AirFreightPricingModal: React.FC<AirFreightPricingModalProps> = ({
  isOpen,
  onClose,
  quote
}) => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'history'>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [carriers, setCarriers] = useState<AirFreightCarrier[]>([]);
  const [filteredCarriers, setFilteredCarriers] = useState<AirFreightCarrier[]>([]);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [selectedCarrier, setSelectedCarrier] = useState<AirFreightCarrier | null>(null);

  const [editingCarrierId, setEditingCarrierId] = useState<string | null>(null);
  const [viewHistoryCarrierId, setViewHistoryCarrierId] = useState<string | null>(null);
  const [carrierHistory, setCarrierHistory] = useState<AirFreightCarrierHistory[]>([]);

  const [formData, setFormData] = useState<CarrierFormData>({
    carrierName: '',
    costRatePerKg: 0,
    chargeRatePerKg: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchCarriers();
    }
  }, [isOpen]);

  useEffect(() => {
    applyFilters();
  }, [carriers, showActiveOnly]);

  const fetchCarriers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('air_freight_carriers')
        .select('*')
        .order('carrier_name', { ascending: true });

      if (fetchError) throw fetchError;

      const transformedData: AirFreightCarrier[] = (data || []).map(item => ({
        id: item.id,
        carrierName: item.carrier_name,
        costRatePerKg: parseFloat(item.cost_rate_per_kg),
        chargeRatePerKg: parseFloat(item.charge_rate_per_kg),
        profitPerKg: parseFloat(item.profit_per_kg),
        profitMarginPercentage: parseFloat(item.profit_margin_percentage),
        currency: item.currency,
        isActive: item.is_active,
        effectiveDate: item.effective_date,
        expirationDate: item.expiration_date,
        notes: item.notes,
        createdBy: item.created_by,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));

      setCarriers(transformedData);
    } catch (err: any) {
      console.error('Error fetching carriers:', err);
      setError(err.message || 'Failed to fetch carriers');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...carriers];

    if (showActiveOnly) {
      filtered = filtered.filter(item => item.isActive);
    }

    setFilteredCarriers(filtered);
  };

  const calculateProfit = () => {
    return formData.chargeRatePerKg - formData.costRatePerKg;
  };

  const calculateProfitMargin = () => {
    if (formData.chargeRatePerKg === 0) return 0;
    return ((formData.chargeRatePerKg - formData.costRatePerKg) / formData.chargeRatePerKg) * 100;
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.carrierName.trim()) {
      setError('Carrier name is required');
      return;
    }

    if (formData.costRatePerKg < 0 || formData.chargeRatePerKg < 0) {
      setError('All rate values must be non-negative');
      return;
    }

    if (formData.chargeRatePerKg < formData.costRatePerKg) {
      setError('Charge rate should be greater than or equal to cost rate');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const carrierData = {
        carrier_name: formData.carrierName.trim(),
        cost_rate_per_kg: formData.costRatePerKg,
        charge_rate_per_kg: formData.chargeRatePerKg,
        currency: 'AUD',
        is_active: true,
        effective_date: formData.effectiveDate,
        expiration_date: formData.expirationDate || null,
        notes: formData.notes.trim() || null,
        created_by: user.id
      };

      if (editingCarrierId) {
        const { error: updateError } = await supabase
          .from('air_freight_carriers')
          .update(carrierData)
          .eq('id', editingCarrierId);

        if (updateError) throw updateError;
        setSuccessMessage('Carrier updated successfully!');
        setEditingCarrierId(null);
      } else {
        const { error: insertError } = await supabase
          .from('air_freight_carriers')
          .insert([carrierData]);

        if (insertError) throw insertError;
        setSuccessMessage('Carrier added successfully!');
      }

      resetForm();
      await fetchCarriers();
      setActiveTab('list');

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving carrier:', err);
      setError(err.message || 'Failed to save carrier');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (carrier: AirFreightCarrier) => {
    setFormData({
      carrierName: carrier.carrierName,
      costRatePerKg: carrier.costRatePerKg,
      chargeRatePerKg: carrier.chargeRatePerKg,
      effectiveDate: carrier.effectiveDate.split('T')[0],
      expirationDate: carrier.expirationDate ? carrier.expirationDate.split('T')[0] : '',
      notes: carrier.notes || ''
    });
    setEditingCarrierId(carrier.id);
    setActiveTab('add');
  };

  const handleDelete = async (carrierId: string) => {
    if (!window.confirm('Are you sure you want to delete this carrier?')) {
      return;
    }

    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('air_freight_carriers')
        .delete()
        .eq('id', carrierId);

      if (deleteError) throw deleteError;

      setSuccessMessage('Carrier deleted successfully!');
      await fetchCarriers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting carrier:', err);
      setError(err.message || 'Failed to delete carrier');
    }
  };

  const handleToggleActive = async (carrierId: string, currentStatus: boolean) => {
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('air_freight_carriers')
        .update({ is_active: !currentStatus })
        .eq('id', carrierId);

      if (updateError) throw updateError;

      setSuccessMessage(`Carrier ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      await fetchCarriers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error toggling carrier status:', err);
      setError(err.message || 'Failed to update carrier status');
    }
  };

  const handleViewHistory = async (carrierId: string) => {
    setViewHistoryCarrierId(carrierId);
    setIsLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_air_freight_carrier_history', { p_carrier_id: carrierId });

      if (fetchError) throw fetchError;

      const transformedHistory: AirFreightCarrierHistory[] = (data || []).map((record: any) => ({
        id: record.id,
        carrierId: carrierId,
        carrierName: record.carrier_name,
        costRatePerKg: parseFloat(record.cost_rate_per_kg),
        chargeRatePerKg: parseFloat(record.charge_rate_per_kg),
        profitPerKg: parseFloat(record.profit_per_kg),
        currency: record.currency,
        changeReason: record.change_reason,
        changedAt: record.changed_at
      }));

      setCarrierHistory(transformedHistory);
      setActiveTab('history');
    } catch (err: any) {
      console.error('Error fetching carrier history:', err);
      setError(err.message || 'Failed to fetch carrier history');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      carrierName: '',
      costRatePerKg: 0,
      chargeRatePerKg: 0,
      effectiveDate: new Date().toISOString().split('T')[0],
      expirationDate: '',
      notes: ''
    });
    setEditingCarrierId(null);
  };

  const generateRateTable = (costRate: number, chargeRate: number, maxKg: number = 10) => {
    const rows = [];
    for (let kg = 1; kg <= maxKg; kg++) {
      rows.push({
        weight: kg,
        costTotal: (costRate * kg).toFixed(2),
        chargeTotal: (chargeRate * kg).toFixed(2),
        profitTotal: ((chargeRate - costRate) * kg).toFixed(2)
      });
    }
    return rows;
  };

  if (!isOpen) return null;

  const canManage = hasPermission('quotes', 'update');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
                <Plane className="h-6 w-6 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Air Freight Carriers
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage carrier rates per kilogram
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
                setViewHistoryCarrierId(null);
                setSelectedCarrier(null);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'list'
                  ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <List className="h-4 w-4" />
              <span>Carriers ({filteredCarriers.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('add');
                resetForm();
                setViewHistoryCarrierId(null);
                setSelectedCarrier(null);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'add'
                  ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>{editingCarrierId ? 'Edit Carrier' : 'Add Carrier'}</span>
            </button>
            {viewHistoryCarrierId && (
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'history'
                    ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <History className="h-4 w-4" />
                <span>Rate History</span>
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
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active only</span>
                </label>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-600 dark:text-sky-400" />
                </div>
              ) : filteredCarriers.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Plane className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No carriers found</p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="mt-4 text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-medium"
                  >
                    Add your first carrier
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredCarriers.map((carrier) => (
                    <div
                      key={carrier.id}
                      className="bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg p-6 hover:border-sky-300 dark:hover:border-sky-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                              {carrier.carrierName}
                            </h3>
                            {carrier.isActive ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Cost Rate</p>
                              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                                ${carrier.costRatePerKg.toFixed(2)}/kg
                              </p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Charge Rate</p>
                              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                ${carrier.chargeRatePerKg.toFixed(2)}/kg
                              </p>
                            </div>
                          </div>
                          <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3 mb-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Profit per kg:</span>
                              <span className="text-lg font-bold text-sky-600 dark:text-sky-400">
                                ${carrier.profitPerKg.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Margin:</span>
                              <span className="text-sm font-semibold text-sky-600 dark:text-sky-400">
                                {carrier.profitMarginPercentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedCarrier(selectedCarrier?.id === carrier.id ? null : carrier)}
                            className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-medium"
                          >
                            {selectedCarrier?.id === carrier.id ? 'Hide Rate Table' : 'Show Rate Table'}
                          </button>
                        </div>
                        {canManage && (
                          <div className="flex flex-col space-y-2 ml-4">
                            <button
                              onClick={() => handleViewHistory(carrier.id)}
                              className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                              title="View history"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(carrier)}
                              className="p-1.5 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded"
                              title="Edit"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(carrier.id, carrier.isActive)}
                              className={`p-1.5 rounded ${
                                carrier.isActive
                                  ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                                  : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                              }`}
                              title={carrier.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {carrier.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDelete(carrier.id)}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {selectedCarrier?.id === carrier.id && (
                        <div className="mt-4 border-t border-gray-200 dark:border-gray-600 pt-4">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Rate Breakdown (1-10 KG)
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Weight</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Cost</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Charge</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Profit</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                {generateRateTable(carrier.costRatePerKg, carrier.chargeRatePerKg).map((row) => (
                                  <tr key={row.weight} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{row.weight} kg</td>
                                    <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">${row.costTotal}</td>
                                    <td className="px-3 py-2 text-right text-green-600 dark:text-green-400 font-semibold">${row.chargeTotal}</td>
                                    <td className="px-3 py-2 text-right text-sky-600 dark:text-sky-400 font-semibold">${row.profitTotal}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
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
                  {editingCarrierId ? 'Edit Carrier' : 'Add New Carrier'}
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Carrier Name *
                    </label>
                    <input
                      type="text"
                      value={formData.carrierName}
                      onChange={(e) => setFormData(prev => ({ ...prev, carrierName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="e.g., DHL, FedEx, UPS"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <DollarSign className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span>Cost Rate ($ per kg) *</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.costRatePerKg || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, costRatePerKg: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="30.00"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">What you pay the carrier per kg</p>
                    </div>

                    <div>
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span>Charge Rate ($ per kg) *</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.chargeRatePerKg || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, chargeRatePerKg: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="40.00"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">What you charge customers per kg</p>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-sky-50 to-green-50 dark:from-sky-900/20 dark:to-green-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Profit Per KG</p>
                        <div className="flex items-baseline space-x-2">
                          <p className="text-3xl font-bold text-sky-600 dark:text-sky-400">
                            ${calculateProfit().toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Profit Margin</p>
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {calculateProfitMargin().toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {formData.costRatePerKg > 0 && formData.chargeRatePerKg > 0 && (
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Preview: Rate Breakdown (1-10 KG)
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Weight</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Cost</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Charge</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Profit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                            {generateRateTable(formData.costRatePerKg, formData.chargeRatePerKg).map((row) => (
                              <tr key={row.weight}>
                                <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{row.weight} kg</td>
                                <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">${row.costTotal}</td>
                                <td className="px-3 py-2 text-right text-green-600 dark:text-green-400 font-semibold">${row.chargeTotal}</td>
                                <td className="px-3 py-2 text-right text-sky-600 dark:text-sky-400 font-semibold">${row.profitTotal}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

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
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                          : 'bg-sky-600 dark:bg-sky-700 text-white hover:bg-sky-700 dark:hover:bg-sky-600'
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
                          <span>{editingCarrierId ? 'Update Carrier' : 'Save Carrier'}</span>
                        </>
                      )}
                    </button>
                    {editingCarrierId && (
                      <button
                        onClick={() => {
                          setEditingCarrierId(null);
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

          {activeTab === 'history' && viewHistoryCarrierId && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Rate Change History
                </h3>
                <button
                  onClick={() => {
                    setViewHistoryCarrierId(null);
                    setActiveTab('list');
                  }}
                  className="text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 text-sm font-medium"
                >
                  Back to List
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-600 dark:text-sky-400" />
                </div>
              ) : carrierHistory.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <History className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No rate changes recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {carrierHistory.map((record) => (
                    <div
                      key={record.id}
                      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {record.carrierName}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Changed: {new Date(record.changedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Cost Rate</p>
                          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                            ${record.costRatePerKg.toFixed(2)}/kg
                          </p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Charge Rate</p>
                          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                            ${record.chargeRatePerKg.toFixed(2)}/kg
                          </p>
                        </div>
                        <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Profit Per KG</p>
                          <p className="text-sm font-semibold text-sky-600 dark:text-sky-400">
                            ${record.profitPerKg.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {record.changeReason && (
                        <div className="mt-4 p-3 bg-sky-50 dark:bg-sky-900/20 rounded-lg">
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
              Manage air freight carrier rates with per kg pricing
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

export default AirFreightPricingModal;
