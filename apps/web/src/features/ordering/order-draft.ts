import type { Product, QuickNote } from '@bigger/shared';

export const MAX_LINE_QUANTITY = 99;

/** A chosen customization option, with a price snapshot so the comanda totals on its own. */
export interface SelectedOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDeltaClp: number;
}

/** A chosen product for one combo slot ("Café a elección"). */
export interface ComboChoice {
  slotId: string;
  slotName: string;
  productId: string;
  productName: string;
  extraPriceClp: number;
}

export interface LineConfig {
  options: SelectedOption[];
  comboChoices: ComboChoice[];
  quickNotes: QuickNote[];
  note: string;
}

export interface DraftLine extends LineConfig {
  lineId: string;
  productId: string;
  productName: string;
  basePriceClp: number;
  quantity: number;
}

export interface OrderDraft {
  customerName: string;
  lines: DraftLine[];
}

export type ProductSeed = Pick<Product, 'id' | 'name' | 'priceClp'>;

export type OrderDraftAction =
  | { type: 'add-line'; lineId: string; product: ProductSeed; config: LineConfig }
  | { type: 'increment'; lineId: string }
  | { type: 'decrement'; lineId: string }
  | { type: 'toggle-note'; lineId: string; note: QuickNote }
  | { type: 'set-note'; lineId: string; note: string }
  | { type: 'set-customer-name'; customerName: string }
  | { type: 'clear' };

export const EMPTY_DRAFT: OrderDraft = { customerName: '', lines: [] };

/** Config for a product added without opening the options modal. */
export const EMPTY_CONFIG: LineConfig = {
  options: [],
  comboChoices: [],
  quickNotes: [],
  note: '',
};

export function lineUnitPriceClp(line: DraftLine): number {
  const optionsDelta = line.options.reduce((sum, option) => sum + option.priceDeltaClp, 0);
  const comboExtra = line.comboChoices.reduce((sum, choice) => sum + choice.extraPriceClp, 0);
  return line.basePriceClp + optionsDelta + comboExtra;
}

/** A line with no options, combo or notes merges with the same product instead of stacking. */
function isPlain(line: DraftLine): boolean {
  return line.options.length === 0 && line.comboChoices.length === 0;
}

function updateLine(
  draft: OrderDraft,
  lineId: string,
  update: (line: DraftLine) => DraftLine | null,
): OrderDraft {
  return {
    ...draft,
    lines: draft.lines.flatMap((line) => {
      if (line.lineId !== lineId) return [line];
      const next = update(line);
      return next ? [next] : [];
    }),
  };
}

/** Pure reducer for the comanda being built. One line per configuration; plain lines merge. */
export function orderDraftReducer(draft: OrderDraft, action: OrderDraftAction): OrderDraft {
  switch (action.type) {
    case 'add-line': {
      const { product, config } = action;
      const plainAdd = config.options.length === 0 && config.comboChoices.length === 0;
      const mergeInto = plainAdd
        ? draft.lines.find((line) => line.productId === product.id && isPlain(line))
        : undefined;
      if (mergeInto)
        return orderDraftReducer(draft, { type: 'increment', lineId: mergeInto.lineId });
      return {
        ...draft,
        lines: [
          ...draft.lines,
          {
            lineId: action.lineId,
            productId: product.id,
            productName: product.name,
            basePriceClp: product.priceClp,
            quantity: 1,
            ...config,
          },
        ],
      };
    }
    case 'increment':
      return updateLine(draft, action.lineId, (line) => ({
        ...line,
        quantity: Math.min(line.quantity + 1, MAX_LINE_QUANTITY),
      }));
    case 'decrement':
      return updateLine(draft, action.lineId, (line) =>
        line.quantity > 1 ? { ...line, quantity: line.quantity - 1 } : null,
      );
    case 'toggle-note':
      return updateLine(draft, action.lineId, (line) => ({
        ...line,
        quickNotes: line.quickNotes.includes(action.note)
          ? line.quickNotes.filter((note) => note !== action.note)
          : [...line.quickNotes, action.note],
      }));
    case 'set-note':
      return updateLine(draft, action.lineId, (line) => ({ ...line, note: action.note }));
    case 'set-customer-name':
      return { ...draft, customerName: action.customerName };
    case 'clear':
      return EMPTY_DRAFT;
  }
}

export function draftTotalClp(draft: OrderDraft): number {
  return draft.lines.reduce((sum, line) => sum + lineUnitPriceClp(line) * line.quantity, 0);
}
