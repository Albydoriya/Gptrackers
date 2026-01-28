import type ExcelJS from "npm:exceljs@4.4.0";
import type { OrderExportData, MultiOrderExportData } from "./types.ts";
import { applyHPITemplate } from "./hpiTemplate.ts";
import { applyGenericTemplate } from "./genericTemplate.ts";
import { applyHPITemplateMulti } from "./hpiTemplateMulti.ts";
import { applyGenericTemplateMulti } from "./genericTemplateMulti.ts";

export type TemplateFunction = (
  worksheet: ExcelJS.Worksheet,
  data: OrderExportData,
  config?: any
) => void;

export type MultiOrderTemplateFunction = (
  worksheet: ExcelJS.Worksheet,
  data: MultiOrderExportData,
  config?: any
) => void;

export function getTemplateFunction(templateType: string): TemplateFunction {
  const normalizedType = (templateType || 'generic').toLowerCase().trim();

  switch (normalizedType) {
    case 'hpi':
      return applyHPITemplate;

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
    case 'generic':
      return 'Generic Supplier Template';
    default:
      return `${templateType} Template (Using Generic)`;
  }
}
