import {
  CashCloseSummarySchema,
  SalesReportSchema,
  type CashCloseInput,
  type ReportKind,
  type ReportRange,
} from '@bigger/shared';
import { buildApiUrl, getJson, requestJson } from './http-client';

export const reportsService = {
  sales: (range: ReportRange, signal?: AbortSignal) =>
    getJson('/admin/reports/sales', SalesReportSchema, { from: range.from, to: range.to }, signal),
  cashClose: (date: string, signal?: AbortSignal) =>
    getJson('/admin/reports/cash-close', CashCloseSummarySchema, { date }, signal),
  closeCash: (input: CashCloseInput) =>
    requestJson('POST', '/admin/reports/cash-close', CashCloseSummarySchema, { body: input }),
  /** A file download: the browser sends the admin cookie by itself. */
  csvUrl: (range: ReportRange, kind: ReportKind) =>
    buildApiUrl('/admin/reports/export.csv', { from: range.from, to: range.to, kind }),
};
