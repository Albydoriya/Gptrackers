import { supabase } from '../lib/supabase';

export interface ExportOptions {
  templateType?: 'hpi';
  includeImages?: boolean;
  includeTerms?: boolean;
}

export async function exportOrderTemplate(
  orderId: string,
  options: ExportOptions = {}
): Promise<Blob> {
  const { templateType = 'hpi' } = options;

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const token = (await supabase.auth.getSession()).data.session?.access_token;

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/export-order-template`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId,
        templateType,
        options
      })
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Export failed with status ${response.status}`);
      }
      throw new Error(`Export failed with status ${response.status}`);
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('No data received from export function');
    }

    return blob;
  } catch (err: any) {
    console.error('Export template error:', err);
    throw new Error(err.message || 'Failed to export order template');
  }
}

export function downloadExcelFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function generateExportFilename(supplierName: string, orderNumber: string): string {
  const date = new Date().toISOString().split('T')[0];
  const sanitizedSupplier = supplierName.replace(/[^a-zA-Z0-9]/g, '_');
  return `PO_Request_${sanitizedSupplier}_${orderNumber}_${date}.xlsx`;
}

export async function logExportHistory(
  orderId: string,
  exportType: string,
  fileName: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('order_export_history')
      .insert({
        order_id: orderId,
        export_type: exportType,
        file_name: fileName,
      });

    if (error) {
      console.error('Failed to log export history:', error);
      // Don't throw - logging failure shouldn't block the export
    }
  } catch (err) {
    console.error('Error logging export history:', err);
  }
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: 'draft' | 'supplier_quoting' | 'pending_customer_approval' | 'approved' | 'ordered' | 'in_transit' | 'delivered' | 'cancelled'
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (error) {
    console.error('Failed to update order status:', error);
    throw new Error('Failed to update order status');
  }
}
