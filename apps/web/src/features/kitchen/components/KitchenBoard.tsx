import type { Order } from '@bigger/shared';
import { KITCHEN_COLUMNS } from '../kitchen-columns';
import type { OrdersByKitchenStatus } from '../useKitchenOrders';
import styles from './KitchenBoard.module.css';
import { KitchenColumn } from './KitchenColumn';

export interface KitchenBoardProps {
  orders: OrdersByKitchenStatus;
  now: Date;
  onAdvance?: (order: Order) => void;
}

export function KitchenBoard({ orders, now, onAdvance }: KitchenBoardProps) {
  return (
    <div className={styles.board}>
      {KITCHEN_COLUMNS.map((column) => (
        <KitchenColumn
          key={column.status}
          column={column}
          orders={orders[column.status]}
          now={now}
          {...(onAdvance ? { onAdvance } : {})}
        />
      ))}
    </div>
  );
}
