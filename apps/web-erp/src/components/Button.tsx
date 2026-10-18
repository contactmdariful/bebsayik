import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  shortcutBadge?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      shortcutBadge,
      icon,
      iconPosition = 'left',
      className = '',
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    // Base styles with minimum touch target (44px)
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 select-none min-h-[44px] min-w-[44px]';

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-sm focus:ring-teal-500 disabled:bg-teal-900/40 disabled:text-teal-300/40',
      secondary:
        'bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-100 border border-slate-700 focus:ring-slate-500 disabled:bg-slate-900/50 disabled:text-slate-500 disabled:border-slate-800',
      outline:
        'bg-transparent hover:bg-slate-800/60 active:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 focus:ring-slate-500 disabled:text-slate-600 disabled:border-slate-800',
      ghost:
        'bg-transparent hover:bg-slate-800/60 active:bg-slate-800 text-slate-300 hover:text-slate-100 focus:ring-slate-500 disabled:text-slate-600',
      destructive:
        'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm focus:ring-rose-500 disabled:bg-rose-950/40 disabled:text-rose-400/40',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-2.5 gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
          isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'
        } ${className}`}
        {...rest}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
        )}

        <span>{children}</span>

        {!loading && icon && iconPosition === 'right' && (
          <span className="shrink-0">{icon}</span>
        )}

        {shortcutBadge && (
          <kbd
            className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-black/20 text-current/80 border border-current/20 hidden sm:inline-block leading-none"
            aria-label={`Keyboard shortcut: ${shortcutBadge}`}
          >
            {shortcutBadge}
          </kbd>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
