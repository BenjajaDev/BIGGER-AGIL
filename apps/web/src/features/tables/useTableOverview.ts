import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../app/query-keys';
import { tablesService } from '../../services/tables.service';

export function useTableOverview() {
  return useQuery({
    queryKey: queryKeys.tables,
    queryFn: ({ signal }) => tablesService.listOverview(signal),
  });
}
