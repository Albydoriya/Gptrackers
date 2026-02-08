import type ExcelJS from "npm:exceljs@4.4.0";
import type { OrderExportData } from "./types.ts";
import type { LogoData } from "./logoLoader.ts";
import { formatDateForExcel, formatDateAsYYYYMMDD } from "./utils.ts";

export const HPI_COLORS = {
  borderColor: '000000',
  headerBg: 'FFFFFF',
};

export const COLUMN_WIDTHS = {
  productNameA: 8,
  productNameB: 20,
  productNameC: 15,
  productNameD: 15,
  partNumberE: 12,
  partNumberF: 12,
  qty: 6,
  retail: 12,
  discount: 12,
  unitPrice: 12,
  cost: 12,
  delivery: 20,
};

export function applyHPITemplate(
  worksheet: ExcelJS.Worksheet,
  data: OrderExportData,
  config?: any,
  workbook?: ExcelJS.Workbook,
  logoData?: LogoData | null
): void {
  worksheet.columns = [
    { width: COLUMN_WIDTHS.productNameA },
    { width: COLUMN_WIDTHS.productNameB },
    { width: COLUMN_WIDTHS.productNameC },
    { width: COLUMN_WIDTHS.productNameD },
    { width: COLUMN_WIDTHS.partNumberE },
    { width: COLUMN_WIDTHS.partNumberF },
    { width: COLUMN_WIDTHS.qty },
    { width: COLUMN_WIDTHS.retail },
    { width: COLUMN_WIDTHS.discount },
    { width: COLUMN_WIDTHS.unitPrice },
    { width: COLUMN_WIDTHS.cost },
    { width: COLUMN_WIDTHS.delivery },
  ];

  addHeaderSection(worksheet, data, workbook, logoData);
  const lastPartRow = addPartsTable(worksheet, data);
  addFooterSection(worksheet, data, lastPartRow);
  configurePageSetup(worksheet, lastPartRow);
}

function addHeaderSection(
  worksheet: ExcelJS.Worksheet,
  data: OrderExportData,
  workbook?: ExcelJS.Workbook,
  logoData?: LogoData | null
): void {
  worksheet.mergeCells('B1:D1');
  worksheet.getCell('B1').value = 'ORDER';
  worksheet.getCell('B1').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('B1').font = { name: 'Arial', size: 36, bold: true };
  worksheet.getRow(1).height = 35;

  if (logoData && workbook) {
    const imageId = workbook.addImage({
      buffer: logoData.buffer,
      extension: logoData.extension,
    });

    worksheet.addImage(imageId, {
      tl: { col: 5, row: 0 },
      ext: { width: logoData.width || 191, height: logoData.height || 37 },
    });
  }

  worksheet.getRow(2).height = 20;

  worksheet.mergeCells('A3:D9');
  const supplierBox = worksheet.getCell('A3');
  supplierBox.value = `Purchasing name : ${data.company.name}`;
  supplierBox.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  supplierBox.font = { name: 'Arial', size: 11 };
  supplierBox.border = {
    top: { style: 'medium', color: { argb: HPI_COLORS.borderColor } },
    left: { style: 'medium', color: { argb: HPI_COLORS.borderColor } },
    bottom: { style: 'medium', color: { argb: HPI_COLORS.borderColor } },
    right: { style: 'medium', color: { argb: HPI_COLORS.borderColor } },
  };

  worksheet.getCell('I3').value = formatDateForExcel(data.order.order_date);
  worksheet.getCell('I3').alignment = { horizontal: 'right' };
  worksheet.getCell('I3').font = { name: 'Arial', size: 10 };

  worksheet.getCell('F5').value = 'Purchaser: ALBERT HO -san';
  worksheet.getCell('F5').alignment = { horizontal: 'left' };
  worksheet.getCell('F5').font = { name: 'Arial', size: 10 };

  worksheet.getCell('F6').value = `Estimate No,${formatDateAsYYYYMMDD()}`;
  worksheet.getCell('F6').alignment = { horizontal: 'left' };
  worksheet.getCell('F6').font = { name: 'Arial', size: 10 };

  worksheet.getRow(10).height = 5;
}

function addPartsTable(worksheet: ExcelJS.Worksheet, data: OrderExportData): number {
  let currentRow = 11;

  worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = '';
  worksheet.getCell(`A${currentRow}`).border = {
    top: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
    left: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
    right: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
  };

  worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
  worksheet.getCell(`E${currentRow}`).value = '';
  worksheet.getCell(`E${currentRow}`).border = {
    top: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
    left: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
    right: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
  };

  const singleHeaders = ['QTY', 'Retail', 'Discount', 'unit Price', 'Cost', 'delivery'];
  singleHeaders.forEach((header, index) => {
    const cell = worksheet.getCell(currentRow, 7 + index);
    cell.value = header;
    cell.font = { name: 'Arial', bold: true, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
      left: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
      bottom: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
      right: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
    };
  });

  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  data.parts.forEach((part) => {
    const row = worksheet.getRow(currentRow);

    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    row.getCell(1).value = `${part.name} ${part.part_number}`;
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(1).font = { name: 'Arial', size: 10 };

    worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
    row.getCell(5).value = part.part_number;
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(5).font = { name: 'Arial', size: 10 };

    row.getCell(7).value = part.quantity;
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(7).font = { name: 'Arial', size: 10 };

    row.getCell(8).value = '';
    row.getCell(8).numFmt = '¥#,##0';
    row.getCell(8).font = { name: 'Arial', size: 10 };

    row.getCell(9).value = '';
    row.getCell(9).numFmt = '0%';
    row.getCell(9).font = { name: 'Arial', size: 10 };

    row.getCell(10).value = '';
    row.getCell(10).numFmt = '¥#,##0';
    row.getCell(10).font = { name: 'Arial', size: 10 };

    row.getCell(11).value = '';
    row.getCell(11).numFmt = '¥#,##0';
    row.getCell(11).font = { name: 'Arial', size: 10 };

    row.getCell(12).value = '';
    row.getCell(12).font = { name: 'Arial', size: 10 };

    for (let col = 1; col <= 12; col++) {
      row.getCell(col).border = {
        top: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
        left: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
        bottom: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
        right: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
      };
    }

    row.height = 20;
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

  worksheet.getCell(currentRow, 10).value = 'subtotal';
  worksheet.getCell(currentRow, 10).alignment = { horizontal: 'left' };
  worksheet.getCell(currentRow, 10).font = { name: 'Arial', size: 10 };

  worksheet.getCell(currentRow, 11).value = '';
  worksheet.getCell(currentRow, 11).numFmt = '¥#,##0';
  worksheet.getCell(currentRow, 11).font = { name: 'Arial', size: 10 };
  currentRow++;

  currentRow++;

  worksheet.getCell(currentRow, 10).value = 'TOTAL';
  worksheet.getCell(currentRow, 10).alignment = { horizontal: 'left' };
  worksheet.getCell(currentRow, 10).font = { name: 'Arial', size: 10, bold: true };

  worksheet.getCell(currentRow, 11).value = '';
  worksheet.getCell(currentRow, 11).numFmt = '¥#,##0';
  worksheet.getCell(currentRow, 11).font = { name: 'Arial', size: 10 };
  worksheet.getCell(currentRow, 11).border = {
    top: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
  };

  const bankInfoStartRow = 21;

  const bankInfo = data.supplier.template_config?.bank_info;

  worksheet.mergeCells(`G${bankInfoStartRow}:J${bankInfoStartRow + 6}`);
  const bankCell = worksheet.getCell(`G${bankInfoStartRow}`);

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
    top: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
    left: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
    right: { style: 'thin', color: { argb: HPI_COLORS.borderColor } },
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

  worksheet.pageSetup.printArea = `A1:L${lastPartRow + 25}`;
}