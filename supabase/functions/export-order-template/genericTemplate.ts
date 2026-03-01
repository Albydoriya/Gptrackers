import type ExcelJS from "npm:exceljs@4.4.0";
import type { OrderExportData } from "./types.ts";
import type { LogoData } from "./logoLoader.ts";
import { formatDateForExcel, formatSpecifications, getQuoteDeadline } from "./utils.ts";

export const GENERIC_COLORS = {
  primary: '0F766E',
  primaryLight: 'CCFBF1',
  primaryDark: '134E4A',
  accent: '0891B2',
  accentLight: 'CFFAFE',
  success: '059669',
  successLight: 'D1FAE5',
  neutral: 'F9FAFB',
  neutralDark: '374151',
  border: 'E5E7EB',
  text: '1F2937',
  textLight: '6B7280',
  headerBg: 'F3F4F6',
  cardBg: 'FFFFFF',
};

export const GENERIC_COLUMN_WIDTHS = {
  itemNo: 6,
  partNumber: 16,
  description: 35,
  specifications: 28,
  quantity: 8,
  unitPrice: 14,
  total: 14,
  leadTime: 16,
  notes: 22,
};

export function applyGenericTemplate(
  worksheet: ExcelJS.Worksheet,
  data: OrderExportData,
  config?: any,
  workbook?: ExcelJS.Workbook,
  logoData?: LogoData | null
): void {
  const colors = config?.colors || GENERIC_COLORS;
  const columnWidths = config?.columnWidths || GENERIC_COLUMN_WIDTHS;

  worksheet.columns = [
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
  data: OrderExportData,
  colors: any,
  workbook?: ExcelJS.Workbook,
  logoData?: LogoData | null
): void {
  worksheet.mergeCells('A1:I1');
  const headerRow = worksheet.getRow(1);
  headerRow.height = 8;
  headerRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.headerBg },
  };

  worksheet.mergeCells('A2:C3');
  if (logoData && workbook) {
    const imageId = workbook.addImage({
      buffer: logoData.buffer,
      extension: logoData.extension,
    });
    worksheet.addImage(imageId, {
      tl: { col: 0, row: 1 },
      br: { col: 3, row: 3 },
    });
  } else {
    const logoCell = worksheet.getCell('A2');
    logoCell.value = data.company.name || 'Company Logo';
    logoCell.alignment = { vertical: 'middle', horizontal: 'left' };
    logoCell.font = { size: 16, bold: true, color: { argb: colors.primary } };
  }

  worksheet.mergeCells('G2:I3');
  const companyInfo = [];
  if (data.company.name) companyInfo.push(data.company.name);
  if (data.company.address) companyInfo.push(data.company.address);

  const contactParts = [];
  if (data.company.phone) contactParts.push(`📞 ${data.company.phone}`);
  if (data.company.email) contactParts.push(`📧 ${data.company.email}`);
  if (contactParts.length > 0) companyInfo.push(contactParts.join('\n'));

  const companyCell = worksheet.getCell('G2');
  companyCell.value = companyInfo.join('\n');
  companyCell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
  companyCell.font = { size: 9, color: { argb: colors.textLight } };

  worksheet.getRow(2).height = 22;
  worksheet.getRow(3).height = 22;

  worksheet.mergeCells('A4:I4');
  worksheet.getRow(4).height = 5;

  worksheet.mergeCells('A5:I5');
  const titleCell = worksheet.getCell('A5');
  titleCell.value = 'Purchase Order Quote Request';
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.font = { size: 20, bold: true, color: { argb: colors.text } };
  worksheet.getRow(5).height = 32;

  worksheet.mergeCells('A6:I6');
  const orderInfoCell = worksheet.getCell('A6');
  orderInfoCell.value = `Order: ${data.order.order_number}  •  Date: ${formatDateForExcel(data.order.order_date)}`;
  orderInfoCell.alignment = { vertical: 'middle', horizontal: 'left' };
  orderInfoCell.font = { size: 10, color: { argb: colors.textLight } };
  worksheet.getRow(6).height = 18;

  worksheet.mergeCells('A7:I7');
  worksheet.getRow(7).height = 12;

  worksheet.mergeCells('A8:I8');
  const supplierHeaderCell = worksheet.getCell('A8');
  supplierHeaderCell.value = 'Supplier Information';
  supplierHeaderCell.alignment = { vertical: 'middle', horizontal: 'left' };
  supplierHeaderCell.font = { size: 12, bold: true, color: { argb: colors.neutralDark } };
  worksheet.getRow(8).height = 24;

  worksheet.mergeCells('A9:I9');
  const supplierCardRow = worksheet.getRow(9);
  supplierCardRow.height = 3;
  for (let col = 1; col <= 9; col++) {
    supplierCardRow.getCell(col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.primaryLight },
    };
  }

  worksheet.mergeCells('A10:D10');
  const supplierNameCell = worksheet.getCell('A10');
  supplierNameCell.value = data.supplier.name;
  supplierNameCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  supplierNameCell.font = { size: 11, bold: true, color: { argb: colors.text } };
  supplierNameCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.neutral },
  };

  worksheet.mergeCells('E10:I10');
  const contactCell = worksheet.getCell('E10');
  contactCell.value = `Contact: ${data.supplier.contact_person || 'N/A'}`;
  contactCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  contactCell.font = { size: 10, color: { argb: colors.text } };
  contactCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.neutral },
  };
  worksheet.getRow(10).height = 22;

  worksheet.mergeCells('A11:D11');
  const emailCell = worksheet.getCell('A11');
  emailCell.value = `📧 ${data.supplier.email || 'N/A'}`;
  emailCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  emailCell.font = { size: 10, color: { argb: colors.text } };
  emailCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.neutral },
  };

  worksheet.mergeCells('E11:I11');
  const phoneCell = worksheet.getCell('E11');
  phoneCell.value = `📞 ${data.supplier.phone || 'N/A'}`;
  phoneCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  phoneCell.font = { size: 10, color: { argb: colors.text } };
  phoneCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.neutral },
  };
  worksheet.getRow(11).height = 22;

  worksheet.mergeCells('A12:D12');
  const paymentCell = worksheet.getCell('A12');
  paymentCell.value = `Payment Terms: ${data.supplier.payment_terms || 'TBD'}`;
  paymentCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  paymentCell.font = { size: 10, bold: true, color: { argb: colors.primary } };
  paymentCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.neutral },
  };

  worksheet.mergeCells('E12:I12');
  const deliveryCell = worksheet.getCell('E12');
  deliveryCell.value = `Expected Delivery: ${data.order.expected_delivery ? formatDateForExcel(data.order.expected_delivery) : 'TBD'}`;
  deliveryCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  deliveryCell.font = { size: 10, color: { argb: colors.text } };
  deliveryCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.neutral },
  };
  worksheet.getRow(12).height = 22;

  worksheet.mergeCells('A13:I13');
  worksheet.getRow(13).height = 16;
}

function addPartsTable(
  worksheet: ExcelJS.Worksheet,
  data: OrderExportData,
  colors: any
): number {
  let currentRow = 14;

  const headers = [
    '#',
    'Part Number',
    'Description',
    'Specifications',
    'Qty',
    'Unit Price (JPY)',
    'Total (JPY)',
    'Lead Time',
    'Notes'
  ];

  headers.forEach((header, index) => {
    const cell = worksheet.getCell(currentRow, index + 1);
    cell.value = header;
    cell.font = { bold: true, size: 10, color: { argb: colors.neutralDark } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.headerBg },
    };
    cell.border = {
      bottom: { style: 'medium', color: { argb: colors.primary } },
    };
  });

  worksheet.getRow(currentRow).height = 28;
  currentRow++;

  data.parts.forEach((part, index) => {
    const row = worksheet.getRow(currentRow);
    const isAltRow = index % 2 === 1;

    row.getCell(1).value = index + 1;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(1).font = { size: 9, bold: true, color: { argb: colors.primary } };

    row.getCell(2).value = part.part_number;
    row.getCell(2).font = { size: 10, bold: true };
    row.getCell(2).alignment = { vertical: 'middle' };

    row.getCell(3).value = part.name;
    row.getCell(3).alignment = { wrapText: true, vertical: 'middle' };
    row.getCell(3).font = { size: 10 };

    const specs = formatSpecifications(part.specifications);
    row.getCell(4).value = specs;
    row.getCell(4).alignment = { wrapText: true, vertical: 'middle' };
    row.getCell(4).font = { size: 9, color: { argb: colors.textLight } };

    row.getCell(5).value = part.quantity;
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).font = { size: 10, bold: true };

    row.getCell(6).value = '';
    row.getCell(6).numFmt = '¥#,##0';
    row.getCell(6).alignment = { vertical: 'middle' };
    row.getCell(6).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.accentLight },
    };

    row.getCell(7).value = { formula: `E${currentRow}*F${currentRow}` };
    row.getCell(7).numFmt = '¥#,##0';
    row.getCell(7).font = { bold: true };
    row.getCell(7).alignment = { vertical: 'middle' };

    row.getCell(8).value = '';
    row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(8).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.accentLight },
    };

    row.getCell(9).value = '';
    row.getCell(9).alignment = { vertical: 'middle' };

    if (isAltRow) {
      for (let col = 1; col <= 9; col++) {
        if (col !== 6 && col !== 8) {
          row.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: colors.neutral },
          };
        }
      }
    }

    for (let col = 1; col <= 9; col++) {
      row.getCell(col).border = {
        bottom: { style: 'thin', color: { argb: colors.border } },
      };
    }

    if (specs.length > 50) {
      row.height = 45;
    } else {
      row.height = 30;
    }

    currentRow++;
  });

  return currentRow - 1;
}

function addFooterSection(
  worksheet: ExcelJS.Worksheet,
  data: OrderExportData,
  lastPartRow: number,
  colors: any
): void {
  let currentRow = lastPartRow + 2;
  const firstPartRow = 15;

  worksheet.mergeCells(currentRow, 6, currentRow, 7);
  const subtotalLabelCell = worksheet.getCell(currentRow, 6);
  subtotalLabelCell.value = 'Subtotal';
  subtotalLabelCell.font = { size: 10, color: { argb: colors.textLight } };
  subtotalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

  worksheet.mergeCells(currentRow, 8, currentRow, 9);
  const subtotalValueCell = worksheet.getCell(currentRow, 8);
  subtotalValueCell.value = { formula: `SUM(G${firstPartRow}:G${lastPartRow})` };
  subtotalValueCell.numFmt = '¥#,##0';
  subtotalValueCell.font = { size: 11, bold: true };
  subtotalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
  const subtotalRow = currentRow;
  worksheet.getRow(currentRow).height = 24;
  currentRow++;

  worksheet.mergeCells(currentRow, 6, currentRow, 7);
  const shippingLabelCell = worksheet.getCell(currentRow, 6);
  shippingLabelCell.value = 'Shipping (Est)';
  shippingLabelCell.font = { size: 10, color: { argb: colors.textLight } };
  shippingLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

  worksheet.mergeCells(currentRow, 8, currentRow, 9);
  const shippingValueCell = worksheet.getCell(currentRow, 8);
  shippingValueCell.value = '';
  shippingValueCell.numFmt = '¥#,##0';
  shippingValueCell.font = { size: 11 };
  shippingValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
  shippingValueCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.accentLight },
  };
  const shippingCell = `H${currentRow}`;
  worksheet.getRow(currentRow).height = 24;
  currentRow++;

  worksheet.mergeCells(currentRow, 6, currentRow, 7);
  const totalLabelCell = worksheet.getCell(currentRow, 6);
  totalLabelCell.value = 'GRAND TOTAL';
  totalLabelCell.font = { size: 13, bold: true, color: { argb: colors.success } };
  totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

  worksheet.mergeCells(currentRow, 8, currentRow, 9);
  const totalValueCell = worksheet.getCell(currentRow, 8);
  totalValueCell.value = { formula: `H${subtotalRow}+${shippingCell}` };
  totalValueCell.numFmt = '¥#,##0';
  totalValueCell.font = { size: 14, bold: true, color: { argb: colors.success } };
  totalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
  totalValueCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.successLight },
  };
  totalValueCell.border = {
    top: { style: 'medium', color: { argb: colors.success } },
    bottom: { style: 'medium', color: { argb: colors.success } },
  };
  worksheet.getRow(currentRow).height = 32;

  currentRow += 3;

  const quoteDeadline = getQuoteDeadline(data.order.order_date);

  worksheet.mergeCells(currentRow, 1, currentRow, 9);
  const termsHeaderCell = worksheet.getCell(currentRow, 1);
  termsHeaderCell.value = 'Quote Requirements';
  termsHeaderCell.font = { bold: true, size: 13, color: { argb: colors.neutralDark } };
  termsHeaderCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(currentRow).height = 28;
  currentRow++;

  worksheet.mergeCells(currentRow, 1, currentRow, 9);
  worksheet.getRow(currentRow).height = 3;
  for (let col = 1; col <= 9; col++) {
    worksheet.getCell(currentRow, col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.primary },
    };
  }
  currentRow++;

  const terms = [
    `⏰ Quote Deadline: ${quoteDeadline}`,
    `✓ Include lead times for all items`,
    `💴 All prices must be in JPY`,
    `💳 Payment Terms: ${data.supplier.payment_terms}`,
    `📦 Please indicate any minimum order quantities`,
  ];

  terms.forEach((term, index) => {
    worksheet.mergeCells(currentRow, 1, currentRow, 9);
    const termCell = worksheet.getCell(currentRow, 1);
    termCell.value = term;
    termCell.font = { size: 10, color: { argb: colors.text } };
    termCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    if (index === 0) {
      termCell.font = { size: 10, bold: true, color: { argb: colors.primary } };
    }

    if (index % 2 === 1) {
      termCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors.neutral },
      };
    }

    worksheet.getRow(currentRow).height = 22;
    currentRow++;
  });

  currentRow += 2;

  worksheet.mergeCells(currentRow, 1, currentRow, 9);
  const responseHeaderCell = worksheet.getCell(currentRow, 1);
  responseHeaderCell.value = 'Complete Your Quote';
  responseHeaderCell.font = { bold: true, size: 13, color: { argb: colors.neutralDark } };
  responseHeaderCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(currentRow).height = 28;
  currentRow++;

  worksheet.mergeCells(currentRow, 1, currentRow, 9);
  worksheet.getRow(currentRow).height = 3;
  for (let col = 1; col <= 9; col++) {
    worksheet.getCell(currentRow, col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.primary },
    };
  }
  currentRow++;

  worksheet.getRow(currentRow).height = 10;
  currentRow++;

  worksheet.mergeCells(currentRow, 1, currentRow, 2);
  const quotedByLabel = worksheet.getCell(currentRow, 1);
  quotedByLabel.value = 'Quoted By:';
  quotedByLabel.font = { size: 10, bold: true, color: { argb: colors.textLight } };
  quotedByLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  quotedByLabel.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.neutral },
  };

  worksheet.mergeCells(currentRow, 3, currentRow, 5);
  const quotedByValue = worksheet.getCell(currentRow, 3);
  quotedByValue.value = '';
  quotedByValue.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.accentLight },
  };
  quotedByValue.border = {
    bottom: { style: 'thin', color: { argb: colors.accent } },
  };

  worksheet.getCell(currentRow, 6).value = 'Date:';
  worksheet.getCell(currentRow, 6).font = { size: 10, bold: true, color: { argb: colors.textLight } };
  worksheet.getCell(currentRow, 6).alignment = { vertical: 'middle', horizontal: 'right' };
  worksheet.getCell(currentRow, 6).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.neutral },
  };

  worksheet.mergeCells(currentRow, 7, currentRow, 9);
  const dateValue = worksheet.getCell(currentRow, 7);
  dateValue.value = '';
  dateValue.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.accentLight },
  };
  dateValue.border = {
    bottom: { style: 'thin', color: { argb: colors.accent } },
  };
  worksheet.getRow(currentRow).height = 26;
  currentRow++;

  worksheet.mergeCells(currentRow, 1, currentRow, 2);
  const companyLabel = worksheet.getCell(currentRow, 1);
  companyLabel.value = 'Company:';
  companyLabel.font = { size: 10, bold: true, color: { argb: colors.textLight } };
  companyLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  companyLabel.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.neutral },
  };

  worksheet.mergeCells(currentRow, 3, currentRow, 5);
  const companyValue = worksheet.getCell(currentRow, 3);
  companyValue.value = '';
  companyValue.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.accentLight },
  };
  companyValue.border = {
    bottom: { style: 'thin', color: { argb: colors.accent } },
  };

  worksheet.getCell(currentRow, 6).value = 'Valid Until:';
  worksheet.getCell(currentRow, 6).font = { size: 10, bold: true, color: { argb: colors.textLight } };
  worksheet.getCell(currentRow, 6).alignment = { vertical: 'middle', horizontal: 'right' };
  worksheet.getCell(currentRow, 6).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.neutral },
  };

  worksheet.mergeCells(currentRow, 7, currentRow, 9);
  const validValue = worksheet.getCell(currentRow, 7);
  validValue.value = '';
  validValue.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.accentLight },
  };
  validValue.border = {
    bottom: { style: 'thin', color: { argb: colors.accent } },
  };
  worksheet.getRow(currentRow).height = 26;
  currentRow++;

  worksheet.mergeCells(currentRow, 1, currentRow, 2);
  const signatureLabel = worksheet.getCell(currentRow, 1);
  signatureLabel.value = 'Signature:';
  signatureLabel.font = { size: 10, bold: true, color: { argb: colors.textLight } };
  signatureLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  signatureLabel.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.neutral },
  };

  worksheet.mergeCells(currentRow, 3, currentRow, 9);
  const signatureValue = worksheet.getCell(currentRow, 3);
  signatureValue.value = '';
  signatureValue.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.accentLight },
  };
  signatureValue.border = {
    bottom: { style: 'thin', color: { argb: colors.accent } },
  };
  worksheet.getRow(currentRow).height = 30;
}

function configurePageSetup(worksheet: ExcelJS.Worksheet, lastPartRow: number): void {
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.5,
      right: 0.5,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3,
    },
    printTitlesRow: '1:14',
  };

  worksheet.pageSetup.printArea = `A1:I${lastPartRow + 25}`;
}
