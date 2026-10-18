import Decimal from 'decimal.js';
import mongoose from 'mongoose';

// Configure Decimal precision for high-integrity monetary arithmetic
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export type MonetaryInput = string | number | Decimal | mongoose.Types.Decimal128;

/**
 * Normalizes any supported monetary input into a Decimal instance.
 * Avoids floating-point drift.
 */
export function toDecimal(val: MonetaryInput): Decimal {
  if (val instanceof Decimal) return val;
  if (val instanceof mongoose.Types.Decimal128) return new Decimal(val.toString());
  if (typeof val === 'number') return new Decimal(val.toString());
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return new Decimal(trimmed === '' ? '0' : trimmed);
  }
  return new Decimal(0);
}

/**
 * Formats a monetary value to exactly 2 decimal places string representation (e.g., "1500.00").
 */
export function formatMoney(val: MonetaryInput): string {
  return toDecimal(val).toFixed(2);
}

/**
 * Adds multiple monetary values with zero precision loss.
 */
export function addMoney(...vals: MonetaryInput[]): Decimal {
  return vals.reduce<Decimal>((acc, cur) => acc.plus(toDecimal(cur)), new Decimal(0));
}

/**
 * Subtracts subtrahend from minuend (a - b).
 */
export function subtractMoney(a: MonetaryInput, b: MonetaryInput): Decimal {
  return toDecimal(a).minus(toDecimal(b));
}

/**
 * Multiplies two monetary values.
 */
export function multiplyMoney(a: MonetaryInput, b: MonetaryInput): Decimal {
  return toDecimal(a).times(toDecimal(b));
}

/**
 * Divides dividend by divisor (a / b). Throws on division by zero.
 */
export function divideMoney(a: MonetaryInput, b: MonetaryInput): Decimal {
  const divisor = toDecimal(b);
  if (divisor.isZero()) {
    throw new Error('Division by zero in monetary arithmetic');
  }
  return toDecimal(a).dividedBy(divisor);
}

/**
 * Calculates percentage: (base * percent) / 100 rounded to 2 decimal places.
 */
export function calculatePercentage(base: MonetaryInput, percent: MonetaryInput): Decimal {
  return toDecimal(base).times(toDecimal(percent)).dividedBy(100);
}

/**
 * Checks if two monetary values are identical to 2 decimal places.
 */
export function isMoneyEqual(a: MonetaryInput, b: MonetaryInput): boolean {
  return toDecimal(a).toFixed(2) === toDecimal(b).toFixed(2);
}

/**
 * Checks if a > b.
 */
export function isMoneyGreaterThan(a: MonetaryInput, b: MonetaryInput): boolean {
  return toDecimal(a).greaterThan(toDecimal(b));
}

/**
 * Checks if a < b.
 */
export function isMoneyLessThan(a: MonetaryInput, b: MonetaryInput): boolean {
  return toDecimal(a).lessThan(toDecimal(b));
}

/**
 * Mongoose Schema Decimal128 Getter: Converts stored Decimal128 into a 2-decimal string.
 */
export function decimal128Getter(val: unknown): any {
  if (val === null || val === undefined) return val;
  if (val instanceof mongoose.Types.Decimal128) return val.toString();
  return String(val);
}

/**
 * Mongoose Schema Decimal128 Setter: Ensures values are converted to Decimal128.
 * Preserves null/undefined for optional fields without injecting false zeros.
 */
export function decimal128Setter(val: unknown): any {
  if (val === null || val === undefined) return val;
  const fixed = toDecimal(val as MonetaryInput).toFixed(2);
  return mongoose.Types.Decimal128.fromString(fixed);
}

