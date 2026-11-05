import { PrinterStatusSchema, PrinterTestResultSchema, PrintJobSchema } from '@bigger/shared';
import { z } from 'zod';
import { getJson, requestJson } from './http-client';

export const printingService = {
  status: (signal?: AbortSignal) => getJson('/printer', PrinterStatusSchema, {}, signal),
  jobs: (signal?: AbortSignal) => getJson('/print-jobs', z.array(PrintJobSchema), {}, signal),
  test: () => requestJson('POST', '/printer/test', PrinterTestResultSchema),
  reprint: (orderId: string) => requestJson('POST', `/orders/${orderId}/print`, PrintJobSchema),
};
