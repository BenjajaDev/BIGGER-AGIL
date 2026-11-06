import type { TableOverview } from '@bigger/shared';
import { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { TableMap } from '../../tables/components/TableMap';
import { TableStatusLegend } from '../../tables/components/TableStatusLegend';
import {
  filterTables,
  TABLE_FILTER_LABELS,
  TABLE_FILTERS,
  type TableFilter,
} from '../summary-model';
import styles from './TablesSection.module.css';

const EMPTY_TEXT: Readonly<Record<TableFilter, string>> = {
  all: 'Todavía no hay mesas configuradas.',
  occupied: 'No hay mesas ocupadas ahora.',
  'to-pay': 'Ninguna mesa espera la cuenta.',
};

export function TablesSection({ tables, now }: { tables: readonly TableOverview[]; now: Date }) {
  const [filter, setFilter] = useState<TableFilter>('all');
  const visible = filterTables(tables, filter);

  return (
    <Card as="section" aria-labelledby="resumen-mesas-titulo" className={styles.card}>
      <div className={styles.head}>
        <h2 id="resumen-mesas-titulo" className={styles.title}>
          Mesas
        </h2>
        <div role="group" aria-label="Filtrar mesas" className={styles.filters}>
          {TABLE_FILTERS.map((option) => (
            <Chip
              key={option}
              pressed={filter === option}
              onClick={() => {
                setFilter(option);
              }}
            >
              {TABLE_FILTER_LABELS[option]}
            </Chip>
          ))}
        </div>
      </div>
      <TableStatusLegend />
      {visible.length === 0 ? (
        <p className={styles.empty}>{EMPTY_TEXT[filter]}</p>
      ) : (
        <TableMap tables={visible} now={now} />
      )}
    </Card>
  );
}
