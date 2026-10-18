import React, { useState } from 'react';
import { Delete, CornerDownLeft, RotateCcw } from 'lucide-react';

export interface OnScreenNumpadProps {
  value: string;
  onChange: (newValue: string) => void;
  onConfirm?: (value: string) => void;
  allowDecimal?: boolean;
  maxDecimals?: number;
  maxValue?: number;
  quickAmounts?: number[];
  disabled?: boolean;
  className?: string;
}

export function OnScreenNumpad({
  value,
  onChange,
  onConfirm,
  allowDecimal = true,
  maxDecimals = 2,
  maxValue = 10000000,
  quickAmounts = [100, 500, 1000, 5000],
  disabled = false,
  className = '',
}: OnScreenNumpadProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDigit = (digit: string) => {
    if (disabled || isSubmitting) return;

    if (digit === '.') {
      if (!allowDecimal) return;
      if (value.includes('.')) return;
      if (!value) {
        onChange('0.');
        return;
      }
      onChange(value + '.');
      return;
    }

    if (digit === '00') {
      if (!value || value === '0') return;
      if (value.includes('.')) {
        const [, dec] = value.split('.');
        if (dec && dec.length >= maxDecimals) return;
      }
      const newVal = value + '00';
      if (parseFloat(newVal) <= maxValue) {
        onChange(newVal);
      }
      return;
    }

    // Number digits 0-9
    if (value === '0') {
      onChange(digit);
      return;
    }

    if (value.includes('.')) {
      const [, dec] = value.split('.');
      if (dec && dec.length >= maxDecimals) return;
    }

    const newVal = value + digit;
    if (parseFloat(newVal) <= maxValue) {
      onChange(newVal);
    }
  };

  const handleBackspace = () => {
    if (disabled || isSubmitting) return;
    if (!value || value.length <= 1) {
      onChange('');
      return;
    }
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    if (disabled || isSubmitting) return;
    onChange('');
  };

  const handleQuickAdd = (amount: number) => {
    if (disabled || isSubmitting) return;
    const current = parseFloat(value) || 0;
    const result = (current + amount).toString();
    if (parseFloat(result) <= maxValue) {
      onChange(result);
    }
  };

  const handleConfirm = () => {
    if (disabled || isSubmitting || !onConfirm) return;
    setIsSubmitting(true);
    try {
      onConfirm(value || '0');
    } finally {
      setTimeout(() => setIsSubmitting(false), 200);
    }
  };

  const keyBaseStyle =
    'h-12 min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-base sm:text-lg rounded-xl transition-all select-none active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-40 disabled:pointer-events-none';

  return (
    <div className={`w-full max-w-sm flex flex-col gap-2 p-3 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl ${className}`}>
      {/* Quick Add Presets */}
      {quickAmounts.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 pb-1">
          {quickAmounts.map((amt) => (
            <button
              key={`quick-${amt}`}
              type="button"
              disabled={disabled}
              onClick={() => handleQuickAdd(amt)}
              className="py-1.5 px-1 bg-slate-900 hover:bg-slate-800 text-teal-400 text-xs font-semibold rounded-lg border border-slate-800 tnum transition-colors min-h-[44px]"
            >
              +৳{amt}
            </button>
          ))}
        </div>
      )}

      {/* Numeric Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Row 1 */}
        {['1', '2', '3'].map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(d)}
            className={`${keyBaseStyle} bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-800`}
          >
            {d}
          </button>
        ))}

        {/* Row 2 */}
        {['4', '5', '6'].map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(d)}
            className={`${keyBaseStyle} bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-800`}
          >
            {d}
          </button>
        ))}

        {/* Row 3 */}
        {['7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(d)}
            className={`${keyBaseStyle} bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-800`}
          >
            {d}
          </button>
        ))}

        {/* Row 4 */}
        <button
          type="button"
          disabled={disabled || !allowDecimal}
          onClick={() => handleDigit('.')}
          className={`${keyBaseStyle} bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800`}
        >
          {allowDecimal ? '.' : '—'}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigit('0')}
          className={`${keyBaseStyle} bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-800`}
        >
          0
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigit('00')}
          className={`${keyBaseStyle} bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800`}
        >
          00
        </button>
      </div>

      {/* Action Row */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <button
          type="button"
          disabled={disabled || !value}
          onClick={handleClear}
          aria-label="Clear all input"
          className={`${keyBaseStyle} bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800`}
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          <span className="text-xs">Clear</span>
        </button>

        <button
          type="button"
          disabled={disabled || !value}
          onClick={handleBackspace}
          aria-label="Backspace one digit"
          className={`${keyBaseStyle} bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800`}
        >
          <Delete className="w-5 h-5" />
        </button>

        <button
          type="button"
          disabled={disabled || isSubmitting}
          onClick={handleConfirm}
          aria-label="Confirm tender amount"
          className={`${keyBaseStyle} bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-950/50`}
        >
          <CornerDownLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
