import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton.js';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  position?: 'right' | 'bottom';
  maxWidth?: 'sm' | 'md' | 'lg';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  id?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  position = 'right',
  maxWidth = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
  id = 'bebsayik-drawer',
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = drawerRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables && focusables.length > 0) {
      focusables[0].focus();
    } else {
      drawerRef.current?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const elements = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (elements.length === 0) return;

        const first = elements[0];
        const last = elements[elements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const widthStyles: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'max-w-xs',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  const isBottom = position === 'bottom';
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`bg-slate-900 border-slate-800 shadow-2xl flex flex-col focus:outline-none ${
          isBottom
            ? 'mt-auto w-full max-h-[85vh] rounded-t-2xl border-t animate-in slide-in-from-bottom duration-200 pb-safe'
            : `ml-auto h-full w-full ${widthStyles[maxWidth]} border-l animate-in slide-in-from-right duration-200`
        } ${className}`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/80 shrink-0">
          <div>
            {title && (
              <h2 id={titleId} className="text-base font-semibold text-slate-100">
                {title}
              </h2>
            )}
            {description && (
              <p id={descId} className="text-xs text-slate-400 mt-0.5">
                {description}
              </p>
            )}
          </div>

          <IconButton
            icon={<X className="w-4 h-4" />}
            aria-label="Close drawer"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100"
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-5 overflow-y-auto text-sm text-slate-300">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/90 shrink-0 flex items-center justify-end space-x-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
