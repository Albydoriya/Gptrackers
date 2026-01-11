import ExcelJS from "npm:exceljs@4.4.0";
import type { OrderExportData } from "./types.ts";
import { applyHPITemplate } from "./hpiTemplate.ts";

export async function generateExcelFile(
  data: OrderExportData,
  templateType: 'hpi'
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Parts Management System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Purchase Order Request', {
    properties: { tabColor: { argb: 'FF0066CC' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 12 }]
  });

  if (templateType === 'hpi') {
    applyHPITemplate(worksheet, data);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}