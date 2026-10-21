import {
  BarChart3,
  ChefHat,
  ClipboardList,
  LayoutGrid,
  type LucideIcon,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from 'lucide-react';

interface BaseModule {
  path: `/${string}`;
  label: string;
  icon: LucideIcon;
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
  { path: '/mesas', label: 'Mesas', icon: LayoutGrid, status: 'active' },
  { path: '/pedido', label: 'Pedido', icon: ClipboardList, status: 'active' },
  { path: '/cocina', label: 'Cocina', icon: ChefHat, status: 'active' },
  { path: '/configuracion', label: 'Configuración', icon: Settings, status: 'active' },
  {
    path: '/bodega',
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
  {
    path: '/reportes',
    label: 'Reportes',
    icon: BarChart3,
    status: 'in-development',
    summary: 'Resumen de ventas para decidir con datos reales.',
    plannedFeatures: [
      'Ventas, pedidos y ticket promedio por semana, mes y temporada',
      'Lo más vendido y productos de poca salida',
      'Exportación a PDF',
    ],
    plannedIncrement: 'INC-5',
  },
  {
    path: '/clientes',
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
