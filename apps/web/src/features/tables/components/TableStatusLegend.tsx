import { TABLE_STATUSES } from '@bigger/shared';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { TABLE_STATUS_PRESENTATION } from '../table-status';
import styles from './TableStatusLegend.module.css';

export function TableStatusLegend() {
  return (
    <ul role="list" className={styles.legend} aria-label="Leyenda de estados de mesa">
      {TABLE_STATUSES.map((status) => {
        const { label, tone, icon } = TABLE_STATUS_PRESENTATION[status];
        return (
          <li key={status}>
            <StatusBadge tone={tone} icon={icon} label={label} />
          </li>
        );
      })}
    </ul>
  );
}
