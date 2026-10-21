import { OrderListFilterSchema } from '@bigger/shared';
import type { RequestHandler } from 'express';
import { parseOrThrow } from '../../core/http/parse.js';
import { sendData } from '../../core/http/respond.js';
import type { OrdersService } from './orders.service.js';

export class OrdersController {
  readonly #service: OrdersService;

  constructor(service: OrdersService) {
    this.#service = service;
  }

  list: RequestHandler = async (req, res) => {
    const filter = parseOrThrow(OrderListFilterSchema, req.query);
    sendData(res, await this.#service.list(filter));
  };
}
