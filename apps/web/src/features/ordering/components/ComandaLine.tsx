import { QUICK_NOTES, type QuickNote } from '@bigger/shared';
import { Chip } from '../../../components/ui/Chip';
import { QuantityStepper } from '../../../components/ui/QuantityStepper';
import { formatClp } from '../../../lib/format';
import { QUICK_NOTE_LABELS } from '../../orders/order-text';
import type { DraftLine } from '../order-draft';
import styles from './ComandaLine.module.css';

export interface ComandaLineProps {
  line: DraftLine;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onToggleNote: (productId: string, note: QuickNote) => void;
}

export function ComandaLine({ line, onIncrement, onDecrement, onToggleNote }: ComandaLineProps) {
  return (
    <li className={styles.line}>
      <div className={styles.header}>
        <span>{line.productName}</span>
        <span className={styles.subtotal}>{formatClp(line.unitPriceClp * line.quantity)}</span>
      </div>
      <QuantityStepper
        value={line.quantity}
        itemName={line.productName}
        onIncrement={() => {
          onIncrement(line.productId);
        }}
        onDecrement={() => {
          onDecrement(line.productId);
        }}
      />
      <div
        className={styles.notes}
        role="group"
        aria-label={`Notas rápidas para ${line.productName}`}
      >
        {QUICK_NOTES.map((note) => (
          <Chip
            key={note}
            compact
            pressed={line.quickNotes.includes(note)}
            onClick={() => {
              onToggleNote(line.productId, note);
            }}
          >
            {QUICK_NOTE_LABELS[note]}
          </Chip>
        ))}
      </div>
    </li>
  );
}
