import type { SupplyUnit } from '@bigger/shared';
import { recipeItems, stockMovements, suppliers, supplies } from '../schema.js';
import type { SeedTransaction } from './seed-types.js';

interface SeedSupply {
  name: string;
  unit: SupplyUnit;
  stock: number;
  minStock: number;
  costPerUnitClp: number;
  supplier: string;
  /** Days from today until it expires. */
  expiresInDays?: number;
  /** Units lost before the demo starts, so Reportes and Bodega show some shrinkage. */
  wasted?: number;
}

const SEED_SUPPLIERS = [
  { name: 'Panadería La Espiga', phone: '56911112222' },
  { name: 'Carnes del Maule', phone: '56933334444' },
  { name: 'Verdulería Don Lucho', phone: '56955556666' },
  { name: 'Distribuidora Lácteos Sur', phone: '56977778888' },
] as const;

/** Stock levels tuned for the demo: two supplies run low and one expires soon. */
const SEED_SUPPLIES: readonly SeedSupply[] = [
  {
    name: 'Pan frica',
    unit: 'un',
    stock: 60,
    minStock: 40,
    costPerUnitClp: 180,
    supplier: 'Panadería La Espiga',
  },
  {
    name: 'Pan de molde',
    unit: 'un',
    stock: 12,
    minStock: 20,
    costPerUnitClp: 90,
    supplier: 'Panadería La Espiga',
  },
  {
    name: 'Carne de vacuno',
    unit: 'kg',
    stock: 3.5,
    minStock: 6,
    costPerUnitClp: 9800,
    supplier: 'Carnes del Maule',
  },
  {
    name: 'Pechuga de pollo',
    unit: 'kg',
    stock: 7,
    minStock: 4,
    costPerUnitClp: 5200,
    supplier: 'Carnes del Maule',
  },
  {
    name: 'Palta',
    unit: 'kg',
    stock: 4,
    minStock: 3,
    costPerUnitClp: 4500,
    supplier: 'Verdulería Don Lucho',
    expiresInDays: 2,
    wasted: 0.5,
  },
  {
    name: 'Tomate',
    unit: 'kg',
    stock: 6,
    minStock: 3,
    costPerUnitClp: 1600,
    supplier: 'Verdulería Don Lucho',
  },
  {
    name: 'Porotos verdes',
    unit: 'kg',
    stock: 2.5,
    minStock: 2,
    costPerUnitClp: 2800,
    supplier: 'Verdulería Don Lucho',
  },
  {
    name: 'Queso mantecoso',
    unit: 'kg',
    stock: 3,
    minStock: 2,
    costPerUnitClp: 8900,
    supplier: 'Distribuidora Lácteos Sur',
    expiresInDays: 9,
  },
  {
    name: 'Mayonesa',
    unit: 'kg',
    stock: 4,
    minStock: 2,
    costPerUnitClp: 3200,
    supplier: 'Distribuidora Lácteos Sur',
  },
];

/** What each product uses per unit sold. */
const SEED_RECIPES: readonly (readonly [string, readonly (readonly [string, number])[]])[] = [
  [
    'Chacarero',
    [
      ['Pan frica', 1],
      ['Carne de vacuno', 0.12],
      ['Porotos verdes', 0.05],
      ['Tomate', 0.05],
    ],
  ],
  [
    'Italiano',
    [
      ['Pan frica', 1],
      ['Carne de vacuno', 0.12],
      ['Palta', 0.06],
      ['Tomate', 0.05],
      ['Mayonesa', 0.02],
    ],
  ],
  [
    'Luco',
    [
      ['Pan frica', 1],
      ['Carne de vacuno', 0.12],
      ['Queso mantecoso', 0.04],
    ],
  ],
  [
    'Napolitano',
    [
      ['Pan de molde', 2],
      ['Queso mantecoso', 0.04],
      ['Tomate', 0.04],
    ],
  ],
];

const DAY_MS = 86_400_000;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function seedInventory(
  tx: SeedTransaction,
  now: Date,
  productIdsByName: ReadonlyMap<string, string>,
): void {
  const supplierIds = new Map<string, string>();
  for (const supplier of SEED_SUPPLIERS) {
    const [created] = tx.insert(suppliers).values(supplier).returning({ id: suppliers.id }).all();
    if (!created) throw new Error(`No se pudo crear el proveedor ${supplier.name}`);
    supplierIds.set(supplier.name, created.id);
  }

  const supplyIds = new Map<string, string>();
  for (const supply of SEED_SUPPLIES) {
    const purchasedAt = new Date(now.getTime() - 3 * DAY_MS);
    const [created] = tx
      .insert(supplies)
      .values({
        name: supply.name,
        unit: supply.unit,
        stock: supply.stock,
        minStock: supply.minStock,
        costPerUnitClp: supply.costPerUnitClp,
        supplierId: supplierIds.get(supply.supplier) ?? null,
        expiresOn:
          supply.expiresInDays === undefined
            ? null
            : isoDate(new Date(now.getTime() + supply.expiresInDays * DAY_MS)),
        createdAt: purchasedAt,
        updatedAt: purchasedAt,
      })
      .returning({ id: supplies.id })
      .all();
    if (!created) throw new Error(`No se pudo crear el insumo ${supply.name}`);
    supplyIds.set(supply.name, created.id);

    const wasted = supply.wasted ?? 0;
    tx.insert(stockMovements)
      .values([
        {
          supplyId: created.id,
          kind: 'purchase',
          delta: supply.stock + wasted,
          costClp: Math.round((supply.stock + wasted) * supply.costPerUnitClp),
          note: 'Compra semanal',
          createdAt: purchasedAt,
        },
        ...(wasted > 0
          ? [
              {
                supplyId: created.id,
                kind: 'waste' as const,
                delta: -wasted,
                costClp: Math.round(wasted * supply.costPerUnitClp),
                note: 'Maduró de más',
                createdAt: new Date(now.getTime() - DAY_MS),
              },
            ]
          : []),
      ])
      .run();
  }

  for (const [productName, items] of SEED_RECIPES) {
    const productId = productIdsByName.get(productName);
    if (!productId) throw new Error(`Producto de receta no encontrado: ${productName}`);
    tx.insert(recipeItems)
      .values(
        items.map(([supplyName, quantity]) => {
          const supplyId = supplyIds.get(supplyName);
          if (!supplyId) throw new Error(`Insumo de receta no encontrado: ${supplyName}`);
          return { productId, supplyId, quantity };
        }),
      )
      .run();
  }
}
