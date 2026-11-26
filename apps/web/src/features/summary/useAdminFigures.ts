import { alertRank, supplyAlert, type Supply, type SupplyAlert } from '@bigger/shared';
import { useQuery } from '@tanstack/react-query';
import { localToday } from '../../lib/dates';
import { inventoryService } from '../../services/inventory.service';
import { reportsService } from '../../services/reports.service';
import { useAdminSession } from '../catalog-admin/useCatalogAdmin';

/** Whether the manager's PIN session is active; the Resumen never asks for the PIN itself. */
export function useIsAdmin(): boolean {
  return useAdminSession().data?.authenticated === true;
}

export function useTodaySales(enabled: boolean, today: string) {
  return useQuery({
    queryKey: ['admin', 'reports', 'sales', { from: today, to: today }],
    queryFn: ({ signal }) => reportsService.sales({ from: today, to: today }, signal),
    enabled,
  });
}

export function useSupplyAlerts(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'inventory', 'supplies'],
    queryFn: ({ signal }) => inventoryService.supplies(signal),
    enabled,
  });
}

export interface AlertedSupply {
  supply: Supply;
  alert: Exclude<SupplyAlert, 'ok'>;
}

/** Supplies with a problem, the most urgent first. */
export function alertedSupplies(
  supplies: readonly Supply[],
  today = localToday(),
): AlertedSupply[] {
  return supplies
    .flatMap((supply) => {
      const alert = supplyAlert(supply, today);
      return alert === 'ok' ? [] : [{ supply, alert }];
    })
    .sort((a, b) => alertRank(a.alert) - alertRank(b.alert));
}
