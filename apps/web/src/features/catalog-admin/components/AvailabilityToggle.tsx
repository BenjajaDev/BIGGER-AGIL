import type { AdminProduct } from '@bigger/shared';
import { cx } from '../../../lib/cx';
import styles from './AvailabilityToggle.module.css';

export interface AvailabilityToggleProps {
  product: Pick<AdminProduct, 'name' | 'isAvailable'>;
  disabled?: boolean;
  onChange: (isAvailable: boolean) => void;
}

/** «Agotado hoy»: a switch on the row, so a sold-out product is one tap away, not an edit form. */
export function AvailabilityToggle({
  product,
  disabled = false,
  onChange,
}: AvailabilityToggleProps) {
  const soldOut = !product.isAvailable;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={soldOut}
      aria-label={`Agotado hoy: ${product.name}`}
      disabled={disabled}
      className={cx(styles.toggle, soldOut && styles.on)}
      onClick={() => {
        onChange(soldOut);
      }}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      Agotado hoy
    </button>
  );
}
