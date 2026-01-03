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

  const { data, error } = await supabase.functions.invoke('export-order-template', {
    body: {
      orderId,
      templateType,
      options
    },
  });

  if (error) {
    console.error('Export error:', error);
    throw new Error(error.message || 'Failed to export order template');
  }

  // Convert response to Blob
  if (data instanceof Blob) {
    return data;
  }

  // If data is ArrayBuffer or similar, convert it
  return new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
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
  newStatus: string
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
