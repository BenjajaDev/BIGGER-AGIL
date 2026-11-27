import { ChevronRight, type LucideIcon, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';
import { cx } from '../../lib/cx';
import { Card } from './Card';
import styles from './StatCard.module.css';

export interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { direction: 'up' | 'down' | 'flat'; text: string };
  hint?: string;
  to?: string;
}

const TREND_ICONS = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

export function StatCard({ label, value, icon: Icon, trend, hint, to }: StatCardProps) {
  const TrendIcon = trend ? TREND_ICONS[trend.direction] : null;
  const body = (
    <>
      <span className={styles.label}>
        <span className={styles.icon}>
          <Icon size={18} aria-hidden="true" />
        </span>
        {label}
        {to && <ChevronRight className={styles.chevron} size={18} aria-hidden="true" />}
      </span>
      <span className={styles.value}>{value}</span>
      {trend && TrendIcon && (
        <span className={styles.trend} data-trend={trend.direction}>
          <TrendIcon size={14} aria-hidden="true" />
          {trend.text}
        </span>
      )}
      {hint && <span className={styles.hint}>{hint}</span>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cx(styles.card, styles.link)}>
        {body}
      </Link>
    );
  }
  return <Card className={styles.card}>{body}</Card>;
}
