import {
  canTransitionOrder,
  resolveGroupRules,
  type ApiFieldIssue,
  type CreateOrderInput,
  type CreateOrderItemInput,
  type Order,
  type OrderListFilter,
  type UpdateOrderStatusInput,
  type ProductSize,
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

  async updateStatus(id: string, input: UpdateOrderStatusInput): Promise<Order> {
    const current = await this.#repository.findById(id);
    if (!current) throw AppError.notFound('Pedido');
    if (!canTransitionOrder(current.status, input.status)) {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        `No se puede cambiar el pedido de ${current.status} a ${input.status}`,
      );
    }

    const updated = await this.#repository.updateStatus(id, current.status, input.status);
    if (!updated) {
      throw new AppError(
        'CONFLICT',
        'El pedido cambió mientras se actualizaba. Vuelve a consultarlo',
      );
    }

    this.#publisher.publish({ type: 'order.updated', payload: updated });
    return updated;
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
      const size = resolveSize(product, line, index, issues);
      if (size === undefined) return;
      items.push({
        productId: product.id,
        productName: product.name,
        unitPriceClp: size?.priceClp ?? product.priceClp,
        quantity: line.quantity,
        quickNotes: line.quickNotes,
        note: line.note,
        options: [
          ...(size ? [sizeSnapshot(size)] : []),
          ...resolveModifiers(product, size, line, index, issues),
          ...resolveComboChoices(product, line, index, issues),
        ],
      });
    });

    if (issues.length > 0) throw AppError.validation(issues);
    return items;
  }
}

function lineTotalClp(item: NewOrderItem): number {
  return item.options.reduce((sum, option) => sum + option.priceDeltaClp, item.unitPriceClp);
}

/**
 * The size sets the unit price and the customization rules. Returns `null` for a product without
 * sizes and `undefined` when the line is invalid (an issue was recorded).
 */
function resolveSize(
  product: OrderableProduct,
  line: CreateOrderItemInput,
  index: number,
  issues: ApiFieldIssue[],
): ProductSize | null | undefined {
  const path = `items.${index}.sizeId`;
  if (product.sizes.length === 0) {
    if (line.sizeId === null) return null;
    issues.push({ path, message: `«${product.name}» no tiene tamaños` });
    return undefined;
  }
  const size = product.sizes.find((candidate) => candidate.id === line.sizeId);
  if (!size) {
    issues.push({ path, message: `Elige un tamaño para «${product.name}»` });
    return undefined;
  }
  return size;
}

function sizeSnapshot(size: ProductSize): NewOrderItemOption {
  return { kind: 'size', label: 'Tamaño', name: size.name, priceDeltaClp: 0, referenceId: size.id };
}

/** Snapshots each chosen customization and enforces the selection rules of the chosen size. */
function resolveModifiers(
  product: OrderableProduct,
  size: ProductSize | null,
  line: CreateOrderItemInput,
  index: number,
  issues: ApiFieldIssue[],
): NewOrderItemOption[] {
  const rules = resolveGroupRules(product.modifierGroups, size);
  const chosenPerGroup = new Map<string, number>();
  const options: NewOrderItemOption[] = [];

  line.options.forEach((chosen, optionIndex) => {
    const path = `items.${index}.options.${optionIndex}`;
    const rule = rules.find((candidate) => candidate.group.id === chosen.groupId);
    const option = rule?.group.options.find((candidate) => candidate.id === chosen.optionId);
    if (!rule || !option) {
      issues.push({
        path,
        message: size
          ? `Esa personalización no se ofrece en tamaño ${size.name}`
          : 'La personalización ya no existe',
      });
      return;
    }
    if (!option.isAvailable) {
      issues.push({ path, message: `«${option.name}» no está disponible` });
      return;
    }
    chosenPerGroup.set(rule.group.id, (chosenPerGroup.get(rule.group.id) ?? 0) + 1);
    options.push({
      kind: 'modifier',
      label: rule.group.name,
      name: option.name,
      priceDeltaClp: option.priceDeltaClp,
      referenceId: option.id,
    });
  });

  for (const rule of rules) {
    const chosen = chosenPerGroup.get(rule.group.id) ?? 0;
    if (chosen < rule.minSelections) {
      issues.push({
        path: `items.${index}.options`,
        message: `Elige al menos ${rule.minSelections} en «${rule.group.name}»`,
      });
    } else if (chosen > rule.maxSelections) {
      issues.push({
        path: `items.${index}.options`,
        message: `Puedes elegir hasta ${rule.maxSelections} en «${rule.group.name}»`,
      });
    }
  }
  return options;
}

/** One product per slot; required slots must be chosen, optional ones may be left empty. */
function resolveComboChoices(
  product: OrderableProduct,
  line: CreateOrderItemInput,
  index: number,
  issues: ApiFieldIssue[],
): NewOrderItemOption[] {
  const options: NewOrderItemOption[] = [];
  const chosenSlots = new Set<string>();

  line.comboChoices.forEach((chosen, choiceIndex) => {
    const path = `items.${index}.comboChoices.${choiceIndex}`;
    const slot = product.comboSlots.find((candidate) => candidate.id === chosen.slotId);
    const option = slot?.options.find((candidate) => candidate.productId === chosen.productId);
    if (!slot || !option) {
      issues.push({ path, message: 'La opción del combo ya no existe' });
      return;
    }
    if (chosenSlots.has(slot.id)) {
      issues.push({ path, message: `Solo se elige una opción en «${slot.name}»` });
      return;
    }
    if (!option.isAvailable) {
      issues.push({ path, message: `«${option.productName}» no está disponible` });
      return;
    }
    chosenSlots.add(slot.id);
    options.push({
      kind: 'combo',
      label: slot.name,
      name: option.productName,
      priceDeltaClp: option.extraPriceClp,
      referenceId: option.productId,
    });
  });

  for (const slot of product.comboSlots) {
    if (slot.isRequired && !chosenSlots.has(slot.id)) {
      issues.push({ path: `items.${index}.comboChoices`, message: `Elige «${slot.name}»` });
    }
  }
  return options;
}
