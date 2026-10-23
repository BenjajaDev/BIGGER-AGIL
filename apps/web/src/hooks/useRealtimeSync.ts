import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { queryKeys } from '../app/query-keys';
import { subscribeToRealtime, type RealtimeConnectionState } from '../services/realtime.service';

const ORDER_VIEWS = [queryKeys.orders, queryKeys.tables, queryKeys.checks];

/** Keeps tables, orders and bills fresh across every tablet without reloading the page. */
export function useRealtimeSync(): RealtimeConnectionState {
  const queryClient = useQueryClient();
  const [state, setState] = useState<RealtimeConnectionState>('connecting');

  useEffect(() => {
    let previousState: RealtimeConnectionState = 'connecting';
    return subscribeToRealtime({
      onStateChange: (nextState) => {
        // The initial page queries already load data; only recover a broken connection.
        if (nextState === 'open' && previousState === 'reconnecting') {
          for (const queryKey of ORDER_VIEWS) void queryClient.invalidateQueries({ queryKey });
        }
        previousState = nextState;
        setState(nextState);
      },
      onEvent: (event) => {
        switch (event.type) {
          case 'order.created':
          case 'order.updated':
          case 'check.updated':
            for (const queryKey of ORDER_VIEWS) void queryClient.invalidateQueries({ queryKey });
            break;
          case 'catalog.updated':
            void queryClient.invalidateQueries({ queryKey: queryKeys.catalog });
            void queryClient.invalidateQueries({ queryKey: queryKeys.admin });
            break;
        }
      },
    });
  }, [queryClient]);

  return state;
}
