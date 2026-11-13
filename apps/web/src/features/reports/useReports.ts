import type { ReportRange } from '@bigger/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportsService } from '../../services/reports.service';

const keys = {
  all: ['admin', 'reports'] as const,
  sales: (range: ReportRange) => ['admin', 'reports', 'sales', range] as const,
  cash: (date: string) => ['admin', 'reports', 'cash', date] as const,
};

export function useSalesReport(range: ReportRange) {
  return useQuery({
    queryKey: keys.sales(range),
    queryFn: ({ signal }) => reportsService.sales(range, signal),
  });
}

export function useCashClose(date: string) {
  return useQuery({
    queryKey: keys.cash(date),
    queryFn: ({ signal }) => reportsService.cashClose(date, signal),
  });
}

export function useCloseCash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reportsService.closeCash,
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
}
