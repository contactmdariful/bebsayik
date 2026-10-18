import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import {
  addMoney,
  subtractMoney,
  multiplyMoney,
  divideMoney,
  formatMoney,
  isMoneyEqual,
  isMoneyGreaterThan,
  calculatePercentage,
  decimal128Setter,
  decimal128Getter
} from '../utils/money.js';

describe('Monetary Precision & BigNumber Math Engine (money.ts)', () => {
  it('eliminates IEEE-754 floating point drift: 0.1 + 0.2 equals 0.30', () => {
    const sum = addMoney('0.10', '0.20');
    expect(sum.toFixed(2)).toBe('0.30');
    expect(formatMoney(sum)).toBe('0.30');
    expect(isMoneyEqual(sum, '0.30')).toBe(true);
    // Standard JS float fails this: (0.1 + 0.2 === 0.3) is false
    expect(0.1 + 0.2 === 0.3).toBe(false);
  });

  it('accurately computes VAT and percentage splits without rounding drift', () => {
    // 5% VAT on ৳12,345.50
    const vat = calculatePercentage('12345.50', '5');
    expect(formatMoney(vat)).toBe('617.28');

    // 50% technician repair labor split on ৳1,000.00
    const techSplit = calculatePercentage('1000.00', '50');
    const storeSplit = subtractMoney('1000.00', techSplit);
    expect(formatMoney(techSplit)).toBe('500.00');
    expect(formatMoney(storeSplit)).toBe('500.00');
    expect(formatMoney(addMoney(techSplit, storeSplit))).toBe('1000.00');
  });

  it('handles compound addition and multi-item subtotaling', () => {
    const item1 = '28500.00';
    const item2 = '450.00';
    const item3 = '1250.75';
    const discount = '200.75';

    const subtotal = addMoney(item1, item2, item3);
    const grandTotal = subtractMoney(subtotal, discount);

    expect(formatMoney(subtotal)).toBe('30200.75');
    expect(formatMoney(grandTotal)).toBe('30000.00');
    expect(isMoneyGreaterThan(subtotal, grandTotal)).toBe(true);
  });

  it('throws on division by zero', () => {
    expect(() => divideMoney('100.00', '0')).toThrow('Division by zero');
  });

  it('converts to and from Mongoose Decimal128 seamlessly', () => {
    const dec128 = decimal128Setter('45000.50');
    expect(dec128).toBeInstanceOf(mongoose.Types.Decimal128);
    expect(dec128.toString()).toBe('45000.50');

    const formatted = decimal128Getter(dec128);
    expect(formatted).toBe('45000.50');
  });

  it('safely preserves null and undefined in decimal128Setter and decimal128Getter for optional fields', () => {
    expect(decimal128Setter(undefined)).toBeUndefined();
    expect(decimal128Setter(null)).toBeNull();
    expect(decimal128Getter(undefined)).toBeUndefined();
    expect(decimal128Getter(null)).toBeNull();
  });
});
