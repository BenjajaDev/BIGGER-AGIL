import {
  draftTotalClp,
  EMPTY_DRAFT,
  lineUnitPriceClp,
  MAX_LINE_QUANTITY,
  orderDraftReducer,
  type DraftLine,
  type LineConfig,
  type OrderDraft,
} from './order-draft';

const capuchino = { id: 'p-1', name: 'Capuchino', priceClp: 2500 };
const torta = { id: 'p-2', name: 'Torta mil hojas', priceClp: 3800 };
const plain: LineConfig = { options: [], comboChoices: [], quickNotes: [], note: '' };
const withMilk: LineConfig = {
  ...plain,
  options: [
    {
      groupId: 'g-1',
      groupName: 'Tipo de leche',
      optionId: 'o-1',
      optionName: 'Almendra',
      priceDeltaClp: 500,
    },
  ],
};

function draftWith(...actions: Parameters<typeof orderDraftReducer>[1][]): OrderDraft {
  return actions.reduce(orderDraftReducer, EMPTY_DRAFT);
}

describe('orderDraftReducer', () => {
  it('merges a plain line with the same product on re-add', () => {
    const draft = draftWith(
      { type: 'add-line', lineId: 'l-1', product: capuchino, config: plain },
      { type: 'add-line', lineId: 'l-2', product: capuchino, config: plain },
    );
    expect(draft.lines).toHaveLength(1);
    expect(draft.lines[0]?.lineId).toBe('l-1');
    expect(draft.lines[0]?.quantity).toBe(2);
  });

  it('stacks a configured line separately from a plain one', () => {
    const draft = draftWith(
      { type: 'add-line', lineId: 'l-1', product: capuchino, config: withMilk },
      { type: 'add-line', lineId: 'l-2', product: capuchino, config: plain },
    );
    expect(draft.lines).toHaveLength(2);
  });

  it('removes the line when decremented from 1', () => {
    const draft = draftWith(
      { type: 'add-line', lineId: 'l-1', product: capuchino, config: plain },
      { type: 'decrement', lineId: 'l-1' },
    );
    expect(draft.lines).toEqual([]);
  });

  it('caps quantities at the maximum per line', () => {
    const actions = [
      { type: 'add-line' as const, lineId: 'l-1', product: capuchino, config: plain },
      ...Array.from({ length: MAX_LINE_QUANTITY + 5 }, () => ({
        type: 'increment' as const,
        lineId: 'l-1',
      })),
    ];
    expect(draftWith(...actions).lines[0]?.quantity).toBe(MAX_LINE_QUANTITY);
  });

  it('toggles quick notes on and off by line', () => {
    const withNote = draftWith(
      { type: 'add-line', lineId: 'l-1', product: capuchino, config: plain },
      { type: 'toggle-note', lineId: 'l-1', note: 'no-sugar' },
    );
    expect(withNote.lines[0]?.quickNotes).toEqual(['no-sugar']);

    const withoutNote = orderDraftReducer(withNote, {
      type: 'toggle-note',
      lineId: 'l-1',
      note: 'no-sugar',
    });
    expect(withoutNote.lines[0]?.quickNotes).toEqual([]);
  });

  it('sets a free-text note and keeps the customer name while lines change', () => {
    const draft = draftWith(
      { type: 'set-customer-name', customerName: 'Javier' },
      { type: 'add-line', lineId: 'l-1', product: capuchino, config: plain },
      { type: 'set-note', lineId: 'l-1', note: 'Bien caliente' },
    );
    expect(draft.customerName).toBe('Javier');
    expect(draft.lines[0]?.note).toBe('Bien caliente');
  });

  it('clears the whole draft', () => {
    const draft = draftWith(
      { type: 'add-line', lineId: 'l-1', product: capuchino, config: plain },
      { type: 'clear' },
    );
    expect(draft).toBe(EMPTY_DRAFT);
  });
});

describe('lineUnitPriceClp', () => {
  it('adds the option deltas to the base price', () => {
    const line: DraftLine = {
      lineId: 'l-1',
      productId: 'p-1',
      productName: 'Capuchino',
      basePriceClp: 2500,
      quantity: 1,
      ...withMilk,
    };
    expect(lineUnitPriceClp(line)).toBe(3000);
  });
});

describe('draftTotalClp', () => {
  it('sums unit price (with options) × quantity across lines', () => {
    const draft = draftWith(
      { type: 'add-line', lineId: 'l-1', product: capuchino, config: withMilk },
      { type: 'increment', lineId: 'l-1' },
      { type: 'add-line', lineId: 'l-2', product: torta, config: plain },
    );
    // (2500 + 500) × 2 + 3800 = 9800
    expect(draftTotalClp(draft)).toBe(9800);
  });
});
