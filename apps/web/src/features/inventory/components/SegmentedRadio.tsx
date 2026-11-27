import type { LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { cx } from '../../../lib/cx';
import styles from './Segmented.module.css';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

/** A few large, mutually exclusive choices: native radios, so arrow keys work as expected. */
export function SegmentedRadio<T extends string>({
  label,
  name,
  options,
  value,
  onChange,
  tall = false,
  template,
}: {
  label: string;
  name: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  tall?: boolean;
  /** CSS `grid-template-columns` when the options need unequal widths. */
  template?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={styles.group}
      style={
        {
          '--segments': options.length,
          ...(template ? { gridTemplateColumns: template } : {}),
        } as CSSProperties
      }
    >
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon }) => (
        <label key={optionValue} className={cx(styles.option, tall && styles.tall)}>
          <input
            type="radio"
            name={name}
            value={optionValue}
            className={styles.input}
            checked={value === optionValue}
            onChange={() => {
              onChange(optionValue);
            }}
          />
          {Icon && <Icon size={24} aria-hidden="true" />}
          {optionLabel}
        </label>
      ))}
    </div>
  );
}
