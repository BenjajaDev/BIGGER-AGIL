import { cx } from '../../lib/cx';
import styles from './Button.module.css';

/** `primary` (rojo BIGGER) is reserved for the main action of each view. */
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'ghost';
export type ButtonSize = 'md' | 'lg';

export interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/** Shared by `Button`, `ButtonLink` and controls that must look like a button (file pickers). */
export function buttonClassName(
  { variant = 'secondary', size = 'md', fullWidth = false }: ButtonStyleProps,
  className?: string,
): string {
  return cx(
    styles.button,
    styles[variant],
    size === 'lg' && styles.lg,
    fullWidth && styles.fullWidth,
    className,
  );
}
