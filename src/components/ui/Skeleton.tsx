'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={twMerge('animate-pulse rounded-apple bg-zinc-200 dark:bg-zinc-800/60 opacity-70', className)}
      {...props}
    />
  );
};

// Card Skeleton
export const CardSkeleton = ({ className }: { className?: string }) => {
  return (
    <div className={twMerge('p-6 bg-card border border-border rounded-apple shadow-apple-sm space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <div className="pt-2 flex justify-between items-center">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-7 w-20 rounded-apple" />
      </div>
    </div>
  );
};

// Table Skeleton
export const TableSkeleton = ({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) => {
  return (
    <div className={twMerge('w-full border border-border rounded-apple overflow-hidden bg-card shadow-apple-sm', className)}>
      {/* Table Header */}
      <div className="flex items-center px-6 py-4 border-b border-border bg-sf-bg-light/30 dark:bg-sf-bg-elevatedDark/10">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 max-w-[150px] mr-4" />
        ))}
      </div>
      {/* Table Rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center px-6 py-4">
            {Array.from({ length: cols }).map((_, c) => {
              // Vary widths slightly for realistic appearance
              const widthClass = c === 0 ? 'w-24' : c === 1 ? 'w-36' : 'w-16';
              return (
                <div key={c} className="flex-1 mr-4">
                  <Skeleton className={twMerge('h-3.5', widthClass)} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// Kanban Board Column Skeleton
export const KanbanSkeleton = ({ className }: { className?: string }) => {
  return (
    <div className={twMerge('grid grid-cols-1 md:grid-cols-3 gap-6', className)}>
      {Array.from({ length: 3 }).map((_, colIndex) => (
        <div key={colIndex} className="space-y-4 p-4 bg-apple-gray/50 dark:bg-sf-bg-elevatedDark/20 rounded-apple-lg border border-border/60">
          <div className="flex justify-between items-center mb-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          {Array.from({ length: 3 }).map((_, cardIndex) => (
            <div key={cardIndex} className="p-4 bg-card border border-border rounded-apple shadow-apple-sm space-y-3">
              <div className="flex gap-1.5">
                <Skeleton className="h-4 w-12 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-3 w-full" />
              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

// Chart Skeleton
export const ChartSkeleton = ({ className }: { className?: string }) => {
  return (
    <div className={twMerge('p-6 bg-card border border-border rounded-apple shadow-apple-sm space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-24 rounded-apple" />
      </div>
      {/* Visual representation of chart columns/bars */}
      <div className="h-64 flex items-end gap-3 pt-6 border-b border-l border-border px-4">
        {Array.from({ length: 12 }).map((_, i) => {
          // Varying heights for realistic chart feel
          const heightPercent = [35, 55, 45, 75, 60, 40, 85, 50, 70, 95, 65, 80][i % 12];
          return (
            <Skeleton 
              key={i} 
              className="w-full rounded-t-apple-sm" 
              style={{ height: `${heightPercent}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-neutral-400 text-xs px-2">
        {['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
};

// Tiptap / Text Editor Skeleton
export const EditorSkeleton = ({ className }: { className?: string }) => {
  return (
    <div className={twMerge('border border-border rounded-apple overflow-hidden bg-card shadow-apple-sm flex flex-col', className)}>
      {/* Editor Toolbar */}
      <div className="flex gap-1.5 p-3 border-b border-border bg-sf-bg-light/40 dark:bg-sf-bg-elevatedDark/10">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-7 rounded-md" />
        ))}
        <div className="h-7 w-[1px] bg-border mx-1" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-7 rounded-md" />
        ))}
      </div>
      {/* Editor Body */}
      <div className="p-6 space-y-4 min-h-[300px]">
        <Skeleton className="h-6 w-1/3 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/4" />
        <div className="py-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
};
