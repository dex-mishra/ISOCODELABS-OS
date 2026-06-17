'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
}

export const Badge = ({ className, variant = 'default', children, ...props }: BadgeProps) => {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide transition-colors';
  
  const variants = {
    default: 'bg-apple-blue/10 text-apple-blue border border-apple-blue/20',
    secondary: 'bg-sf-text-secondaryLight/10 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark dark:bg-sf-text-secondaryDark/10 border border-sf-text-secondaryLight/20',
    success: 'bg-apple-green/10 text-apple-green border border-apple-green/20',
    warning: 'bg-apple-orange/10 text-apple-orange border border-apple-orange/20',
    danger: 'bg-apple-red/10 text-apple-red border border-apple-red/20',
  };

  return (
    <span className={twMerge(clsx(baseStyles, variants[variant], className))} {...props}>
      {children}
    </span>
  );
};
