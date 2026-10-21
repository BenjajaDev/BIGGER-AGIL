import type { Product, QuickNote } from '@bigger/shared';

export const MAX_LINE_QUANTITY = 99;

export interface DraftLine {
  productId: string;
  productName: string;
  unitPriceClp: number;
  quantity: number;
  quickNotes: QuickNote[];
}

export interface OrderDraft {
  lines: DraftLine[];
}

export type OrderDraftAction =
  | { type: 'add'; product: Pick<Product, 'id' | 'name' | 'priceClp'> }
  | { type: 'increment'; productId: string }
  | { type: 'decrement'; productId: string }
  | { type: 'toggle-note'; productId: string; note: QuickNote }
  | { type: 'clear' };

export const EMPTY_DRAFT: OrderDraft = { lines: [] };

function updateLine(
  draft: OrderDraft,
  productId: string,
  update: (line: DraftLine) => DraftLine | null,
): OrderDraft {
  return {
    lines: draft.lines.flatMap((line) => {
      if (line.productId !== productId) return [line];
      const next = update(line);
      return next ? [next] : [];
    }),
  };
}

/** Pure reducer for the comanda being built: one line per product, removed when it reaches 0. */
export function orderDraftReducer(draft: OrderDraft, action: OrderDraftAction): OrderDraft {
  switch (action.type) {
    case 'add': {
      const existing = draft.lines.some((line) => line.productId === action.product.id);
      if (existing)
        return orderDraftReducer(draft, { type: 'increment', productId: action.product.id });
      return {
        lines: [
          ...draft.lines,
          {
            productId: action.product.id,
            productName: action.product.name,
            unitPriceClp: action.product.priceClp,
            quantity: 1,
            quickNotes: [],
          },
        ],
      };
    }
    case 'increment':
      return updateLine(draft, action.productId, (line) => ({
        ...line,
        quantity: Math.min(line.quantity + 1, MAX_LINE_QUANTITY),
      }));
    case 'decrement':
      return updateLine(draft, action.productId, (line) =>
        line.quantity > 1 ? { ...line, quantity: line.quantity - 1 } : null,
      );
    case 'toggle-note':
      return updateLine(draft, action.productId, (line) => ({
        ...line,
        quickNotes: line.quickNotes.includes(action.note)
          ? line.quickNotes.filter((note) => note !== action.note)
          : [...line.quickNotes, action.note],
      }));
    case 'clear':
      return EMPTY_DRAFT;
  }
}

export function draftTotalClp(draft: OrderDraft): number {
  return draft.lines.reduce((sum, line) => sum + line.unitPriceClp * line.quantity, 0);
}
