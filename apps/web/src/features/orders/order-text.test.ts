import { describeOrderItem, orderTitle } from './order-text';

describe('describeOrderItem', () => {
  it('appends quick notes and free-text notes', () => {
    expect(
      describeOrderItem({
        quantity: 2,
        productName: 'Capuchino',
        quickNotes: ['no-sugar'],
        note: 'leche tibia',
      }),
    ).toBe('2 × Capuchino · sin azúcar · leche tibia');
  });

  it('omits the separator when there are no notes', () => {
    expect(
      describeOrderItem({ quantity: 1, productName: 'Brownie', quickNotes: [], note: null }),
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
