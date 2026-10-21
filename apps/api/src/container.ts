import type { Router } from 'express';
import type { AppDatabase } from './db/client.js';
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
}

/** Composition root: the only place that knows concrete implementations. */
export function buildApiRouters({ db, eventHub }: ContainerDependencies): Router[] {
  const ordersRepository = new DrizzleOrdersRepository(db);

  const catalogController = new CatalogController(
    new CatalogService(new DrizzleCatalogRepository(db)),
  );
  const ordersController = new OrdersController(new OrdersService(ordersRepository));
  const tablesController = new TablesController(
    new TablesService(new DrizzleTablesRepository(db), ordersRepository),
  );

  return [
    createHealthRouter(),
    createCatalogRouter(catalogController),
    createOrdersRouter(ordersController),
    createTablesRouter(tablesController),
    createRealtimeRouter(eventHub),
  ];
}
