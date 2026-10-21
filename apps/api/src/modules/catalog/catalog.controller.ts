import { ProductFilterSchema } from '@bigger/shared';
import type { RequestHandler } from 'express';
import { parseOrThrow } from '../../core/http/parse.js';
import { sendData } from '../../core/http/respond.js';
import type { CatalogService } from './catalog.service.js';

export class CatalogController {
  readonly #service: CatalogService;

  constructor(service: CatalogService) {
    this.#service = service;
  }

  listCategories: RequestHandler = async (_req, res) => {
    sendData(res, await this.#service.listCategories());
  };

  listProducts: RequestHandler = async (req, res) => {
    const filter = parseOrThrow(ProductFilterSchema, req.query);
    sendData(res, await this.#service.listProducts(filter));
  };

  getPublicMenu: RequestHandler = async (_req, res) => {
    sendData(res, await this.#service.getPublicMenu());
  };
}
