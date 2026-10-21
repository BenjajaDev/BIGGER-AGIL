import type { AdminSession } from '@bigger/shared';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '../services/http-client';
import { queryKeys } from './query-keys';

const SIGNED_OUT: AdminSession = { authenticated: false, expiresAt: null };

export function createQueryClient(): QueryClient {
  /** An expired admin session anywhere sends the user back to the PIN screen. */
  const handleError = (error: Error) => {
    if (error instanceof ApiRequestError && error.code === 'UNAUTHORIZED') {
      queryClient.setQueryData(queryKeys.adminSession, SIGNED_OUT);
    }
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) =>
          !(error instanceof ApiRequestError && error.status !== null && error.status < 500) &&
          failureCount < 1,
        refetchOnWindowFocus: true,
      },
    },
  });
  return queryClient;
}
