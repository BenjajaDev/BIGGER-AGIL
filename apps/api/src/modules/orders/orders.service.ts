import type {
  ApiFieldIssue,
  CreateOrderInput,
  CreateOrderItemInput,
  Order,
  OrderListFilter,
} from '@bigger/shared';
import { AppError } from '../../core/errors/app-error.js';
import type { RealtimePublisher } from '../../realtime/event-hub.js';
import type {
  NewOrderItem,
  NewOrderItemOption,
  OrderableProduct,
  OrdersRepository,
} from './orders.repository.js';

export class OrdersService {
  readonly #repository: OrdersRepository;
  readonly #publisher: RealtimePublisher;

  constructor(repository: OrdersRepository, publisher: RealtimePublisher) {
    this.#repository = repository;
    this.#publisher = publisher;
  }

  list(filter: OrderListFilter): Promise<Order[]> {
    return this.#repository.list({
      ...(filter.status ? { statuses: filter.status } : {}),
      ...(filter.channel ? { channel: filter.channel } : {}),
    });
  }

  async create(input: CreateOrderInput): Promise<Order> {
    if (input.channel === 'takeaway' && input.customerName === null) {
      throw AppError.validation([
        { path: 'customerName', message: 'Un pedido para llevar requiere un nombre' },
      ]);
    }

    const items = await this.#priceItems(input.items);
    const totalClp = items.reduce((sum, item) => sum + lineTotalClp(item) * item.quantity, 0);

    const order = await this.#repository.create({
      channel: input.channel,
      tableId: input.tableId,
      customerName: input.customerName,
      pickupAt: input.pickupAt === null ? null : new Date(input.pickupAt),
      totalClp,
      items,
    });

    this.#publisher.publish({ type: 'order.created', payload: order });
    return order;
  }

  /** The server owns the price: it snapshots the current catalog, never trusting the client. */
  async #priceItems(lines: CreateOrderInput['items']): Promise<NewOrderItem[]> {
    const products = await this.#repository.productsForOrder(lines.map((line) => line.productId));
    const byId = new Map(products.map((product) => [product.id, product]));

    const issues: ApiFieldIssue[] = [];
    const items: NewOrderItem[] = [];
    lines.forEach((line, index) => {
      const product = byId.get(line.productId);
      if (!product || product.archivedAt !== null) {
        issues.push({ path: `items.${index}.productId`, message: 'El producto ya no existe' });
        return;
      }
      if (!product.isAvailable) {
        issues.push({
          path: `items.${index}.productId`,
          message: `«${product.name}» no está disponible`,
        });
        return;
      }
      items.push({
        productId: product.id,
        productName: product.name,
        unitPriceClp: product.priceClp,
        quantity: line.quantity,
        quickNotes: line.quickNotes,
        note: line.note,
        options: resolveOptions(product, line, index, issues),
      });
    });

    if (issues.length > 0) throw AppError.validation(issues);
    return items;
  }
}

function lineTotalClp(item: NewOrderItem): number {
  return item.options.reduce((sum, option) => sum + option.priceDeltaClp, item.unitPriceClp);
}

/** Resolves each chosen option against the product's catalog, snapshotting name and price. */
function resolveOptions(
  product: OrderableProduct,
  line: CreateOrderItemInput,
  index: number,
  issues: ApiFieldIssue[],
): NewOrderItemOption[] {
  const options: NewOrderItemOption[] = [];

  line.options.forEach((chosen, optionIndex) => {
    const path = `items.${index}.options.${optionIndex}`;
    const group = product.modifierGroups.find((candidate) => candidate.id === chosen.groupId);
    const option = group?.options.find((candidate) => candidate.id === chosen.optionId);
    if (!group || !option) {
      issues.push({ path, message: 'La personalización ya no existe' });
      return;
    }
    if (!option.isAvailable) {
      issues.push({ path, message: `«${option.name}» no está disponible` });
      return;
    }
    options.push({
      kind: 'modifier',
      label: group.name,
      name: option.name,
      priceDeltaClp: option.priceDeltaClp,
      referenceId: option.id,
    });
  });

  line.comboChoices.forEach((chosen, choiceIndex) => {
    const path = `items.${index}.comboChoices.${choiceIndex}`;
    const slot = product.comboSlots.find((candidate) => candidate.id === chosen.slotId);
    const option = slot?.options.find((candidate) => candidate.productId === chosen.productId);
    if (!slot || !option) {
      issues.push({ path, message: 'La opción del combo ya no existe' });
      return;
    }
    if (!option.isAvailable) {
      issues.push({ path, message: `«${option.productName}» no está disponible` });
      return;
    }
    options.push({
      kind: 'combo',
      label: slot.name,
      name: option.productName,
      priceDeltaClp: option.extraPriceClp,
      referenceId: option.productId,
    });
  });

  return options;
}
