import type { HTMLAttributes } from 'react';
import { cx } from '../../lib/cx';
import styles from './Card.module.css';

type CardElement = 'div' | 'section' | 'article' | 'li' | 'aside';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  padded?: boolean;
}

export function Card({ as: Element = 'div', padded = true, className, ...props }: CardProps) {
  return <Element className={cx(styles.card, padded && styles.padded, className)} {...props} />;
}
