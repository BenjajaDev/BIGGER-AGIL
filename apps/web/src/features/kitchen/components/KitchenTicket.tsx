import type { Order } from '@bigger/shared';
import { LoaderCircle } from 'lucide-react';
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
}

export function KitchenTicket({ order, now, action }: KitchenTicketProps) {
  const title = orderTitle(order);
  const titleId = `ticket-${order.id}`;

  return (
    <article
      className={cx(styles.ticket, styles[order.status])}
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
      </header>
      <ul role="list" className={styles.items}>
        {order.items.map((item) => (
          <li key={item.id}>{describeOrderItem(item)}</li>
        ))}
      </ul>
      {action && (
        <Button
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
