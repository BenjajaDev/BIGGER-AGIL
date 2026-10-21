import { useId } from 'react';
import { FieldError } from './Field';
import styles from './forms.module.css';

export interface CheckboxOption {
  value: string;
  label: string;
  description?: string;
}

export interface CheckboxGroupProps {
  legend: string;
  hint?: string;
  options: readonly CheckboxOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  error?: string | undefined;
}

/** Multi-select as real checkboxes inside a fieldset, so the group is announced with its legend. */
export function CheckboxGroup({
  legend,
  hint,
  options,
  value,
  onChange,
  onBlur,
  error,
}: CheckboxGroupProps) {
  const id = useId();
  const describedBy = [hint && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ');

  const toggle = (optionValue: string, checked: boolean) => {
    onChange(
      checked
        ? options
            .map((option) => option.value)
            .filter((v) => v === optionValue || value.includes(v))
        : value.filter((v) => v !== optionValue),
    );
  };

  return (
    <fieldset
      className={styles.fieldset}
      {...(describedBy ? { 'aria-describedby': describedBy } : {})}
    >
      <legend className={styles.legend}>{legend}</legend>
      {hint && (
        <p id={`${id}-ayuda`} className={styles.hint}>
          {hint}
        </p>
      )}
      <div className={styles.options}>
        {options.map((option) => (
          <label key={option.value} className={styles.check}>
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={(event) => {
                toggle(option.value, event.target.checked);
              }}
              onBlur={onBlur}
            />
            <span className={styles.checkText}>
              {option.label}
              {option.description && (
                <span className={styles.checkDescription}>{option.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
      {error && <FieldError id={`${id}-error`} message={error} />}
    </fieldset>
  );
}
