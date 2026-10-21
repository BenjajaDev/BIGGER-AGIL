import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { AppShell } from '../components/layout/AppShell';
import { RouteFallback } from './RouteFallback';
import { IN_DEVELOPMENT_MODULES } from './navigation';

const loadCatalogAdmin = {
  layout: () => import('../features/catalog-admin/ConfigLayout'),
  productList: () => import('../features/catalog-admin/ProductListPage'),
  productEditor: () => import('../features/catalog-admin/ProductEditorPage'),
  groupList: () => import('../features/catalog-admin/ModifierGroupListPage'),
  groupEditor: () => import('../features/catalog-admin/ModifierGroupEditorPage'),
  categories: () => import('../features/catalog-admin/CategoriesPage'),
};

const configurationRoute: RouteObject = {
  path: '/configuracion',
  lazy: () => loadCatalogAdmin.layout().then((m) => ({ Component: m.ConfigLayout })),
  children: [
    { index: true, element: <Navigate to="productos" replace /> },
    ...(['single', 'combo'] as const).flatMap((kind) => {
      const segment = kind === 'single' ? 'productos' : 'combos';
      const editor = () =>
        loadCatalogAdmin.productEditor().then((m) => ({
          Component: () => <m.ProductEditorPage kind={kind} />,
        }));
      return [
        {
          path: segment,
          lazy: () =>
            loadCatalogAdmin.productList().then((m) => ({
              Component: () => <m.ProductListPage kind={kind} />,
            })),
        },
        { path: `${segment}/nuevo`, lazy: editor },
        { path: `${segment}/:productId`, lazy: editor },
      ];
    }),
    {
      path: 'personalizaciones',
      lazy: () =>
        loadCatalogAdmin.groupList().then((m) => ({ Component: m.ModifierGroupListPage })),
    },
    ...['personalizaciones/nueva', 'personalizaciones/:groupId'].map((path) => ({
      path,
      lazy: () =>
        loadCatalogAdmin.groupEditor().then((m) => ({ Component: m.ModifierGroupEditorPage })),
    })),
    {
      path: 'categorias',
      lazy: () => loadCatalogAdmin.categories().then((m) => ({ Component: m.CategoriesPage })),
    },
  ],
};

/** Pages are code-split: phones opening the QR menu never download the internal system. */
const internalRoutes: RouteObject[] = [
  { index: true, element: <Navigate to="/mesas" replace /> },
  {
    path: '/mesas',
    lazy: () => import('../features/tables/TablesPage').then((m) => ({ Component: m.TablesPage })),
  },
  {
    path: '/pedido',
    lazy: () =>
      import('../features/ordering/OrderTakingPage').then((m) => ({
        Component: m.OrderTakingPage,
      })),
  },
  {
    path: '/cocina',
    lazy: () =>
      import('../features/kitchen/KitchenPage').then((m) => ({ Component: m.KitchenPage })),
  },
  configurationRoute,
  ...IN_DEVELOPMENT_MODULES.map((module) => ({
    path: module.path,
    lazy: () =>
      import('../features/under-development/UnderDevelopmentPage').then((m) => ({
        Component: () => <m.UnderDevelopmentPage module={module} />,
      })),
  })),
  {
    path: '*',
    lazy: () => import('../pages/NotFoundPage').then((m) => ({ Component: m.NotFoundPage })),
  },
];

const publicMenuRoutes: RouteObject = {
  path: '/carta',
  lazy: () => import('../features/menu/MenuLayout').then((m) => ({ Component: m.MenuLayout })),
  hydrateFallbackElement: <RouteFallback />,
  children: [
    {
      index: true,
      lazy: () =>
        import('../features/menu/MenuHomePage').then((m) => ({ Component: m.MenuHomePage })),
    },
    {
      path: ':categorySlug',
      lazy: () =>
        import('../features/menu/MenuCategoryPage').then((m) => ({
          Component: m.MenuCategoryPage,
        })),
    },
  ],
};

export function createAppRouter() {
  return createBrowserRouter([
    {
      path: '/',
      element: <AppShell />,
      hydrateFallbackElement: <RouteFallback />,
      children: internalRoutes,
    },
    publicMenuRoutes,
  ]);
}
