import type { PaymentMethod } from '@bigger/shared';
import { checks, orderItems, orders, payments } from '../schema.js';
import type { SeedTransaction } from './seed-types.js';

/** Products that sell the most, with a relative weight: the demo history follows real habits. */
const BEST_SELLERS: readonly (readonly [string, number])[] = [
  ['Chacarero', 9],
  ['Italiano', 8],
  ['Roll canela', 8],
  ['Luco', 6],
  ['Italiana', 6],
  ['Pie limón', 5],
  ['Cheesecake Berries', 5],
  ['Napolitano', 4],
  ['Kuchen manzana', 4],
  ['César', 3],
  ['Chilena', 3],
  ['Media luna', 3],
  ['Pollo 1', 2],
  ['Crumbl cookies rellenas', 2],
  ['Vegetariana', 1],
];

const METHODS: readonly PaymentMethod[] = ['debit', 'debit', 'cash', 'cash', 'junaeb'];
const HISTORY_DAYS = 35;
const DAY_MS = 86_400_000;

/** Deterministic generator (mulberry32): the same seed always draws the same history. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export interface HistoryProduct {
  id: string;
  priceClp: number;
}

/**
 * Paid and delivered orders for the last weeks (today excluded), so Reportes shows trends,
 * the comparison with the previous period and the best and slowest sellers.
 */
export function seedSalesHistory(
  tx: SeedTransaction,
  now: Date,
  productsByName: ReadonlyMap<string, HistoryProduct>,
): void {
  const random = createRandom(2026);
  const pick = <T>(values: readonly T[]): T => values[Math.floor(random() * values.length)] as T;
  const weighted = BEST_SELLERS.flatMap(([name, weight]) => Array<string>(weight).fill(name));

  for (let daysAgo = HISTORY_DAYS; daysAgo >= 1; daysAgo -= 1) {
    const day = new Date(now.getTime() - daysAgo * DAY_MS);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const orderCount = (weekend ? 11 : 8) + Math.floor(random() * 5) + (HISTORY_DAYS - daysAgo) / 3;

    for (let index = 0; index < orderCount; index += 1) {
      const createdAt = new Date(day);
      createdAt.setHours(10 + Math.floor(random() * 10), Math.floor(random() * 60), 0, 0);
      const lines = Array.from({ length: 1 + Math.floor(random() * 3) }, () => {
        const productName = pick(weighted);
        const product = productsByName.get(productName);
        if (!product) throw new Error(`Producto del historial no encontrado: ${productName}`);
        return { productName, product, quantity: 1 + Math.floor(random() * 2) };
      });
      const totalClp = lines.reduce((sum, line) => sum + line.product.priceClp * line.quantity, 0);

      const [check] = tx
        .insert(checks)
        .values({ status: 'closed', closedAt: createdAt, createdAt, updatedAt: createdAt })
        .returning({ id: checks.id })
        .all();
      if (!check) throw new Error('No se pudo crear la cuenta del historial');
      const [order] = tx
        .insert(orders)
        .values({
          checkId: check.id,
          channel: random() < 0.2 ? 'whatsapp' : 'takeaway',
          status: 'delivered',
          totalClp,
          createdAt,
          updatedAt: createdAt,
        })
        .returning({ id: orders.id })
        .all();
      if (!order) throw new Error('No se pudo crear el pedido del historial');
      tx.insert(orderItems)
        .values(
          lines.map((line, position) => ({
            orderId: order.id,
            position,
            productId: line.product.id,
            productName: line.productName,
            unitPriceClp: line.product.priceClp,
            quantity: line.quantity,
            quickNotes: [],
          })),
        )
        .run();
      const method = pick(METHODS);
      tx.insert(payments)
        .values({
          checkId: check.id,
          method,
          mode: 'full',
          amountClp: totalClp,
          tipClp:
            method === 'junaeb' || random() < 0.5 ? 0 : Math.round((totalClp * 0.1) / 10) * 10,
          receivedClp: method === 'cash' ? Math.ceil(totalClp / 1000) * 1000 : null,
          createdAt: new Date(createdAt.getTime() + 25 * 60_000),
        })
        .run();
    }
  }
}
