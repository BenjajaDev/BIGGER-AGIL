import { describeOrderItem, orderTitle } from './order-text';

describe('describeOrderItem', () => {
  it('appends options, quick notes and free-text notes', () => {
    expect(
      describeOrderItem({
        quantity: 2,
        productName: 'Capuchino',
        quickNotes: ['no-sugar'],
        note: 'leche tibia',
        options: [
          { kind: 'modifier', label: 'Tipo de leche', name: 'Almendra', priceDeltaClp: 500 },
        ],
      }),
    ).toBe('2 × Capuchino · almendra · sin azúcar · leche tibia');
  });

  it('omits the separator when there are no notes', () => {
    expect(
      describeOrderItem({
        quantity: 1,
        productName: 'Brownie',
        quickNotes: [],
        note: null,
        options: [],
      }),
    ).toBe('1 × Brownie');
  });
});

describe('orderTitle', () => {
  it('names each channel the way the team says it out loud', () => {
    expect(orderTitle({ channel: 'dine-in', tableLabel: 'Mesa 2', customerName: null })).toBe(
      'Mesa 2',
    );
    expect(orderTitle({ channel: 'whatsapp', tableLabel: null, customerName: 'Camila R.' })).toBe(
      'WhatsApp · Camila R.',
    );
    expect(orderTitle({ channel: 'takeaway', tableLabel: null, customerName: null })).toBe(
      'Para llevar',
    );
  });
});
