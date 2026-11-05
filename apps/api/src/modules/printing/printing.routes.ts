import { Router } from 'express';
import type { PrintingController } from './printing.controller.js';

export function createPrintingRouter(controller: PrintingController): Router {
  const router = Router();
  router.get('/printer', controller.status);
  router.post('/printer/test', controller.test);
  router.post('/orders/:orderId/print', controller.reprint);
  router.get('/print-jobs', controller.listJobs);
  return router;
}
