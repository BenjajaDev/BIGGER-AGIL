import type { Supply, SupplyAlert } from '@bigger/shared';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { formatQuantity, statusPhrase } from '../supply-text';
import { ALERT_PRESENTATION } from './alert-presentation';
import styles from './Ficha.module.css';
import { StockMeter } from './StockMeter';

export function FichaHeader({
  supply,
  alert,
  today,
}: {
  supply: Supply;
  alert: SupplyAlert;
  today: string;
}) {
  const { tone, icon } = ALERT_PRESENTATION[alert];
  const [figure, unit] = formatQuantity(supply.stock, supply.unit).split(' ');
  return (
    <div className={styles.summary}>
      <div className={styles.summaryTop}>
        <span className={styles.caption}>Hay ahora</span>
        <StatusBadge tone={tone} icon={icon} label={statusPhrase(supply, alert, today)} />
      </div>
      <p className={styles.stockBig}>
        {figure}
        <small>{unit}</small>
      </p>
      <StockMeter stock={supply.stock} minStock={supply.minStock} alert={alert} />
      <p className={styles.summaryMeta}>
        Mínimo {formatQuantity(supply.minStock, supply.unit)}
        {supply.supplierName && ` · ${supply.supplierName}`}
      </p>
    </div>
  );
}
