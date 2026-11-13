import type { SupplyAlert } from '@bigger/shared';
import type { CSSProperties } from 'react';
import styles from './Inventory.module.css';

/**
 * Stock level at a glance: the bar fills up to twice the minimum and the notch marks the minimum.
 * Decorative: the row already says the stock and the minimum in words.
 */
export function StockMeter({
  stock,
  minStock,
  alert,
}: {
  stock: number;
  minStock: number;
  alert: SupplyAlert;
}) {
  const scale = Math.max(minStock * 2, stock, 1);
  const style = {
    '--meter-fill': `${String(Math.min(100, (stock / scale) * 100))}%`,
    '--meter-min': `${String((minStock / scale) * 100)}%`,
  } as CSSProperties;
  return <span className={styles.meter} data-alert={alert} style={style} aria-hidden="true" />;
}
