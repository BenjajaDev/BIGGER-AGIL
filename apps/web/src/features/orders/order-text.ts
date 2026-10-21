import type { Order, OrderItem, QuickNote } from '@bigger/shared';

export const QUICK_NOTE_LABELS: Readonly<Record<QuickNote, string>> = {
  'no-sugar': 'Sin azúcar',
  takeaway: 'Para llevar',
  'lactose-free': 'Sin lactosa',
  sweetener: 'Con endulzante',
};

export function describeOrderItem(
  item: Pick<OrderItem, 'quantity' | 'productName' | 'quickNotes' | 'note'>,
): string {
  const notes = [...item.quickNotes.map((note) => QUICK_NOTE_LABELS[note].toLowerCase()), item.note]
    .filter(Boolean)
    .join(' · ');
  return `${item.quantity} × ${item.productName}${notes ? ` · ${notes}` : ''}`;
}

export function orderTitle(order: Pick<Order, 'channel' | 'tableLabel' | 'customerName'>): string {
  switch (order.channel) {
    case 'dine-in':
      return order.tableLabel ?? 'Mesa';
    case 'whatsapp':
      return `WhatsApp · ${order.customerName ?? 'Cliente'}`;
    case 'takeaway':
      return order.customerName ? `Para llevar · ${order.customerName}` : 'Para llevar';
  }
}
