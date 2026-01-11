import type ExcelJS from "npm:exceljs@4.4.0";
import type { OrderExportData } from "./types.ts";
import { formatDateForExcel, formatSpecifications, getQuoteDeadline } from "./utils.ts";

export const HPI_COLORS = {
  headerBg: 'E8F4F8',
  altRowBg: 'F9F9F9',
  borderColor: 'D0D0D0',
  totalBg: 'FFF9E6',
};

export const COLUMN_WIDTHS = {
  itemNo: 8,
  partNumber: 18,
  description: 45,
  specifications: 30,
  quantity: 8,
  unitPrice: 15,
  total: 15,
  leadTime: 18,
  notes: 20,
};

export function applyHPITemplate(
  worksheet: ExcelJS.Worksheet,
  data: OrderExportData
): void {
  worksheet.columns = [
    { width: COLUMN_WIDTHS.itemNo },
    { width: COLUMN_WIDTHS.partNumber },
    { width: COLUMN_WIDTHS.description },
    { width: COLUMN_WIDTHS.specifications },
    { width: COLUMN_WIDTHS.quantity },
    { width: COLUMN_WIDTHS.unitPrice },
    { width: COLUMN_WIDTHS.total },
    { width: COLUMN_WIDTHS.leadTime },
    { width: COLUMN_WIDTHS.notes },
  ];

  addHeaderSection(worksheet, data);
  const lastPartRow = addPartsTable(worksheet, data);
  addFooterSection(worksheet, data, lastPartRow);
  configurePageSetup(worksheet, lastPartRow);
}

function addHeaderSection(worksheet: ExcelJS.Worksheet, data: OrderExportData): void {
  worksheet.mergeCells('A1:B2');
  worksheet.getCell('A1').value = 'LOGO PLACEHOLDER';
  worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A1').font = { size: 9, color: { argb: '999999' } };
  worksheet.getCell('A1').border = {
    top: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
    left: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
    right: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
  };

  worksheet.mergeCells('C1:F2');
  worksheet.getCell('C1').value = 'Your Company Name\nAddress Line 1\nPhone | Email';
  worksheet.getCell('C1').alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
  worksheet.getCell('C1').font = { size: 11 };

  worksheet.getRow(3).height = 5;

  worksheet.mergeCells('A4:I4');
  worksheet.getCell('A4').value = 'PURCHASE ORDER REQUEST';
  worksheet.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A4').font = { size: 18, bold: true };

  worksheet.getRow(5).height = 5;

  worksheet.getCell('A6').value = 'PO Request Number:';
  worksheet.getCell('A6').font = { bold: true };
  worksheet.getCell('B6').value = data.order.order_number;

  worksheet.getCell('D6').value = 'Date:';
  worksheet.getCell('D6').font = { bold: true };
  worksheet.getCell('E6').value = formatDateForExcel(data.order.order_date);

  worksheet.getCell('A7').value = 'Supplier:';
  worksheet.getCell('A7').font = { bold: true };
  worksheet.getCell('B7').value = data.supplier.name;

  worksheet.getCell('D7').value = 'Expected Delivery:';
  worksheet.getCell('D7').font = { bold: true };
  worksheet.getCell('E7').value = data.order.expected_delivery
    ? formatDateForExcel(data.order.expected_delivery)
    : 'TBD';

  worksheet.getCell('A8').value = 'Contact:';
  worksheet.getCell('A8').font = { bold: true };
  worksheet.getCell('B8').value = data.supplier.contact_person;

  worksheet.getCell('D8').value = 'Priority:';
  worksheet.getCell('D8').font = { bold: true };
  worksheet.getCell('E8').value = data.order.priority.toUpperCase();

  worksheet.getCell('A9').value = 'Email:';
  worksheet.getCell('B9').value = data.supplier.email;

  worksheet.getCell('D9').value = 'Payment Terms:';
  worksheet.getCell('E9').value = data.supplier.payment_terms;

  worksheet.getCell('A10').value = 'Phone:';
  worksheet.getCell('B10').value = data.supplier.phone;

  worksheet.getRow(11).height = 10;
}

function addPartsTable(worksheet: ExcelJS.Worksheet, data: OrderExportData): number {
  let currentRow = 12;

  const headers = [
    'Item #',
    'Part Number',
    'Description',
    'Specifications',
    'Qty',
    'Unit Price (AUD)',
    'Total (AUD)',
    'Supplier Lead Time',
    'Notes'
  ];

  headers.forEach((header, index) => {
    const cell = worksheet.getCell(currentRow, index + 1);
    cell.value = header;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HPI_COLORS.headerBg },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
      left: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
      bottom: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
      right: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
    };
  });

  worksheet.getRow(currentRow).height = 30;
  currentRow++;

  data.parts.forEach((part, index) => {
    const row = worksheet.getRow(currentRow);
    const isAltRow = index % 2 === 1;

    row.getCell(1).value = index + 1;
    row.getCell(1).alignment = { horizontal: 'center' };

    row.getCell(2).value = part.part_number;

    row.getCell(3).value = part.name;
    row.getCell(3).alignment = { wrapText: true };

    const specs = formatSpecifications(part.specifications);
    row.getCell(4).value = specs;
    row.getCell(4).alignment = { wrapText: true };

    row.getCell(5).value = part.quantity;
    row.getCell(5).alignment = { horizontal: 'center' };

    row.getCell(6).value = '';
    row.getCell(6).numFmt = '$#,##0.00';

    row.getCell(7).value = { formula: `E${currentRow}*F${currentRow}` };
    row.getCell(7).numFmt = '$#,##0.00';

    row.getCell(8).value = '';
    row.getCell(8).alignment = { horizontal: 'center' };

    row.getCell(9).value = '';

    if (isAltRow) {
      for (let col = 1; col <= 9; col++) {
        row.getCell(col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: HPI_COLORS.altRowBg },
        };
      }
    }

    for (let col = 1; col <= 9; col++) {
      row.getCell(col).border = {
        top: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
        left: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
        bottom: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
        right: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
      };
    }

    if (specs.length > 50) {
      row.height = 40;
    } else {
      row.height = 25;
    }

    currentRow++;
  });

  return currentRow - 1;
}

function addFooterSection(
  worksheet: ExcelJS.Worksheet,
  data: OrderExportData,
  lastPartRow: number
): void {
  let currentRow = lastPartRow + 2;
  const firstPartRow = 13;

  worksheet.getCell(currentRow, 6).value = 'Subtotal:';
  worksheet.getCell(currentRow, 6).font = { bold: true };
  worksheet.getCell(currentRow, 6).alignment = { horizontal: 'right' };
  worksheet.getCell(currentRow, 7).value = { formula: `SUM(G${firstPartRow}:G${lastPartRow})` };
  worksheet.getCell(currentRow, 7).numFmt = '$#,##0.00';
  worksheet.getCell(currentRow, 7).font = { bold: true };
  currentRow++;

  worksheet.getCell(currentRow, 6).value = 'Shipping (Est):';
  worksheet.getCell(currentRow, 6).font = { bold: true };
  worksheet.getCell(currentRow, 6).alignment = { horizontal: 'right' };
  worksheet.getCell(currentRow, 7).value = '';
  worksheet.getCell(currentRow, 7).numFmt = '$#,##0.00';
  const shippingCell = `G${currentRow}`;
  currentRow++;

  worksheet.getCell(currentRow, 6).value = 'GST (10%):';
  worksheet.getCell(currentRow, 6).font = { bold: true };
  worksheet.getCell(currentRow, 6).alignment = { horizontal: 'right' };
  worksheet.getCell(currentRow, 7).value = {
    formula: `(G${lastPartRow + 2}+${shippingCell})*0.1`
  };
  worksheet.getCell(currentRow, 7).numFmt = '$#,##0.00';
  worksheet.getCell(currentRow, 7).font = { bold: true };
  const gstCell = `G${currentRow}`;
  currentRow++;

  worksheet.getCell(currentRow, 6).value = 'GRAND TOTAL:';
  worksheet.getCell(currentRow, 6).font = { bold: true, size: 12 };
  worksheet.getCell(currentRow, 6).alignment = { horizontal: 'right' };
  worksheet.getCell(currentRow, 7).value = {
    formula: `G${lastPartRow + 2}+${shippingCell}+${gstCell}`
  };
  worksheet.getCell(currentRow, 7).numFmt = '$#,##0.00';
  worksheet.getCell(currentRow, 7).font = { bold: true, size: 12 };
  worksheet.getCell(currentRow, 7).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: HPI_COLORS.totalBg },
  };
  worksheet.getCell(currentRow, 7).border = {
    top: { style: 'double' },
    bottom: { style: 'double' },
  };

  currentRow += 2;

  const quoteDeadline = getQuoteDeadline(data.order.order_date);

  worksheet.mergeCells(currentRow, 1, currentRow, 9);
  worksheet.getCell(currentRow, 1).value = 'TERMS AND CONDITIONS:';
  worksheet.getCell(currentRow, 1).font = { bold: true, size: 11 };
  currentRow++;

  const terms = [
    `- Please provide complete quote by: ${quoteDeadline}`,
    '- Include lead times for all items',
    '- Prices should be in AUD',
    `- Payment terms: ${data.supplier.payment_terms}`,
    '- Please indicate any minimum order quantities',
  ];

  terms.forEach(term => {
    worksheet.mergeCells(currentRow, 1, currentRow, 9);
    worksheet.getCell(currentRow, 1).value = term;
    worksheet.getCell(currentRow, 1).font = { size: 10 };
    currentRow++;
  });

  currentRow += 2;

  worksheet.mergeCells(currentRow, 1, currentRow, 9);
  worksheet.getCell(currentRow, 1).value = 'SUPPLIER TO COMPLETE AND RETURN:';
  worksheet.getCell(currentRow, 1).font = { bold: true, size: 11 };
  currentRow += 2;

  worksheet.getCell(currentRow, 1).value = 'Quoted By:';
  worksheet.getCell(currentRow, 2).value = '____________________';
  worksheet.getCell(currentRow, 5).value = 'Date:';
  worksheet.getCell(currentRow, 6).value = '____________';
  currentRow += 2;

  worksheet.getCell(currentRow, 1).value = 'Company:';
  worksheet.getCell(currentRow, 2).value = '____________________';
  worksheet.getCell(currentRow, 5).value = 'Valid Until:';
  worksheet.getCell(currentRow, 6).value = '____________';
  currentRow += 2;

  worksheet.getCell(currentRow, 1).value = 'Signature:';
  worksheet.getCell(currentRow, 2).value = '____________________';
}

function configurePageSetup(worksheet: ExcelJS.Worksheet, lastPartRow: number): void {
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3,
    },
    printTitlesRow: '1:12',
  };

  worksheet.pageSetup.printArea = `A1:I${lastPartRow + 20}`;
}