import type { Router } from 'express';
import type { AppDatabase } from './db/client.js';
import type { Logger } from './core/logger.js';
import { AdminAuthController } from './modules/admin-auth/admin-auth.controller.js';
import { createAdminAuthRouter } from './modules/admin-auth/admin-auth.routes.js';
import { AdminAuthService, type AdminAuthConfig } from './modules/admin-auth/admin-auth.service.js';
import { LoginThrottle } from './modules/admin-auth/login-throttle.js';
import { requireAdmin } from './modules/admin-auth/require-admin.js';
import {
  CategoriesAdminController,
  ModifierGroupsAdminController,
  ProductsAdminController,
  ProductTypesController,
} from './modules/catalog-admin/catalog-admin.controller.js';
import { createCatalogAdminRouter } from './modules/catalog-admin/catalog-admin.routes.js';
import { DrizzleCategoriesAdminRepository } from './modules/catalog-admin/categories.repository.js';
import { DrizzleCatalogLookups } from './modules/catalog-admin/catalog-lookups.js';
import { CategoriesAdminService } from './modules/catalog-admin/categories.service.js';
import { DrizzleProductTypesRepository } from './modules/catalog-admin/product-types.repository.js';
import { ProductTypesService } from './modules/catalog-admin/product-types.service.js';
import { SharpImageProcessor } from './modules/images/image-processor.js';
import { LocalImageStorage } from './modules/images/image-storage.js';
import { DrizzleImagesRepository } from './modules/images/images.repository.js';
import { createImagesRouter } from './modules/images/images.routes.js';
import { ImagesService } from './modules/images/images.service.js';
import { DrizzleModifierGroupsAdminRepository } from './modules/catalog-admin/modifier-groups.repository.js';
import { ModifierGroupsAdminService } from './modules/catalog-admin/modifier-groups.service.js';
import { DrizzleProductsAdminRepository } from './modules/catalog-admin/products.repository.js';
import { ProductsAdminService } from './modules/catalog-admin/products.service.js';
import { BrailleController } from './modules/braille/braille.controller.js';
import { createBrailleRouter } from './modules/braille/braille.routes.js';
import { BrailleService } from './modules/braille/braille.service.js';
import { CatalogController } from './modules/catalog/catalog.controller.js';
import { ChecksController } from './modules/checks/checks.controller.js';
import { DrizzleChecksRepository } from './modules/checks/checks.repository.js';
import { createChecksRouter } from './modules/checks/checks.routes.js';
import { ChecksService } from './modules/checks/checks.service.js';
import { DrizzleCatalogRepository } from './modules/catalog/catalog.repository.js';
import { createCatalogRouter } from './modules/catalog/catalog.routes.js';
import { CatalogService, type CatalogClock } from './modules/catalog/catalog.service.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { DrizzlePrintJobsRepository } from './modules/printing/print-jobs.repository.js';
import { PrintService } from './modules/printing/print.service.js';
import { PrintingController } from './modules/printing/printing.controller.js';
import type { PrintingSetup } from './modules/printing/printing.config.js';
import { createPrintingRouter } from './modules/printing/printing.routes.js';
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
  /** Where processed images are written (served under `/media`). */
  uploadsDir: string;
  /** Shop time zone and clock used to decide which promotions are running. */
  clock: CatalogClock;
  /** The thermal printer (or none) and how it prints. */
  printing: PrintingSetup;
  logger: Logger;
}

/** Composition root: the only place that knows concrete implementations. */
export function buildApiRouters({
  db,
  eventHub,
  adminAuth,
  uploadsDir,
  clock,
  printing,
  logger,
}: ContainerDependencies): Router[] {
  const ordersRepository = new DrizzleOrdersRepository(db);
  const modifierGroupsRepository = new DrizzleModifierGroupsAdminRepository(db);
  const lookups = new DrizzleCatalogLookups(db);
  const adminAuthService = new AdminAuthService(adminAuth, new LoginThrottle());

  const catalogService = new CatalogService(new DrizzleCatalogRepository(db), clock);
  const catalogController = new CatalogController(catalogService);
  const brailleRouter = createBrailleRouter(
    new BrailleController(new BrailleService(catalogService)),
  );
  const checksService = new ChecksService(
    new DrizzleChecksRepository(db),
    ordersRepository,
    eventHub,
  );
  const printService = new PrintService({
    jobs: new DrizzlePrintJobsRepository(db),
    printer: printing.printer,
    orders: ordersRepository,
    options: printing.options,
    logger,
  });
  void printService.start(eventHub).catch((error: unknown) => {
    logger.error({ err: error }, 'No se pudo iniciar la impresión');
  });
  const ordersController = new OrdersController(
    new OrdersService(ordersRepository, eventHub, checksService),
  );
  const tablesController = new TablesController(
    new TablesService(new DrizzleTablesRepository(db), checksService),
  );
  const catalogAdminControllers = {
    categories: new CategoriesAdminController(
      new CategoriesAdminService(new DrizzleCategoriesAdminRepository(db), lookups, eventHub),
    ),
    products: new ProductsAdminController(
      new ProductsAdminService(new DrizzleProductsAdminRepository(db), lookups, eventHub),
    ),
    modifierGroups: new ModifierGroupsAdminController(
      new ModifierGroupsAdminService(modifierGroupsRepository, eventHub),
    ),
    productTypes: new ProductTypesController(
      new ProductTypesService(new DrizzleProductTypesRepository(db), lookups),
    ),
  };
  const imagesRouter = createImagesRouter(
    new ImagesService(
      new SharpImageProcessor(),
      new LocalImageStorage(uploadsDir),
      new DrizzleImagesRepository(db),
    ),
  );

  return [
    createHealthRouter(),
    createCatalogRouter(catalogController),
    createOrdersRouter(ordersController),
    createTablesRouter(tablesController),
    createChecksRouter(new ChecksController(checksService)),
    createPrintingRouter(new PrintingController(printService)),
    createRealtimeRouter(eventHub),
    createAdminAuthRouter(new AdminAuthController(adminAuthService)),
    createCatalogAdminRouter(catalogAdminControllers, requireAdmin(adminAuthService), [
      imagesRouter,
      brailleRouter,
    ]),
  ];
}
