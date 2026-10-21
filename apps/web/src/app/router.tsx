import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { AppShell } from '../components/layout/AppShell';
import { RouteFallback } from './RouteFallback';
import { IN_DEVELOPMENT_MODULES } from './navigation';

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
