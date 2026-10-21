import type { TableStatus } from '@bigger/shared';
import { Circle, CircleDollarSign, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { StatusTone } from '../../components/ui/StatusBadge';

export interface TableStatusPresentation {
  label: string;
  tone: StatusTone;
  icon: LucideIcon;
}

export const TABLE_STATUS_PRESENTATION: Readonly<Record<TableStatus, TableStatusPresentation>> = {
  free: { label: 'Libre', tone: 'neutral', icon: Circle },
  occupied: { label: 'Con pedido', tone: 'accent', icon: UtensilsCrossed },
  'awaiting-payment': { label: 'Por pagar', tone: 'highlight', icon: CircleDollarSign },
};
