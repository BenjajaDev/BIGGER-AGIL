import { Minus, Plus } from 'lucide-react';
import styles from './QuantityStepper.module.css';

export interface QuantityStepperProps {
  value: number;
  itemName: string;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function QuantityStepper({
  value,
  itemName,
  onIncrement,
  onDecrement,
}: QuantityStepperProps) {
  return (
    <div className={styles.stepper} role="group" aria-label={`Cantidad de ${itemName}`}>
      <button
        type="button"
        className={styles.step}
        onClick={onDecrement}
        aria-label={value === 1 ? `Quitar ${itemName} de la comanda` : `Restar un ${itemName}`}
      >
        <Minus size={20} aria-hidden="true" />
      </button>
      <output className={styles.value} aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={styles.step}
        onClick={onIncrement}
        aria-label={`Sumar un ${itemName}`}
      >
        <Plus size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
