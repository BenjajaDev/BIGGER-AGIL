import type { ReactNode } from 'react';
import { Card } from '../../../components/ui/Card';
import { cx } from '../../../lib/cx';
import styles from './AdminListRow.module.css';

export interface AdminListRowProps {
  /** Thumbnail or icon on the left. */
  leading?: ReactNode;
  title: ReactNode;
  /** Badges next to the title. */
  badges?: ReactNode;
  /** One or more meta lines under the title. */
  meta?: ReactNode;
  /** Price or any value aligned to the right of the text. */
  trailing?: ReactNode;
  actions?: ReactNode;
  archived?: boolean;
  /** Replaces the whole row content (inline editing). */
  children?: ReactNode;
}

/** The single list-row pattern of every catalog list: info on the left, actions on the right. */
export function AdminListRow({
  leading,
  title,
  badges,
  meta,
  trailing,
  actions,
  archived = false,
  children,
}: AdminListRowProps) {
  return (
    <Card as="li" padded={false} className={cx(styles.row, archived && styles.archived)}>
      {children ?? (
        <>
          {leading && <div className={styles.leading}>{leading}</div>}
          <div className={styles.main}>
            <span className={styles.title}>
              {title}
              {badges}
            </span>
            {meta && <span className={styles.meta}>{meta}</span>}
          </div>
          {trailing && <div className={styles.trailing}>{trailing}</div>}
          {actions && <div className={styles.actions}>{actions}</div>}
        </>
      )}
    </Card>
  );
}
