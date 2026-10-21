import { Router } from 'express';
import type { OrdersController } from './orders.controller.js';

export function createOrdersRouter(controller: OrdersController): Router {
  const router = Router();
  router.get('/orders', controller.list);
  return router;
}
