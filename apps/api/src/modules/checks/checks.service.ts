import {
  isCheckSettled,
  priceItemSelection,
  summarizeCheck,
  type Check,
  type CreatePaymentInput,
  type Order,
  type SetSplitInput,
  type VoidPaymentInput,
} from '@bigger/shared';
import { AppError } from '../../core/errors/app-error.js';
import type { RealtimePublisher } from '../../realtime/event-hub.js';
import type { CheckHooks } from '../orders/check-hooks.js';
import type { OrdersRepository } from '../orders/orders.repository.js';
import type { ChecksRepository, CheckRecord } from './checks.repository.js';

const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const STALE_CHECK = 'La cuenta cambió mientras cobrabas. Revisa el saldo y vuelve a intentarlo';

export class ChecksService implements CheckHooks {
  readonly #checks: ChecksRepository;
  readonly #orders: Pick<OrdersRepository, 'list'>;
  readonly #publisher: RealtimePublisher;

  constructor(
    checks: ChecksRepository,
    orders: Pick<OrdersRepository, 'list'>,
    publisher: RealtimePublisher,
  ) {
    this.#checks = checks;
    this.#orders = orders;
    this.#publisher = publisher;
  }

  async getById(id: string): Promise<Check> {
    const record = await this.#checks.findById(id);
    if (!record) throw AppError.notFound('Cuenta');
    return this.#toCheck(record);
  }

  async getOpenForTable(tableId: string): Promise<Check> {
    const record = await this.#checks.findOpenByTable(tableId);
    if (!record) throw new AppError('NOT_FOUND', 'La mesa no tiene una cuenta abierta');
    return this.#toCheck(record);
  }

  async listOpenForTables(): Promise<Check[]> {
    const records = await this.#checks.listOpenForTables();
    const orders = await this.#orders.list({ checkIds: records.map((record) => record.id) });
    return records.map((record) =>
      this.#build(
        record,
        orders.filter((order) => order.checkId === record.id),
      ),
    );
  }

  async setSplit(id: string, input: SetSplitInput): Promise<Check> {
    const check = await this.#openCheck(id);
    if (!(await this.#checks.setSplit(id, check.version, input.parts))) {
      throw new AppError('CONFLICT', STALE_CHECK);
    }
    return this.#publishCheck(id);
  }

  async pay(id: string, input: CreatePaymentInput): Promise<Check> {
    const check = await this.#openCheck(id);
    if (check.balanceClp === 0) {
      throw new AppError('CONFLICT', 'La cuenta no tiene saldo pendiente');
    }

    const { amountClp, items } = this.#priceInput(check, input);
    if (amountClp > check.balanceClp) {
      throw AppError.validation([
        { path: 'items', message: `Supera el saldo pendiente (${clp.format(check.balanceClp)})` },
      ]);
    }
    if (amountClp !== input.expectedAmountClp) {
      throw new AppError(
        'CONFLICT',
        `El monto cambió: ahora es ${clp.format(amountClp)}. Revisa la cuenta antes de cobrar`,
      );
    }
    const dueClp = amountClp + input.tipClp;
    if (input.receivedClp !== null && input.receivedClp < dueClp) {
      throw AppError.validation([
        { path: 'receivedClp', message: `Recibido menor al total a pagar (${clp.format(dueClp)})` },
      ]);
    }

    const saved = await this.#checks.addPayment(id, check.version, {
      method: input.method,
      mode: input.mode,
      amountClp,
      tipClp: input.tipClp,
      receivedClp: input.receivedClp,
      items,
    });
    if (!saved) throw new AppError('CONFLICT', STALE_CHECK);
    return this.#settle(id);
  }

  async voidPayment(paymentId: string, input: VoidPaymentInput): Promise<Check> {
    const checkId = await this.#checks.findPaymentCheckId(paymentId);
    if (!checkId) throw AppError.notFound('Pago');
    const check = await this.getById(checkId);
    if (check.status === 'closed') {
      throw new AppError('CONFLICT', 'La cuenta ya se cerró: sus pagos no se pueden anular');
    }
    const payment = check.payments.find((candidate) => candidate.id === paymentId);
    if (!payment || payment.voidedAt !== null) {
      throw new AppError('CONFLICT', 'Ese pago ya estaba anulado');
    }
    if (!(await this.#checks.voidPayment(checkId, check.version, payment, input.reason))) {
      throw new AppError('CONFLICT', STALE_CHECK);
    }
    return this.#publishCheck(checkId);
  }

  async assertCanCancel(order: Order): Promise<void> {
    const check = await this.getById(order.checkId);
    const itemIds = new Set(order.items.map((item) => item.id));
    const paidItems = check.payments.some(
      (payment) =>
        payment.voidedAt === null && payment.items.some((item) => itemIds.has(item.orderItemId)),
    );
    if (paidItems || check.paidClp > check.totalClp - order.totalClp) {
      throw new AppError(
        'CONFLICT',
        'Este pedido ya tiene pagos en la cuenta. Anula primero el pago para poder anularlo',
      );
    }
  }

  async afterOrderChange(checkId: string): Promise<void> {
    await this.#settle(checkId);
  }

  /** Closes the check once nothing is owed and everything was delivered, then announces it. */
  async #settle(id: string): Promise<Check> {
    const check = await this.getById(id);
    if (check.status === 'open' && isCheckSettled(check.orders, check.balanceClp)) {
      if (!(await this.#checks.close(id, check.version))) {
        throw new AppError('CONFLICT', STALE_CHECK);
      }
      const closed = await this.getById(id);
      for (const order of closed.orders.filter((candidate) => candidate.status === 'paid')) {
        this.#publisher.publish({ type: 'order.updated', payload: order });
      }
      this.#publisher.publish({ type: 'check.updated', payload: closed });
      return closed;
    }
    this.#publisher.publish({ type: 'check.updated', payload: check });
    return check;
  }

  async #publishCheck(id: string): Promise<Check> {
    const check = await this.getById(id);
    this.#publisher.publish({ type: 'check.updated', payload: check });
    return check;
  }

  async #openCheck(id: string): Promise<Check> {
    const check = await this.getById(id);
    if (check.status === 'closed') throw new AppError('CONFLICT', 'La cuenta ya está cerrada');
    return check;
  }

  #priceInput(check: Check, input: CreatePaymentInput) {
    switch (input.mode) {
      case 'full':
        return { amountClp: check.balanceClp, items: [] };
      case 'equal':
        if (check.nextPartClp === null) {
          throw AppError.validation([
            { path: 'mode', message: 'Primero divide la cuenta en partes iguales' },
          ]);
        }
        return { amountClp: check.nextPartClp, items: [] };
      case 'items': {
        const priced = priceItemSelection(check.lines, input.items);
        if (!priced.ok) {
          throw AppError.validation([
            { path: `items.${priced.index}.quantity`, message: priced.message },
          ]);
        }
        return { amountClp: priced.amountClp, items: priced.items };
      }
    }
  }

  async #toCheck(record: CheckRecord): Promise<Check> {
    return this.#build(record, await this.#orders.list({ checkIds: [record.id] }));
  }

  #build(record: CheckRecord, orders: Order[]): Check {
    const totals = summarizeCheck(orders, record.payments, {
      parts: record.splitParts,
      paidParts: record.splitPaidParts,
    });
    return {
      id: record.id,
      tableId: record.tableId,
      tableLabel: record.tableLabel,
      status: record.status,
      version: record.version,
      splitParts: record.splitParts,
      orders,
      payments: record.payments,
      ...totals,
      openedAt: record.openedAt.toISOString(),
      closedAt: record.closedAt?.toISOString() ?? null,
    };
  }
}
