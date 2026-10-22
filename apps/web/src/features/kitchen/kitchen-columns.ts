import type { KitchenOrderStatus, OrderStatus } from '@bigger/shared';
import { CircleCheck, Flame, Sparkles, type LucideIcon } from 'lucide-react';
import type { ButtonVariant } from '../../components/ui/Button';

export interface KitchenColumnConfig {
  status: KitchenOrderStatus;
  title: string;
  icon: LucideIcon;
  emptyMessage: string;
  action: { label: string; variant: ButtonVariant; nextStatus: OrderStatus };
}

export const KITCHEN_COLUMNS: readonly KitchenColumnConfig[] = [
  {
    status: 'new',
    title: 'Nuevos',
    icon: Sparkles,
    emptyMessage: 'No hay pedidos nuevos',
    action: { label: 'Empezar', variant: 'primary', nextStatus: 'preparing' },
  },
  {
    status: 'preparing',
    title: 'En preparación',
    icon: Flame,
    emptyMessage: 'Nada en preparación',
    action: { label: 'Marcar listo', variant: 'warning', nextStatus: 'ready' },
  },
  {
    status: 'ready',
    title: 'Listos para entregar',
    icon: CircleCheck,
    emptyMessage: 'Nada esperando entrega',
    action: { label: 'Entregado', variant: 'success', nextStatus: 'delivered' },
  },
];
