'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverEffect = false, children, ...props }, ref) => {
    // Cards use lg radius (16px) and quiet elevation — depth communicates
    // structure, not decoration (shape-language.md, material-language.md).
    const cardStyles = 'bg-card text-foreground border border-border shadow-sm rounded-apple-lg overflow-hidden';

    if (hoverEffect) {
      return (
        <motion.div
          ref={ref}
          whileHover={{ y: -2, boxShadow: '0 10px 30px rgba(11, 13, 16, 0.08)' }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={twMerge(clsx(cardStyles, className))}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...(props as any)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        className={twMerge(clsx(cardStyles, className))}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={twMerge('p-6 border-b border-border flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);

export const CardContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={twMerge('p-6', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={twMerge('p-6 border-t border-border bg-sf-bg-light/30 dark:bg-sf-bg-elevatedDark/30', className)} {...props}>
    {children}
  </div>
);
