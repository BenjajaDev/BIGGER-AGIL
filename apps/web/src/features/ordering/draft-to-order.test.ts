import type { OrderDraft } from './order-draft';
import { draftToCreateOrder } from './draft-to-order';

const draft: OrderDraft = {
  customerName: '  Javier  ',
  lines: [
    {
      lineId: 'l-1',
      productId: 'p-1',
      productName: 'Capuchino',
      basePriceClp: 2500,
      quantity: 2,
      quickNotes: ['no-sugar'],
      note: ' sin espuma ',
      options: [],
      comboChoices: [],
    },
    {
      lineId: 'l-2',
      productId: 'p-2',
      productName: 'Torta',
      basePriceClp: 3800,
      quantity: 1,
      quickNotes: [],
      note: '',
      options: [],
      comboChoices: [],
    },
  ],
};

describe('draftToCreateOrder', () => {
  it('maps a dine-in draft and trims text, turning blanks into null', () => {
    const input = draftToCreateOrder(draft, { channel: 'dine-in', tableId: 't-9' });
    expect(input).toEqual({
      channel: 'dine-in',
      tableId: 't-9',
      customerName: 'Javier',
      pickupAt: null,
      items: [
        { productId: 'p-1', quantity: 2, quickNotes: ['no-sugar'], note: 'sin espuma' },
        { productId: 'p-2', quantity: 1, quickNotes: [], note: null },
      ],
    });
  });

  it('keeps tableId null for takeaway', () => {
    const input = draftToCreateOrder(
      { customerName: '', lines: draft.lines },
      { channel: 'takeaway', tableId: null },
    );
    expect(input.channel).toBe('takeaway');
    expect(input.tableId).toBeNull();
    expect(input.customerName).toBeNull();
  });
});
