import { Router, type RequestHandler } from 'express';
import type {
  CategoriesAdminController,
  ModifierGroupsAdminController,
  ProductsAdminController,
  ProductTypesController,
} from './catalog-admin.controller.js';

export interface CatalogAdminControllers {
  categories: CategoriesAdminController;
  products: ProductsAdminController;
  modifierGroups: ModifierGroupsAdminController;
  productTypes: ProductTypesController;
}

/** Every route below `/admin` requires a valid admin session. */
export function createCatalogAdminRouter(
  { categories, products, modifierGroups, productTypes }: CatalogAdminControllers,
  requireAdmin: RequestHandler,
  extraAdminRouters: readonly Router[] = [],
): Router {
  const admin = Router();
  admin.use(requireAdmin);
  for (const extra of extraAdminRouters) admin.use(extra);

  admin.get('/categories', categories.list);
  admin.post('/categories', categories.create);
  admin.put('/categories/:id', categories.update);
  admin.delete('/categories/:id', categories.archive);
  admin.post('/categories/:id/restore', categories.restore);

  admin.get('/products', products.list);
  admin.post('/products', products.create);
  admin.get('/products/:id', products.get);
  admin.put('/products/:id', products.update);
  admin.delete('/products/:id', products.archive);
  admin.post('/products/:id/restore', products.restore);

  admin.get('/modifier-groups', modifierGroups.list);
  admin.post('/modifier-groups', modifierGroups.create);
  admin.get('/modifier-groups/:id', modifierGroups.get);
  admin.put('/modifier-groups/:id', modifierGroups.update);
  admin.delete('/modifier-groups/:id', modifierGroups.delete);

  admin.get('/product-types', productTypes.list);
  admin.post('/product-types', productTypes.create);
  admin.get('/product-types/:id', productTypes.get);
  admin.put('/product-types/:id', productTypes.update);
  admin.delete('/product-types/:id', productTypes.delete);

  const router = Router();
  router.use('/admin', admin);
  return router;
}
