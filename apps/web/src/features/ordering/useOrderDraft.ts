import type { QuickNote } from '@bigger/shared';
import { useMemo, useReducer } from 'react';
import {
  draftTotalClp,
  EMPTY_DRAFT,
  orderDraftReducer,
  type LineConfig,
  type ProductSeed,
} from './order-draft';

export function useOrderDraft() {
  const [draft, dispatch] = useReducer(orderDraftReducer, EMPTY_DRAFT);

  const actions = useMemo(
    () => ({
      addLine: (product: ProductSeed, config: LineConfig) => {
        dispatch({ type: 'add-line', lineId: crypto.randomUUID(), product, config });
      },
      increment: (lineId: string) => {
        dispatch({ type: 'increment', lineId });
      },
      decrement: (lineId: string) => {
        dispatch({ type: 'decrement', lineId });
      },
      toggleNote: (lineId: string, note: QuickNote) => {
        dispatch({ type: 'toggle-note', lineId, note });
      },
      setNote: (lineId: string, note: string) => {
        dispatch({ type: 'set-note', lineId, note });
      },
      setCustomerName: (customerName: string) => {
        dispatch({ type: 'set-customer-name', customerName });
      },
      clear: () => {
        dispatch({ type: 'clear' });
      },
    }),
    [],
  );

  return {
    customerName: draft.customerName,
    lines: draft.lines,
    totalClp: draftTotalClp(draft),
    ...actions,
  };
}
