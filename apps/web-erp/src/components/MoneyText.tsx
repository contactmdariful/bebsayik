import React from 'react';

export interface MoneyTextProps {
  amount: number | string;
  currencySymbol?: string;
  decimals?: number;
  showSign?: boolean;
  masked?: boolean;
  colored?: boolean;
  className?: string;
}

export function MoneyText({
  amount,
  currencySymbol = '৳',
  decimals = 2,
  showSign = false,
  masked = false,
  colored = false,
  className = '',
}: MoneyTextProps) {
  if (masked) {
    return (
      <span className={`font-mono text-slate-400 select-none ${className}`} title="Hidden value">
        ••••••
      </span>
    );
  }

  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const formatted = absNum.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  let colorClass = '';
  if (colored) {
    if (num > 0) colorClass = 'text-emerald-400';
    else if (num < 0) colorClass = 'text-rose-400';
    else colorClass = 'text-slate-400';
  }

  const sign = isNegative ? '-' : showSign && num > 0 ? '+' : '';

  return (
    <span
      className={`tnum font-medium whitespace-nowrap inline-flex items-baseline ${colorClass} ${className}`}
    >
      <span className="mr-0.5 text-[0.88em] select-none font-sans opacity-90">{currencySymbol}</span>
      <span>
        {sign}
        {formatted}
      </span>
    </span>
  );
}
