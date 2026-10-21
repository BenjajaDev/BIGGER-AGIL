import type { Product, QuickNote } from '@bigger/shared';
import { useMemo, useReducer } from 'react';
import { draftTotalClp, EMPTY_DRAFT, orderDraftReducer } from './order-draft';

export function useOrderDraft() {
  const [draft, dispatch] = useReducer(orderDraftReducer, EMPTY_DRAFT);

  const actions = useMemo(
    () => ({
      add: (product: Product) => {
        dispatch({ type: 'add', product });
      },
      increment: (productId: string) => {
        dispatch({ type: 'increment', productId });
      },
      decrement: (productId: string) => {
        dispatch({ type: 'decrement', productId });
      },
      toggleNote: (productId: string, note: QuickNote) => {
        dispatch({ type: 'toggle-note', productId, note });
      },
      clear: () => {
        dispatch({ type: 'clear' });
      },
    }),
    [],
  );

  return { lines: draft.lines, totalClp: draftTotalClp(draft), ...actions };
}
