import type { TableOverview } from '@bigger/shared';
import { Link } from 'react-router';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { cx } from '../../../lib/cx';
import { formatClp, minutesSince, pluralize } from '../../../lib/format';
import { TABLE_STATUS_PRESENTATION } from '../table-status';
import styles from './TableCard.module.css';

export interface TableCardProps {
  table: TableOverview;
  now: Date;
}

function describeTable(table: TableOverview, now: Date): string | null {
  switch (table.status) {
    case 'free':
      return null;
    case 'occupied': {
      const items = pluralize(table.itemCount, 'producto', 'productos');
      return table.openSince ? `${items} · ${minutesSince(table.openSince, now)} min` : items;
    }
    case 'awaiting-payment':
      return formatClp(table.openTotalClp);
  }
}

export function TableCard({ table, now }: TableCardProps) {
  const presentation = TABLE_STATUS_PRESENTATION[table.status];
  const detail = describeTable(table, now);

  return (
    <Link
      to={`/pedido?mesa=${table.id}`}
      className={cx(styles.card, styles[table.status])}
      aria-label={[table.label, presentation.label, detail].filter(Boolean).join(', ')}
    >
      <span className={styles.label}>{table.label}</span>
      <StatusBadge tone={presentation.tone} icon={presentation.icon} label={presentation.label} />
      {detail && <span className={styles.detail}>{detail}</span>}
    </Link>
  );
}
