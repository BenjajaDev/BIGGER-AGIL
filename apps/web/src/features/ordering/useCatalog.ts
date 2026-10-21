import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../app/query-keys';
import { catalogService } from '../../services/catalog.service';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: ({ signal }) => catalogService.listCategories(signal),
  });
}

export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: ({ signal }) => catalogService.listProducts({}, signal),
  });
}
