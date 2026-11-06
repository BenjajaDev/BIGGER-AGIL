import type { NavBadgeKey } from '../app/navigation';
import { groupByKitchenStatus, useKitchenOrders } from '../features/kitchen/useKitchenOrders';
import { useTableOverview } from '../features/tables/useTableOverview';

export type NavBadgeCounts = Readonly<Partial<Record<NavBadgeKey, number>>>;

/** Counters for the navigation, read from the same queries the pages use (kept fresh by realtime). */
export function useNavBadges(): NavBadgeCounts {
  const tables = useTableOverview().data;
  const kitchen = useKitchenOrders().data;
  return {
    ...(tables
      ? { tablesToPay: tables.filter((table) => table.status === 'awaiting-payment').length }
      : {}),
    ...(kitchen ? { kitchenNew: groupByKitchenStatus(kitchen).new.length } : {}),
  };
}
