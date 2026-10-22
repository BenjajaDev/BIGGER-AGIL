import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../app/query-keys';
import { ordersService, type OrderListParams } from '../../services/orders.service';

export function useOrders(params: OrderListParams) {
  return useQuery({
    queryKey: queryKeys.orderList(params),
    queryFn: ({ signal }) => ordersService.list(params, signal),
  });
}

/** Sending a comanda refreshes every orders view and the table map. */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ordersService.create,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tables }),
      ]);
    },
  });
}

/** Reconcile every view even when the response was lost after the server saved the change. */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ordersService.updateStatus,
    retry: false,
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tables }),
      ]);
    },
  });
}
