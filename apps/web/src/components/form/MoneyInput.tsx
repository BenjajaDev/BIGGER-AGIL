import { forwardRef, type InputHTMLAttributes } from 'react';
import styles from './forms.module.css';

export type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Whole Chilean pesos: numeric keypad on tablets, no decimals. */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput(props, ref) {
    return (
      <div className={styles.money}>
        <span className={styles.moneyPrefix} aria-hidden="true">
          $
        </span>
        <input
          ref={ref}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          className={styles.control}
          {...props}
        />
      </div>
    );
  },
);
