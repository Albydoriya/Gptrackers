import type ExcelJS from "npm:exceljs@4.4.0";
import type { OrderExportData } from "./types.ts";
import type { LogoData } from "./logoLoader.ts";
import { formatDateForExcel, formatSpecifications, getQuoteDeadline } from "./utils.ts";

export const GENERIC_COLORS = {
  charcoal: '3A3A3A',
  mediumGray: '6B7280',
  slateBlue: '475569',
  veryLightGray: 'F8F9FA',
  lightGray: 'D1D5DB',
  forestGreen: '047857',
  paleBlue: 'F0F9FF',
  offWhite: 'FAFAF9',
  white: 'FFFFFF',
  border: 'D1D5DB',
  text: '3A3A3A',
  textLight: '6B7280',
  headerBg: 'F8F9FA',
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
  const letterheadTopRow = worksheet.getRow(1);
  letterheadTopRow.height = 5;
  letterheadTopRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.offWhite },
  };

  worksheet.mergeCells('A2:D4');
  worksheet.getRow(2).height = 20;
  worksheet.getRow(3).height = 20;
  worksheet.getRow(4).height = 5;

  if (logoData && workbook) {
    const imageId = workbook.addImage({
      buffer: logoData.buffer,
      extension: logoData.extension,
    });
    worksheet.addImage(imageId, {
      tl: { col: 0.15, row: 1.15 },
      br: { col: 3.85, row: 3.85 },
    });
  } else {
    const logoCell = worksheet.getCell('A2');
    logoCell.value = data.company.name || 'Company Logo';
    logoCell.alignment = { vertical: 'middle', horizontal: 'left' };
    logoCell.font = { size: 11, bold: true, color: { argb: colors.charcoal } };
  }

  worksheet.mergeCells('G2:I4');
  const companyInfo = [];
  if (data.company.name) companyInfo.push(data.company.name);
  if (data.company.address) companyInfo.push(data.company.address);

  const contactParts = [];
  if (data.company.phone) contactParts.push(`Phone: ${data.company.phone}`);
  if (data.company.email) contactParts.push(`Email: ${data.company.email}`);
  if (contactParts.length > 0) companyInfo.push(contactParts.join('\n'));

  const companyCell = worksheet.getCell('G2');
  companyCell.value = companyInfo.join('\n');
  companyCell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
  companyCell.font = { size: 9, color: { argb: colors.mediumGray } };

  worksheet.mergeCells('A5:I5');
  const letterheadBottomRow = worksheet.getRow(5);
  letterheadBottomRow.height = 3;
  for (let col = 1; col <= 9; col++) {
    letterheadBottomRow.getCell(col).border = {
      bottom: { style: 'thin', color: { argb: colors.lightGray } },
    };
  }

  worksheet.mergeCells('A6:I6');
  worksheet.getRow(6).height = 8;

  worksheet.mergeCells('A7:I7');
  const titleCell = worksheet.getCell('A7');
  titleCell.value = 'Purchase Order Quote Request';
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.font = { size: 18, bold: true, color: { argb: colors.charcoal } };
  worksheet.getRow(7).height = 28;

  worksheet.mergeCells('A8:I8');
  const orderInfoCell = worksheet.getCell('A8');
  orderInfoCell.value = `Order: ${data.order.order_number}  •  Date: ${formatDateForExcel(data.order.order_date)}`;
  orderInfoCell.alignment = { vertical: 'middle', horizontal: 'left' };
  orderInfoCell.font = { size: 9, color: { argb: colors.mediumGray } };
  worksheet.getRow(8).height = 16;

  worksheet.mergeCells('A9:I9');
  worksheet.getRow(9).height = 6;

  worksheet.mergeCells('A10:I10');
  worksheet.getRow(10).height = 6;

  worksheet.mergeCells('A11:I11');
  const supplierHeaderCell = worksheet.getCell('A11');
  supplierHeaderCell.value = 'Supplier Information';
  supplierHeaderCell.alignment = { vertical: 'middle', horizontal: 'left' };
  supplierHeaderCell.font = { size: 12, bold: true, color: { argb: colors.charcoal } };
  supplierHeaderCell.border = {
    bottom: { style: 'thin', color: { argb: colors.lightGray } },
  };
  worksheet.getRow(11).height = 24;

  worksheet.mergeCells('A12:D12');
  const supplierNameCell = worksheet.getCell('A12');
  supplierNameCell.value = data.supplier.name;
  supplierNameCell.alignment = { vertical: 'middle', horizontal: 'left' };
  supplierNameCell.font = { size: 11, bold: true, color: { argb: colors.text } };
  supplierNameCell.border = {
    top: { style: 'thin', color: { argb: colors.lightGray } },
    left: { style: 'thin', color: { argb: colors.lightGray } },
    bottom: { style: 'thin', color: { argb: colors.lightGray } },
    right: { style: 'thin', color: { argb: colors.lightGray } },
  };

  worksheet.mergeCells('E12:I12');
  const contactCell = worksheet.getCell('E12');
  contactCell.value = `Contact: ${data.supplier.contact_person || 'N/A'}`;
  contactCell.alignment = { vertical: 'middle', horizontal: 'left' };
  contactCell.font = { size: 10, color: { argb: colors.text } };
  contactCell.border = {
    top: { style: 'thin', color: { argb: colors.lightGray } },
    left: { style: 'thin', color: { argb: colors.lightGray } },
    bottom: { style: 'thin', color: { argb: colors.lightGray } },
    right: { style: 'thin', color: { argb: colors.lightGray } },
  };
  worksheet.getRow(12).height = 22;

  worksheet.mergeCells('A13:D13');
  const emailCell = worksheet.getCell('A13');
  emailCell.value = `Email: ${data.supplier.email || 'N/A'}`;
  emailCell.alignment = { vertical: 'middle', horizontal: 'left' };
  emailCell.font = { size: 10, color: { argb: colors.text } };
  emailCell.border = {
    top: { style: 'thin', color: { argb: colors.lightGray } },
    left: { style: 'thin', color: { argb: colors.lightGray } },
    bottom: { style: 'thin', color: { argb: colors.lightGray } },
    right: { style: 'thin', color: { argb: colors.lightGray } },
  };

  worksheet.mergeCells('E13:I13');
  const phoneCell = worksheet.getCell('E13');
  phoneCell.value = `Phone: ${data.supplier.phone || 'N/A'}`;
  phoneCell.alignment = { vertical: 'middle', horizontal: 'left' };
  phoneCell.font = { size: 10, color: { argb: colors.text } };
  phoneCell.border = {
    top: { style: 'thin', color: { argb: colors.lightGray } },
    left: { style: 'thin', color: { argb: colors.lightGray } },
    bottom: { style: 'thin', color: { argb: colors.lightGray } },
    right: { style: 'thin', color: { argb: colors.lightGray } },
  };
  worksheet.getRow(13).height = 22;

  worksheet.mergeCells('A14:D14');
  const paymentCell = worksheet.getCell('A14');
  paymentCell.value = `Payment Terms: ${data.supplier.payment_terms || 'TBD'}`;
  paymentCell.alignment = { vertical: 'middle', horizontal: 'left' };
  paymentCell.font = { size: 10, bold: true, color: { argb: colors.slateBlue } };
  paymentCell.border = {
    top: { style: 'thin', color: { argb: colors.lightGray } },
    left: { style: 'thin', color: { argb: colors.lightGray } },
    bottom: { style: 'thin', color: { argb: colors.lightGray } },
    right: { style: 'thin', color: { argb: colors.lightGray } },
  };

  worksheet.mergeCells('E14:I14');
  const totalOrdersCell = worksheet.getCell('E14');
  totalOrdersCell.value = `Total Orders: 1`;
  totalOrdersCell.alignment = { vertical: 'middle', horizontal: 'left' };
  totalOrdersCell.font = { size: 10, color: { argb: colors.text } };
  totalOrdersCell.border = {
    top: { style: 'thin', color: { argb: colors.lightGray } },
    left: { style: 'thin', color: { argb: colors.lightGray } },
    bottom: { style: 'thin', color: { argb: colors.lightGray } },
    right: { style: 'thin', color: { argb: colors.lightGray } },
  };
  worksheet.getRow(14).height = 22;

  worksheet.mergeCells('A15:I15');
  worksheet.getRow(15).height = 12;
}

function addPartsTable(
  worksheet: ExcelJS.Worksheet,
  data: OrderExportData,
  colors: any
): number {
  let currentRow = 16;

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
    cell.font = { bold: true, size: 10, color: { argb: colors.charcoal } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.headerBg },
    };
    cell.border = {
      bottom: { style: 'thin', color: { argb: colors.lightGray } },
    };
  });

  worksheet.getRow(currentRow).height = 28;
  currentRow++;

  data.parts.forEach((part, index) => {
    const row = worksheet.getRow(currentRow);
    const isAltRow = index % 2 === 1;

    row.getCell(1).value = index + 1;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(1).font = { size: 9, bold: true, color: { argb: colors.mediumGray } };

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
      fgColor: { argb: colors.paleBlue },
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
      fgColor: { argb: colors.paleBlue },
    };

    row.getCell(9).value = '';
    row.getCell(9).alignment = { vertical: 'middle' };

    if (isAltRow) {
      for (let col = 1; col <= 9; col++) {
        if (col !== 6 && col !== 8) {
          row.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: colors.veryLightGray },
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
      row.height = 32;
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
  const firstPartRow = 17;

  worksheet.mergeCells(currentRow, 6, currentRow, 7);
  const subtotalLabelCell = worksheet.getCell(currentRow, 6);
  subtotalLabelCell.value = 'Subtotal';
  subtotalLabelCell.font = { size: 10, color: { argb: colors.mediumGray } };
  subtotalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

  worksheet.mergeCells(currentRow, 8, currentRow, 9);
  const subtotalValueCell = worksheet.getCell(currentRow, 8);
  subtotalValueCell.value = { formula: `SUM(G${firstPartRow}:G${lastPartRow})` };
  subtotalValueCell.numFmt = '¥#,##0';
  subtotalValueCell.font = { size: 12, bold: true, color: { argb: colors.charcoal } };
  subtotalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
  const subtotalRow = currentRow;
  worksheet.getRow(currentRow).height = 24;
  currentRow++;

  worksheet.mergeCells(currentRow, 6, currentRow, 7);
  const shippingLabelCell = worksheet.getCell(currentRow, 6);
  shippingLabelCell.value = 'Shipping (Est)';
  shippingLabelCell.font = { size: 10, color: { argb: colors.mediumGray } };
  shippingLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

  worksheet.mergeCells(currentRow, 8, currentRow, 9);
  const shippingValueCell = worksheet.getCell(currentRow, 8);
  shippingValueCell.value = '';
  shippingValueCell.numFmt = '¥#,##0';
  shippingValueCell.font = { size: 12 };
  shippingValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
  shippingValueCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.paleBlue },
  };
  const shippingCell = `H${currentRow}`;
  worksheet.getRow(currentRow).height = 24;
  currentRow++;

  worksheet.mergeCells(currentRow, 6, currentRow, 7);
  const totalLabelCell = worksheet.getCell(currentRow, 6);
  totalLabelCell.value = 'GRAND TOTAL';
  totalLabelCell.font = { size: 14, bold: true, color: { argb: colors.forestGreen } };
  totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

  worksheet.mergeCells(currentRow, 8, currentRow, 9);
  const totalValueCell = worksheet.getCell(currentRow, 8);
  totalValueCell.value = { formula: `H${subtotalRow}+${shippingCell}` };
  totalValueCell.numFmt = '¥#,##0';
  totalValueCell.font = { size: 14, bold: true, color: { argb: colors.forestGreen } };
  totalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
  totalValueCell.border = {
    top: { style: 'thin', color: { argb: colors.forestGreen } },
    bottom: { style: 'thin', color: { argb: colors.forestGreen } },
  };
  worksheet.getRow(currentRow).height = 32;

  currentRow += 3;

  const quoteDeadline = getQuoteDeadline(data.order.order_date);

  worksheet.mergeCells(currentRow, 1, currentRow, 9);
  const termsHeaderCell = worksheet.getCell(currentRow, 1);
  termsHeaderCell.value = 'Quote Requirements';
  termsHeaderCell.font = { bold: true, size: 12, color: { argb: colors.charcoal } };
  termsHeaderCell.alignment = { vertical: 'middle', horizontal: 'left' };
  termsHeaderCell.border = {
    bottom: { style: 'thin', color: { argb: colors.lightGray } },
  };
  worksheet.getRow(currentRow).height = 26;
  currentRow++;

  const terms = [
    `Quote Deadline: ${quoteDeadline}`,
    `Include lead times for all items`,
    `All prices must be in JPY`,
    `Payment Terms: ${data.supplier.payment_terms}`,
    `Please indicate any minimum order quantities`,
  ];

  terms.forEach((term, index) => {
    worksheet.mergeCells(currentRow, 1, currentRow, 9);
    const termCell = worksheet.getCell(currentRow, 1);
    termCell.value = term;
    termCell.font = { size: 10, color: { argb: colors.text } };
    termCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    if (index === 0) {
      termCell.font = { size: 10, bold: true, color: { argb: colors.slateBlue } };
    }

    if (index % 2 === 1) {
      termCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors.veryLightGray },
      };
    }

    worksheet.getRow(currentRow).height = 22;
    currentRow++;
  });

  currentRow += 2;

  worksheet.mergeCells(currentRow, 1, currentRow, 9);
  const responseHeaderCell = worksheet.getCell(currentRow, 1);
  responseHeaderCell.value = 'Supplier Response';
  responseHeaderCell.font = { bold: true, size: 12, color: { argb: colors.charcoal } };
  responseHeaderCell.alignment = { vertical: 'middle', horizontal: 'left' };
  responseHeaderCell.border = {
    bottom: { style: 'thin', color: { argb: colors.lightGray } },
  };
  worksheet.getRow(currentRow).height = 26;
  currentRow++;

  worksheet.getRow(currentRow).height = 8;
  currentRow++;

  worksheet.mergeCells(currentRow, 1, currentRow, 2);
  const quotedByLabel = worksheet.getCell(currentRow, 1);
  quotedByLabel.value = 'Quoted By:';
  quotedByLabel.font = { size: 10, color: { argb: colors.mediumGray } };
  quotedByLabel.alignment = { vertical: 'middle', horizontal: 'left' };

  worksheet.mergeCells(currentRow, 3, currentRow, 5);
  const quotedByValue = worksheet.getCell(currentRow, 3);
  quotedByValue.value = '';
  quotedByValue.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.paleBlue },
  };
  quotedByValue.border = {
    bottom: { style: 'thin', color: { argb: colors.mediumGray } },
  };

  worksheet.getCell(currentRow, 6).value = 'Date:';
  worksheet.getCell(currentRow, 6).font = { size: 10, color: { argb: colors.mediumGray } };
  worksheet.getCell(currentRow, 6).alignment = { vertical: 'middle', horizontal: 'right' };

  worksheet.mergeCells(currentRow, 7, currentRow, 9);
  const dateValue = worksheet.getCell(currentRow, 7);
  dateValue.value = '';
  dateValue.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.paleBlue },
  };
  dateValue.border = {
    bottom: { style: 'thin', color: { argb: colors.mediumGray } },
  };
  worksheet.getRow(currentRow).height = 26;
  currentRow++;

  worksheet.mergeCells(currentRow, 1, currentRow, 2);
  const companyLabel = worksheet.getCell(currentRow, 1);
  companyLabel.value = 'Company:';
  companyLabel.font = { size: 10, color: { argb: colors.mediumGray } };
  companyLabel.alignment = { vertical: 'middle', horizontal: 'left' };

  worksheet.mergeCells(currentRow, 3, currentRow, 5);
  const companyValue = worksheet.getCell(currentRow, 3);
  companyValue.value = '';
  companyValue.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.paleBlue },
  };
  companyValue.border = {
    bottom: { style: 'thin', color: { argb: colors.mediumGray } },
  };

  worksheet.getCell(currentRow, 6).value = 'Valid Until:';
  worksheet.getCell(currentRow, 6).font = { size: 10, color: { argb: colors.mediumGray } };
  worksheet.getCell(currentRow, 6).alignment = { vertical: 'middle', horizontal: 'right' };

  worksheet.mergeCells(currentRow, 7, currentRow, 9);
  const validValue = worksheet.getCell(currentRow, 7);
  validValue.value = '';
  validValue.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.paleBlue },
  };
  validValue.border = {
    bottom: { style: 'thin', color: { argb: colors.mediumGray } },
  };
  worksheet.getRow(currentRow).height = 26;
  currentRow++;

  worksheet.mergeCells(currentRow, 1, currentRow, 2);
  const signatureLabel = worksheet.getCell(currentRow, 1);
  signatureLabel.value = 'Signature:';
  signatureLabel.font = { size: 10, color: { argb: colors.mediumGray } };
  signatureLabel.alignment = { vertical: 'middle', horizontal: 'left' };

  worksheet.mergeCells(currentRow, 3, currentRow, 9);
  const signatureValue = worksheet.getCell(currentRow, 3);
  signatureValue.value = '';
  signatureValue.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.paleBlue },
  };
  signatureValue.border = {
    bottom: { style: 'thin', color: { argb: colors.mediumGray } },
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
      top: 0.3,
      bottom: 0.5,
      header: 0.2,
      footer: 0.3,
    },
    printTitlesRow: '1:16',
  };

  worksheet.pageSetup.printArea = `A1:I${lastPartRow + 25}`;
}
