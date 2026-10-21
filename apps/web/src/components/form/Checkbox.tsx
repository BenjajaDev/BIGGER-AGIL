import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './forms.module.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, ...props },
  ref,
) {
  return (
    <label className={styles.check}>
      <input ref={ref} type="checkbox" {...props} />
      <span className={styles.checkText}>
        {label}
        {description && <span className={styles.checkDescription}>{description}</span>}
      </span>
    </label>
  );
});
