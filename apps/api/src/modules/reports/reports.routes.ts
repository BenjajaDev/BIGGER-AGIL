import { Router } from 'express';
import type { ReportsController } from './reports.controller.js';

/** Mounted below `/admin`: sales figures need the administration session. */
export function createReportsRouter(controller: ReportsController): Router {
  const router = Router();
  router.get('/reports/sales', controller.sales);
  router.get('/reports/export.csv', controller.export);
  router.get('/reports/cash-close', controller.cashClose);
  router.post('/reports/cash-close', controller.closeCash);
  return router;
}
