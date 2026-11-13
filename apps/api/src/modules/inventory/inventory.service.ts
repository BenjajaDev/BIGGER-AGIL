import type {
  MovementInput,
  Order,
  PurchaseGroup,
  Recipe,
  RecipeInput,
  ReportRange,
  StockMovement,
  Supplier,
  SupplierInput,
  Supply,
  SupplyInput,
  WasteSummary,
} from '@bigger/shared';
import { AppError } from '../../core/errors/app-error.js';
import type { Logger } from '../../core/logger.js';
import type { RealtimeEvent } from '@bigger/shared';
import { addDays, localDate } from '../reports/local-date.js';
import { previousRange } from '../reports/sales-report.js';
import type { InventoryRepository } from './inventory.repository.js';
import { buildPurchaseList } from './purchase-list.js';

const MOVEMENT_LIMIT = 100;

export interface OrderEvents {
  subscribe: (listener: (event: RealtimeEvent) => void) => () => void;
}

export class InventoryService {
  readonly #repository: InventoryRepository;
  readonly #timeZone: string;
  readonly #logger: Logger;
  readonly #now: () => Date;

  constructor(
    repository: InventoryRepository,
    timeZone: string,
    logger: Logger,
    now: () => Date = () => new Date(),
  ) {
    this.#repository = repository;
    this.#timeZone = timeZone;
    this.#logger = logger;
    this.#now = now;
  }

  /** Selling takes the recipe quantities out of the stock; a failure here never blocks the order. */
  start(events: OrderEvents): void {
    events.subscribe((event) => {
      if (event.type !== 'order.created') return;
      this.deductForOrder(event.payload).catch((error: unknown) => {
        this.#logger.error(
          { err: error, orderId: event.payload.id },
          'No se pudo descontar el stock',
        );
      });
    });
  }

  async deductForOrder(order: Pick<Order, 'id' | 'items'>): Promise<void> {
    const lines = await this.#repository.recipeLinesFor(order.items.map((item) => item.productId));
    for (const item of order.items) {
      for (const line of lines.filter((candidate) => candidate.productId === item.productId)) {
        await this.#repository.applyMovement({
          supplyId: line.supplyId,
          kind: 'usage',
          delta: -line.quantity * item.quantity,
          newExpiresOn: null,
          note: `Pedido ${order.id.slice(0, 8)}`,
        });
      }
    }
  }

  supplies(): Promise<Supply[]> {
    return this.#repository.listSupplies();
  }

  async createSupply(input: SupplyInput): Promise<Supply> {
    await this.#assertSupplier(input.supplierId);
    return this.#get(await this.#repository.createSupply(input));
  }

  async updateSupply(id: string, input: SupplyInput): Promise<Supply> {
    await this.#get(id);
    await this.#assertSupplier(input.supplierId);
    await this.#repository.updateSupply(id, input);
    return this.#get(id);
  }

  async archiveSupply(id: string): Promise<void> {
    await this.#get(id);
    await this.#repository.archiveSupply(id);
  }

  async registerMovement(id: string, input: MovementInput): Promise<Supply> {
    const supply = await this.#get(id);
    if (input.kind !== 'adjustment' && input.quantity === 0) {
      throw AppError.validation([
        { path: 'quantity', message: 'Indica una cantidad mayor que cero' },
      ]);
    }
    const delta =
      input.kind === 'purchase'
        ? input.quantity
        : input.kind === 'waste'
          ? -input.quantity
          : input.quantity - supply.stock;
    await this.#repository.applyMovement({
      supplyId: id,
      kind: input.kind,
      delta,
      newExpiresOn: input.kind === 'purchase' ? input.expiresOn : null,
      note: input.note,
    });
    return this.#get(id);
  }

  movements(): Promise<StockMovement[]> {
    return this.#repository.listMovements(MOVEMENT_LIMIT);
  }

  suppliers(): Promise<Supplier[]> {
    return this.#repository.listSuppliers();
  }

  async createSupplier(input: SupplierInput): Promise<Supplier> {
    const id = await this.#repository.createSupplier(input);
    return { id, ...input };
  }

  async updateSupplier(id: string, input: SupplierInput): Promise<Supplier> {
    await this.#assertSupplier(id);
    await this.#repository.updateSupplier(id, input);
    return { id, ...input };
  }

  async archiveSupplier(id: string): Promise<void> {
    await this.#assertSupplier(id);
    await this.#repository.archiveSupplier(id);
  }

  async purchaseList(): Promise<PurchaseGroup[]> {
    const [supplies, suppliers] = await Promise.all([
      this.#repository.listSupplies(),
      this.#repository.listSuppliers(),
    ]);
    return buildPurchaseList(supplies, suppliers, localDate(this.#now(), this.#timeZone));
  }

  recipes(): Promise<Recipe[]> {
    return this.#repository.listRecipes();
  }

  async setRecipe(productId: string, input: RecipeInput): Promise<void> {
    const known = new Set((await this.#repository.listSupplies()).map((supply) => supply.id));
    const unknown = input.lines.findIndex((line) => !known.has(line.supplyId));
    if (unknown >= 0) {
      throw AppError.validation([
        { path: `lines.${String(unknown)}.supplyId`, message: 'El insumo ya no existe' },
      ]);
    }
    await this.#repository.setRecipe(productId, input.lines);
  }

  async wasteSummary(range: ReportRange): Promise<WasteSummary> {
    const previous = previousRange(range);
    const start = new Date(Date.parse(`${addDays(previous.from, -1)}T00:00:00Z`));
    const end = new Date(Date.parse(`${addDays(range.to, 2)}T00:00:00Z`));
    const rows = await this.#repository.wasteBetween(start, end);
    const inside = (row: { createdAt: Date }, window: ReportRange) => {
      const day = localDate(row.createdAt, this.#timeZone);
      return day >= window.from && day <= window.to;
    };
    const current = rows.filter((row) => inside(row, range));
    const byName = new Map<string, { quantity: number; costClp: number }>();
    for (const row of current) {
      const entry = byName.get(row.supplyName) ?? { quantity: 0, costClp: 0 };
      entry.quantity += Math.abs(row.delta);
      entry.costClp += row.costClp;
      byName.set(row.supplyName, entry);
    }
    const total = (list: readonly { costClp: number }[]) =>
      list.reduce((sum, row) => sum + row.costClp, 0);
    return {
      costClp: total(current),
      previousCostClp: total(rows.filter((row) => inside(row, previous))),
      items: [...byName]
        .map(([name, value]) => ({ name, ...value }))
        .sort((a, b) => b.costClp - a.costClp)
        .slice(0, 5),
    };
  }

  async #get(id: string): Promise<Supply> {
    const supply = await this.#repository.findSupply(id);
    if (!supply) throw AppError.notFound('Insumo');
    return supply;
  }

  async #assertSupplier(id: string | null): Promise<void> {
    if (id === null) return;
    const known = (await this.#repository.listSuppliers()).some((supplier) => supplier.id === id);
    if (!known) throw AppError.notFound('Proveedor');
  }
}
