import { ChefHat, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Card } from '../../../components/ui/Card';
import { formatElapsed } from '../../../lib/format';
import { ORDER_STATUS_PRESENTATION } from '../../orders/order-status';
import { cx } from '../../../lib/cx';
import type { KitchenLane } from '../summary-model';
import styles from './KitchenLive.module.css';

/** «Cocina en vivo»: how many orders are in each stage and how long the oldest has waited. */
export function KitchenLive({ lanes, now }: { lanes: readonly KitchenLane[]; now: Date }) {
  return (
    <Card as="section" aria-labelledby="cocina-vivo-titulo" className={styles.card}>
      <div className={styles.head}>
        <h2 id="cocina-vivo-titulo" className={styles.title}>
          <ChefHat size={22} aria-hidden="true" />
          Cocina en vivo
        </h2>
        <Link to="/cocina" viewTransition className={styles.link}>
          Abrir Cocina
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <ul role="list" className={styles.lanes}>
        {lanes.map((lane) => {
          const { label, icon: Icon } = ORDER_STATUS_PRESENTATION[lane.status];
          return (
            <li key={lane.status} className={cx(styles.lane, lane.count === 0 && styles.empty)}>
              <span className={styles.label}>
                <Icon size={16} aria-hidden="true" />
                {label}
              </span>
              <span className={styles.count}>{lane.count}</span>
              <span className={styles.wait}>
                {lane.oldestSince
                  ? `El más antiguo: ${formatElapsed(lane.oldestSince, now)}`
                  : 'Sin pedidos'}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
