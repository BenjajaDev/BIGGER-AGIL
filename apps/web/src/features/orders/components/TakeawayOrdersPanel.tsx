import { OPEN_ORDER_STATUSES } from '@bigger/shared';
import { MessageCircle, Wallet } from 'lucide-react';
import { useState } from 'react';
import { AsyncContent } from '../../../components/ui/AsyncContent';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { formatClockTime, formatClp } from '../../../lib/format';
import { PaymentDialog } from '../../checks/components/PaymentDialog';
import { useCheck } from '../../checks/useChecks';
import { ORDER_STATUS_PRESENTATION } from '../order-status';
import { describeOrderItem, orderTitle } from '../order-text';
import { useOrders } from '../useOrders';
import styles from './TakeawayOrdersPanel.module.css';

const OPEN_ORDERS_QUERY = { statuses: OPEN_ORDER_STATUSES } as const;

/** Each takeaway or WhatsApp order has its own bill; it loads only when someone pays. */
function TakeawayPayment({ checkId, onClose }: { checkId: string; onClose: () => void }) {
  const checkQuery = useCheck(checkId);
  if (!checkQuery.data) return null;
  return <PaymentDialog check={checkQuery.data} open onClose={onClose} />;
}

export interface TakeawayOrdersPanelProps {
  now: Date;
}

export function TakeawayOrdersPanel({ now }: TakeawayOrdersPanelProps) {
  const ordersQuery = useOrders(OPEN_ORDERS_QUERY);
  const [payingCheckId, setPayingCheckId] = useState<string | null>(null);

  return (
    <section className={styles.panel} aria-labelledby="para-llevar-titulo">
      <h2 id="para-llevar-titulo" className={styles.title}>
        Para llevar y WhatsApp
      </h2>
      <AsyncContent query={ordersQuery} loadingLabel="Cargando pedidos para llevar…">
        {(allOrders) => {
          const orders = allOrders.filter((order) => order.channel !== 'dine-in');
          if (orders.length === 0) {
            return <EmptyState icon={MessageCircle} title="Sin pedidos para llevar" />;
          }
          return (
            <ul role="list" className={styles.list}>
              {orders.map((order) => {
                const status = ORDER_STATUS_PRESENTATION[order.status];
                const title = orderTitle(order);
                const pickup =
                  order.pickupAt && new Date(order.pickupAt) > now
                    ? ` · retira ${formatClockTime(order.pickupAt)}`
                    : '';
                return (
                  <li key={order.id} className={styles.item}>
                    <div className={styles.itemHeader}>
                      <span className={styles.customer}>{title}</span>
                      <StatusBadge tone={status.tone} icon={status.icon} label={status.label} />
                    </div>
                    <p className={styles.summary}>
                      {order.items.map(describeOrderItem).join(', ')}
                      {pickup}
                    </p>
                    <div className={styles.itemFooter}>
                      <span className={styles.total}>{formatClp(order.totalClp)}</span>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setPayingCheckId(order.checkId);
                        }}
                      >
                        <Wallet size={18} aria-hidden="true" />
                        Cobrar<span className="visually-hidden"> {title}</span>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        }}
      </AsyncContent>
      {payingCheckId && (
        <TakeawayPayment
          checkId={payingCheckId}
          onClose={() => {
            setPayingCheckId(null);
          }}
        />
      )}
    </section>
  );
}
