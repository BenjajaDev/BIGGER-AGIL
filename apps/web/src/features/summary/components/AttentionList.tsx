import {
  CircleCheck,
  CircleDollarSign,
  HandPlatter,
  Printer,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { Card } from '../../../components/ui/Card';
import type { AttentionItem, AttentionKind } from '../summary-model';
import styles from './AttentionList.module.css';

const ICONS: Readonly<Record<AttentionKind, LucideIcon>> = {
  'printer-failed': Printer,
  'order-waiting': Timer,
  'order-ready': HandPlatter,
  'table-to-pay': CircleDollarSign,
};

/** «Ahora»: what needs someone right now, each with one action a tap away. */
export function AttentionList({ items }: { items: readonly AttentionItem[] }) {
  return (
    <Card as="section" aria-labelledby="ahora-titulo" className={styles.card}>
      <h2 id="ahora-titulo" className={styles.title}>
        Ahora
      </h2>
      {items.length === 0 ? (
        <p className={styles.clear}>
          <CircleCheck size={20} aria-hidden="true" />
          Todo al día: nada espera por ti.
        </p>
      ) : (
        <ul role="list" className={styles.list}>
          {items.map((item) => {
            const Icon = ICONS[item.kind];
            return (
              <li key={item.key} className={styles.item}>
                <Icon size={20} className={styles.icon} aria-hidden="true" />
                <div className={styles.text}>
                  <p className={styles.itemTitle}>{item.title}</p>
                  <p className={styles.detail}>{item.detail}</p>
                </div>
                <Link to={item.to} viewTransition className={styles.action}>
                  {item.actionLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
