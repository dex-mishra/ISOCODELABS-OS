'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:opacity-45 disabled:pointer-events-none';

    // Cobalt is the only interactive color (design-language.md). Secondary,
    // outline and ghost recede onto neutrals so one primary action dominates.
    const variants = {
      primary: 'bg-accent-blue text-white hover:bg-accent-blueHover active:bg-accent-blueActive shadow-button',
      secondary: 'bg-apple-gray dark:bg-sf-bg-elevatedDark text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-800 active:bg-neutral-300 dark:active:bg-neutral-700',
      outline: 'border border-border bg-transparent text-foreground hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark active:bg-neutral-200 dark:active:bg-neutral-800',
      danger: 'bg-danger text-white hover:opacity-90 active:opacity-100',
      ghost: 'bg-transparent text-foreground hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark active:bg-neutral-200 dark:active:bg-neutral-800',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-caption',
      md: 'px-4 py-2 text-body-sm',
      lg: 'px-6 py-3 text-body-base',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        aria-busy={loading || undefined}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        disabled={loading || props.disabled}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(props as any)}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
