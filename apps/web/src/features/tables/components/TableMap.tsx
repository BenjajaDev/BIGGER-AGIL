import type { TableOverview } from '@bigger/shared';
import { TableCard } from './TableCard';
import styles from './TableMap.module.css';

export interface TableMapProps {
  tables: readonly TableOverview[];
  now: Date;
}

export function TableMap({ tables, now }: TableMapProps) {
  return (
    <ul role="list" className={styles.grid}>
      {tables.map((table) => (
        <li key={table.id}>
          <TableCard table={table} now={now} />
        </li>
      ))}
    </ul>
  );
}
