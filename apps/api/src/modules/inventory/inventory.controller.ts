import {
  MovementInputSchema,
  RecipeInputSchema,
  ReportRangeSchema,
  SupplierInputSchema,
  SupplyInputSchema,
} from '@bigger/shared';
import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import { parseOrThrow } from '../../core/http/parse.js';
import { sendData } from '../../core/http/respond.js';
import type { InventoryService } from './inventory.service.js';

const IdParamsSchema = z.object({ id: z.uuid() });
const ProductParamsSchema = z.object({ productId: z.uuid() });
const idOf = (req: Request) => parseOrThrow(IdParamsSchema, req.params).id;

export class InventoryController {
  readonly #service: InventoryService;

  constructor(service: InventoryService) {
    this.#service = service;
  }

  supplies: RequestHandler = async (_req, res) => {
    sendData(res, await this.#service.supplies());
  };

  createSupply: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.createSupply(parseOrThrow(SupplyInputSchema, req.body)), 201);
  };

  updateSupply: RequestHandler = async (req, res) => {
    sendData(
      res,
      await this.#service.updateSupply(idOf(req), parseOrThrow(SupplyInputSchema, req.body)),
    );
  };

  archiveSupply: RequestHandler = async (req, res) => {
    await this.#service.archiveSupply(idOf(req));
    sendData(res, null);
  };

  registerMovement: RequestHandler = async (req, res) => {
    sendData(
      res,
      await this.#service.registerMovement(idOf(req), parseOrThrow(MovementInputSchema, req.body)),
      201,
    );
  };

  movements: RequestHandler = async (_req, res) => {
    sendData(res, await this.#service.movements());
  };

  suppliers: RequestHandler = async (_req, res) => {
    sendData(res, await this.#service.suppliers());
  };

  createSupplier: RequestHandler = async (req, res) => {
    sendData(
      res,
      await this.#service.createSupplier(parseOrThrow(SupplierInputSchema, req.body)),
      201,
    );
  };

  updateSupplier: RequestHandler = async (req, res) => {
    sendData(
      res,
      await this.#service.updateSupplier(idOf(req), parseOrThrow(SupplierInputSchema, req.body)),
    );
  };

  archiveSupplier: RequestHandler = async (req, res) => {
    await this.#service.archiveSupplier(idOf(req));
    sendData(res, null);
  };

  purchaseList: RequestHandler = async (_req, res) => {
    sendData(res, await this.#service.purchaseList());
  };

  recipes: RequestHandler = async (_req, res) => {
    sendData(res, await this.#service.recipes());
  };

  setRecipe: RequestHandler = async (req, res) => {
    const { productId } = parseOrThrow(ProductParamsSchema, req.params);
    await this.#service.setRecipe(productId, parseOrThrow(RecipeInputSchema, req.body));
    sendData(res, null);
  };

  waste: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.wasteSummary(parseOrThrow(ReportRangeSchema, req.query)));
  };
}
