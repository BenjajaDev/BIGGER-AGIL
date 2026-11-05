import { PrintJobFilterSchema } from '@bigger/shared';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { parseOrThrow } from '../../core/http/parse.js';
import { sendData } from '../../core/http/respond.js';
import type { PrintService } from './print.service.js';

const OrderParamsSchema = z.object({ orderId: z.uuid() });

export class PrintingController {
  readonly #service: PrintService;

  constructor(service: PrintService) {
    this.#service = service;
  }

  status: RequestHandler = async (_req, res) => {
    sendData(res, await this.#service.status());
  };

  test: RequestHandler = async (_req, res) => {
    sendData(res, await this.#service.printTest());
  };

  reprint: RequestHandler = async (req, res) => {
    const { orderId } = parseOrThrow(OrderParamsSchema, req.params);
    // Accepted, not done: the ticket is queued and prints in a moment.
    sendData(res, await this.#service.reprintOrder(orderId), 202);
  };

  listJobs: RequestHandler = async (req, res) => {
    const filter = parseOrThrow(PrintJobFilterSchema, req.query);
    sendData(res, await this.#service.listJobs(filter));
  };
}
