import type { Router } from 'express';
import type { AppDatabase } from './db/client.js';
import { AdminAuthController } from './modules/admin-auth/admin-auth.controller.js';
import { createAdminAuthRouter } from './modules/admin-auth/admin-auth.routes.js';
import { AdminAuthService, type AdminAuthConfig } from './modules/admin-auth/admin-auth.service.js';
import { LoginThrottle } from './modules/admin-auth/login-throttle.js';
import { requireAdmin } from './modules/admin-auth/require-admin.js';
import {
  CategoriesAdminController,
  ModifierGroupsAdminController,
  ProductsAdminController,
} from './modules/catalog-admin/catalog-admin.controller.js';
import { createCatalogAdminRouter } from './modules/catalog-admin/catalog-admin.routes.js';
import { DrizzleCategoriesAdminRepository } from './modules/catalog-admin/categories.repository.js';
import { CategoriesAdminService } from './modules/catalog-admin/categories.service.js';
import { DrizzleModifierGroupsAdminRepository } from './modules/catalog-admin/modifier-groups.repository.js';
import { ModifierGroupsAdminService } from './modules/catalog-admin/modifier-groups.service.js';
import { DrizzleProductsAdminRepository } from './modules/catalog-admin/products.repository.js';
import { ProductsAdminService } from './modules/catalog-admin/products.service.js';
import { CatalogController } from './modules/catalog/catalog.controller.js';
import { DrizzleCatalogRepository } from './modules/catalog/catalog.repository.js';
import { createCatalogRouter } from './modules/catalog/catalog.routes.js';
import { CatalogService } from './modules/catalog/catalog.service.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { OrdersController } from './modules/orders/orders.controller.js';
import { DrizzleOrdersRepository } from './modules/orders/orders.repository.js';
import { createOrdersRouter } from './modules/orders/orders.routes.js';
import { OrdersService } from './modules/orders/orders.service.js';
import { TablesController } from './modules/tables/tables.controller.js';
import { DrizzleTablesRepository } from './modules/tables/tables.repository.js';
import { createTablesRouter } from './modules/tables/tables.routes.js';
import { TablesService } from './modules/tables/tables.service.js';
import type { EventHub } from './realtime/event-hub.js';
import { createRealtimeRouter } from './realtime/realtime.routes.js';

export interface ContainerDependencies {
  db: AppDatabase;
  eventHub: EventHub;
  adminAuth: AdminAuthConfig;
}

/** Composition root: the only place that knows concrete implementations. */
export function buildApiRouters({ db, eventHub, adminAuth }: ContainerDependencies): Router[] {
  const ordersRepository = new DrizzleOrdersRepository(db);
  const modifierGroupsRepository = new DrizzleModifierGroupsAdminRepository(db);
  const adminAuthService = new AdminAuthService(adminAuth, new LoginThrottle());

  const catalogController = new CatalogController(
    new CatalogService(new DrizzleCatalogRepository(db)),
  );
  const ordersController = new OrdersController(new OrdersService(ordersRepository, eventHub));
  const tablesController = new TablesController(
    new TablesService(new DrizzleTablesRepository(db), ordersRepository),
  );
  const catalogAdminControllers = {
    categories: new CategoriesAdminController(
      new CategoriesAdminService(new DrizzleCategoriesAdminRepository(db), eventHub),
    ),
    products: new ProductsAdminController(
      new ProductsAdminService(
        new DrizzleProductsAdminRepository(db),
        modifierGroupsRepository,
        eventHub,
      ),
    ),
    modifierGroups: new ModifierGroupsAdminController(
      new ModifierGroupsAdminService(modifierGroupsRepository, eventHub),
    ),
  };

  return [
    createHealthRouter(),
    createCatalogRouter(catalogController),
    createOrdersRouter(ordersController),
    createTablesRouter(tablesController),
    createRealtimeRouter(eventHub),
    createAdminAuthRouter(new AdminAuthController(adminAuthService)),
    createCatalogAdminRouter(catalogAdminControllers, requireAdmin(adminAuthService)),
  ];
}
