import type { Check } from '@bigger/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../app/query-keys';
import { checksService } from '../../services/checks.service';

export function useTableCheck(tableId: string) {
  return useQuery({
    queryKey: queryKeys.tableCheck(tableId),
    queryFn: ({ signal }) => checksService.forTable(tableId, signal),
    retry: false,
  });
}

export function useCheck(checkId: string | null) {
  return useQuery({
    queryKey: queryKeys.check(checkId ?? ''),
    queryFn: ({ signal }) => checksService.get(checkId ?? '', signal),
    enabled: checkId !== null,
  });
}

/**
 * A payment changes the bill, the orders (closing marks them paid) and the table map. The
 * returned bill is cached first: once closed, the table has no open check to refetch.
 */
function useCheckMutation<TParams>(mutationFn: (params: TParams) => Promise<Check>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    retry: false,
    onSuccess: (check) => {
      queryClient.setQueryData(queryKeys.check(check.id), check);
      if (check.tableId) queryClient.setQueryData(queryKeys.tableCheck(check.tableId), check);
    },
    onSettled: async () => {
      await Promise.all(
        [queryKeys.checks, queryKeys.tables, queryKeys.orders].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}

export const usePay = () => useCheckMutation(checksService.pay);
export const useSetSplit = () => useCheckMutation(checksService.setSplit);
export const useVoidPayment = () => useCheckMutation(checksService.voidPayment);
