import type { TicketLine } from '@bigger/shared';
import { cx } from '../../../lib/cx';
import styles from './TicketPreview.module.css';

export interface TicketPreviewProps {
  lines: readonly TicketLine[];
  columns: number;
  label: string;
}

/** The ticket as a thermal printer draws it: monospace, `columns` wide, doubled sizes and bold. */
export function TicketPreview({ lines, columns, label }: TicketPreviewProps) {
  return (
    <figure className={styles.wrap} aria-label={label}>
      <div className={styles.paper} style={{ width: `${columns}ch` }}>
        {lines.map((line, index) => (
          <div
            key={`${index}-${line.text}`}
            className={cx(
              styles.line,
              line.align === 'center' && styles.center,
              line.bold && styles.bold,
              line.size === 'tall' && styles.tall,
              line.size === 'big' && styles.big,
            )}
          >
            <span className={styles.text}>{line.text === '' ? ' ' : line.text}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
