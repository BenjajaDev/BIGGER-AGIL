import {
  BarChart3,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  type LucideIcon,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from 'lucide-react';

export type NavGroup = 'operation' | 'management';

export const NAV_GROUPS: Readonly<Record<NavGroup, { label: string }>> = {
  operation: { label: 'Operación' },
  management: { label: 'Gestión' },
};

/** Live counters shown next to a module; the data comes from `useNavBadges`. */
export type NavBadgeKey = 'tablesToPay' | 'kitchenNew';

export interface NavBadge {
  key: NavBadgeKey;
  /** What a screen reader hears for the count, e.g. «2 mesas por cobrar». */
  describe: (count: number) => string;
}

interface BaseModule {
  path: `/${string}`;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
  badge?: NavBadge;
}

export interface ActiveModule extends BaseModule {
  status: 'active';
}

export interface InDevelopmentModule extends BaseModule {
  status: 'in-development';
  summary: string;
  plannedFeatures: readonly string[];
  plannedIncrement: string;
}

export type AppModule = ActiveModule | InDevelopmentModule;

/** Single source of truth for the internal navigation and the "En desarrollo" routes. */
export const APP_MODULES: readonly AppModule[] = [
  { path: '/', label: 'Resumen', icon: LayoutDashboard, group: 'operation', status: 'active' },
  {
    path: '/mesas',
    label: 'Mesas',
    icon: LayoutGrid,
    group: 'operation',
    status: 'active',
    badge: {
      key: 'tablesToPay',
      describe: (count) => `${count} ${count === 1 ? 'mesa por cobrar' : 'mesas por cobrar'}`,
    },
  },
  { path: '/pedido', label: 'Pedido', icon: ClipboardList, group: 'operation', status: 'active' },
  {
    path: '/cocina',
    label: 'Cocina',
    icon: ChefHat,
    group: 'operation',
    status: 'active',
    badge: {
      key: 'kitchenNew',
      describe: (count) => `${count} ${count === 1 ? 'pedido nuevo' : 'pedidos nuevos'}`,
    },
  },
  {
    path: '/configuracion',
    label: 'Carta y ajustes',
    icon: Settings,
    group: 'management',
    status: 'active',
  },
  {
    path: '/bodega',
    group: 'management',
    label: 'Bodega',
    icon: Package,
    status: 'in-development',
    summary: 'Control de insumos con descuento automático al vender.',
    plannedFeatures: [
      'Stock de insumos actualizado con cada venta',
      'Alertas de stock bajo el mínimo',
      'Avisos de productos por vencer',
    ],
    plannedIncrement: 'INC-4',
  },
  {
    path: '/compras',
    group: 'management',
    label: 'Compras',
    icon: ShoppingCart,
    status: 'in-development',
    summary: 'Lista de compra sugerida según el stock y lo que se vende cada semana.',
    plannedFeatures: [
      'Lista de compra agrupada por proveedor',
      'Envío del pedido al proveedor por WhatsApp',
    ],
    plannedIncrement: 'INC-4',
  },
  { path: '/reportes', label: 'Reportes', icon: BarChart3, group: 'management', status: 'active' },
  {
    path: '/clientes',
    group: 'management',
    label: 'Clientes',
    icon: Users,
    status: 'in-development',
    summary: 'Cuentas semanales de clientes frecuentes, sin cuadernos.',
    plannedFeatures: ['Cuenta semanal por cliente', 'Recordatorio de cierre de cuenta'],
    plannedIncrement: 'Por definir con BIGGER',
  },
];

export const IN_DEVELOPMENT_MODULES = APP_MODULES.filter(
  (module): module is InDevelopmentModule => module.status === 'in-development',
);

export function modulesIn(group: NavGroup): readonly AppModule[] {
  return APP_MODULES.filter((module) => module.group === group);
}

/** The area a route belongs to; unknown routes stay in Operación. */
export function groupOf(pathname: string): NavGroup {
  const match = APP_MODULES.find(
    (module) =>
      module.path !== '/' && (pathname === module.path || pathname.startsWith(`${module.path}/`)),
  );
  return match?.group ?? 'operation';
}
