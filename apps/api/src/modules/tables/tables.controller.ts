import type { RequestHandler } from 'express';
import { sendData } from '../../core/http/respond.js';
import type { TablesService } from './tables.service.js';

export class TablesController {
  readonly #service: TablesService;

  constructor(service: TablesService) {
    this.#service = service;
  }

  listOverview: RequestHandler = async (_req, res) => {
    sendData(res, await this.#service.listOverview());
  };
}
