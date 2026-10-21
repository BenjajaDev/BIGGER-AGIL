import type { OrderStatus } from '@bigger/shared';
import {
  CircleCheck,
  CircleDollarSign,
  CircleSlash,
  Flame,
  HandPlatter,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { StatusTone } from '../../components/ui/StatusBadge';

export interface OrderStatusPresentation {
  label: string;
  tone: StatusTone;
  icon: LucideIcon;
}

export const ORDER_STATUS_PRESENTATION: Readonly<Record<OrderStatus, OrderStatusPresentation>> = {
  new: { label: 'Nuevo', tone: 'neutral', icon: Sparkles },
  preparing: { label: 'En preparación', tone: 'warning', icon: Flame },
  ready: { label: 'Listo', tone: 'success', icon: CircleCheck },
  delivered: { label: 'Entregado', tone: 'highlight', icon: HandPlatter },
  paid: { label: 'Pagado', tone: 'neutral', icon: CircleDollarSign },
  cancelled: { label: 'Anulado', tone: 'neutral', icon: CircleSlash },
};
