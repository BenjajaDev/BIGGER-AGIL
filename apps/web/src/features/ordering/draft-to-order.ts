import type { CreateOrderInput, OrderChannel } from '@bigger/shared';
import type { OrderDraft } from './order-draft';

export interface OrderTarget {
  channel: Extract<OrderChannel, 'dine-in' | 'takeaway'>;
  tableId: string | null;
}

function cleaned(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Builds the API payload from the local draft; the server owns the total and the snapshot. */
export function draftToCreateOrder(draft: OrderDraft, target: OrderTarget): CreateOrderInput {
  return {
    channel: target.channel,
    tableId: target.tableId,
    customerName: cleaned(draft.customerName),
    pickupAt: null,
    items: draft.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      quickNotes: line.quickNotes,
      note: cleaned(line.note),
      sizeId: line.size?.sizeId ?? null,
      options: line.options.map((option) => ({
        groupId: option.groupId,
        optionId: option.optionId,
      })),
      comboChoices: line.comboChoices.map((choice) => ({
        slotId: choice.slotId,
        productId: choice.productId,
      })),
    })),
  };
}
