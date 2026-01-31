import ExcelJS from "npm:exceljs@4.4.0";
import type { OrderExportData, MultiOrderExportData } from "./types.ts";
import { getTemplateFunction, getMultiOrderTemplateFunction } from "./templateFactory.ts";
import { loadLogo } from "./logoLoader.ts";

function isMultiOrderData(data: OrderExportData | MultiOrderExportData): data is MultiOrderExportData {
  return 'orders' in data && Array.isArray(data.orders);
}

export async function generateExcelFile(
  data: OrderExportData | MultiOrderExportData,
  templateType: string
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Parts Management System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const logoData = await loadLogo(templateType);

  const isMultiOrder = isMultiOrderData(data);
  const worksheetName = isMultiOrder ? 'Combined Purchase Orders' : 'Purchase Order Request';

  const worksheet = workbook.addWorksheet(worksheetName, {
    properties: { tabColor: { argb: 'FF0066CC' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: isMultiOrder ? 13 : 12 }]
  });

  if (isMultiOrder) {
    const templateFunction = getMultiOrderTemplateFunction(templateType);
    templateFunction(worksheet, data, data.supplier.template_config, workbook, logoData);
  } else {
    const templateFunction = getTemplateFunction(templateType);
    templateFunction(worksheet, data, data.supplier.template_config, workbook, logoData);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}