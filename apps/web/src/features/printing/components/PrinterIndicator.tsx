import { Printer, PrinterCheck, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { cx } from '../../../lib/cx';
import { describeHealth, printerHealth } from '../printer-health';
import { usePrinterStatus } from '../usePrinter';
import styles from './PrinterIndicator.module.css';

/** Top-bar light for the printer; absent while printing is off so nobody is nagged about it. */
export function PrinterIndicator() {
  const { data: status } = usePrinterStatus();
  if (!status?.enabled) return null;

  const health = printerHealth(status);
  const Icon = health === 'attention' ? TriangleAlert : health === 'ready' ? PrinterCheck : Printer;
  return (
    <Link
      to="/configuracion/impresora"
      className={cx(styles.indicator, health === 'attention' && styles.attention)}
    >
      <Icon size={18} aria-hidden="true" />
      <span className={health === 'ready' ? styles.quiet : undefined}>
        {describeHealth(status)}
      </span>
    </Link>
  );
}
