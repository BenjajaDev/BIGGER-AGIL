import type { InputHTMLAttributes } from 'react';
import { controlClassName } from '../../../components/form/control';
import { cx } from '../../../lib/cx';
import styles from './SupplyForm.module.css';

/** Decimal field (accepts «2,5») with the unit written after the number. */
export function UnitInput({
  unit,
  className,
  ...props
}: { unit: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode'>) {
  return (
    <span className={styles.suffixWrap}>
      <input
        inputMode="decimal"
        autoComplete="off"
        className={cx(controlClassName, styles.suffixInput, className)}
        {...props}
      />
      <span className={styles.suffix} aria-hidden="true">
        {unit}
      </span>
    </span>
  );
}
