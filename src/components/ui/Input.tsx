'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark tracking-wide uppercase">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full px-4 py-2.5 text-sm bg-apple-gray dark:bg-sf-bg-elevatedDark text-foreground border border-border rounded-apple focus:outline-none focus:ring-2 focus:ring-apple-blue/50 focus:border-apple-blue transition-all disabled:opacity-50 disabled:pointer-events-none',
              error && 'border-apple-red focus:ring-apple-red/50 focus:border-apple-red'
            ),
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-xs text-apple-red font-medium mt-0.5">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
