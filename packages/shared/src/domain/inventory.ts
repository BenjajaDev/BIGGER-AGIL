import { z } from 'zod';

export const SUPPLY_UNITS = ['kg', 'g', 'l', 'ml', 'un'] as const;
export const SupplyUnitSchema = z.enum(SUPPLY_UNITS);
export type SupplyUnit = z.infer<typeof SupplyUnitSchema>;

export const UNIT_LABELS: Readonly<Record<SupplyUnit, string>> = {
  kg: 'kg',
  g: 'g',
  l: 'litros',
  ml: 'ml',
  un: 'unidades',
};

const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato AAAA-MM-DD');
const quantity = z.number().min(0).max(1_000_000);

export const SupplierInputSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre').max(60),
  /** WhatsApp number in international format without «+», e.g. 56912345678. */
  phone: z
    .string()
    .trim()
    .regex(/^\d{8,15}$/, 'Usa formato internacional sin «+» ni espacios')
    .nullable(),
});
export type SupplierInput = z.infer<typeof SupplierInputSchema>;

export const SupplierSchema = SupplierInputSchema.extend({ id: z.uuid() });
export type Supplier = z.infer<typeof SupplierSchema>;

export const SupplyInputSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre').max(60),
  unit: SupplyUnitSchema,
  minStock: quantity,
  costPerUnitClp: z.number().int().min(0).max(10_000_000),
  supplierId: z.uuid().nullable(),
  expiresOn: DateOnlySchema.nullable(),
});
export type SupplyInput = z.infer<typeof SupplyInputSchema>;

export const SupplySchema = SupplyInputSchema.extend({
  id: z.uuid(),
  stock: z.number().min(0),
  supplierName: z.string().nullable(),
});
export type Supply = z.infer<typeof SupplySchema>;

export const MOVEMENT_KINDS = ['purchase', 'usage', 'waste', 'adjustment'] as const;
export const MovementKindSchema = z.enum(MOVEMENT_KINDS);
export type MovementKind = z.infer<typeof MovementKindSchema>;

/** What a person can register by hand; `usage` is written by sales, never typed. */
export const MovementInputSchema = z.object({
  kind: z.enum(['purchase', 'waste', 'adjustment']),
  /** Purchase and waste: how much; adjustment: the counted stock. */
  quantity: quantity,
  /** A purchase can bring a new expiry date. */
  expiresOn: DateOnlySchema.nullable().default(null),
  note: z.string().trim().max(120).default(''),
});
export type MovementInput = z.infer<typeof MovementInputSchema>;

export const StockMovementSchema = z.object({
  id: z.uuid(),
  supplyId: z.uuid(),
  supplyName: z.string(),
  kind: MovementKindSchema,
  /** Signed: positive adds stock, negative removes it. */
  delta: z.number(),
  costClp: z.number().int(),
  note: z.string(),
  createdAt: z.iso.datetime(),
});
export type StockMovement = z.infer<typeof StockMovementSchema>;

export const RecipeInputSchema = z.object({
  lines: z
    .array(z.object({ supplyId: z.uuid(), quantity: z.number().positive().max(1_000_000) }))
    .max(30),
});
export type RecipeInput = z.infer<typeof RecipeInputSchema>;

export const RecipeSchema = z.object({
  productId: z.uuid(),
  productName: z.string(),
  lines: RecipeInputSchema.shape.lines,
});
export type Recipe = z.infer<typeof RecipeSchema>;

export const PurchaseGroupSchema = z.object({
  supplier: SupplierSchema.nullable(),
  items: z.array(
    z.object({
      supplyId: z.uuid(),
      name: z.string(),
      unit: SupplyUnitSchema,
      stock: z.number(),
      minStock: z.number(),
      suggestedQuantity: z.number(),
      estimatedCostClp: z.number().int(),
    }),
  ),
  totalClp: z.number().int(),
});
export type PurchaseGroup = z.infer<typeof PurchaseGroupSchema>;

export const WasteSummarySchema = z.object({
  costClp: z.number().int(),
  previousCostClp: z.number().int(),
  items: z.array(z.object({ name: z.string(), quantity: z.number(), costClp: z.number().int() })),
});
export type WasteSummary = z.infer<typeof WasteSummarySchema>;

export type SupplyAlert = 'ok' | 'low' | 'out' | 'expiring' | 'expired';

export const EXPIRY_WARNING_DAYS = 3;

function daysUntil(date: string, today: string): number {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
}

/** The most urgent problem of a supply, in the order a person should deal with them. */
export function supplyAlert(
  supply: Pick<Supply, 'stock' | 'minStock' | 'expiresOn'>,
  today: string,
): SupplyAlert {
  if (supply.expiresOn !== null && supply.expiresOn < today) return 'expired';
  if (supply.stock <= 0) return 'out';
  if (supply.expiresOn !== null && daysUntil(supply.expiresOn, today) <= EXPIRY_WARNING_DAYS) {
    return 'expiring';
  }
  if (supply.stock <= supply.minStock) return 'low';
  return 'ok';
}

const ALERT_ORDER: readonly SupplyAlert[] = ['expired', 'out', 'expiring', 'low', 'ok'];

export function alertRank(alert: SupplyAlert): number {
  return ALERT_ORDER.indexOf(alert);
}

/** Buy enough to reach twice the minimum; whole units for things counted one by one. */
export function suggestedPurchase(supply: Pick<Supply, 'stock' | 'minStock' | 'unit'>): number {
  const missing = Math.max(supply.minStock * 2 - supply.stock, 0);
  return supply.unit === 'un' ? Math.ceil(missing) : Math.round(missing * 100) / 100;
}
