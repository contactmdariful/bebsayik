import crypto from 'crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { UserRole } from '@bebsayik/shared-types';
import { ENV } from '../config/env.js';

export interface AccessTokenPayload {
  userId: string;
  phone: string;
  role: UserRole;
  shopId?: string | undefined;
  tokenVersion: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
}

/**
 * Generate cryptographically secure numeric OTP
 */
export function generateNumericOtp(digits = 6): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits);
  return crypto.randomInt(min, max).toString();
}

/**
 * SHA-256 hash for OTP storage
 */
export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Argon2id password hasher (memoryCost: 65536, timeCost: 3)
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3
  });
}

/**
 * Argon2id password verification
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Short-lived Access Token (15 minutes)
 */
export function createAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, {
    expiresIn: '15m'
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ENV.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * Long-lived Refresh Token (7 days)
 */
export function createRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: '7d'
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
