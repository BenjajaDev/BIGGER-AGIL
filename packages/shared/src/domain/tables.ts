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
  itemCount: z.int().nonnegative(),
  openTotalClp: PriceClpSchema,
  openSince: z.iso.datetime().nullable(),
});
export type TableOverview = z.infer<typeof TableOverviewSchema>;
