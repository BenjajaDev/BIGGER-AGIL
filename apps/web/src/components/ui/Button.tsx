import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import { buttonClassName, type ButtonStyleProps } from './button-styles';

export type { ButtonSize, ButtonVariant } from './button-styles';

/** Icon-only buttons have no visible text, so an accessible name is mandatory. */
type IconOnlyProps = { iconOnly?: false } | { iconOnly: true; 'aria-label': string };

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  Omit<ButtonStyleProps, 'iconOnly'> &
  IconOnlyProps;

export function Button({
  variant,
  size,
  fullWidth,
  iconOnly,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, fullWidth, iconOnly }, className)}
      {...props}
    />
  );
}

export type ButtonLinkProps = LinkProps & Omit<ButtonStyleProps, 'iconOnly'> & IconOnlyProps;

export function ButtonLink({
  variant,
  size,
  fullWidth,
  iconOnly,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClassName({ variant, size, fullWidth, iconOnly }, className)}
      {...props}
    />
  );
}
