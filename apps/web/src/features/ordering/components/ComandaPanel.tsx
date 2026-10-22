import { ChefHat, ReceiptText } from 'lucide-react';
import { useId, useState } from 'react';
import { controlClassName } from '../../../components/form/control';
import { FieldError } from '../../../components/form/Field';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatClockTime, formatClp, formatClpSpoken } from '../../../lib/format';
import type { DraftLine } from '../order-draft';
import { ComandaLine } from './ComandaLine';
import styles from './ComandaPanel.module.css';

export interface ComandaPanelProps {
  heading: string;
  subtitle: string;
  customerName: string;
  /** Takeaway orders require a name so the kitchen knows who to call. */
  requireName: boolean;
  lines: readonly DraftLine[];
  totalClp: number;
  onSetCustomerName: (name: string) => void;
  onIncrement: (lineId: string) => void;
  onDecrement: (lineId: string) => void;
  onSetNote: (lineId: string, note: string) => void;
  /** Absent until the order write endpoint exists; the main action stays disabled. */
  onSubmit?: () => void;
  isSubmitting?: boolean;
  error?: string | undefined;
}

export function ComandaPanel({
  heading,
  subtitle,
  customerName,
  requireName,
  lines,
  totalClp,
  onSetCustomerName,
  onIncrement,
  onDecrement,
  onSetNote,
  onSubmit,
  isSubmitting = false,
  error,
}: ComandaPanelProps) {
  const nameId = useId();
  const hintId = useId();
  const [openedAt] = useState(() => new Date());
  const nameMissing = requireName && customerName.trim() === '';
  const canSubmit = onSubmit !== undefined && lines.length > 0 && !isSubmitting && !nameMissing;
  const tipClp = Math.round(totalClp * 0.1);
  const totalWithTipClp = totalClp + tipClp;

  return (
    <Card as="aside" className={styles.panel} aria-labelledby="comanda-titulo">
      <div className={styles.head}>
        <p className={styles.eyebrow}>BIGGER</p>
        <h2 id="comanda-titulo" className={styles.heading}>
          {heading}
        </h2>
        <p className={styles.subtitle}>{subtitle}</p>

        <p className={styles.meta}>
          <span>Comanda nueva</span>
          <time dateTime={openedAt.toISOString()}>{formatClockTime(openedAt.toISOString())}</time>
        </p>

        {requireName && (
          <div className={styles.name}>
            <label htmlFor={nameId}>Nombre</label>
            <input
              id={nameId}
              type="text"
              className={controlClassName}
              value={customerName}
              maxLength={60}
              required
              aria-describedby={hintId}
              placeholder="¿Para quién es?"
              onChange={(event) => {
                onSetCustomerName(event.target.value);
              }}
            />
            <p id={hintId} className={styles.nameHint}>
              Obligatorio para pedidos para llevar
            </p>
          </div>
        )}

        <p className={styles.columns} aria-hidden="true">
          <span>Cant</span>
          <span className={styles.columnsProduct}>
            <span>Producto</span>
            <span>Total</span>
          </span>
        </p>
      </div>

      <div className={styles.lines}>
        {lines.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="Comanda vacía"
            description="Toca un producto para agregarlo."
          />
        ) : (
          <ul role="list" className={styles.list}>
            {lines.map((line) => (
              <ComandaLine
                key={line.lineId}
                line={line}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onSetNote={onSetNote}
              />
            ))}
          </ul>
        )}
      </div>

      <div className={styles.footer}>
        {error && <FieldError message={error} />}
        <div className={styles.subtotals}>
          <p className={styles.subtotalRow}>
            <span>Subtotal</span>
            <span>{formatClp(totalClp)}</span>
          </p>
          <p className={styles.subtotalRow}>
            <span>Propina sugerida (10%)</span>
            <span>{formatClp(tipClp)}</span>
          </p>
        </div>
        <p className={styles.total}>
          <span>Total con propina</span>
          <span className={styles.totalAmount} aria-hidden="true">
            {formatClp(totalWithTipClp)}
          </span>
          <span className="visually-hidden">{formatClpSpoken(totalWithTipClp)}</span>
        </p>
        <Button variant="primary" size="lg" fullWidth disabled={!canSubmit} onClick={onSubmit}>
          <ChefHat size={20} aria-hidden="true" />
          {isSubmitting ? 'Enviando…' : 'Enviar a cocina'}
        </Button>
      </div>
    </Card>
  );
}
