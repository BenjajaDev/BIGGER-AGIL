import { CircleAlert } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './forms.module.css';

export interface FieldControlProps {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

export interface FieldProps {
  label: ReactNode;
  hint?: string;
  error?: string | undefined;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

export function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} className={styles.error}>
      <CircleAlert size={16} aria-hidden="true" />
      {message}
    </p>
  );
}

/**
 * Label + control + hint + error. `aria-invalid` and the error text appear in the same render,
 * and the form only reports errors after the user touched the field or tried to save.
 */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-ayuda`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ');

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({
        id,
        ...(error ? { 'aria-invalid': true as const } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId} message={error} />}
    </div>
  );
}
