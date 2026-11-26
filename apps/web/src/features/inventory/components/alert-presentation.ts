import type { SupplyAlert } from '@bigger/shared';
import { CircleAlert, CircleCheck, CircleSlash, Hourglass, TriangleAlert } from 'lucide-react';
import type { StatusTone } from '../../../components/ui/StatusBadge';

export const ALERT_PRESENTATION = {
  ok: { tone: 'success', icon: CircleCheck },
  low: { tone: 'warning', icon: TriangleAlert },
  out: { tone: 'accent', icon: CircleSlash },
  expiring: { tone: 'warning', icon: Hourglass },
  expired: { tone: 'accent', icon: CircleAlert },
} as const satisfies Record<SupplyAlert, { tone: StatusTone; icon: typeof CircleCheck }>;
