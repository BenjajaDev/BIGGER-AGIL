import {
  CreateOrderInputSchema,
  OrderListFilterSchema,
  UpdateOrderStatusInputSchema,
} from '@bigger/shared';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { parseOrThrow } from '../../core/http/parse.js';
import { sendData } from '../../core/http/respond.js';
import type { OrdersService } from './orders.service.js';

const OrderParamsSchema = z.object({ orderId: z.uuid() });

export class OrdersController {
  readonly #service: OrdersService;

  constructor(service: OrdersService) {
    this.#service = service;
  }

  list: RequestHandler = async (req, res) => {
    const filter = parseOrThrow(OrderListFilterSchema, req.query);
    sendData(res, await this.#service.list(filter));
  };

  create: RequestHandler = async (req, res) => {
    const input = parseOrThrow(CreateOrderInputSchema, req.body);
    sendData(res, await this.#service.create(input), 201);
  };

  updateStatus: RequestHandler = async (req, res) => {
    const { orderId } = parseOrThrow(OrderParamsSchema, req.params);
    const input = parseOrThrow(UpdateOrderStatusInputSchema, req.body);
    sendData(res, await this.#service.updateStatus(orderId, input));
  };
}
