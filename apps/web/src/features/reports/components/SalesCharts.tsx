import type { SalesReport } from '@bigger/shared';
import { formatClp } from '../../../lib/format';
import { shortDate } from '../report-format';
import styles from './SalesCharts.module.css';

const COMPACT = new Intl.NumberFormat('es-CL', { notation: 'compact', maximumFractionDigits: 1 });

const METHOD_LABELS = { cash: 'Efectivo', debit: 'Débito', junaeb: 'JUNAEB' } as const;

/** Bars drawn with plain elements; the same numbers are always written next to them. */
export function DailyChart({ days }: { days: SalesReport['byDay'] }) {
  const max = Math.max(...days.map((day) => day.salesClp), 1);
  return (
    <div>
      <ul role="list" className={styles.columns} aria-label="Ventas por día">
        {days.map((day) => (
          <li key={day.date} className={styles.column}>
            <span className={styles.columnValue}>
              <span aria-hidden="true">${COMPACT.format(day.salesClp)}</span>
              <span className="visually-hidden">{formatClp(day.salesClp)}</span>
            </span>
            <span
              className={styles.columnBar}
              data-best={day.salesClp === max ? 'true' : undefined}
              style={{ height: `${String((day.salesClp / max) * 100)}%` }}
            />
            <span className={styles.columnLabel}>{shortDate(day.date)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RankedBars({
  rows,
  unit,
}: {
  rows: readonly { name: string; quantity: number }[];
  unit: string;
}) {
  const max = Math.max(...rows.map((row) => row.quantity), 1);
  return (
    <ul role="list" className={styles.ranked}>
      {rows.map((row) => (
        <li key={row.name} className={styles.rankedRow}>
          <span className={styles.rankedName}>{row.name}</span>
          <span className={styles.rankedBar} aria-hidden="true">
            <span style={{ width: `${String((row.quantity / max) * 100)}%` }} />
          </span>
          <span className={styles.rankedValue}>
            {row.quantity} {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MethodTable({ rows }: { rows: SalesReport['byMethod'] }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Medio de pago</th>
          <th scope="col">Pagos</th>
          <th scope="col">Monto</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.method}>
            <th scope="row">{METHOD_LABELS[row.method]}</th>
            <td>{row.payments}</td>
            <td>{formatClp(row.amountClp)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
