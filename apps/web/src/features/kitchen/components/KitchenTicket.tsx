import type { Order } from '@bigger/shared';
import { useDraggable } from '@dnd-kit/react';
import { GripVertical, LoaderCircle } from 'lucide-react';
import { Button, type ButtonVariant } from '../../../components/ui/Button';
import { cx } from '../../../lib/cx';
import { formatElapsed } from '../../../lib/format';
import { describeOrderItem, orderTitle } from '../../orders/order-text';
import styles from './KitchenTicket.module.css';

export interface KitchenTicketAction {
  label: string;
  variant: ButtonVariant;
  onClick: () => void;
  isPending?: boolean;
}

export interface KitchenTicketProps {
  order: Order;
  now: Date;
  action?: KitchenTicketAction;
  draggable?: boolean;
}

export function KitchenTicket({ order, now, action, draggable = false }: KitchenTicketProps) {
  const title = orderTitle(order);
  const titleId = `ticket-${order.id}`;
  const { ref, handleRef, isDragging } = useDraggable({
    id: order.id,
    type: order.status,
    disabled: !draggable || Boolean(action?.isPending),
  });

  return (
    <article
      ref={draggable ? ref : undefined}
      className={cx(styles.ticket, styles[order.status], isDragging && styles.dragging)}
      aria-labelledby={titleId}
      data-order-id={order.id}
    >
      <header className={styles.header}>
        <h3 id={titleId} className={styles.title}>
          {title}
        </h3>
        <time className={styles.elapsed} dateTime={order.createdAt}>
          {formatElapsed(order.createdAt, now)}
        </time>
        {draggable && (
          <button
            ref={handleRef}
            type="button"
            className={styles.dragHandle}
            data-drag-handle
            disabled={action?.isPending}
            aria-label={`Arrastrar: ${title}`}
            aria-roledescription="pedido arrastrable"
            aria-describedby="kitchen-drag-instructions"
          >
            <GripVertical size={22} aria-hidden="true" />
          </button>
        )}
      </header>
      <ul role="list" className={styles.items}>
        {order.items.map((item) => (
          <li key={item.id}>{describeOrderItem(item)}</li>
        ))}
      </ul>
      {action && (
        <Button
          data-order-action
          variant={action.variant}
          size="lg"
          fullWidth
          onClick={action.onClick}
          disabled={action.isPending}
          aria-busy={action.isPending}
          aria-label={`${action.isPending ? 'Guardando… ' : ''}${action.label}: ${title}`}
        >
          {action.isPending && (
            <LoaderCircle className={styles.spinner} size={20} aria-hidden="true" />
          )}
          {action.isPending ? 'Guardando…' : action.label}
        </Button>
      )}
    </article>
  );
}
