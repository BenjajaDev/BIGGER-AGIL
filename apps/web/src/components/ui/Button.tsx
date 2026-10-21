import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cx } from '../../lib/cx';
import styles from './Button.module.css';

/** `primary` (rojo BIGGER) is reserved for the main action of each view. */
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'ghost';
export type ButtonSize = 'md' | 'lg';

interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

function buttonClassName(
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

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyleProps;

export function Button({
  variant,
  size,
  fullWidth,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, fullWidth }, className)}
      {...props}
    />
  );
}

export type ButtonLinkProps = LinkProps & ButtonStyleProps;

export function ButtonLink({ variant, size, fullWidth, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClassName({ variant, size, fullWidth }, className)} {...props} />;
}
