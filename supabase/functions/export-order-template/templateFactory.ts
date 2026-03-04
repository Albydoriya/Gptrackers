import type ExcelJS from "npm:exceljs@4.4.0";
import type { OrderExportData, MultiOrderExportData } from "./types.ts";
import type { LogoData } from "./logoLoader.ts";
import { applyHPITemplate } from "./hpiTemplate.ts";
import { applyGenericTemplate } from "./genericTemplate.ts";
import { applyHPITemplateMulti } from "./hpiTemplateMulti.ts";
import { applyGenericTemplateMulti } from "./genericTemplateMulti.ts";
import { applyJapaneseQuotationTemplate } from "./japaneseQuotationTemplate.ts";
import { applyJapaneseQuotationTemplateMulti } from "./japaneseQuotationTemplateMulti.ts";

export type TemplateFunction = (
  worksheet: ExcelJS.Worksheet,
  data: OrderExportData,
  config?: any,
  workbook?: ExcelJS.Workbook,
  logoData?: LogoData | null
) => void;

export type MultiOrderTemplateFunction = (
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData,
  config?: any,
  workbook?: ExcelJS.Workbook,
  logoData?: LogoData | null
) => void;

export function getTemplateFunction(templateType: string): TemplateFunction {
  const normalizedType = (templateType || 'generic').toLowerCase().trim();

  switch (normalizedType) {
    case 'hpi':
      return applyHPITemplate;

    case 'japanese':
    case 'japanese_quotation':
      return applyJapaneseQuotationTemplate;

    case 'generic':
    default:
      return applyGenericTemplate;
  }
}

export function getMultiOrderTemplateFunction(templateType: string): MultiOrderTemplateFunction {
  const normalizedType = (templateType || 'generic').toLowerCase().trim();

  switch (normalizedType) {
    case 'hpi':
      return applyHPITemplateMulti;

    case 'japanese':
    case 'japanese_quotation':
      return applyJapaneseQuotationTemplateMulti;

    case 'generic':
    default:
      return applyGenericTemplateMulti;
  }
}

export function getTemplateName(templateType: string): string {
  const normalizedType = (templateType || 'generic').toLowerCase().trim();

  switch (normalizedType) {
    case 'hpi':
      return 'HPI Supplier Template';
    case 'japanese':
    case 'japanese_quotation':
      return 'Japanese Quotation Template';
    case 'generic':
      return 'Generic Supplier Template';
    default:
      return `${templateType} Template (Using Generic)`;
  }
}
