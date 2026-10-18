import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button.js';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/50 my-4 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-teal-400 mb-3 shadow-inner">
        {icon || <Inbox className="w-6 h-6" />}
      </div>

      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1 mb-4">{description}</p>

      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
