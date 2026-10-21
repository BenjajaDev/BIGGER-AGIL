import type { QuickNote } from '@bigger/shared';
import { ChefHat, ReceiptText } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatClp, formatClpSpoken } from '../../../lib/format';
import type { DraftLine } from '../order-draft';
import { ComandaLine } from './ComandaLine';
import styles from './ComandaPanel.module.css';

export interface ComandaPanelProps {
  title: string;
  lines: readonly DraftLine[];
  totalClp: number;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onToggleNote: (productId: string, note: QuickNote) => void;
  /** Absent until the order write endpoint exists; the main action stays disabled. */
  onSubmit?: () => void;
  isSubmitting?: boolean;
}

export function ComandaPanel({
  title,
  lines,
  totalClp,
  onIncrement,
  onDecrement,
  onToggleNote,
  onSubmit,
  isSubmitting = false,
}: ComandaPanelProps) {
  const canSubmit = onSubmit !== undefined && lines.length > 0 && !isSubmitting;

  return (
    <Card as="aside" className={styles.panel} aria-labelledby="comanda-titulo">
      <h2 id="comanda-titulo" className={styles.title}>
        {title}
      </h2>

      <div className={styles.lines}>
        {lines.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="Comanda vacía"
            description="Toca un producto para agregarlo."
          />
        ) : (
          <ul role="list">
            {lines.map((line) => (
              <ComandaLine
                key={line.productId}
                line={line}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onToggleNote={onToggleNote}
              />
            ))}
          </ul>
        )}
      </div>

      <div className={styles.footer}>
        <p className={styles.total}>
          <span>Total</span>
          <span className={styles.totalAmount} aria-hidden="true">
            {formatClp(totalClp)}
          </span>
          <span className="visually-hidden">{formatClpSpoken(totalClp)}</span>
        </p>
        <Button variant="primary" size="lg" fullWidth disabled={!canSubmit} onClick={onSubmit}>
          <ChefHat size={20} aria-hidden="true" />
          {isSubmitting ? 'Enviando…' : 'Enviar a cocina'}
        </Button>
      </div>
    </Card>
  );
}
