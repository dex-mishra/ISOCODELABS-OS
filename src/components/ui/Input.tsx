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
          aria-invalid={error ? true : undefined}
          className={twMerge(
            clsx(
              'w-full px-4 py-2.5 text-body-sm bg-apple-gray dark:bg-sf-bg-elevatedDark text-foreground placeholder:text-[var(--text-tertiary)] border border-border rounded-md transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:border-accent-blue disabled:opacity-45 disabled:pointer-events-none',
              error && 'border-danger focus-visible:ring-danger focus-visible:border-danger'
            ),
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-caption text-danger font-medium mt-0.5">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
