import { FILTER_LABELS, FILTERS, type SupplyFilter } from '../supply-filters';
import styles from './InventoryList.module.css';

const TONES: Partial<Record<SupplyFilter, 'warning' | 'danger'>> = {
  reorder: 'warning',
  expiring: 'warning',
  expired: 'danger',
};

export function SupplyFilters({
  value,
  counts,
  onChange,
}: {
  value: SupplyFilter;
  counts: Readonly<Record<SupplyFilter, number>>;
  onChange: (filter: SupplyFilter) => void;
}) {
  return (
    <div role="group" aria-label="Filtrar insumos" className={styles.filters}>
      {FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          className={styles.filter}
          aria-pressed={value === filter}
          onClick={() => {
            onChange(filter);
          }}
        >
          {FILTER_LABELS[filter]}
          <span className={styles.count} data-tone={counts[filter] > 0 ? TONES[filter] : undefined}>
            {counts[filter]}
          </span>
        </button>
      ))}
    </div>
  );
}
