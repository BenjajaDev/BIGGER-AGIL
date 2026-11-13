import type { CashCloseSummary } from '@bigger/shared';
import { useState } from 'react';
import { MoneyInput } from '../../../components/form/MoneyInput';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { formatClp } from '../../../lib/format';
import { useCloseCash } from '../useReports';
import styles from './CashCloseCard.module.css';
import { MethodTable } from './SalesCharts';

function describeDifference(difference: number): string {
  if (difference === 0) return 'La caja cuadra.';
  return difference > 0
    ? `Sobran ${formatClp(difference)}.`
    : `Faltan ${formatClp(Math.abs(difference))}.`;
}

/** Closing the day: what the system expects in cash against what is counted in the drawer. */
export function CashCloseCard({ summary }: { summary: CashCloseSummary }) {
  const close = useCloseCash();
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const done = summary.close;
  const preview = counted === '' ? null : Number(counted) - summary.expectedCashClp;

  return (
    <Card as="section" aria-labelledby="cierre-titulo" className={styles.card}>
      <h2 id="cierre-titulo" className={styles.title}>
        Cierre de caja · {summary.date}
      </h2>
      <MethodTable
        rows={summary.byMethod.map((row) => ({
          method: row.method,
          payments: row.payments,
          amountClp: row.amountClp,
        }))}
      />
      <dl className={styles.figures}>
        <div>
          <dt>Ventas</dt>
          <dd>{formatClp(summary.salesClp)}</dd>
        </div>
        <div>
          <dt>Propinas</dt>
          <dd>{formatClp(summary.tipsClp)}</dd>
        </div>
        <div>
          <dt>Efectivo esperado en caja</dt>
          <dd className={styles.big}>{formatClp(summary.expectedCashClp)}</dd>
        </div>
      </dl>
      {summary.voided.length > 0 && (
        <p className={styles.voided}>
          Pagos anulados: {summary.voided.length} (
          {formatClp(summary.voided.reduce((sum, payment) => sum + payment.amountClp, 0))}), no
          cuentan en los totales.
        </p>
      )}

      {done ? (
        <p role="status" className={styles.done}>
          Caja cerrada. Contado {formatClp(done.countedCashClp)}.{' '}
          {describeDifference(done.differenceClp)}
          {done.note !== '' && ` Nota: ${done.note}`}
        </p>
      ) : (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            close.mutate({ date: summary.date, countedCashClp: Number(counted), note });
          }}
        >
          <div className={styles.field}>
            <label htmlFor="efectivo-contado">Efectivo contado</label>
            <MoneyInput
              id="efectivo-contado"
              required
              value={counted}
              onChange={(event) => {
                setCounted(event.target.value);
              }}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="nota-cierre">Nota (opcional)</label>
            <input
              id="nota-cierre"
              className={styles.note}
              maxLength={240}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
              }}
            />
          </div>
          {preview !== null && <p role="status">{describeDifference(preview)}</p>}
          {close.error && (
            <p role="alert" className={styles.error}>
              {close.error.message}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={counted === '' || close.isPending}>
            Cerrar caja
          </Button>
        </form>
      )}
    </Card>
  );
}
