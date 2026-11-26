import { cx } from '../../lib/cx';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  lines?: number;
  height?: string;
  className?: string;
}

/** Decorative loading placeholder; announce loading state in the parent. */
export function Skeleton({ lines = 1, height = '1rem', className }: SkeletonProps) {
  return (
    <div className={cx(styles.skeleton, className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className={styles.block} style={{ height }} />
      ))}
    </div>
  );
}
