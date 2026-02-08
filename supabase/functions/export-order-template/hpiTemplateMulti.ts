import type ExcelJS from "npm:exceljs@4.4.0";
import type { MultiOrderExportData } from "./types.ts";
import type { LogoData } from "./logoLoader.ts";
import { formatDateForExcel } from "./utils.ts";

export const HPI_MULTI_COLORS = {
  borderColor: '000000',
  headerBg: 'FFFFFF',
};

export const HPI_MULTI_COLUMN_WIDTHS = {
  orderNumber: 12,
  productNameA: 8,
  productNameB: 20,
  productNameC: 15,
  productNameD: 15,
  partNumberE: 12,
  partNumberF: 12,
  qty: 6,
  retail: 10,
  discount: 8,
  unitPrice: 10,
  cost: 10,
  delivery: 10,
};

export function applyHPITemplateMulti(
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData,
  config?: any,
  workbook?: ExcelJS.Workbook,
  logoData?: LogoData | null
): void {
  worksheet.columns = [
    { width: HPI_MULTI_COLUMN_WIDTHS.orderNumber },
    { width: HPI_MULTI_COLUMN_WIDTHS.productNameA },
    { width: HPI_MULTI_COLUMN_WIDTHS.productNameB },
    { width: HPI_MULTI_COLUMN_WIDTHS.productNameC },
    { width: HPI_MULTI_COLUMN_WIDTHS.productNameD },
    { width: HPI_MULTI_COLUMN_WIDTHS.partNumberE },
    { width: HPI_MULTI_COLUMN_WIDTHS.partNumberF },
    { width: HPI_MULTI_COLUMN_WIDTHS.qty },
    { width: HPI_MULTI_COLUMN_WIDTHS.retail },
    { width: HPI_MULTI_COLUMN_WIDTHS.discount },
    { width: HPI_MULTI_COLUMN_WIDTHS.unitPrice },
    { width: HPI_MULTI_COLUMN_WIDTHS.cost },
    { width: HPI_MULTI_COLUMN_WIDTHS.delivery },
  ];

  addHeaderSection(worksheet, data, workbook, logoData);
  const lastPartRow = addPartsTable(worksheet, data);
  addFooterSection(worksheet, data, lastPartRow);
  configurePageSetup(worksheet, lastPartRow);
}

function addHeaderSection(
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData,
  workbook?: ExcelJS.Workbook,
  logoData?: LogoData | null
): void {
  worksheet.mergeCells('B1:E1');
  worksheet.getCell('B1').value = 'ORDER';
  worksheet.getCell('B1').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('B1').font = { size: 36, bold: true };
  worksheet.getRow(1).height = 35;

  if (logoData && workbook) {
    const imageId = workbook.addImage({
      buffer: logoData.buffer,
      extension: logoData.extension,
    });

    worksheet.addImage(imageId, {
      tl: { col: 6, row: 0 },
      ext: { width: logoData.width || 180, height: logoData.height || 60 },
    });
  }

  worksheet.getRow(2).height = 20;

  worksheet.mergeCells('A3:E9');
  const supplierBox = worksheet.getCell('A3');
  supplierBox.value = `Purchasing name : ${data.supplier.name}`;
  supplierBox.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  supplierBox.font = { size: 11 };
  supplierBox.border = {
    top: { style: 'medium', color: { argb: HPI_MULTI_COLORS.borderColor } },
    left: { style: 'medium', color: { argb: HPI_MULTI_COLORS.borderColor } },
    bottom: { style: 'medium', color: { argb: HPI_MULTI_COLORS.borderColor } },
    right: { style: 'medium', color: { argb: HPI_MULTI_COLORS.borderColor } },
  };

  const orderDates = data.orders.map(o => new Date(o.order.order_date));
  const minDate = new Date(Math.min(...orderDates.map(d => d.getTime())));

  worksheet.getCell('K3').value = formatDateForExcel(minDate);
  worksheet.getCell('K3').alignment = { horizontal: 'right' };
  worksheet.getCell('K3').font = { size: 10 };

  worksheet.getCell('G5').value = 'Purchaser: ALBERT HO -san';
  worksheet.getCell('G5').alignment = { horizontal: 'left' };
  worksheet.getCell('G5').font = { size: 10 };

  const orderNumbers = data.orders.map(o => o.order.order_number).join(', ');
  worksheet.getCell('G6').value = `Estimate No,${orderNumbers}`;
  worksheet.getCell('G6').alignment = { horizontal: 'left' };
  worksheet.getCell('G6').font = { size: 10 };

  worksheet.getRow(10).height = 5;
}

function addPartsTable(
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData
): number {
  let currentRow = 11;

  worksheet.getCell(`A${currentRow}`).value = 'Order #';
  worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 10 };
  worksheet.getCell(`A${currentRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell(`A${currentRow}`).border = {
    top: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    left: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    right: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
  };

  worksheet.mergeCells(`B${currentRow}:E${currentRow}`);
  worksheet.getCell(`B${currentRow}`).value = '';
  worksheet.getCell(`B${currentRow}`).border = {
    top: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    left: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    right: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
  };

  worksheet.mergeCells(`F${currentRow}:G${currentRow}`);
  worksheet.getCell(`F${currentRow}`).value = '';
  worksheet.getCell(`F${currentRow}`).border = {
    top: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    left: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    right: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
  };

  const singleHeaders = ['QTY', 'Retail', 'Discount', 'unit Price', 'Cost', 'delivery'];
  singleHeaders.forEach((header, index) => {
    const cell = worksheet.getCell(currentRow, 8 + index);
    cell.value = header;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
      left: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
      bottom: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
      right: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    };
  });

  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  data.orders.forEach((orderData) => {
    orderData.parts.forEach((part) => {
      const row = worksheet.getRow(currentRow);

      row.getCell(1).value = orderData.order.order_number;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells(`B${currentRow}:E${currentRow}`);
      row.getCell(2).value = `${part.name} ${part.part_number}`;
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells(`F${currentRow}:G${currentRow}`);
      row.getCell(6).value = part.part_number;
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };

      row.getCell(8).value = part.quantity;
      row.getCell(8).alignment = { horizontal: 'center' };

      row.getCell(9).value = '';
      row.getCell(9).numFmt = '¥#,##0';

      row.getCell(10).value = '';
      row.getCell(10).numFmt = '0%';

      row.getCell(11).value = '';
      row.getCell(11).numFmt = '¥#,##0';

      row.getCell(12).value = '';
      row.getCell(12).numFmt = '¥#,##0';

      row.getCell(13).value = '';

      for (let col = 1; col <= 13; col++) {
        row.getCell(col).border = {
          top: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
          left: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
          bottom: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
          right: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
        };
      }

      row.height = 20;
      currentRow++;
    });
  });

  return currentRow - 1;
}

function addFooterSection(
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData,
  lastPartRow: number
): void {
  let currentRow = lastPartRow + 2;

  worksheet.getCell(currentRow, 11).value = 'subtotal';
  worksheet.getCell(currentRow, 11).alignment = { horizontal: 'left' };
  worksheet.getCell(currentRow, 11).font = { size: 10 };

  worksheet.getCell(currentRow, 12).value = '';
  worksheet.getCell(currentRow, 12).numFmt = '¥#,##0';
  currentRow++;

  currentRow++;

  worksheet.getCell(currentRow, 11).value = 'TOTAL';
  worksheet.getCell(currentRow, 11).alignment = { horizontal: 'left' };
  worksheet.getCell(currentRow, 11).font = { size: 10, bold: true };

  worksheet.getCell(currentRow, 12).value = '';
  worksheet.getCell(currentRow, 12).numFmt = '¥#,##0';
  worksheet.getCell(currentRow, 12).border = {
    top: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
  };

  const bankInfoStartRow = lastPartRow + 8;

  const bankInfo = data.supplier.template_config?.bank_info;

  if (bankInfo) {
    worksheet.mergeCells(`H${bankInfoStartRow}:L${bankInfoStartRow + 9}`);
    const bankCell = worksheet.getCell(`H${bankInfoStartRow}`);

    const bankText = [
      'Bank Information',
      bankInfo.bank_name || 'Bank of Mitsubishi UFJ',
      `Branch Number: ${bankInfo.branch_number || '463'}`,
      `Branch Name: ${bankInfo.branch_name || 'Komatsugawa Branch'}`,
      `Account Number: ${bankInfo.account_number || '0824029'}`,
      `Account Name: ${bankInfo.account_name || 'HPI Co., Ltd.'}`,
      `Swift Code: ${bankInfo.swift_code || 'BOTKJPJT'}`,
    ].join('\n');

    bankCell.value = bankText;
    bankCell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
    bankCell.font = { size: 10, bold: false };
    bankCell.border = {
      top: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
      left: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
      bottom: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
      right: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    };
  }
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
    printTitlesRow: '1:11',
  };

  worksheet.pageSetup.printArea = `A1:M${lastPartRow + 25}`;
}
