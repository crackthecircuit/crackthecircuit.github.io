import type { ComponentPropsWithRef } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  /** Keyboard shortcut shown as a small key cap. */
  shortcut?: string;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  shortcut,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={[styles.button, className].filter(Boolean).join(' ')}
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {children}
      {shortcut && <kbd className={styles.kbd}>{shortcut}</kbd>}
    </button>
  );
}
