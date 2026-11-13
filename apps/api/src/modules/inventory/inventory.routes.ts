import { Router } from 'express';
import type { InventoryController } from './inventory.controller.js';

/** Mounted below `/admin`: stock and costs need the administration session. */
export function createInventoryRouter(c: InventoryController): Router {
  const router = Router();
  router.get('/inventory/supplies', c.supplies);
  router.post('/inventory/supplies', c.createSupply);
  router.put('/inventory/supplies/:id', c.updateSupply);
  router.delete('/inventory/supplies/:id', c.archiveSupply);
  router.post('/inventory/supplies/:id/movements', c.registerMovement);
  router.get('/inventory/movements', c.movements);
  router.get('/inventory/suppliers', c.suppliers);
  router.post('/inventory/suppliers', c.createSupplier);
  router.put('/inventory/suppliers/:id', c.updateSupplier);
  router.delete('/inventory/suppliers/:id', c.archiveSupplier);
  router.get('/inventory/purchase-list', c.purchaseList);
  router.get('/inventory/recipes', c.recipes);
  router.put('/inventory/recipes/:productId', c.setRecipe);
  router.get('/inventory/waste', c.waste);
  return router;
}
