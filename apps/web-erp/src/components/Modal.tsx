import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton.js';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  id?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
  id = 'bebsayik-modal',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management & Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element to restore focus on close
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the modal or first focusable child
    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      modalRef.current?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Trap focus
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      // Restore previous focus
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles: Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  const titleId = `${id}-title`;
  const descId = `${id}-desc`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`w-full ${maxWidthStyles[maxWidth]} bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col focus:outline-none animate-in zoom-in-95 duration-150 ${className}`}
      >
        {/* Modal Header */}
        {(title || description) && (
          <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-950/60">
            <div>
              {title && (
                <h2 id={titleId} className="text-base sm:text-lg font-semibold text-slate-100">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  {description}
                </p>
              )}
            </div>

            <IconButton
              icon={<X className="w-4 h-4" />}
              aria-label="Close dialog"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 -mr-1.5 -mt-1.5"
            />
          </div>
        )}

        {/* Modal Content Body */}
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-120px)] text-sm text-slate-300">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end space-x-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
