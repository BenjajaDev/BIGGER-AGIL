import type { CashCloseSummary } from '@bigger/shared';
import { CircleAlert, CircleCheck, TrendingUp, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Field } from '../../../components/form/Field';
import { MoneyInput } from '../../../components/form/MoneyInput';
import { controlClassName } from '../../../components/form/control';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { formatClp } from '../../../lib/format';
import { describeRange } from '../report-format';
import { useCloseCash } from '../useReports';
import styles from './CashCloseCard.module.css';
import { MethodTable } from './SalesCharts';

type DifferenceTone = 'success' | 'warning' | 'danger';

function describeDifference(difference: number): {
  text: string;
  tone: DifferenceTone;
  icon: LucideIcon;
} {
  if (difference === 0) return { text: 'La caja cuadra.', tone: 'success', icon: CircleCheck };
  return difference > 0
    ? { text: `Sobran ${formatClp(difference)}.`, tone: 'warning', icon: TrendingUp }
    : { text: `Faltan ${formatClp(Math.abs(difference))}.`, tone: 'danger', icon: CircleAlert };
}

function Difference({ value, role }: { value: number; role?: 'status' }) {
  const { text, tone, icon: Icon } = describeDifference(value);
  return (
    <p role={role} className={styles.difference} data-tone={tone}>
      <Icon size={20} aria-hidden="true" />
      {text}
    </p>
  );
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
      <SectionHeader
        id="cierre-titulo"
        title="Cierre de caja"
        description={describeRange({ from: summary.date, to: summary.date })}
      />
      <div className={styles.columns}>
        <div className={styles.summary}>
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
        </div>

        {done ? (
          <div role="status" className={styles.done}>
            <p>
              <strong>Caja cerrada.</strong> Contado {formatClp(done.countedCashClp)}.
            </p>
            <Difference value={done.differenceClp} />
            {done.note !== '' && <p>Nota: {done.note}</p>}
          </div>
        ) : (
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              close.mutate({ date: summary.date, countedCashClp: Number(counted), note });
            }}
          >
            <Field label="Efectivo contado">
              {(control) => (
                <MoneyInput
                  {...control}
                  required
                  value={counted}
                  onChange={(event) => {
                    setCounted(event.target.value);
                  }}
                />
              )}
            </Field>
            <Field label="Nota (opcional)">
              {(control) => (
                <input
                  {...control}
                  className={controlClassName}
                  maxLength={240}
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value);
                  }}
                />
              )}
            </Field>
            {preview !== null && <Difference value={preview} role="status" />}
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
      </div>
    </Card>
  );
}
