import { OPEN_ORDER_STATUSES } from '@bigger/shared';
import { MessageCircle } from 'lucide-react';
import { AsyncContent } from '../../../components/ui/AsyncContent';
import { EmptyState } from '../../../components/ui/EmptyState';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { formatClockTime } from '../../../lib/format';
import { ORDER_STATUS_PRESENTATION } from '../order-status';
import { describeOrderItem } from '../order-text';
import { useOrders } from '../useOrders';
import styles from './WhatsAppOrdersPanel.module.css';

const WHATSAPP_QUERY = { statuses: OPEN_ORDER_STATUSES, channel: 'whatsapp' } as const;

export interface WhatsAppOrdersPanelProps {
  now: Date;
}

export function WhatsAppOrdersPanel({ now }: WhatsAppOrdersPanelProps) {
  const ordersQuery = useOrders(WHATSAPP_QUERY);

  return (
    <section className={styles.panel} aria-labelledby="whatsapp-titulo">
      <h2 id="whatsapp-titulo" className={styles.title}>
        Pedidos por WhatsApp
      </h2>
      <AsyncContent query={ordersQuery} loadingLabel="Cargando pedidos por WhatsApp…">
        {(orders) =>
          orders.length === 0 ? (
            <EmptyState icon={MessageCircle} title="Sin pedidos por WhatsApp" />
          ) : (
            <ul role="list" className={styles.list}>
              {orders.map((order) => {
                const status = ORDER_STATUS_PRESENTATION[order.status];
                const pickup =
                  order.pickupAt && new Date(order.pickupAt) > now
                    ? ` · retira ${formatClockTime(order.pickupAt)}`
                    : '';
                return (
                  <li key={order.id} className={styles.item}>
                    <div className={styles.itemHeader}>
                      <span className={styles.customer}>{order.customerName}</span>
                      <StatusBadge tone={status.tone} icon={status.icon} label={status.label} />
                    </div>
                    <p className={styles.summary}>
                      {order.items.map(describeOrderItem).join(', ')}
                      {pickup}
                    </p>
                  </li>
                );
              })}
            </ul>
          )
        }
      </AsyncContent>
    </section>
  );
}
