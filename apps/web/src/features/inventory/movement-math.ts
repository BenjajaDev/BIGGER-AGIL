import type { Supply, SupplyUnit } from '@bigger/shared';
import { formatQuantity, formatSigned } from './supply-text';

export type RegisterKind = 'purchase' | 'waste' | 'adjustment';

export const KIND_COPY: Readonly<
  Record<RegisterKind, { label: string; submit: string; undo: string }>
> = {
  purchase: { label: 'Llegó', submit: 'Guardar llegada', undo: 'llegada' },
  waste: { label: 'Se perdió', submit: 'Registrar pérdida', undo: 'pérdida' },
  adjustment: { label: 'Contar', submit: 'Guardar conteo', undo: 'conteo' },
};

/** Amounts that are quick to add for each unit: the usual box, bag or bottle sizes. */
export const QUICK_AMOUNTS: Readonly<Record<SupplyUnit, readonly number[]>> = {
  kg: [0.5, 1, 5],
  g: [100, 500, 1000],
  l: [0.5, 1, 5],
  ml: [100, 500, 1000],
  un: [1, 5, 10],
};

/** How much the − and + buttons move the quantity. */
export const STEP: Readonly<Record<SupplyUnit, number>> = { kg: 0.5, g: 50, l: 0.5, ml: 50, un: 1 };

export const WASTE_REASONS = ['Venció', 'Se echó a perder', 'Se cayó o rompió', 'Otro'] as const;

/** «4,5» or «4.5» → 4.5; anything that is not a plain number → null. */
export function parseQuantity(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '' || !/^\d*\.?\d+$|^\d+\.$/.test(normalized)) return null;
  return Number(normalized);
}

/** The number as typed in a es-CL field: comma as decimal separator, no thousands grouping. */
export function quantityText(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',');
}

export function nextStock(kind: RegisterKind, stock: number, quantity: number): number {
  if (kind === 'purchase') return stock + quantity;
  if (kind === 'waste') return Math.max(stock - quantity, 0);
  return quantity;
}

/** Plain-words problem with the typed quantity, or null when it can be saved. */
export function quantityError(
  kind: RegisterKind,
  supply: Pick<Supply, 'stock' | 'unit'>,
  text: string,
): string | null {
  const quantity = parseQuantity(text);
  if (quantity === null) {
    return kind === 'adjustment' ? 'Escribe cuánto hay contado' : 'Escribe la cantidad';
  }
  if (kind !== 'adjustment' && quantity <= 0) return 'Indica una cantidad mayor que cero';
  if (kind === 'waste' && quantity > supply.stock) {
    return `Solo hay ${formatQuantity(supply.stock, supply.unit)} en bodega`;
  }
  return null;
}

/** «Guardar llegada · +5 kg»: the button says exactly what will be written. */
export function submitLabel(
  kind: RegisterKind,
  supply: Pick<Supply, 'stock' | 'unit'>,
  quantity: number | null,
): string {
  const { submit } = KIND_COPY[kind];
  if (quantity === null) return submit;
  if (kind === 'adjustment') return `${submit} · ${formatQuantity(quantity, supply.unit)}`;
  return `${submit} · ${formatSigned(kind === 'purchase' ? quantity : -quantity, supply.unit)}`;
}

/** «Se registró +5 kg de Palta» for the undo toast. */
export function doneMessage(
  kind: RegisterKind,
  supply: Pick<Supply, 'name' | 'stock' | 'unit'>,
  quantity: number,
): string {
  if (kind === 'adjustment') {
    return `Se contó ${formatQuantity(quantity, supply.unit)} de ${supply.name}`;
  }
  const delta = kind === 'purchase' ? quantity : -Math.min(quantity, supply.stock);
  return `Se registró ${formatSigned(delta, supply.unit)} de ${supply.name}`;
}

/** `2026-11-27` + 7 → `2026-12-04`, as calendar dates (no time zones involved). */
export function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
