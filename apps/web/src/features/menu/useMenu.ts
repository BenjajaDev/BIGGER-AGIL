import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../app/query-keys';
import { catalogService } from '../../services/catalog.service';

export function useMenu() {
  return useQuery({
    queryKey: queryKeys.menu,
    queryFn: ({ signal }) => catalogService.getMenu(signal),
  });
}
