import {
  draftTotalClp,
  EMPTY_DRAFT,
  MAX_LINE_QUANTITY,
  orderDraftReducer,
  type OrderDraft,
} from './order-draft';

const capuchino = { id: 'p-1', name: 'Capuchino', priceClp: 2500 };
const tortaMilHojas = { id: 'p-2', name: 'Torta mil hojas', priceClp: 3800 };

function draftWith(...actions: Parameters<typeof orderDraftReducer>[1][]): OrderDraft {
  return actions.reduce(orderDraftReducer, EMPTY_DRAFT);
}

describe('orderDraftReducer', () => {
  it('adds a new line and increments it when the product is tapped again', () => {
    const draft = draftWith(
      { type: 'add', product: capuchino },
      { type: 'add', product: capuchino },
    );
    expect(draft.lines).toEqual([
      {
        productId: 'p-1',
        productName: 'Capuchino',
        unitPriceClp: 2500,
        quantity: 2,
        quickNotes: [],
      },
    ]);
  });

  it('removes the line when decremented from 1', () => {
    const draft = draftWith(
      { type: 'add', product: capuchino },
      { type: 'decrement', productId: 'p-1' },
    );
    expect(draft.lines).toEqual([]);
  });

  it('caps quantities at the maximum per line', () => {
    const actions = Array.from({ length: MAX_LINE_QUANTITY + 5 }, () => ({
      type: 'add' as const,
      product: capuchino,
    }));
    expect(draftWith(...actions).lines[0]?.quantity).toBe(MAX_LINE_QUANTITY);
  });

  it('toggles quick notes on and off', () => {
    const withNote = draftWith(
      { type: 'add', product: capuchino },
      { type: 'toggle-note', productId: 'p-1', note: 'no-sugar' },
    );
    expect(withNote.lines[0]?.quickNotes).toEqual(['no-sugar']);

    const withoutNote = orderDraftReducer(withNote, {
      type: 'toggle-note',
      productId: 'p-1',
      note: 'no-sugar',
    });
    expect(withoutNote.lines[0]?.quickNotes).toEqual([]);
  });

  it('clears the whole draft', () => {
    const draft = draftWith({ type: 'add', product: capuchino }, { type: 'clear' });
    expect(draft).toBe(EMPTY_DRAFT);
  });
});

describe('draftTotalClp', () => {
  it('sums unit price × quantity across lines', () => {
    const draft = draftWith(
      { type: 'add', product: capuchino },
      { type: 'add', product: capuchino },
      { type: 'add', product: tortaMilHojas },
    );
    expect(draftTotalClp(draft)).toBe(8800);
  });
});
