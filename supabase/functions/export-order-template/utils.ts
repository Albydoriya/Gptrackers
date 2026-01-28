export function formatDateForExcel(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function getQuoteDeadline(orderDate: string, days: number = 7): string {
  const date = new Date(orderDate);
  date.setDate(date.getDate() + days);
  return formatDateForExcel(date);
}

export function formatSpecifications(specs: Record<string, any>): string {
  if (!specs || Object.keys(specs).length === 0) {
    return '';
  }

  return Object.entries(specs)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text.trim();
}

export function generateFileName(supplierName: string, orderNumber: string): string {
  const date = new Date().toISOString().split('T')[0];
  const sanitizedSupplier = supplierName.replace(/[^a-zA-Z0-9]/g, '_');
  return `PO_Request_${sanitizedSupplier}_${orderNumber}_${date}.xlsx`;
}

export function generateMultiOrderFileName(
  supplierName: string,
  orderNumbers: string[],
  orderDates: string[]
): string {
  const sanitizedSupplier = supplierName.replace(/[^a-zA-Z0-9]/g, '_');
  const earliestDate = orderDates
    .map(d => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const dateStr = earliestDate.toISOString().split('T')[0];

  if (orderNumbers.length <= 3) {
    const orderNumbersStr = orderNumbers.join('_');
    return `PO_Request_${sanitizedSupplier}_${orderNumbersStr}_${dateStr}.xlsx`;
  } else {
    return `PO_Request_${sanitizedSupplier}_Combined_${orderNumbers.length}_Orders_${dateStr}.xlsx`;
  }
}