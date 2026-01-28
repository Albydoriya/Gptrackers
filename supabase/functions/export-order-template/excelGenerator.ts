import ExcelJS from "npm:exceljs@4.4.0";
import type { OrderExportData } from "./types.ts";
import { getTemplateFunction } from "./templateFactory.ts";

export async function generateExcelFile(
  data: OrderExportData,
  templateType: string
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Parts Management System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Purchase Order Request', {
    properties: { tabColor: { argb: 'FF0066CC' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 12 }]
  });

  const templateFunction = getTemplateFunction(templateType);
  templateFunction(worksheet, data, data.supplier.template_config);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}