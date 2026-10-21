import { Check } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';
import styles from './Chip.module.css';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  pressed: boolean;
  compact?: boolean;
}

/** Toggle button: state is exposed through `aria-pressed` and a check icon, not only color. */
export function Chip({ pressed, compact = false, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cx(styles.chip, compact && styles.compact, className)}
      {...props}
    >
      {pressed && <Check size={16} strokeWidth={2.5} aria-hidden="true" />}
      {children}
    </button>
  );
}
