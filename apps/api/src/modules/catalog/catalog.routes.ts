import { Router } from 'express';
import type { CatalogController } from './catalog.controller.js';

export function createCatalogRouter(controller: CatalogController): Router {
  const router = Router();
  router.get('/categories', controller.listCategories);
  router.get('/products', controller.listProducts);
  router.get('/menu', controller.getPublicMenu);
  return router;
}
