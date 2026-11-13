import { z } from 'zod';
import { PriceClpSchema } from './catalog.js';

export const TABLE_STATUSES = ['free', 'occupied', 'awaiting-payment'] as const;
export const TableStatusSchema = z.enum(TABLE_STATUSES);
export type TableStatus = z.infer<typeof TableStatusSchema>;

export const DiningTableSchema = z.object({
  id: z.uuid(),
  number: z.int().positive(),
  label: z.string().min(1).max(30),
  sortOrder: z.int().nonnegative(),
});
export type DiningTable = z.infer<typeof DiningTableSchema>;

export const TableOverviewSchema = DiningTableSchema.extend({
  status: TableStatusSchema,
  /** The open check, `null` when the table is free. */
  checkId: z.uuid().nullable(),
  itemCount: z.int().nonnegative(),
  openTotalClp: PriceClpSchema,
  paidClp: PriceClpSchema,
  balanceClp: PriceClpSchema,
  openSince: z.iso.datetime().nullable(),
});
export type TableOverview = z.infer<typeof TableOverviewSchema>;

/** What a table's QR needs: an unguessable token that opens the menu showing the table's name. */
export const TableQrSchema = z.object({
  id: z.uuid(),
  number: z.number().int(),
  label: z.string(),
  token: z.string().min(16),
});
export type TableQr = z.infer<typeof TableQrSchema>;

export const TableLabelSchema = z.object({ label: z.string() });
