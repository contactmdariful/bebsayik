import React from 'react';
import { Loader2 } from 'lucide-react';
import { ButtonVariant, ButtonSize } from './Button.js';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  'aria-label': string; // Mandatory accessibility label
  tooltip?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      'aria-label': ariaLabel,
      tooltip,
      variant = 'ghost',
      size = 'md',
      loading = false,
      disabled = false,
      className = '',
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const baseStyles =
      'inline-flex items-center justify-center rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 select-none min-h-[44px] min-w-[44px]';

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-teal-600 hover:bg-teal-700 text-white shadow-sm focus:ring-teal-500 disabled:bg-teal-900/40',
      secondary:
        'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 focus:ring-slate-500 disabled:bg-slate-900/50',
      outline:
        'bg-transparent hover:bg-slate-800/60 text-slate-200 border border-slate-700 hover:border-slate-600 focus:ring-slate-500 disabled:text-slate-600',
      ghost:
        'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-100 focus:ring-slate-500 disabled:text-slate-700',
      destructive:
        'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500 disabled:bg-rose-950/40',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'p-1.5',
      md: 'p-2.5',
      lg: 'p-3',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-label={ariaLabel}
        title={tooltip || ariaLabel}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
          isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'
        } ${className}`}
        {...rest}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        ) : (
          <span className="shrink-0 flex items-center justify-center">{icon}</span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
