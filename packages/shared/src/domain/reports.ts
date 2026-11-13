import { z } from 'zod';
import { PaymentMethodSchema } from './checks.js';

const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato AAAA-MM-DD');
const MAX_RANGE_DAYS = 366;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** A period of whole days in the shop's time zone, both ends included. */
export const ReportRangeSchema = z
  .object({ from: DateOnlySchema, to: DateOnlySchema })
  .refine((range) => daysBetween(range.from, range.to) >= 0, {
    message: 'La fecha final no puede ser anterior a la inicial',
    path: ['to'],
  })
  .refine((range) => daysBetween(range.from, range.to) < MAX_RANGE_DAYS, {
    message: 'El período no puede pasar de un año',
    path: ['to'],
  });
export type ReportRange = z.infer<typeof ReportRangeSchema>;

export const ReportKindSchema = z.enum(['daily', 'products', 'payments']);
export type ReportKind = z.infer<typeof ReportKindSchema>;

const MoneySchema = z.number().int();

export const SalesTotalsSchema = z.object({
  salesClp: MoneySchema,
  tipsClp: MoneySchema,
  orders: z.number().int(),
  averageTicketClp: MoneySchema,
});
export type SalesTotals = z.infer<typeof SalesTotalsSchema>;

export const SalesReportSchema = z.object({
  range: z.object({ from: DateOnlySchema, to: DateOnlySchema }),
  totals: SalesTotalsSchema,
  /** The period of the same length right before, to compare against. */
  previous: SalesTotalsSchema,
  byMethod: z.array(
    z.object({ method: PaymentMethodSchema, amountClp: MoneySchema, payments: z.number().int() }),
  ),
  byDay: z.array(
    z.object({ date: DateOnlySchema, salesClp: MoneySchema, orders: z.number().int() }),
  ),
  topProducts: z.array(
    z.object({ name: z.string(), quantity: z.number().int(), revenueClp: MoneySchema }),
  ),
  /** Products still on the menu that sold least: candidates to buy less of. */
  slowProducts: z.array(z.object({ name: z.string(), quantity: z.number().int() })),
});
export type SalesReport = z.infer<typeof SalesReportSchema>;

export const CashCloseInputSchema = z.object({
  date: DateOnlySchema,
  countedCashClp: z.number().int().min(0).max(100_000_000),
  note: z.string().trim().max(240).default(''),
});
export type CashCloseInput = z.infer<typeof CashCloseInputSchema>;

export const CashCloseRecordSchema = z.object({
  countedCashClp: MoneySchema,
  expectedCashClp: MoneySchema,
  differenceClp: MoneySchema,
  note: z.string(),
  closedAt: z.iso.datetime(),
});
export type CashCloseRecord = z.infer<typeof CashCloseRecordSchema>;

export const CashCloseSummarySchema = z.object({
  date: DateOnlySchema,
  byMethod: z.array(
    z.object({
      method: PaymentMethodSchema,
      amountClp: MoneySchema,
      tipsClp: MoneySchema,
      payments: z.number().int(),
    }),
  ),
  salesClp: MoneySchema,
  tipsClp: MoneySchema,
  /** Cash that should be in the drawer: cash payments plus the tips paid in cash. */
  expectedCashClp: MoneySchema,
  voided: z.array(
    z.object({ method: PaymentMethodSchema, amountClp: MoneySchema, reason: z.string() }),
  ),
  close: CashCloseRecordSchema.nullable(),
});
export type CashCloseSummary = z.infer<typeof CashCloseSummarySchema>;
