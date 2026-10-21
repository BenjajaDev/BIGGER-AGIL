import type { LucideIcon } from 'lucide-react';
import { cx } from '../../lib/cx';
import styles from './StatusBadge.module.css';

export type StatusTone = 'neutral' | 'accent' | 'highlight' | 'warning' | 'success';

export interface StatusBadgeProps {
  tone: StatusTone;
  icon: LucideIcon;
  label: string;
  className?: string;
}

/** A state is never communicated by color alone: every badge carries an icon and a text label. */
export function StatusBadge({ tone, icon: Icon, label, className }: StatusBadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone], className)}>
      <Icon className={styles.icon} size={14} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
}
