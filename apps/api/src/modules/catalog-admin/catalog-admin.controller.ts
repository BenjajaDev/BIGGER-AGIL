import {
  CategoryInputSchema,
  IncludeArchivedQuerySchema,
  ModifierGroupInputSchema,
  ProductInputSchema,
} from '@bigger/shared';
import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import { parseOrThrow } from '../../core/http/parse.js';
import { sendData } from '../../core/http/respond.js';
import type { CategoriesAdminService } from './categories.service.js';
import type { ModifierGroupsAdminService } from './modifier-groups.service.js';
import type { ProductsAdminService } from './products.service.js';

const IdParamsSchema = z.object({ id: z.uuid() });

const idOf = (req: Request) => parseOrThrow(IdParamsSchema, req.params).id;
const includeArchivedOf = (req: Request) =>
  parseOrThrow(IncludeArchivedQuerySchema, req.query).includeArchived;

export class CategoriesAdminController {
  readonly #service: CategoriesAdminService;

  constructor(service: CategoriesAdminService) {
    this.#service = service;
  }

  list: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.list(includeArchivedOf(req)));
  };

  create: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.create(parseOrThrow(CategoryInputSchema, req.body)), 201);
  };

  rename: RequestHandler = async (req, res) => {
    sendData(
      res,
      await this.#service.rename(idOf(req), parseOrThrow(CategoryInputSchema, req.body)),
    );
  };

  archive: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.archive(idOf(req)));
  };

  restore: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.restore(idOf(req)));
  };
}

export class ProductsAdminController {
  readonly #service: ProductsAdminService;

  constructor(service: ProductsAdminService) {
    this.#service = service;
  }

  list: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.list(includeArchivedOf(req)));
  };

  get: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.get(idOf(req)));
  };

  create: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.create(parseOrThrow(ProductInputSchema, req.body)), 201);
  };

  update: RequestHandler = async (req, res) => {
    sendData(
      res,
      await this.#service.update(idOf(req), parseOrThrow(ProductInputSchema, req.body)),
    );
  };

  archive: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.archive(idOf(req)));
  };

  restore: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.restore(idOf(req)));
  };
}

export class ModifierGroupsAdminController {
  readonly #service: ModifierGroupsAdminService;

  constructor(service: ModifierGroupsAdminService) {
    this.#service = service;
  }

  list: RequestHandler = async (_req, res) => {
    sendData(res, await this.#service.list());
  };

  get: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.get(idOf(req)));
  };

  create: RequestHandler = async (req, res) => {
    sendData(
      res,
      await this.#service.create(parseOrThrow(ModifierGroupInputSchema, req.body)),
      201,
    );
  };

  update: RequestHandler = async (req, res) => {
    sendData(
      res,
      await this.#service.update(idOf(req), parseOrThrow(ModifierGroupInputSchema, req.body)),
    );
  };

  delete: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.delete(idOf(req)));
  };
}
