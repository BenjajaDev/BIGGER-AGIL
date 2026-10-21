import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  inverse?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  inverse = false,
}: EmptyStateProps) {
  return (
    <div className={cx(styles.empty, inverse && styles.inverse)}>
      <Icon className={styles.icon} size={32} aria-hidden="true" />
      <p className={styles.title}>{title}</p>
      {description && <p>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
