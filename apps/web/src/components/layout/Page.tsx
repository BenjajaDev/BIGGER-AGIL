import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Page.module.css';

export interface PageProps {
  width?: 'wide' | 'narrow' | 'full';
  className?: string;
  children: ReactNode;
  as?: 'div' | 'section';
}

/** Single page container: same centring and gutter on every screen. */
export function Page({ width = 'wide', className, children, as: Tag = 'div' }: PageProps) {
  return <Tag className={cx(styles.page, styles[width], className)}>{children}</Tag>;
}
