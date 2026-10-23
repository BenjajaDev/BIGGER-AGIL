import { Router } from 'express';
import type { ChecksController } from './checks.controller.js';

export function createChecksRouter(controller: ChecksController): Router {
  const router = Router();
  router.get('/tables/:tableId/check', controller.getForTable);
  router.get('/checks/:checkId', controller.get);
  router.put('/checks/:checkId/split', controller.setSplit);
  router.post('/checks/:checkId/payments', controller.pay);
  router.post('/payments/:paymentId/void', controller.voidPayment);
  return router;
}
