import {
  canTransitionOrder,
  KITCHEN_ORDER_STATUSES,
  type KitchenOrderStatus,
  type Order,
  type OrderStatus,
} from '@bigger/shared';
import { KeyboardSensor } from '@dnd-kit/react';

/** Dragging only targets existing kitchen columns; delivery remains a button action. */
export function kitchenDropStatus(
  from: OrderStatus,
  destination: unknown,
): KitchenOrderStatus | null {
  const target = KITCHEN_ORDER_STATUSES.find((status) => status === destination);
  return target && canTransitionOrder(from, target) ? target : null;
}

export type KitchenDragSnapshot = Pick<Order, 'id' | 'status' | 'updatedAt'>;

export function matchesKitchenDrag(
  order: Order | undefined,
  snapshot: KitchenDragSnapshot,
): order is Order {
  return (
    order?.id === snapshot.id &&
    order.status === snapshot.status &&
    order.updatedAt === snapshot.updatedAt
  );
}

/** One arrow reaches the permitted column, including the stacked tablet layout. */
export class KitchenKeyboardSensor extends KeyboardSensor {
  protected override handleMove(
    direction: 'up' | 'down' | 'left' | 'right',
    event: KeyboardEvent,
  ): void {
    event.preventDefault();
    if (direction !== 'right' && direction !== 'down') return;
    const source = this.manager.dragOperation.source;
    const destination = [...this.manager.registry.droppables].find(
      (column) => source && !column.disabled && column.accepts(source) && column.element,
    );
    const element = destination?.element;
    if (!element) return;
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    destination.refreshShape();
    const rect = element.getBoundingClientRect();
    this.manager.actions.move({
      event,
      to: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    });
  }
}
