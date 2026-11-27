import type { Supply } from '@bigger/shared';
import { Package, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { controlClassName } from '../../../components/form/control';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { cx } from '../../../lib/cx';
import { localToday } from '../../../lib/dates';
import {
  countFilters,
  matchesFilter,
  matchesQuery,
  sortByUrgency,
  type SupplyFilter,
} from '../supply-filters';
import styles from './InventoryList.module.css';
import { SupplyFilters } from './SupplyFilters';
import { SupplyRow } from './SupplyRow';

export function InventoryTab({
  supplies,
  onOpen,
  onCreate,
}: {
  supplies: readonly Supply[];
  onOpen: (supply: Supply) => void;
  onCreate: () => void;
}) {
  const today = localToday();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SupplyFilter>('all');
  const counts = useMemo(() => countFilters(supplies, today), [supplies, today]);
  const rows = useMemo(
    () =>
      sortByUrgency(supplies, today).filter(
        ({ supply }) => matchesFilter(supply, filter, today) && matchesQuery(supply.name, query),
      ),
    [supplies, today, filter, query],
  );

  if (supplies.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Todavía no hay insumos"
        description="Agrega el primero para controlar el stock."
        action={
          <Button variant="primary" onClick={onCreate}>
            Nuevo insumo
          </Button>
        }
      />
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search className={styles.searchIcon} size={20} aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar insumo"
            placeholder="Buscar insumo"
            autoComplete="off"
            className={cx(controlClassName, styles.searchInput)}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </div>
        <SupplyFilters value={filter} counts={counts} onChange={setFilter} />
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No hay insumos que mostrar"
          description="Prueba con otra búsqueda o revisa todos los insumos."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              Ver todos
            </Button>
          }
        />
      ) : (
        <ul role="list" className={styles.rows} aria-label="Insumos">
          {rows.map(({ supply, alert }) => (
            <SupplyRow
              key={supply.id}
              supply={supply}
              alert={alert}
              today={today}
              onOpen={() => {
                onOpen(supply);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
