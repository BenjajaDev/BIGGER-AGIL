import { z } from 'zod';

/** What can be printed from a job; more kinds (pre-cuenta, QR) join this list later. */
export const PRINT_JOB_KINDS = ['kitchen'] as const;
export const PrintJobKindSchema = z.enum(PRINT_JOB_KINDS);
export type PrintJobKind = z.infer<typeof PrintJobKindSchema>;

export const PRINT_JOB_STATUSES = ['pending', 'printing', 'printed', 'failed'] as const;
export const PrintJobStatusSchema = z.enum(PRINT_JOB_STATUSES);
export type PrintJobStatus = z.infer<typeof PrintJobStatusSchema>;

export const PrintJobSchema = z.object({
  id: z.uuid(),
  kind: PrintJobKindSchema,
  orderId: z.uuid(),
  /** Snapshot of who the ticket was for ("Mesa 2", "WhatsApp · Camila"). */
  label: z.string(),
  /** 1 for the original comanda, 2 and up for reprints. */
  copy: z.int().positive(),
  status: PrintJobStatusSchema,
  attempts: z.int().nonnegative(),
  lastError: z.string().nullable(),
  createdAt: z.iso.datetime(),
  printedAt: z.iso.datetime().nullable(),
});
export type PrintJob = z.infer<typeof PrintJobSchema>;

export const PrintJobFilterSchema = z.object({
  status: z
    .string()
    .transform((value) => value.split(',').filter(Boolean))
    .pipe(z.array(PrintJobStatusSchema).min(1))
    .optional(),
});
export type PrintJobFilter = z.infer<typeof PrintJobFilterSchema>;

export const PrinterStatusSchema = z.object({
  enabled: z.boolean(),
  /** The device path in use, for the manager to recognize; `null` while disabled. */
  device: z.string().nullable(),
  codepage: z.string(),
  columns: z.int().positive(),
  pending: z.int().nonnegative(),
  /** Jobs that failed and whose order has no printed copy yet. */
  failed: z.int().nonnegative(),
  lastPrintedAt: z.iso.datetime().nullable(),
  lastError: z.string().nullable(),
});
export type PrinterStatus = z.infer<typeof PrinterStatusSchema>;

export const PrinterTestResultSchema = z.object({ printedAt: z.iso.datetime() });
export type PrinterTestResult = z.infer<typeof PrinterTestResultSchema>;
