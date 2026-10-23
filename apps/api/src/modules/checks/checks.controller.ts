import {
  CreatePaymentInputSchema,
  SetSplitInputSchema,
  VoidPaymentInputSchema,
} from '@bigger/shared';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { parseOrThrow } from '../../core/http/parse.js';
import { sendData } from '../../core/http/respond.js';
import type { ChecksService } from './checks.service.js';

const CheckParamsSchema = z.object({ checkId: z.uuid() });
const TableParamsSchema = z.object({ tableId: z.uuid() });
const PaymentParamsSchema = z.object({ paymentId: z.uuid() });

export class ChecksController {
  readonly #service: ChecksService;

  constructor(service: ChecksService) {
    this.#service = service;
  }

  getForTable: RequestHandler = async (req, res) => {
    const { tableId } = parseOrThrow(TableParamsSchema, req.params);
    sendData(res, await this.#service.getOpenForTable(tableId));
  };

  get: RequestHandler = async (req, res) => {
    const { checkId } = parseOrThrow(CheckParamsSchema, req.params);
    sendData(res, await this.#service.getById(checkId));
  };

  setSplit: RequestHandler = async (req, res) => {
    const { checkId } = parseOrThrow(CheckParamsSchema, req.params);
    const input = parseOrThrow(SetSplitInputSchema, req.body);
    sendData(res, await this.#service.setSplit(checkId, input));
  };

  pay: RequestHandler = async (req, res) => {
    const { checkId } = parseOrThrow(CheckParamsSchema, req.params);
    const input = parseOrThrow(CreatePaymentInputSchema, req.body);
    sendData(res, await this.#service.pay(checkId, input), 201);
  };

  voidPayment: RequestHandler = async (req, res) => {
    const { paymentId } = parseOrThrow(PaymentParamsSchema, req.params);
    const input = parseOrThrow(VoidPaymentInputSchema, req.body);
    sendData(res, await this.#service.voidPayment(paymentId, input));
  };
}
