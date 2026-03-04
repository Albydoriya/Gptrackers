import type ExcelJS from "npm:exceljs@4.4.0";
import type { MultiOrderExportData } from "./types.ts";
import { formatDateForExcel } from "./utils.ts";

export const JAPANESE_COLORS = {
  black: '000000',
  white: 'FFFFFF',
};

export const JAPANESE_COLUMN_WIDTHS = {
  orderNo: 16,
  itemNo: 6,
  item: 48,
  itemNumber: 20,
  chassisNumber: 22,
  quantity: 10,
  price: 12,
  amount: 12,
  eta: 12,
};

export function applyJapaneseQuotationTemplateMulti(
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData,
  config?: any
): void {
  const colors = config?.colors || JAPANESE_COLORS;
  const columnWidths = config?.columnWidths || JAPANESE_COLUMN_WIDTHS;

  worksheet.columns = [
    { width: columnWidths.orderNo },
    { width: columnWidths.itemNo },
    { width: columnWidths.item },
    { width: columnWidths.itemNumber },
    { width: columnWidths.chassisNumber },
    { width: columnWidths.quantity },
    { width: columnWidths.price },
    { width: columnWidths.amount },
    { width: columnWidths.eta },
  ];

  addHeaderSection(worksheet, data, colors);
  const lastPartRow = addPartsTable(worksheet, data, colors);
  addFooterSection(worksheet, lastPartRow, colors);
  configurePageSetup(worksheet, lastPartRow);
}

function addHeaderSection(
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData,
  colors: any
): void {
  // Title - Row 1
  worksheet.mergeCells('A1:I1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'REQUEST FOR QUOTATION　見積依頼書';
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.font = { name: 'Arial', size: 24, bold: true, color: { argb: colors.black } };
  worksheet.getRow(1).height = 40;

  // Empty Row 2
  worksheet.getRow(2).height = 12;

  // Recipient Field - Row 3
  worksheet.mergeCells('A3:D3');
  const recipientCell = worksheet.getCell('A3');
  recipientCell.value = `${data.supplier.name}　様`;
  recipientCell.alignment = { vertical: 'middle', horizontal: 'left' };
  recipientCell.font = { size: 11, color: { argb: colors.black } };
  recipientCell.border = {
    bottom: { style: 'thin', color: { argb: colors.black } },
  };
  worksheet.getRow(3).height = 25;

  // Date and Company Info Block (Top Right) - Rows 4-9
  const firstOrderDate = data.orders[0]?.order.order_date || new Date().toISOString();

  worksheet.mergeCells('F4:I4');
  const dateCell = worksheet.getCell('F4');
  dateCell.value = `DATE :　　　　　　　${formatDateForExcel(firstOrderDate)}`;
  dateCell.alignment = { vertical: 'middle', horizontal: 'right' };
  dateCell.font = { name: 'Arial', size: 10, color: { argb: colors.black } };
  worksheet.getRow(4).height = 18;

  worksheet.mergeCells('F5:I5');
  const quoteByLabelCell = worksheet.getCell('F5');
  quoteByLabelCell.value = 'Quote By:';
  quoteByLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };
  quoteByLabelCell.font = { name: 'Arial', size: 10, color: { argb: colors.black } };
  worksheet.getRow(5).height = 18;

  worksheet.mergeCells('F6:I6');
  const companyNameCell = worksheet.getCell('F6');
  companyNameCell.value = data.company.name || 'Go Parts/Retro Wonders Pty Ltd';
  companyNameCell.alignment = { vertical: 'middle', horizontal: 'right' };
  companyNameCell.font = { name: 'Arial', size: 10, color: { argb: colors.black } };
  worksheet.getRow(6).height = 18;

  // Contact Person
  worksheet.mergeCells('F7:I7');
  const contactCell = worksheet.getCell('F7');
  contactCell.value = 'Yuka Ichimaru';
  contactCell.alignment = { vertical: 'middle', horizontal: 'right' };
  contactCell.font = { name: 'Arial', size: 10, color: { argb: colors.black } };
  worksheet.getRow(7).height = 18;

  // Address
  worksheet.mergeCells('F8:I8');
  const addressCell = worksheet.getCell('F8');
  addressCell.value = data.company.address || 'E12/20 Picrite Close, Pemulwuy, NSW 2145　Australia';
  addressCell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
  addressCell.font = { name: 'Arial', size: 10, color: { argb: colors.black } };
  worksheet.getRow(8).height = 18;

  // Phone
  worksheet.mergeCells('F9:I9');
  const phoneCell = worksheet.getCell('F9');
  phoneCell.value = data.company.phone || '+61 423335099';
  phoneCell.alignment = { vertical: 'middle', horizontal: 'right' };
  phoneCell.font = { name: 'Arial', size: 10, color: { argb: colors.black } };
  worksheet.getRow(9).height = 18;

  // Greeting Text - Row 5-6 (left side)
  worksheet.mergeCells('A5:E5');
  const greeting1Cell = worksheet.getCell('A5');
  greeting1Cell.value = 'お世話になっております。';
  greeting1Cell.alignment = { vertical: 'middle', horizontal: 'left' };
  greeting1Cell.font = { size: 10, color: { argb: colors.black } };

  worksheet.mergeCells('A6:E6');
  const greeting2Cell = worksheet.getCell('A6');
  greeting2Cell.value = '下記商品について、価格と納期をご確認の上ご返信をお願い致します。';
  greeting2Cell.alignment = { vertical: 'middle', horizontal: 'left' };
  greeting2Cell.font = { size: 10, color: { argb: colors.black } };

  // Empty spacing
  worksheet.getRow(10).height = 12;

  // Total Amount Box - Row 11 (right side)
  worksheet.mergeCells('E11:H11');
  const totalLabelCell = worksheet.getCell('E11');
  totalLabelCell.value = '見積もり合計金額 Total Amount :';
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };
  totalLabelCell.font = { size: 10, bold: true, color: { argb: colors.black } };
  totalLabelCell.border = {
    top: { style: 'medium', color: { argb: colors.black } },
    left: { style: 'medium', color: { argb: colors.black } },
    bottom: { style: 'medium', color: { argb: colors.black } },
  };

  const totalValueCell = worksheet.getCell('I11');
  totalValueCell.value = { formula: `SUM(H13:H100)` }; // Will adjust range dynamically
  totalValueCell.numFmt = '¥#,##0';
  totalValueCell.alignment = { vertical: 'middle', horizontal: 'right' };
  totalValueCell.font = { size: 10, bold: true, color: { argb: colors.black } };
  totalValueCell.border = {
    top: { style: 'medium', color: { argb: colors.black } },
    right: { style: 'medium', color: { argb: colors.black } },
    bottom: { style: 'medium', color: { argb: colors.black } },
  };
  worksheet.getRow(11).height = 30;
}

function addPartsTable(
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData,
  colors: any
): number {
  const currentRow = 12;

  // Headers - Row 12 (bilingual)
  const headers = [
    { jp: 'Order #', en: 'Order #' },
    { jp: '#', en: '#' },
    { jp: '商品', en: 'ITEM' },
    { jp: '商品番号', en: 'ITEM #' },
    { jp: '車体番号', en: 'CHASSIS #' },
    { jp: '数量', en: 'QUANTITY' },
    { jp: '単価', en: 'PRICE' },
    { jp: '合計', en: 'AMOUNT' },
    { jp: '納期', en: 'ETA' },
  ];

  headers.forEach((header, index) => {
    const cell = worksheet.getCell(currentRow, index + 1);
    cell.value = `${header.jp}\n${header.en}`;
    cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: colors.black } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: colors.black } },
      left: { style: 'medium', color: { argb: colors.black } },
      right: { style: 'medium', color: { argb: colors.black } },
      bottom: { style: 'medium', color: { argb: colors.black } },
    };
  });

  worksheet.getRow(currentRow).height = 30;

  // Data Rows - Starting from Row 13
  let dataRow = currentRow + 1;
  const firstDataRow = dataRow;
  let itemIndex = 1;

  data.orders.forEach((orderData) => {
    orderData.parts.forEach((part) => {
      const row = worksheet.getRow(dataRow);

      // Order number
      row.getCell(1).value = orderData.order.order_number;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(1).font = { name: 'Arial', size: 9, color: { argb: colors.black } };
      row.getCell(1).border = {
        top: { style: 'medium', color: { argb: colors.black } },
        left: { style: 'medium', color: { argb: colors.black } },
        right: { style: 'medium', color: { argb: colors.black } },
        bottom: { style: 'medium', color: { argb: colors.black } },
      };

      // Item number
      row.getCell(2).value = itemIndex++;
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).font = { name: 'Arial', size: 10, color: { argb: colors.black } };
      row.getCell(2).border = {
        top: { style: 'medium', color: { argb: colors.black } },
        left: { style: 'medium', color: { argb: colors.black } },
        right: { style: 'medium', color: { argb: colors.black } },
        bottom: { style: 'medium', color: { argb: colors.black } },
      };

      // Item name
      row.getCell(3).value = part.name;
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(3).font = { name: 'Arial', size: 10, color: { argb: colors.black } };
      row.getCell(3).border = {
        top: { style: 'medium', color: { argb: colors.black } },
        left: { style: 'medium', color: { argb: colors.black } },
        right: { style: 'medium', color: { argb: colors.black } },
        bottom: { style: 'medium', color: { argb: colors.black } },
      };

      // Part number
      row.getCell(4).value = part.part_number;
      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(4).font = { name: 'Arial', size: 10, color: { argb: colors.black } };
      row.getCell(4).border = {
        top: { style: 'medium', color: { argb: colors.black } },
        left: { style: 'medium', color: { argb: colors.black } },
        right: { style: 'medium', color: { argb: colors.black } },
        bottom: { style: 'medium', color: { argb: colors.black } },
      };

      // Chassis number (empty for supplier to fill in)
      row.getCell(5).value = '';
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(5).font = { name: 'Arial', size: 10, color: { argb: colors.black } };
      row.getCell(5).border = {
        top: { style: 'medium', color: { argb: colors.black } },
        left: { style: 'medium', color: { argb: colors.black } },
        right: { style: 'medium', color: { argb: colors.black } },
        bottom: { style: 'medium', color: { argb: colors.black } },
      };

      // Quantity
      row.getCell(6).value = part.quantity;
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).font = { name: 'Arial', size: 10, color: { argb: colors.black } };
      row.getCell(6).border = {
        top: { style: 'medium', color: { argb: colors.black } },
        left: { style: 'medium', color: { argb: colors.black } },
        right: { style: 'medium', color: { argb: colors.black } },
        bottom: { style: 'medium', color: { argb: colors.black } },
      };

      // Unit Price (empty for supplier to fill)
      row.getCell(7).value = '';
      row.getCell(7).numFmt = '¥#,##0';
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell(7).font = { name: 'Arial', size: 10, color: { argb: colors.black } };
      row.getCell(7).border = {
        top: { style: 'medium', color: { argb: colors.black } },
        left: { style: 'medium', color: { argb: colors.black } },
        right: { style: 'medium', color: { argb: colors.black } },
        bottom: { style: 'medium', color: { argb: colors.black } },
      };

      // Amount (formula)
      row.getCell(8).value = { formula: `F${dataRow}*G${dataRow}` };
      row.getCell(8).numFmt = '¥#,##0';
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell(8).font = { name: 'Arial', size: 10, color: { argb: colors.black } };
      row.getCell(8).border = {
        top: { style: 'medium', color: { argb: colors.black } },
        left: { style: 'medium', color: { argb: colors.black } },
        right: { style: 'medium', color: { argb: colors.black } },
        bottom: { style: 'medium', color: { argb: colors.black } },
      };

      // ETA (empty for supplier to fill)
      row.getCell(9).value = '';
      row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(9).font = { name: 'Arial', size: 10, color: { argb: colors.black } };
      row.getCell(9).border = {
        top: { style: 'medium', color: { argb: colors.black } },
        left: { style: 'medium', color: { argb: colors.black } },
        right: { style: 'medium', color: { argb: colors.black } },
        bottom: { style: 'medium', color: { argb: colors.black } },
      };

      row.height = 25;
      dataRow++;
    });
  });

  // Update the total formula in I11 with correct range
  const totalValueCell = worksheet.getCell('I11');
  totalValueCell.value = { formula: `SUM(H${firstDataRow}:H${dataRow - 1})` };

  return dataRow - 1;
}

function addFooterSection(
  worksheet: ExcelJS.Worksheet,
  lastPartRow: number,
  colors: any
): void {
  const footerRow = lastPartRow + 2;

  // Simple total at bottom
  worksheet.mergeCells(footerRow, 7, footerRow, 8);
  const totalLabelCell = worksheet.getCell(footerRow, 7);
  totalLabelCell.value = 'TOTAL';
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };
  totalLabelCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: colors.black } };
  totalLabelCell.border = {
    top: { style: 'thin', color: { argb: colors.black } },
  };

  const totalValueCell = worksheet.getCell(footerRow, 9);
  totalValueCell.value = { formula: `SUM(H13:H${lastPartRow})` };
  totalValueCell.numFmt = '¥#,##0';
  totalValueCell.alignment = { vertical: 'middle', horizontal: 'right' };
  totalValueCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: colors.black } };
  totalValueCell.border = {
    top: { style: 'thin', color: { argb: colors.black } },
  };
  worksheet.getRow(footerRow).height = 32;
}

function configurePageSetup(worksheet: ExcelJS.Worksheet, lastPartRow: number): void {
  worksheet.pageSetup = {
    paperSize: 9, // A4
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
  };

  worksheet.pageSetup.printArea = `A1:I${lastPartRow + 3}`;
}
