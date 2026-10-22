import { Router } from 'express';
import type { OrdersController } from './orders.controller.js';

export function createOrdersRouter(controller: OrdersController): Router {
  const router = Router();
  router.get('/orders', controller.list);
  router.post('/orders', controller.create);
  router.patch('/orders/:orderId/status', controller.updateStatus);
  return router;
}
