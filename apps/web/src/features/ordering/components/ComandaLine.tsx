import { Minus, Plus } from 'lucide-react';
import { controlClassName } from '../../../components/form/control';
import { formatClp } from '../../../lib/format';
import { QUICK_NOTE_LABELS } from '../../orders/order-text';
import type { DraftLine } from '../order-draft';
import styles from './ComandaLine.module.css';

export interface ComandaLineProps {
  line: DraftLine;
  onIncrement: (lineId: string) => void;
  onDecrement: (lineId: string) => void;
  onSetNote: (lineId: string, note: string) => void;
}

interface Detail {
  text: string;
  priceClp: number;
}

function lineDetails(line: DraftLine): Detail[] {
  return [
    ...(line.size ? [{ text: line.size.sizeName, priceClp: 0 }] : []),
    ...line.options.map((option) => ({ text: option.optionName, priceClp: option.priceDeltaClp })),
    ...line.comboChoices.map((choice) => ({
      text: choice.productName,
      priceClp: choice.extraPriceClp,
    })),
    ...line.quickNotes.map((note) => ({ text: QUICK_NOTE_LABELS[note], priceClp: 0 })),
  ];
}

export function ComandaLine({ line, onIncrement, onDecrement, onSetNote }: ComandaLineProps) {
  const noteId = `nota-${line.lineId}`;
  const details = lineDetails(line);
  const removeLabel =
    line.quantity === 1
      ? `Quitar ${line.productName} de la comanda`
      : `Restar un ${line.productName}`;

  return (
    <li className={styles.line}>
      <div className={styles.row}>
        <div className={styles.cant}>
          <span className={styles.qty}>{line.quantity}</span>
          <div
            className={styles.stepper}
            role="group"
            aria-label={`Cantidad de ${line.productName}`}
          >
            <button
              type="button"
              className={styles.step}
              aria-label={removeLabel}
              onClick={() => {
                onDecrement(line.lineId);
              }}
            >
              <Minus size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.step}
              aria-label={`Sumar un ${line.productName}`}
              onClick={() => {
                onIncrement(line.lineId);
              }}
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={styles.product}>
          <div className={styles.header}>
            <span className={styles.name}>{line.productName}</span>
            <span className={styles.total}>{formatClp(line.basePriceClp * line.quantity)}</span>
          </div>
          {details.length > 0 && (
            <ul role="list" className={styles.detail}>
              {details.map((detail, index) => (
                <li key={`${detail.text}-${index}`}>
                  <span>• {detail.text}</span>
                  {detail.priceClp > 0 && (
                    <span className={styles.detailPrice}>+{formatClp(detail.priceClp)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <label htmlFor={noteId} className="visually-hidden">
        Nota para {line.productName}
      </label>
      <input
        id={noteId}
        type="text"
        className={controlClassName}
        value={line.note}
        maxLength={140}
        placeholder="Nota para la cocina (opcional)"
        onChange={(event) => {
          onSetNote(line.lineId, event.target.value);
        }}
      />
    </li>
  );
}
