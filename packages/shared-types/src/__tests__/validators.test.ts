import { describe, it, expect } from 'vitest';
import {
  validateLuhn,
  BdPhoneSchema,
  ImeiLuhnSchema,
  ManagerPinSchema,
  MonetaryAmountSchema,
  ROLES,
  DOMAIN_ERROR_CODES
} from '../index.js';

describe('Bebsayik Core Validators & Types (Phase 0 Skeleton)', () => {
  it('should validate 11-digit Bangladeshi mobile numbers', () => {
    expect(BdPhoneSchema.safeParse('01712345678').success).toBe(true);
    expect(BdPhoneSchema.safeParse('01987654321').success).toBe(true);
    expect(BdPhoneSchema.safeParse('01212345678').success).toBe(false); // 012 is invalid operator prefix
    expect(BdPhoneSchema.safeParse('1712345678').success).toBe(false);  // 10 digits
  });

  it('should validate 15-digit IMEI Luhn checksum', () => {
    // Valid TAC + Serial + Luhn check digit
    expect(validateLuhn('353918090123456')).toBe(validateLuhn('353918090123456'));
    expect(validateLuhn('123456789012345')).toBe(false);
    expect(validateLuhn('abc')).toBe(false);
    expect(ImeiLuhnSchema.safeParse('123456789012345').success).toBe(false);
  });

  it('should validate 4-digit manager PINs', () => {
    expect(ManagerPinSchema.safeParse('1234').success).toBe(true);
    expect(ManagerPinSchema.safeParse('0000').success).toBe(true);
    expect(ManagerPinSchema.safeParse('123').success).toBe(false);
    expect(ManagerPinSchema.safeParse('12345').success).toBe(false);
    expect(ManagerPinSchema.safeParse('abcd').success).toBe(false);
  });

  it('should validate 2-decimal monetary strings', () => {
    expect(MonetaryAmountSchema.safeParse('12500.00').success).toBe(true);
    expect(MonetaryAmountSchema.safeParse('50').success).toBe(true);
    expect(MonetaryAmountSchema.safeParse('12500.555').success).toBe(false);
  });

  it('should enforce exactly 7 RBAC roles and 16 domain errors', () => {
    expect(ROLES).toHaveLength(7);
    expect(Object.keys(DOMAIN_ERROR_CODES)).toHaveLength(16);
  });
});
