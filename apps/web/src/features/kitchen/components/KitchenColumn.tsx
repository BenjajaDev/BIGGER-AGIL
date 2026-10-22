import { canTransitionOrder, type Order } from '@bigger/shared';
import { Coffee } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { pluralize } from '../../../lib/format';
import type { KitchenColumnConfig } from '../kitchen-columns';
import styles from './KitchenColumn.module.css';
import { KitchenTicket } from './KitchenTicket';

export interface KitchenColumnProps {
  column: KitchenColumnConfig;
  orders: readonly Order[];
  now: Date;
  onAdvance?: (order: Order) => void;
  pendingOrderIds?: ReadonlySet<string>;
}

export function KitchenColumn({
  column,
  orders,
  now,
  onAdvance,
  pendingOrderIds,
}: KitchenColumnProps) {
  const headingId = `cocina-${column.status}`;
  const Icon = column.icon;

  return (
    <section className={styles.column} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        <Icon size={22} aria-hidden="true" />
        {column.title}
        <span className={styles.count} aria-label={pluralize(orders.length, 'pedido', 'pedidos')}>
          {orders.length}
        </span>
      </h2>
      {orders.length === 0 ? (
        <EmptyState icon={Coffee} title={column.emptyMessage} inverse />
      ) : (
        <ul role="list" className={styles.list}>
          {orders.map((order) => (
            <li key={order.id}>
              <KitchenTicket
                order={order}
                now={now}
                {...(onAdvance && canTransitionOrder(order.status, column.action.nextStatus)
                  ? {
                      action: {
                        ...column.action,
                        isPending: pendingOrderIds?.has(order.id) ?? false,
                        onClick: () => {
                          onAdvance(order);
                        },
                      },
                    }
                  : {})}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
