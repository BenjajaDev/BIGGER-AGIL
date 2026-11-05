import { orderTitle, QUICK_NOTE_LABELS, type OrderItem } from '@bigger/shared';

export { orderTitle, QUICK_NOTE_LABELS };

export function describeOrderItem(
  item: Pick<OrderItem, 'quantity' | 'productName' | 'quickNotes' | 'note' | 'options'>,
): string {
  const notes = [
    ...item.options.map((option) => option.name.toLowerCase()),
    ...item.quickNotes.map((note) => QUICK_NOTE_LABELS[note].toLowerCase()),
    item.note,
  ]
    .filter(Boolean)
    .join(' · ');
  return `${item.quantity} × ${item.productName}${notes ? ` · ${notes}` : ''}`;
}
