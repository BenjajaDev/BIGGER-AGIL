import type { Supply, SupplyAlert } from '@bigger/shared';
import { ALERT_PRESENTATION } from './alert-presentation';
import { formatQuantity, statusPhrase, supplyRowLabel } from '../supply-text';
import styles from './InventoryList.module.css';
import { StockMeter } from './StockMeter';

/** A whole supply in one tap target: its name, state in words, stock and level. */
export function SupplyRow({
  supply,
  alert,
  today,
  onOpen,
}: {
  supply: Supply;
  alert: SupplyAlert;
  today: string;
  onOpen: () => void;
}) {
  const { icon: Icon } = ALERT_PRESENTATION[alert];
  const label = supplyRowLabel(supply, alert, today);
  const [figure, unit] = formatQuantity(supply.stock, supply.unit).split(' ');
  return (
    <li>
      <button
        type="button"
        className={styles.rowButton}
        data-alert={alert}
        aria-label={label}
        onClick={onOpen}
      >
        <Icon className={styles.rowIcon} size={24} aria-hidden="true" />
        <span className={styles.rowMain} aria-hidden="true">
          <span className={styles.rowName}>{supply.name}</span>
          {supply.supplierName && <span className={styles.rowMeta}>{supply.supplierName}</span>}
          <span className={styles.rowStatus}>{statusPhrase(supply, alert, today)}</span>
        </span>
        <span className={styles.rowStock} aria-hidden="true">
          <span className={styles.stockFigure}>
            {figure}
            <span className={styles.stockUnit}>{unit}</span>
          </span>
          <StockMeter stock={supply.stock} minStock={supply.minStock} alert={alert} />
          <span className={styles.minimum}>
            mín. {formatQuantity(supply.minStock, supply.unit)}
          </span>
        </span>
      </button>
    </li>
  );
}
