import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../app/query-keys';
import { ordersService, type OrderListParams } from '../../services/orders.service';

export function useOrders(params: OrderListParams) {
  return useQuery({
    queryKey: queryKeys.orderList(params),
    queryFn: ({ signal }) => ordersService.list(params, signal),
  });
}
