import type ExcelJS from "npm:exceljs@4.4.0";
import type { MultiOrderExportData } from "./types.ts";
import type { LogoData } from "./logoLoader.ts";
import { formatDateForExcel, formatSpecifications, getQuoteDeadline } from "./utils.ts";

export const GENERIC_MULTI_COLORS = {
  headerBg: 'F8F9FA',
  altRowBg: 'FAFBFC',
  borderColor: 'BDBDBD',
  totalBg: 'FFF9E6',
  accentColor: 'FFD54F',
  sectionBg: 'F5F5F5',
  titleBg: 'E0E0E0',
  supplierBoxBg: 'FAFAFA',
  supplierBoxBorder: '9E9E9E',
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

  addHeaderSection(worksheet, data, colors, workbook, logoData);
  const lastPartRow = addPartsTable(worksheet, data, colors);
  addFooterSection(worksheet, data, lastPartRow, colors);
  configurePageSetup(worksheet, lastPartRow);
}

function addHeaderSection(
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData,
  colors: any,
  workbook?: ExcelJS.Workbook,
  logoData?: LogoData | null
): void {
  worksheet.mergeCells('A1:C4');
  worksheet.getRow(1).height = 20;
  worksheet.getRow(2).height = 20;
  worksheet.getRow(3).height = 20;
  worksheet.getRow(4).height = 20;

  if (logoData && workbook) {
    const imageId = workbook.addImage({
      buffer: logoData.buffer,
      extension: logoData.extension,
    });

    worksheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      br: { col: 3, row: 4 },
    });
  } else {
    worksheet.getCell('A1').value = 'LOGO';
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('A1').font = { size: 11, color: { argb: '757575' } };
  }

  for (let col = 1; col <= 3; col++) {
    for (let row = 1; row <= 4; row++) {
      const cell = worksheet.getCell(row, col);
      cell.border = {
        top: { style: 'thin', color: { argb: colors.borderColor } },
        left: { style: 'thin', color: { argb: colors.borderColor } },
        bottom: { style: 'thin', color: { argb: colors.borderColor } },
        right: { style: 'thin', color: { argb: colors.borderColor } },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF' },
      };
    }
  }

  worksheet.mergeCells('D1:J1');
  const companyNameCell = worksheet.getCell('D1');
  companyNameCell.value = data.company.name || 'Your Company Name';
  companyNameCell.alignment = { vertical: 'middle', horizontal: 'right' };
  companyNameCell.font = { size: 14, bold: true };

  worksheet.mergeCells('D2:J2');
  const addressCell = worksheet.getCell('D2');
  addressCell.value = data.company.address || 'Company Address';
  addressCell.alignment = { vertical: 'middle', horizontal: 'right' };
  addressCell.font = { size: 10 };

  worksheet.mergeCells('D3:J3');
  const phoneCell = worksheet.getCell('D3');
  phoneCell.value = data.company.phone ? `Phone: ${data.company.phone}` : 'Phone: ___________';
  phoneCell.alignment = { vertical: 'middle', horizontal: 'right' };
  phoneCell.font = { size: 10 };

  worksheet.mergeCells('D4:J4');
  const emailCell = worksheet.getCell('D4');
  emailCell.value = data.company.email ? `Email: ${data.company.email}` : 'Email: ___________';
  emailCell.alignment = { vertical: 'middle', horizontal: 'right' };
  emailCell.font = { size: 10 };

  worksheet.getRow(5).height = 8;

  worksheet.mergeCells('A6:J6');
  const titleCell = worksheet.getCell('A6');
  titleCell.value = 'PURCHASE ORDER REQUESTS - COMBINED QUOTE';
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.font = { size: 16, bold: true };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.titleBg },
  };
  worksheet.getRow(6).height = 25;

  worksheet.getRow(7).height = 8;

  const orderNumbers = data.orders.map(o => o.order.order_number).join(', ');
  worksheet.mergeCells('A8:J8');
  const orderNumCell = worksheet.getCell('A8');
  orderNumCell.value = `Orders: ${orderNumbers}`;
  orderNumCell.alignment = { vertical: 'middle', horizontal: 'center' };
  orderNumCell.font = { size: 11, bold: true };
  worksheet.getRow(8).height = 18;

  const orderDates = data.orders.map(o => new Date(o.order.order_date));
  const minDate = new Date(Math.min(...orderDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...orderDates.map(d => d.getTime())));
  const dateRange = minDate.getTime() === maxDate.getTime()
    ? formatDateForExcel(minDate)
    : `${formatDateForExcel(minDate)} - ${formatDateForExcel(maxDate)}`;

  worksheet.mergeCells('A9:J9');
  const dateCell = worksheet.getCell('A9');
  dateCell.value = `Order Dates: ${dateRange}`;
  dateCell.alignment = { vertical: 'middle', horizontal: 'center' };
  dateCell.font = { size: 10 };
  worksheet.getRow(9).height = 18;

  worksheet.getRow(10).height = 10;

  worksheet.mergeCells('A11:J11');
  const supplierHeaderCell = worksheet.getCell('A11');
  supplierHeaderCell.value = 'SUPPLIER INFORMATION';
  supplierHeaderCell.alignment = { vertical: 'middle', horizontal: 'left' };
  supplierHeaderCell.font = { size: 11, bold: true };
  supplierHeaderCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.sectionBg },
  };
  worksheet.getRow(11).height = 20;

  for (let row = 12; row <= 14; row++) {
    for (let col = 1; col <= 10; col++) {
      const cell = worksheet.getCell(row, col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors.supplierBoxBg },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: colors.supplierBoxBorder } },
        left: { style: 'thin', color: { argb: colors.supplierBoxBorder } },
        bottom: { style: 'thin', color: { argb: colors.supplierBoxBorder } },
        right: { style: 'thin', color: { argb: colors.supplierBoxBorder } },
      };
    }
    worksheet.getRow(row).height = 20;
  }

  worksheet.getCell('A12').value = 'Supplier:';
  worksheet.getCell('A12').font = { bold: true, size: 10 };
  worksheet.mergeCells('B12:D12');
  worksheet.getCell('B12').value = data.supplier.name;
  worksheet.getCell('B12').font = { size: 10 };

  worksheet.getCell('F12').value = 'Contact Person:';
  worksheet.getCell('F12').font = { bold: true, size: 10 };
  worksheet.mergeCells('G12:J12');
  worksheet.getCell('G12').value = data.supplier.contact_person;
  worksheet.getCell('G12').font = { size: 10 };

  worksheet.getCell('A13').value = 'Email:';
  worksheet.getCell('A13').font = { bold: true, size: 10 };
  worksheet.mergeCells('B13:D13');
  worksheet.getCell('B13').value = data.supplier.email;
  worksheet.getCell('B13').font = { size: 10 };

  worksheet.getCell('F13').value = 'Phone:';
  worksheet.getCell('F13').font = { bold: true, size: 10 };
  worksheet.mergeCells('G13:J13');
  worksheet.getCell('G13').value = data.supplier.phone;
  worksheet.getCell('G13').font = { size: 10 };

  worksheet.getCell('A14').value = 'Payment Terms:';
  worksheet.getCell('A14').font = { bold: true, size: 10 };
  worksheet.mergeCells('B14:D14');
  worksheet.getCell('B14').value = data.supplier.payment_terms;
  worksheet.getCell('B14').font = { size: 10 };

  worksheet.getRow(15).height = 12;
}

function addPartsTable(
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData,
  colors: any
): number {
  let currentRow = 16;

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
    cell.font = { bold: true, size: 10, color: { argb: '000000' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.headerBg },
    };
    cell.border = {
      top: { style: 'medium', color: { argb: colors.borderColor } },
      left: { style: 'thin', color: { argb: colors.borderColor } },
      bottom: { style: 'medium', color: { argb: colors.borderColor } },
      right: { style: 'thin', color: { argb: colors.borderColor } },
    };
  });

  worksheet.getRow(currentRow).height = 35;
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
        row.height = 45;
      } else {
        row.height = 30;
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
  const firstPartRow = 17;

  for (let row = currentRow; row <= currentRow + 2; row++) {
    for (let col = 6; col <= 10; col++) {
      const cell = worksheet.getCell(row, col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors.sectionBg },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: colors.borderColor } },
        left: { style: 'thin', color: { argb: colors.borderColor } },
        bottom: { style: 'thin', color: { argb: colors.borderColor } },
        right: { style: 'thin', color: { argb: colors.borderColor } },
      };
    }
  }

  worksheet.mergeCells(currentRow, 6, currentRow, 7);
  worksheet.getCell(currentRow, 6).value = 'Subtotal:';
  worksheet.getCell(currentRow, 6).font = { bold: true, size: 11 };
  worksheet.getCell(currentRow, 6).alignment = { horizontal: 'right', vertical: 'middle' };

  worksheet.mergeCells(currentRow, 8, currentRow, 10);
  worksheet.getCell(currentRow, 8).value = { formula: `SUM(H${firstPartRow}:H${lastPartRow})` };
  worksheet.getCell(currentRow, 8).numFmt = '¥#,##0';
  worksheet.getCell(currentRow, 8).font = { bold: true, size: 11 };
  worksheet.getCell(currentRow, 8).alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 25;
  const subtotalRow = currentRow;
  currentRow++;

  worksheet.mergeCells(currentRow, 6, currentRow, 7);
  worksheet.getCell(currentRow, 6).value = 'Shipping (Est):';
  worksheet.getCell(currentRow, 6).font = { bold: true, size: 11 };
  worksheet.getCell(currentRow, 6).alignment = { horizontal: 'right', vertical: 'middle' };

  worksheet.mergeCells(currentRow, 8, currentRow, 10);
  worksheet.getCell(currentRow, 8).value = '';
  worksheet.getCell(currentRow, 8).numFmt = '¥#,##0';
  worksheet.getCell(currentRow, 8).alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 25;
  const shippingCell = `H${currentRow}`;
  currentRow++;

  worksheet.mergeCells(currentRow, 6, currentRow, 7);
  worksheet.getCell(currentRow, 6).value = 'GRAND TOTAL:';
  worksheet.getCell(currentRow, 6).font = { bold: true, size: 13 };
  worksheet.getCell(currentRow, 6).alignment = { horizontal: 'right', vertical: 'middle' };

  worksheet.mergeCells(currentRow, 8, currentRow, 10);
  worksheet.getCell(currentRow, 8).value = {
    formula: `H${subtotalRow}+${shippingCell}`
  };
  worksheet.getCell(currentRow, 8).numFmt = '¥#,##0';
  worksheet.getCell(currentRow, 8).font = { bold: true, size: 13 };
  worksheet.getCell(currentRow, 8).alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getCell(currentRow, 8).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.totalBg },
  };
  worksheet.getCell(currentRow, 8).border = {
    top: { style: 'double', color: { argb: colors.borderColor } },
    left: { style: 'thin', color: { argb: colors.borderColor } },
    bottom: { style: 'double', color: { argb: colors.borderColor } },
    right: { style: 'thin', color: { argb: colors.borderColor } },
  };
  worksheet.getRow(currentRow).height = 28;

  currentRow += 2;

  const earliestOrderDate = data.orders
    .map(o => o.order.order_date)
    .sort()[0];
  const quoteDeadline = getQuoteDeadline(earliestOrderDate);

  worksheet.mergeCells(currentRow, 1, currentRow, 10);
  const termsHeaderCell = worksheet.getCell(currentRow, 1);
  termsHeaderCell.value = 'TERMS AND CONDITIONS';
  termsHeaderCell.font = { bold: true, size: 12 };
  termsHeaderCell.alignment = { vertical: 'middle', horizontal: 'left' };
  termsHeaderCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.sectionBg },
  };
  worksheet.getRow(currentRow).height = 22;
  currentRow++;

  const terms = [
    `Please provide complete quote by: ${quoteDeadline}`,
    'Include lead times for all items',
    'Prices should be in JPY',
    `Payment terms: ${data.supplier.payment_terms}`,
    'Please indicate any minimum order quantities',
  ];

  terms.forEach((term, index) => {
    worksheet.mergeCells(currentRow, 1, currentRow, 10);
    const termCell = worksheet.getCell(currentRow, 1);
    termCell.value = `  ${index + 1}. ${term}`;
    termCell.font = { size: 10 };
    termCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    termCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FAFAFA' },
    };
    termCell.border = {
      top: { style: 'thin', color: { argb: colors.borderColor } },
      left: { style: 'thin', color: { argb: colors.borderColor } },
      bottom: { style: 'thin', color: { argb: colors.borderColor } },
      right: { style: 'thin', color: { argb: colors.borderColor } },
    };
    worksheet.getRow(currentRow).height = 20;
    currentRow++;
  });

  currentRow += 2;

  worksheet.mergeCells(currentRow, 1, currentRow, 10);
  const supplierResponseHeader = worksheet.getCell(currentRow, 1);
  supplierResponseHeader.value = 'SUPPLIER TO COMPLETE AND RETURN';
  supplierResponseHeader.font = { bold: true, size: 12 };
  supplierResponseHeader.alignment = { vertical: 'middle', horizontal: 'left' };
  supplierResponseHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.sectionBg },
  };
  worksheet.getRow(currentRow).height = 22;
  currentRow++;

  for (let row = currentRow; row <= currentRow + 2; row++) {
    for (let col = 1; col <= 10; col++) {
      const cell = worksheet.getCell(row, col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FAFAFA' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: colors.borderColor } },
        left: { style: 'thin', color: { argb: colors.borderColor } },
        bottom: { style: 'thin', color: { argb: colors.borderColor } },
        right: { style: 'thin', color: { argb: colors.borderColor } },
      };
    }
    worksheet.getRow(row).height = 25;
  }

  worksheet.getCell(currentRow, 1).value = 'Quoted By:';
  worksheet.getCell(currentRow, 1).font = { bold: true, size: 10 };
  worksheet.getCell(currentRow, 1).alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.mergeCells(currentRow, 2, currentRow, 4);
  worksheet.getCell(currentRow, 2).value = '________________________________';
  worksheet.getCell(currentRow, 2).alignment = { vertical: 'middle', horizontal: 'left' };

  worksheet.getCell(currentRow, 6).value = 'Date:';
  worksheet.getCell(currentRow, 6).font = { bold: true, size: 10 };
  worksheet.getCell(currentRow, 6).alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.mergeCells(currentRow, 7, currentRow, 10);
  worksheet.getCell(currentRow, 7).value = '________________________________';
  worksheet.getCell(currentRow, 7).alignment = { vertical: 'middle', horizontal: 'left' };
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Company:';
  worksheet.getCell(currentRow, 1).font = { bold: true, size: 10 };
  worksheet.getCell(currentRow, 1).alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.mergeCells(currentRow, 2, currentRow, 4);
  worksheet.getCell(currentRow, 2).value = '________________________________';
  worksheet.getCell(currentRow, 2).alignment = { vertical: 'middle', horizontal: 'left' };

  worksheet.getCell(currentRow, 6).value = 'Valid Until:';
  worksheet.getCell(currentRow, 6).font = { bold: true, size: 10 };
  worksheet.getCell(currentRow, 6).alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.mergeCells(currentRow, 7, currentRow, 10);
  worksheet.getCell(currentRow, 7).value = '________________________________';
  worksheet.getCell(currentRow, 7).alignment = { vertical: 'middle', horizontal: 'left' };
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Signature:';
  worksheet.getCell(currentRow, 1).font = { bold: true, size: 10 };
  worksheet.getCell(currentRow, 1).alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.mergeCells(currentRow, 2, currentRow, 4);
  worksheet.getCell(currentRow, 2).value = '________________________________';
  worksheet.getCell(currentRow, 2).alignment = { vertical: 'middle', horizontal: 'left' };
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
    printTitlesRow: '1:16',
  };

  worksheet.pageSetup.printArea = `A1:J${lastPartRow + 25}`;
}
