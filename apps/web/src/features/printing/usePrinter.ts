import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../app/query-keys';
import { printingService } from '../../services/printing.service';

const IDLE_REFRESH_MS = 10_000;
const BUSY_REFRESH_MS = 2_000;

/** Polled: nothing announces a printer that ran out of paper, so the app asks every few seconds. */
export function usePrinterStatus() {
  return useQuery({
    queryKey: queryKeys.printer,
    queryFn: ({ signal }) => printingService.status(signal),
    refetchInterval: (query) => (query.state.data?.pending ? BUSY_REFRESH_MS : IDLE_REFRESH_MS),
  });
}

export function usePrintJobs(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.printJobs,
    queryFn: ({ signal }) => printingService.jobs(signal),
    enabled,
    refetchInterval: IDLE_REFRESH_MS,
  });
}

function useRefreshPrinter() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.printer });
}

export function usePrintTest() {
  const refresh = useRefreshPrinter();
  return useMutation({ mutationFn: printingService.test, retry: false, onSettled: refresh });
}

export function useReprintOrder() {
  const refresh = useRefreshPrinter();
  return useMutation({ mutationFn: printingService.reprint, retry: false, onSettled: refresh });
}
