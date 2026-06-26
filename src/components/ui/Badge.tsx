'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'emphasis';
}

export const Badge = ({ className, variant = 'default', children, ...props }: BadgeProps) => {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-pill text-caption font-semibold tracking-wide';

  // Semantic, tinted-surface badges. `emphasis` (copper) is for rare
  // craftsmanship moments only, never routine status (design-language.md).
  const variants = {
    default: 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20',
    secondary: 'bg-neutral-500/10 text-[var(--text-secondary)] border border-neutral-500/20',
    success: 'bg-success/10 text-success border border-success/20',
    warning: 'bg-warning/10 text-warning border border-warning/20',
    danger: 'bg-danger/10 text-danger border border-danger/20',
    info: 'bg-info/10 text-info border border-info/20',
    emphasis: 'bg-emphasis/10 text-emphasis border border-emphasis/25',
  };

  return (
    <span className={twMerge(clsx(baseStyles, variants[variant], className))} {...props}>
      {children}
    </span>
  );
};
