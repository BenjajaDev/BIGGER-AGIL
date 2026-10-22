import { CalendarCheck, CalendarClock, CalendarX } from 'lucide-react';

/** Badge for each promotion state, shared by the editor and the product list. */
export const PROMOTION_STATUS_BADGE = {
  active: { label: 'Promoción visible hoy', tone: 'success', icon: CalendarCheck },
  scheduled: { label: 'Promoción programada', tone: 'highlight', icon: CalendarClock },
  expired: { label: 'Promoción vencida', tone: 'neutral', icon: CalendarX },
} as const;
