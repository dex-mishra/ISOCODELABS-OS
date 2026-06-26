'use client';

import React from 'react';
import { clsx } from 'clsx';

interface ConnectionStatusIndicatorProps {
  status: 'connected' | 'disconnected' | 'reconnecting';
}

export const ConnectionStatusIndicator = ({ status }: ConnectionStatusIndicatorProps) => {
  const dotStyles = clsx(
    'w-2 h-2 rounded-full shrink-0',
    {
      'bg-apple-green': status === 'connected',
      'bg-apple-red': status === 'disconnected',
      'bg-apple-yellow animate-pulse': status === 'reconnecting',
    }
  );

  const labelStyles = clsx(
    'text-xs font-medium tracking-tight',
    {
      'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark': status === 'connected',
      'text-apple-red': status === 'disconnected',
      'text-apple-orange': status === 'reconnecting',
    }
  );

  const label = status === 'disconnected'
    ? 'Disconnected'
    : status === 'reconnecting'
      ? 'Reconnecting...'
      : null;

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={dotStyles} />
      {label && <span className={labelStyles}>{label}</span>}
    </div>
  );
};
