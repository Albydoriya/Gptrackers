import type ExcelJS from "npm:exceljs@4.4.0";
import type { MultiOrderExportData } from "./types.ts";
import type { LogoData } from "./logoLoader.ts";
import { formatDateForExcel, formatDateAsYYYYMMDD } from "./utils.ts";

export const HPI_MULTI_COLORS = {
  borderColor: '000000',
  headerBg: 'FFFFFF',
};

export const HPI_MULTI_COLUMN_WIDTHS = {
  orderNumber: 20,
  productName: 58,
  partNumber: 24,
  qty: 6,
  retail: 12,
  discount: 12,
  unitPrice: 12,
  cost: 12,
  delivery: 20,
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
    { width: HPI_MULTI_COLUMN_WIDTHS.productName },
    { width: HPI_MULTI_COLUMN_WIDTHS.partNumber },
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
  worksheet.mergeCells('A1:C1');
  worksheet.getCell('A1').value = 'ORDER';
  worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A1').font = { name: 'Arial', size: 36, bold: true };
  worksheet.getRow(1).height = 35;

  if (logoData && workbook) {
    const imageId = workbook.addImage({
      buffer: logoData.buffer,
      extension: logoData.extension,
    });

    worksheet.addImage(imageId, {
      tl: { col: 4, row: 0 },
      ext: { width: logoData.width || 191, height: logoData.height || 37 },
    });
  }

  worksheet.getRow(2).height = 20;

  worksheet.mergeCells('A3:C9');
  const supplierBox = worksheet.getCell('A3');
  supplierBox.value = `Purchasing name : ${data.company.name}`;
  supplierBox.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  supplierBox.font = { name: 'Arial', size: 11 };
  supplierBox.border = {
    top: { style: 'medium', color: { argb: HPI_MULTI_COLORS.borderColor } },
    left: { style: 'medium', color: { argb: HPI_MULTI_COLORS.borderColor } },
    bottom: { style: 'medium', color: { argb: HPI_MULTI_COLORS.borderColor } },
    right: { style: 'medium', color: { argb: HPI_MULTI_COLORS.borderColor } },
  };

  const orderDates = data.orders.map(o => new Date(o.order.order_date));
  const minDate = new Date(Math.min(...orderDates.map(d => d.getTime())));

  worksheet.getCell('G3').value = formatDateForExcel(minDate);
  worksheet.getCell('G3').alignment = { horizontal: 'right' };
  worksheet.getCell('G3').font = { name: 'Arial', size: 10 };

  worksheet.getCell('D5').value = 'Purchaser: ALBERT HO -san';
  worksheet.getCell('D5').alignment = { horizontal: 'left' };
  worksheet.getCell('D5').font = { name: 'Arial', size: 10 };

  worksheet.getCell('D6').value = `Estimate No,${formatDateAsYYYYMMDD()}`;
  worksheet.getCell('D6').alignment = { horizontal: 'left' };
  worksheet.getCell('D6').font = { name: 'Arial', size: 10 };

  worksheet.getRow(10).height = 5;
}

function addPartsTable(
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData
): number {
  let currentRow = 11;

  const allHeaders = ['GP Order #', 'Product Name', 'Part Number', 'QTY', 'Retail', 'Discount', 'unit Price', 'Cost', 'delivery'];
  allHeaders.forEach((header, index) => {
    const cell = worksheet.getCell(currentRow, 1 + index);
    cell.value = header;
    cell.font = { name: 'Arial', bold: true, size: 10 };
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
      row.getCell(1).font = { name: 'Arial', size: 10 };

      row.getCell(2).value = `${part.name} ${part.part_number}`;
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(2).font = { name: 'Arial', size: 10 };

      row.getCell(3).value = part.part_number;
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell(3).font = { name: 'Arial', size: 10 };

      row.getCell(4).value = part.quantity;
      row.getCell(4).alignment = { horizontal: 'center' };
      row.getCell(4).font = { name: 'Arial', size: 10 };

      row.getCell(5).value = '';
      row.getCell(5).numFmt = '¥#,##0';
      row.getCell(5).font = { name: 'Arial', size: 10 };

      row.getCell(6).value = '';
      row.getCell(6).numFmt = '0%';
      row.getCell(6).font = { name: 'Arial', size: 10 };

      row.getCell(7).value = '';
      row.getCell(7).numFmt = '¥#,##0';
      row.getCell(7).font = { name: 'Arial', size: 10 };

      row.getCell(8).value = '';
      row.getCell(8).numFmt = '¥#,##0';
      row.getCell(8).font = { name: 'Arial', size: 10 };

      row.getCell(9).value = '';
      row.getCell(9).font = { name: 'Arial', size: 10 };

      for (let col = 1; col <= 9; col++) {
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

  worksheet.getCell(currentRow, 7).value = 'subtotal';
  worksheet.getCell(currentRow, 7).alignment = { horizontal: 'left' };
  worksheet.getCell(currentRow, 7).font = { name: 'Arial', size: 10 };

  worksheet.getCell(currentRow, 8).value = { formula: `SUM(H12:H${lastPartRow + 1})` };
  worksheet.getCell(currentRow, 8).numFmt = '¥#,##0';
  worksheet.getCell(currentRow, 8).font = { name: 'Arial', size: 10 };
  const subtotalRow = currentRow;
  currentRow++;

  currentRow++;

  worksheet.getCell(currentRow, 7).value = 'TOTAL';
  worksheet.getCell(currentRow, 7).alignment = { horizontal: 'left' };
  worksheet.getCell(currentRow, 7).font = { name: 'Arial', size: 10, bold: true };

  worksheet.getCell(currentRow, 8).value = { formula: `H${subtotalRow}` };
  worksheet.getCell(currentRow, 8).numFmt = '¥#,##0';
  worksheet.getCell(currentRow, 8).font = { name: 'Arial', size: 10 };
  worksheet.getCell(currentRow, 8).border = {
    top: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
  };

  const bankInfoStartRow = 21;

  const bankInfo = data.supplier.template_config?.bank_info;

  worksheet.mergeCells(`D${bankInfoStartRow}:H${bankInfoStartRow + 6}`);
  const bankCell = worksheet.getCell(`D${bankInfoStartRow}`);

  bankCell.value = {
    richText: [
      { font: { name: 'Arial', size: 10, bold: true }, text: 'Bank Information' },
      { font: { name: 'Arial', size: 10, bold: true }, text: '\n' + (bankInfo?.bank_name || 'Bank of Mitsubishi UFJ') },
      { font: { name: 'Arial', size: 10, bold: true }, text: '\nBranch Number: ' },
      { font: { name: 'Arial', size: 10 }, text: bankInfo?.branch_number || '463' },
      { font: { name: 'Arial', size: 10, bold: true }, text: '\nBranch Name: ' },
      { font: { name: 'Arial', size: 10 }, text: bankInfo?.branch_name || 'Komatsugawa Branch' },
      { font: { name: 'Arial', size: 10, bold: true }, text: '\nAccount Number: ' },
      { font: { name: 'Arial', size: 10 }, text: bankInfo?.account_number || '0824029' },
      { font: { name: 'Arial', size: 10, bold: true }, text: '\nAccount Name: ' },
      { font: { name: 'Arial', size: 10 }, text: bankInfo?.account_name || 'HPI Co., Ltd.' },
      { font: { name: 'Arial', size: 10 }, text: '\n' + `Swift Code: ${bankInfo?.swift_code || 'BOTKJPJT'}` },
    ]
  };
  bankCell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
  bankCell.border = {
    top: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    left: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
    right: { style: 'thin', color: { argb: HPI_MULTI_COLORS.borderColor } },
  };
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

  worksheet.pageSetup.printArea = `A1:I${lastPartRow + 25}`;
}
