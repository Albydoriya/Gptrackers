import type ExcelJS from "npm:exceljs@4.4.0";
import type { MultiOrderExportData } from "./types.ts";
import type { LogoData } from "./logoLoader.ts";
import { formatDateForExcel, formatSpecifications, getQuoteDeadline } from "./utils.ts";

export const GENERIC_MULTI_COLORS = {
  headerBg: 'E8F4F8',
  altRowBg: 'F9F9F9',
  borderColor: 'D0D0D0',
  totalBg: 'FFF9E6',
};

export const GENERIC_MULTI_COLUMN_WIDTHS = {
  orderNumber: 12,
  itemNo: 8,
  partNumber: 18,
  description: 40,
  specifications: 28,
  quantity: 8,
  unitPrice: 15,
  total: 15,
  leadTime: 18,
  notes: 20,
};

export function applyGenericTemplateMulti(
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData,
  config?: any,
  workbook?: ExcelJS.Workbook,
  logoData?: LogoData | null
): void {
  const colors = config?.colors || GENERIC_MULTI_COLORS;
  const columnWidths = config?.columnWidths || GENERIC_MULTI_COLUMN_WIDTHS;

  worksheet.columns = [
    { width: columnWidths.orderNumber },
    { width: columnWidths.itemNo },
    { width: columnWidths.partNumber },
    { width: columnWidths.description },
    { width: columnWidths.specifications },
    { width: columnWidths.quantity },
    { width: columnWidths.unitPrice },
    { width: columnWidths.total },
    { width: columnWidths.leadTime },
    { width: columnWidths.notes },
  ];

  addHeaderSection(worksheet, data, colors);
  const lastPartRow = addPartsTable(worksheet, data, colors);
  addFooterSection(worksheet, data, lastPartRow, colors);
  configurePageSetup(worksheet, lastPartRow);
}

function addHeaderSection(
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData,
  colors: any
): void {
  worksheet.mergeCells('A1:B2');
  worksheet.getCell('A1').value = 'LOGO';
  worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A1').font = { size: 9, color: { argb: '999999' } };
  worksheet.getCell('A1').border = {
    top: { style: 'thin', color: { argb: colors.borderColor } },
    left: { style: 'thin', color: { argb: colors.borderColor } },
    bottom: { style: 'thin', color: { argb: colors.borderColor } },
    right: { style: 'thin', color: { argb: colors.borderColor } },
  };

  worksheet.mergeCells('C1:G2');
  worksheet.getCell('C1').value = 'Your Company Name\nAddress Line 1\nPhone | Email';
  worksheet.getCell('C1').alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
  worksheet.getCell('C1').font = { size: 11 };

  worksheet.getRow(3).height = 5;

  worksheet.mergeCells('A4:J4');
  worksheet.getCell('A4').value = 'PURCHASE ORDER REQUESTS - COMBINED QUOTE';
  worksheet.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A4').font = { size: 18, bold: true };

  worksheet.getRow(5).height = 5;

  const orderNumbers = data.orders.map(o => o.order.order_number).join(', ');
  worksheet.mergeCells('A6:J6');
  worksheet.getCell('A6').value = `Orders: ${orderNumbers}`;
  worksheet.getCell('A6').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A6').font = { size: 11, bold: true };

  const orderDates = data.orders.map(o => new Date(o.order.order_date));
  const minDate = new Date(Math.min(...orderDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...orderDates.map(d => d.getTime())));
  const dateRange = minDate.getTime() === maxDate.getTime()
    ? formatDateForExcel(minDate)
    : `${formatDateForExcel(minDate)} - ${formatDateForExcel(maxDate)}`;

  worksheet.mergeCells('A7:J7');
  worksheet.getCell('A7').value = `Order Dates: ${dateRange}`;
  worksheet.getCell('A7').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A7').font = { size: 10 };

  worksheet.getRow(8).height = 5;

  worksheet.getCell('A9').value = 'Supplier:';
  worksheet.getCell('A9').font = { bold: true };
  worksheet.getCell('B9').value = data.supplier.name;

  worksheet.getCell('E9').value = 'Contact:';
  worksheet.getCell('E9').font = { bold: true };
  worksheet.getCell('F9').value = data.supplier.contact_person;

  worksheet.getCell('A10').value = 'Email:';
  worksheet.getCell('B10').value = data.supplier.email;

  worksheet.getCell('E10').value = 'Phone:';
  worksheet.getCell('F10').value = data.supplier.phone;

  worksheet.getCell('A11').value = 'Payment Terms:';
  worksheet.getCell('B11').value = data.supplier.payment_terms;

  worksheet.getRow(12).height = 10;
}

function addPartsTable(
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData,
  colors: any
): number {
  let currentRow = 13;

  const headers = [
    'Order #',
    'Item #',
    'Part Number',
    'Description',
    'Specifications',
    'Qty',
    'Unit Price (JPY)',
    'Total (JPY)',
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
      fgColor: { argb: colors.headerBg },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: colors.borderColor } },
      left: { style: 'thin', color: { argb: colors.borderColor } },
      bottom: { style: 'thin', color: { argb: colors.borderColor } },
      right: { style: 'thin', color: { argb: colors.borderColor } },
    };
  });

  worksheet.getRow(currentRow).height = 30;
  currentRow++;

  let itemNumber = 1;

  data.orders.forEach((orderData) => {
    orderData.parts.forEach((part, partIndex) => {
      const row = worksheet.getRow(currentRow);
      const isAltRow = itemNumber % 2 === 0;

      row.getCell(1).value = orderData.order.order_number;
      row.getCell(1).alignment = { horizontal: 'center' };

      row.getCell(2).value = itemNumber;
      row.getCell(2).alignment = { horizontal: 'center' };

      row.getCell(3).value = part.part_number;

      row.getCell(4).value = part.name;
      row.getCell(4).alignment = { wrapText: true };

      const specs = formatSpecifications(part.specifications);
      row.getCell(5).value = specs;
      row.getCell(5).alignment = { wrapText: true };

      row.getCell(6).value = part.quantity;
      row.getCell(6).alignment = { horizontal: 'center' };

      row.getCell(7).value = '';
      row.getCell(7).numFmt = '¥#,##0';

      row.getCell(8).value = { formula: `F${currentRow}*G${currentRow}` };
      row.getCell(8).numFmt = '¥#,##0';

      row.getCell(9).value = '';
      row.getCell(9).alignment = { horizontal: 'center' };

      row.getCell(10).value = '';

      if (isAltRow) {
        for (let col = 1; col <= 10; col++) {
          row.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: colors.altRowBg },
          };
        }
      }

      for (let col = 1; col <= 10; col++) {
        row.getCell(col).border = {
          top: { style: 'thin', color: { argb: colors.borderColor } },
          left: { style: 'thin', color: { argb: colors.borderColor } },
          bottom: { style: 'thin', color: { argb: colors.borderColor } },
          right: { style: 'thin', color: { argb: colors.borderColor } },
        };
      }

      if (specs.length > 50) {
        row.height = 40;
      } else {
        row.height = 25;
      }

      currentRow++;
      itemNumber++;
    });
  });

  return currentRow - 1;
}

function addFooterSection(
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData,
  lastPartRow: number,
  colors: any
): void {
  let currentRow = lastPartRow + 2;
  const firstPartRow = 14;

  worksheet.getCell(currentRow, 7).value = 'Subtotal:';
  worksheet.getCell(currentRow, 7).font = { bold: true };
  worksheet.getCell(currentRow, 7).alignment = { horizontal: 'right' };
  worksheet.getCell(currentRow, 8).value = { formula: `SUM(H${firstPartRow}:H${lastPartRow})` };
  worksheet.getCell(currentRow, 8).numFmt = '¥#,##0';
  worksheet.getCell(currentRow, 8).font = { bold: true };
  const subtotalRow = currentRow;
  currentRow++;

  worksheet.getCell(currentRow, 7).value = 'Shipping (Est):';
  worksheet.getCell(currentRow, 7).font = { bold: true };
  worksheet.getCell(currentRow, 7).alignment = { horizontal: 'right' };
  worksheet.getCell(currentRow, 8).value = '';
  worksheet.getCell(currentRow, 8).numFmt = '¥#,##0';
  const shippingCell = `H${currentRow}`;
  currentRow++;

  worksheet.getCell(currentRow, 7).value = 'GRAND TOTAL:';
  worksheet.getCell(currentRow, 7).font = { bold: true, size: 12 };
  worksheet.getCell(currentRow, 7).alignment = { horizontal: 'right' };
  worksheet.getCell(currentRow, 8).value = {
    formula: `H${subtotalRow}+${shippingCell}`
  };
  worksheet.getCell(currentRow, 8).numFmt = '¥#,##0';
  worksheet.getCell(currentRow, 8).font = { bold: true, size: 12 };
  worksheet.getCell(currentRow, 8).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.totalBg },
  };
  worksheet.getCell(currentRow, 8).border = {
    top: { style: 'double' },
    bottom: { style: 'double' },
  };

  currentRow += 2;

  const earliestOrderDate = data.orders
    .map(o => o.order.order_date)
    .sort()[0];
  const quoteDeadline = getQuoteDeadline(earliestOrderDate);

  worksheet.mergeCells(currentRow, 1, currentRow, 10);
  worksheet.getCell(currentRow, 1).value = 'TERMS AND CONDITIONS:';
  worksheet.getCell(currentRow, 1).font = { bold: true, size: 11 };
  currentRow++;

  const terms = [
    `- Please provide complete quote by: ${quoteDeadline}`,
    '- Include lead times for all items',
    '- Prices should be in JPY',
    `- Payment terms: ${data.supplier.payment_terms}`,
    '- Please indicate any minimum order quantities',
  ];

  terms.forEach(term => {
    worksheet.mergeCells(currentRow, 1, currentRow, 10);
    worksheet.getCell(currentRow, 1).value = term;
    worksheet.getCell(currentRow, 1).font = { size: 10 };
    currentRow++;
  });

  currentRow += 2;

  worksheet.mergeCells(currentRow, 1, currentRow, 10);
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
    printTitlesRow: '1:13',
  };

  worksheet.pageSetup.printArea = `A1:J${lastPartRow + 20}`;
}
