import { supabase } from '../lib/supabase';

export interface ExportOptions {
  templateType?: string;
  includeImages?: boolean;
  includeTerms?: boolean;
}

export interface SupplierGroup {
  supplier_id: string;
  supplier_name: string;
  order_ids: string[];
  order_count: number;
}

export interface MultiSupplierResponse {
  multiSupplier: true;
  groups: SupplierGroup[];
}

export interface ExportResult {
  success: boolean;
  supplierName: string;
  orderCount: number;
  error?: string;
}

export interface MultiExportResult {
  totalSuccessful: number;
  totalFailed: number;
  results: ExportResult[];
  successfulOrderIds: string[];
}

export async function exportOrderTemplate(
  orderId: string,
  options: ExportOptions = {}
): Promise<Blob> {
  const { templateType } = options;

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

export async function exportMultipleOrders(
  orderIds: string[],
  options: ExportOptions = {},
  onProgress?: (current: number, total: number, supplierName: string) => void
): Promise<Blob | MultiSupplierResponse> {
  const { templateType } = options;

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
        orderIds,
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

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      if (data.multiSupplier) {
        return data as MultiSupplierResponse;
      }
      throw new Error(data.error || 'Unexpected JSON response');
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('No data received from export function');
    }

    return blob;
  } catch (err: any) {
    console.error('Export multiple orders error:', err);
    throw new Error(err.message || 'Failed to export multiple orders');
  }
}

export async function processMultiSupplierExport(
  orderIds: string[],
  options: ExportOptions = {},
  onProgress?: (current: number, total: number, supplierName: string) => void
): Promise<MultiExportResult> {
  try {
    const response = await exportMultipleOrders(orderIds, options);

    if (response instanceof Blob) {
      throw new Error('Expected multi-supplier response but got single supplier blob');
    }

    const multiSupplierResponse = response as MultiSupplierResponse;
    const results: ExportResult[] = [];
    const successfulOrderIds: string[] = [];
    let totalSuccessful = 0;
    let totalFailed = 0;

    for (let i = 0; i < multiSupplierResponse.groups.length; i++) {
      const group = multiSupplierResponse.groups[i];

      if (onProgress) {
        onProgress(i + 1, multiSupplierResponse.groups.length, group.supplier_name);
      }

      try {
        const blob = await exportMultipleOrders(group.order_ids, options) as Blob;

        const orderNumbers = group.order_ids.map((_, idx) => `Order${idx + 1}`);
        const filename = generateMultiOrderFilename(group.supplier_name, orderNumbers);
        downloadExcelFile(blob, filename);

        results.push({
          success: true,
          supplierName: group.supplier_name,
          orderCount: group.order_count,
        });

        successfulOrderIds.push(...group.order_ids);
        totalSuccessful += group.order_count;
      } catch (error: any) {
        console.error(`Failed to export for ${group.supplier_name}:`, error);
        results.push({
          success: false,
          supplierName: group.supplier_name,
          orderCount: group.order_count,
          error: error.message || 'Unknown error',
        });
        totalFailed += group.order_count;
      }
    }

    return {
      totalSuccessful,
      totalFailed,
      results,
      successfulOrderIds,
    };
  } catch (err: any) {
    console.error('Multi-supplier export error:', err);
    throw new Error(err.message || 'Failed to process multi-supplier export');
  }
}

export function generateExportFilename(supplierName: string, orderNumber: string): string {
  const date = new Date().toISOString().split('T')[0];
  const sanitizedSupplier = supplierName.replace(/[^a-zA-Z0-9]/g, '_');
  return `PO_Request_${sanitizedSupplier}_${orderNumber}_${date}.xlsx`;
}

export function generateMultiOrderFilename(supplierName: string, orderNumbers: string[]): string {
  const date = new Date().toISOString().split('T')[0];
  const sanitizedSupplier = supplierName.replace(/[^a-zA-Z0-9]/g, '_');

  if (orderNumbers.length <= 3) {
    const orderNumbersStr = orderNumbers.join('_');
    return `PO_Request_${sanitizedSupplier}_${orderNumbersStr}_${date}.xlsx`;
  } else {
    return `PO_Request_${sanitizedSupplier}_Combined_${orderNumbers.length}_Orders_${date}.xlsx`;
  }
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
  const { data, error } = await supabase
    .rpc('update_order_status_rpc', {
      p_order_id: orderId,
      p_new_status: newStatus
    });

  if (error) {
    console.error('Failed to update order status:', error);
    throw new Error('Failed to update order status');
  }

  if (!data) {
    throw new Error('Order not found or update failed');
  }
}
