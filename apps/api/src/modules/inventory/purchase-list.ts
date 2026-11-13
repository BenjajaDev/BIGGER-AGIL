import {
  suggestedPurchase,
  supplyAlert,
  type PurchaseGroup,
  type Supplier,
  type Supply,
} from '@bigger/shared';

/** Everything at or under its minimum (or out, or expired), grouped by supplier, ready to order. */
export function buildPurchaseList(
  supplies: readonly Supply[],
  suppliers: readonly Supplier[],
  today: string,
): PurchaseGroup[] {
  const needed = supplies.filter((supply) => {
    const alert = supplyAlert(supply, today);
    return alert === 'low' || alert === 'out' || alert === 'expired';
  });
  const groups = new Map<string | null, PurchaseGroup>();
  for (const supply of needed) {
    const supplier = suppliers.find((candidate) => candidate.id === supply.supplierId) ?? null;
    const key = supplier?.id ?? null;
    const group = groups.get(key) ?? { supplier, items: [], totalClp: 0 };
    const suggestedQuantity = suggestedPurchase(supply);
    const estimatedCostClp = Math.round(suggestedQuantity * supply.costPerUnitClp);
    group.items.push({
      supplyId: supply.id,
      name: supply.name,
      unit: supply.unit,
      stock: supply.stock,
      minStock: supply.minStock,
      suggestedQuantity,
      estimatedCostClp,
    });
    group.totalClp += estimatedCostClp;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) =>
    (a.supplier?.name ?? '￿').localeCompare(b.supplier?.name ?? '￿', 'es'),
  );
}
