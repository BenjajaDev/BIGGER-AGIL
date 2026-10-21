import type { Order, OrderListFilter } from '@bigger/shared';
import type { OrdersRepository } from './orders.repository.js';

export class OrdersService {
  readonly #repository: OrdersRepository;

  constructor(repository: OrdersRepository) {
    this.#repository = repository;
  }

  list(filter: OrderListFilter): Promise<Order[]> {
    return this.#repository.list({
      ...(filter.status ? { statuses: filter.status } : {}),
      ...(filter.channel ? { channel: filter.channel } : {}),
    });
  }
}
