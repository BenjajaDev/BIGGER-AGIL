import type { OrderDraft } from './order-draft';
import { draftToCreateOrder } from './draft-to-order';

const draft: OrderDraft = {
  customerName: '  Javier  ',
  lines: [
    {
      lineId: 'l-1',
      size: null,
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
      size: null,
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
        {
          productId: 'p-1',
          quantity: 2,
          quickNotes: ['no-sugar'],
          note: 'sin espuma',
          sizeId: null,
          options: [],
          comboChoices: [],
        },
        {
          productId: 'p-2',
          quantity: 1,
          quickNotes: [],
          note: null,
          sizeId: null,
          options: [],
          comboChoices: [],
        },
      ],
    });
  });

  it('maps the chosen options and combo picks to ids', () => {
    const input = draftToCreateOrder(
      {
        customerName: '',
        lines: [
          {
            lineId: 'l-3',
            size: null,
            productId: 'p-3',
            productName: 'Ensalada de pollo',
            basePriceClp: 4990,
            quantity: 1,
            quickNotes: [],
            note: '',
            options: [
              {
                groupId: 'g-1',
                groupName: 'Extras',
                optionId: 'o-1',
                optionName: 'Extra pollo',
                priceDeltaClp: 1500,
              },
            ],
            comboChoices: [
              {
                slotId: 's-1',
                slotName: 'Café a elección',
                productId: 'p-cafe',
                productName: 'Cortado',
                extraPriceClp: 0,
              },
            ],
          },
        ],
      },
      { channel: 'takeaway', tableId: null },
    );
    expect(input.items[0]?.options).toEqual([{ groupId: 'g-1', optionId: 'o-1' }]);
    expect(input.items[0]?.comboChoices).toEqual([{ slotId: 's-1', productId: 'p-cafe' }]);
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

  it('sends the chosen size id', () => {
    const input = draftToCreateOrder(
      {
        customerName: '',
        lines: [
          {
            lineId: 'l-9',
            productId: 'p-9',
            productName: 'Arma tu ensalada',
            basePriceClp: 4900,
            quantity: 1,
            quickNotes: [],
            note: '',
            size: { sizeId: 's-grande', sizeName: 'Grande', priceClp: 4900 },
            options: [],
            comboChoices: [],
          },
        ],
      },
      { channel: 'dine-in', tableId: 't-1' },
    );
    expect(input.items[0]?.sizeId).toBe('s-grande');
  });
});
