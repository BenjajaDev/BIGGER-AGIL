import { canTransitionOrder, KITCHEN_ORDER_STATUSES, type Order } from '@bigger/shared';
import { useDroppable } from '@dnd-kit/react';
import { Coffee } from 'lucide-react';
import { useMemo } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { pluralize } from '../../../lib/format';
import { cx } from '../../../lib/cx';
import type { KitchenColumnConfig } from '../kitchen-columns';
import { kitchenDropStatus } from '../kitchen-drag';
import styles from './KitchenColumn.module.css';
import { KitchenTicket } from './KitchenTicket';

export interface KitchenColumnProps {
  column: KitchenColumnConfig;
  orders: readonly Order[];
  now: Date;
  onAdvance?: (order: Order) => void;
  pendingOrderIds?: ReadonlySet<string>;
  validDrop?: boolean;
}

export function KitchenColumn({
  column,
  orders,
  now,
  onAdvance,
  pendingOrderIds,
  validDrop = false,
}: KitchenColumnProps) {
  const headingId = `cocina-${column.status}`;
  const Icon = column.icon;
  const acceptedStatuses = useMemo(
    () =>
      KITCHEN_ORDER_STATUSES.filter((status) => kitchenDropStatus(status, column.status) !== null),
    [column.status],
  );
  const { ref, isDropTarget } = useDroppable({
    id: column.status,
    accept: acceptedStatuses,
    disabled: !onAdvance,
  });

  return (
    <section
      ref={ref}
      data-kitchen-status={column.status}
      className={cx(
        styles.column,
        validDrop && styles.validDrop,
        validDrop && isDropTarget && styles.dropTarget,
      )}
      aria-labelledby={headingId}
    >
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
                draggable={Boolean(onAdvance) && column.status !== 'ready'}
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
