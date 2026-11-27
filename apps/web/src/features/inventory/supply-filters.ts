import { alertRank, EXPIRY_WARNING_DAYS, supplyAlert, type Supply } from '@bigger/shared';
import { daysBetween } from './supply-text';

export type SupplyFilter = 'all' | 'reorder' | 'expiring' | 'expired';

export const FILTER_LABELS: Readonly<Record<SupplyFilter, string>> = {
  all: 'Todos',
  reorder: 'Por reponer',
  expiring: 'Por vencer',
  expired: 'Vencidos',
};

export const FILTERS: readonly SupplyFilter[] = ['all', 'reorder', 'expiring', 'expired'];

export function matchesFilter(supply: Supply, filter: SupplyFilter, today: string): boolean {
  const { expiresOn } = supply;
  switch (filter) {
    case 'all':
      return true;
    case 'reorder':
      return supply.stock <= supply.minStock;
    case 'expired':
      return expiresOn !== null && expiresOn < today;
    case 'expiring':
      return (
        expiresOn !== null &&
        expiresOn >= today &&
        daysBetween(expiresOn, today) <= EXPIRY_WARNING_DAYS
      );
  }
}

export function countFilters(
  supplies: readonly Supply[],
  today: string,
): Record<SupplyFilter, number> {
  const counts: Record<SupplyFilter, number> = { all: 0, reorder: 0, expiring: 0, expired: 0 };
  for (const supply of supplies) {
    for (const filter of FILTERS) if (matchesFilter(supply, filter, today)) counts[filter] += 1;
  }
  return counts;
}

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Search ignoring case and accents: «limon» finds «Limón». */
export function matchesQuery(name: string, query: string): boolean {
  return fold(name).includes(fold(query.trim()));
}

/** Urgent first (expired, no stock, expiring, low), then alphabetical. */
export function sortByUrgency(supplies: readonly Supply[], today: string) {
  return supplies
    .map((supply) => ({ supply, alert: supplyAlert(supply, today) }))
    .sort(
      (a, b) =>
        alertRank(a.alert) - alertRank(b.alert) || a.supply.name.localeCompare(b.supply.name, 'es'),
    );
}
