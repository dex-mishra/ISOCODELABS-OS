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
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-apple-blue/50 disabled:opacity-50 disabled:pointer-events-none rounded-apple';
    
    const variants = {
      primary: 'bg-apple-blue text-white hover:bg-apple-blueHover active:bg-apple-blue',
      secondary: 'bg-apple-gray dark:bg-sf-bg-elevatedDark text-sf-text-light dark:text-sf-text-dark hover:opacity-90',
      outline: 'border border-sf-border-light dark:border-sf-border-dark bg-transparent hover:bg-sf-bg-light dark:hover:bg-sf-bg-elevatedDark text-sf-text-light dark:text-sf-text-dark',
      danger: 'bg-apple-red text-white hover:opacity-90',
      ghost: 'bg-transparent hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark text-sf-text-light dark:text-sf-text-dark',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        disabled={loading || props.disabled}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(props as any)}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
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
