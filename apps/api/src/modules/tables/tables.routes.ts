import { Router } from 'express';
import type { TablesController } from './tables.controller.js';

export function createTablesRouter(controller: TablesController): Router {
  const router = Router();
  router.get('/tables', controller.listOverview);
  return router;
}
