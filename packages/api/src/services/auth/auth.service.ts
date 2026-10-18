import { BdPhoneSchema } from '@bebsayik/shared-types';
import { User, IUser } from '../../models/User.js';
import { AuthOtp } from '../../models/AuthOtp.js';
import { Shop } from '../../models/Shop.js';
import { PhoneChangeRequest } from '../../models/PhoneChangeRequest.js';
import { getSmsDriver } from '../sms/index.js';
import { rateLimiter } from '../rateLimiter/index.js';
import { overrideTokenService } from '../security/overrideToken.service.js';
import {
  generateNumericOtp,
  hashOtp,
  hashPassword,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken
} from '../../utils/security.js';

export interface ServiceError {
  code: string;
  status: number;
  message: string;
  details?: Array<{ field?: string; issue: string }>;
}

export class AuthService {
  /**
   * Request a 6-digit SMS OTP challenge
   */
  async requestOtp(params: {
    phone: string;
    purpose: 'login' | 'registration' | 'password_reset' | 'phone_change' | 'action_verify';
    ip?: string | undefined;
  }): Promise<{ phone: string; expiresInSeconds: number; purpose: string }> {
    const { phone, purpose } = params;

    // Validate phone number
    const parsedPhone = BdPhoneSchema.safeParse(phone);
    if (!parsedPhone.success) {
      throw {
        code: 'VALIDATION_ERROR',
        status: 422,
        message: 'Invalid Bangladeshi mobile number',
        details: [{ field: 'phone', issue: parsedPhone.error.issues[0]?.message || 'Invalid phone' }]
      } as ServiceError;
    }

    // Sliding-window rate limiter: max 3 requests per 15 minutes (900 seconds)
    const rateLimitKey = `ratelimit:otp:${phone}`;
    const rateResult = await rateLimiter.check(rateLimitKey, 3, 900);
    if (!rateResult.allowed) {
      throw {
        code: 'RATE_LIMIT_EXCEEDED',
        status: 429,
        message: `Too many OTP requests. Maximum 3 requests per 15 minutes. Retry after ${rateResult.retryAfterSeconds} seconds.`
      } as ServiceError;
    }

    if (params.ip) {
      const ipKey = `ratelimit:otp:ip:${params.ip}`;
      const ipResult = await rateLimiter.check(ipKey, 10, 900);
      if (!ipResult.allowed) {
        throw {
          code: 'RATE_LIMIT_EXCEEDED',
          status: 429,
          message: `Too many OTP requests from this IP address. Retry after ${ipResult.retryAfterSeconds} seconds.`
        } as ServiceError;
      }
    }

    // Generate 6-digit cryptographically secure numeric OTP
    const otp = generateNumericOtp(6);
    const otpHash = hashOtp(otp);

    // Persist OTP hash with 120s TTL
    await AuthOtp.create({
      phone,
      otpHash,
      purpose,
      attempts: 0,
      consumed: false,
      createdAt: new Date()
    });

    // Dispatch SMS via SMS Driver
    await getSmsDriver().sendSms(
      phone,
      `Your Bebsayik verification code is ${otp}. Valid for 2 minutes. Never share this code with anyone.`
    );

    return {
      phone,
      expiresInSeconds: 120,
      purpose
    };
  }

  /**
   * Validate 6-digit SMS OTP and issue session JWTs
   */
  async verifyOtp(params: {
    phone: string;
    otp: string;
    purpose?: 'login' | 'registration' | 'password_reset' | 'phone_change' | 'action_verify';
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      name: string;
      phone: string;
      role: string;
      shopId?: string | undefined;
    };
    shops: Array<{ id: string; name: string; role: string }>;
  }> {
    const { phone, otp } = params;
    const purpose = params.purpose || 'login';

    // 1. Locate latest unconsumed OTP record
    const otpDoc = await AuthOtp.findOne({
      phone,
      purpose,
      consumed: false
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      throw {
        code: 'OTP_EXPIRED',
        status: 400,
        message: 'SMS OTP challenge has exceeded its 120-second validity window or has already been used'
      } as ServiceError;
    }

    // 2. Validate TTL expiration
    const now = Date.now();
    const ageSeconds = (now - otpDoc.createdAt.getTime()) / 1000;
    if (ageSeconds > 120) {
      throw {
        code: 'OTP_EXPIRED',
        status: 400,
        message: 'SMS OTP challenge has exceeded its 120-second validity window'
      } as ServiceError;
    }

    // 3. Compare SHA-256 hash
    const inputHash = hashOtp(otp);
    if (otpDoc.otpHash !== inputHash) {
      otpDoc.attempts += 1;
      if (otpDoc.attempts >= 3) {
        otpDoc.consumed = true; // Invalidate after 3 bad attempts
      }
      await otpDoc.save();
      throw {
        code: 'VALIDATION_ERROR',
        status: 422,
        message: 'Invalid 6-digit OTP code'
      } as ServiceError;
    }

    // 4. Mark OTP consumed immediately (Replay protection)
    otpDoc.consumed = true;
    await otpDoc.save();

    // 5. Find or provision user
    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({
        phone,
        fullName: `Owner ${phone.slice(-4)}`,
        role: 'STORE_OWNER',
        isActive: true,
        tokenVersion: 0
      });
    }

    // 6. Check if user is terminated
    if (user.isActive === false) {
      throw {
        code: 'STAFF_TERMINATED',
        status: 403,
        message: 'Staff account has been deactivated by owner; token revoked immediately'
      } as ServiceError;
    }

    // 7. Find associated shops
    const shops = await this.getUserShops(user);

    // 8. Generate JWTs
    const activeShopId: string | undefined = user.shopId ? user.shopId.toString() : shops[0]?.id;
    const accessToken = createAccessToken({
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
      shopId: activeShopId,
      tokenVersion: user.tokenVersion
    });

    const refreshToken = createRefreshToken({
      userId: user._id.toString(),
      tokenVersion: user.tokenVersion
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        name: user.fullName,
        phone: user.phone,
        role: user.role,
        shopId: activeShopId
      },
      shops
    };
  }

  /**
   * Password Authentication with Argon2id & 5-Attempt Lockout
   */
  async loginWithPassword(params: {
    phone: string;
    password: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      name: string;
      phone: string;
      role: string;
      shopId?: string | undefined;
    };
    shops: Array<{ id: string; name: string; role: string }>;
  }> {
    const { phone, password } = params;

    const user = await User.findOne({ phone });
    if (!user) {
      throw {
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Invalid mobile number or password'
      } as ServiceError;
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingSeconds = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      throw {
        code: 'ACCOUNT_LOCKED',
        status: 429,
        message: `Account is locked due to 5 consecutive failed login attempts. Retry after ${remainingMinutes} minute(s).`
      } as ServiceError;
    }

    // If lockedUntil expired, reset attempts
    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }

    // Verify Argon2id password hash
    if (!user.passwordHash) {
      throw {
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Password login is not set up for this account. Please log in via SMS OTP.'
      } as ServiceError;
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
        await user.save();
        throw {
          code: 'ACCOUNT_LOCKED',
          status: 429,
          message: 'Account locked for 15 minutes due to 5 consecutive failed login attempts.'
        } as ServiceError;
      }
      await user.save();
      throw {
        code: 'UNAUTHORIZED',
        status: 401,
        message: `Invalid mobile number or password. ${5 - user.failedLoginAttempts} attempt(s) remaining.`
      } as ServiceError;
    }

    // Successful login: reset failed counters
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    // Check staff active status
    if (user.isActive === false) {
      throw {
        code: 'STAFF_TERMINATED',
        status: 403,
        message: 'Staff account has been deactivated by owner; token revoked immediately'
      } as ServiceError;
    }

    const shops = await this.getUserShops(user);
    const activeShopId: string | undefined = user.shopId ? user.shopId.toString() : shops[0]?.id;

    const accessToken = createAccessToken({
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
      shopId: activeShopId,
      tokenVersion: user.tokenVersion
    });

    const refreshToken = createRefreshToken({
      userId: user._id.toString(),
      tokenVersion: user.tokenVersion
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        name: user.fullName,
        phone: user.phone,
        role: user.role,
        shopId: activeShopId
      },
      shops
    };
  }

  /**
   * Refresh JWT Session
   */
  async refreshSession(refreshTokenString: string): Promise<{ accessToken: string }> {
    try {
      const payload = verifyRefreshToken(refreshTokenString);
      const user = await User.findById(payload.userId);

      if (!user) {
        throw {
          code: 'UNAUTHORIZED',
          status: 401,
          message: 'User associated with refresh token not found'
        } as ServiceError;
      }

      if (user.isActive === false) {
        throw {
          code: 'STAFF_TERMINATED',
          status: 403,
          message: 'Staff account has been deactivated by owner; token revoked immediately'
        } as ServiceError;
      }

      if (user.tokenVersion !== payload.tokenVersion) {
        throw {
          code: 'UNAUTHORIZED',
          status: 401,
          message: 'Session has been revoked or superseded'
        } as ServiceError;
      }

      const shops = await this.getUserShops(user);
      const activeShopId: string | undefined = user.shopId ? user.shopId.toString() : shops[0]?.id;

      const accessToken = createAccessToken({
        userId: user._id.toString(),
        phone: user.phone,
        role: user.role,
        shopId: activeShopId,
        tokenVersion: user.tokenVersion
      });

      return { accessToken };
    } catch (err: any) {
      if (err.status) throw err;
      throw {
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Invalid or expired refresh token'
      } as ServiceError;
    }
  }

  /**
   * Password Recovery: Verify OTP and reset password
   */
  async resetPassword(params: {
    phone: string;
    otp: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    const { phone, otp, newPassword } = params;

    if (!newPassword || newPassword.length < 8) {
      throw {
        code: 'VALIDATION_ERROR',
        status: 422,
        message: 'New password must be at least 8 characters long'
      } as ServiceError;
    }

    // Locate unconsumed recovery OTP
    const otpDoc = await AuthOtp.findOne({
      phone,
      purpose: 'password_reset',
      consumed: false
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      throw {
        code: 'OTP_EXPIRED',
        status: 400,
        message: 'Recovery OTP has expired or was already consumed'
      } as ServiceError;
    }

    if (Date.now() - otpDoc.createdAt.getTime() > 120 * 1000) {
      throw {
        code: 'OTP_EXPIRED',
        status: 400,
        message: 'Recovery OTP has expired (120s validity window)'
      } as ServiceError;
    }

    if (otpDoc.otpHash !== hashOtp(otp)) {
      otpDoc.attempts += 1;
      if (otpDoc.attempts >= 3) {
        otpDoc.consumed = true;
      }
      await otpDoc.save();
      throw {
        code: 'VALIDATION_ERROR',
        status: 422,
        message: 'Invalid OTP code'
      } as ServiceError;
    }

    otpDoc.consumed = true;
    await otpDoc.save();

    const user = await User.findOne({ phone });
    if (!user) {
      throw {
        code: 'NOT_FOUND',
        status: 404,
        message: 'User account not found'
      } as ServiceError;
    }

    // Hash new password using Argon2id
    user.passwordHash = await hashPassword(newPassword);
    // Instant session kill switch across all active devices
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    return {
      success: true,
      message: 'Password reset successfully. Please log in with your new password.'
    };
  }

  /**
   * Initiate 180s Dual-OTP Mobile Migration (STORE_OWNER solely)
   */
  async initiatePhoneChange(params: {
    userId: string;
    newPhone: string;
  }): Promise<{ expiresInSeconds: number }> {
    const { userId, newPhone } = params;

    const parsedNewPhone = BdPhoneSchema.safeParse(newPhone);
    if (!parsedNewPhone.success) {
      throw {
        code: 'VALIDATION_ERROR',
        status: 422,
        message: 'Invalid new Bangladeshi mobile number format'
      } as ServiceError;
    }

    const user = await User.findById(userId);
    if (!user) {
      throw { code: 'NOT_FOUND', status: 404, message: 'User not found' } as ServiceError;
    }

    if (user.phone === newPhone) {
      throw {
        code: 'VALIDATION_ERROR',
        status: 422,
        message: 'New phone number cannot be identical to the current phone number'
      } as ServiceError;
    }

    // Check if newPhone already registered
    const existing = await User.findOne({ phone: newPhone });
    if (existing) {
      throw {
        code: 'CONFLICT',
        status: 409,
        message: 'Target mobile number is already registered to another user'
      } as ServiceError;
    }

    // Generate dual OTPs
    const oldPhoneOtp = generateNumericOtp(6);
    const newPhoneOtp = generateNumericOtp(6);

    // Cancel existing pending migration requests for this user
    await PhoneChangeRequest.updateMany(
      { userId: user._id, status: 'pending' },
      { status: 'cancelled' }
    );

    // Create 180s migration request
    await PhoneChangeRequest.create({
      shopId: user.shopId,
      userId: user._id,
      oldPhone: user.phone,
      newPhone,
      oldPhoneOtpHash: hashOtp(oldPhoneOtp),
      newPhoneOtpHash: hashOtp(newPhoneOtp),
      status: 'pending',
      createdAt: new Date()
    });

    // Send SMS to both old and new numbers
    await getSmsDriver().sendSms(
      user.phone,
      `Your current SIM verification OTP for phone migration is ${oldPhoneOtp}. Valid for 3 minutes.`
    );
    await getSmsDriver().sendSms(
      newPhone,
      `Your new SIM verification OTP for Bebsayik migration is ${newPhoneOtp}. Valid for 3 minutes.`
    );

    return { expiresInSeconds: 180 };
  }

  /**
   * Complete 180s Dual-OTP Mobile Migration
   */
  async completePhoneChange(params: {
    userId: string;
    oldPhoneOtp: string;
    newPhoneOtp: string;
  }): Promise<{ newPhone: string }> {
    const { userId, oldPhoneOtp, newPhoneOtp } = params;

    const request = await PhoneChangeRequest.findOne({
      userId,
      status: 'pending'
    }).sort({ createdAt: -1 });

    if (!request) {
      throw {
        code: 'OTP_EXPIRED',
        status: 400,
        message: 'No pending phone migration request found or request window expired'
      } as ServiceError;
    }

    // Check 180s validity window
    const ageSeconds = (Date.now() - request.createdAt.getTime()) / 1000;
    if (ageSeconds > 180) {
      request.status = 'expired';
      await request.save();
      throw {
        code: 'OTP_EXPIRED',
        status: 400,
        message: 'Phone migration window (180 seconds) has expired'
      } as ServiceError;
    }

    // Verify both OTPs
    const oldMatches = request.oldPhoneOtpHash === hashOtp(oldPhoneOtp);
    const newMatches = request.newPhoneOtpHash === hashOtp(newPhoneOtp);

    if (!oldMatches || !newMatches) {
      throw {
        code: 'VALIDATION_ERROR',
        status: 422,
        message: 'Invalid verification OTP provided for current SIM or new SIM'
      } as ServiceError;
    }

    const user = await User.findById(userId);
    if (!user) {
      throw { code: 'NOT_FOUND', status: 404, message: 'User not found' } as ServiceError;
    }

    // Atomically migrate phone and bump tokenVersion to force re-authentication
    const oldPhone = user.phone;
    user.phone = request.newPhone;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    request.status = 'completed';
    request.oldPhoneVerified = true;
    request.newPhoneVerified = true;
    await request.save();

    if (process.env.NODE_ENV !== 'test') {
      console.log(`[PhoneMigration] Migrated user ${user._id} from ${oldPhone} to ${user.phone}`);
    }

    return { newPhone: user.phone };
  }

  /**
   * Staff Emergency Kill-Switch: Deactivates staff and bumps tokenVersion (<1s revocation)
   */
  async emergencyTerminateStaff(params: {
    ownerUserId: string;
    targetStaffId: string;
    ownerPassword: string;
    reason?: string;
  }): Promise<{ terminatedUserId: string; status: 'deactivated' }> {
    const { ownerUserId, targetStaffId, ownerPassword, reason } = params;

    const owner = await User.findById(ownerUserId);
    if (!owner || owner.role !== 'STORE_OWNER') {
      throw {
        code: 'TENANT_ACCESS_DENIED',
        status: 403,
        message: 'Only the STORE_OWNER can trigger staff emergency termination'
      } as ServiceError;
    }

    if (!owner.passwordHash) {
      throw {
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Owner master password is not set'
      } as ServiceError;
    }

    const isPasswordValid = await verifyPassword(owner.passwordHash, ownerPassword);
    if (!isPasswordValid) {
      throw {
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Owner master password verification failed'
      } as ServiceError;
    }

    const staff = await User.findById(targetStaffId);
    if (!staff) {
      throw {
        code: 'NOT_FOUND',
        status: 404,
        message: 'Target staff member not found'
      } as ServiceError;
    }

    // Deactivate and instantly kill active sessions (<1s)
    staff.isActive = false;
    staff.tokenVersion = (staff.tokenVersion || 0) + 1;
    await staff.save();

    if (process.env.NODE_ENV !== 'test') {
      console.log(
        `[StaffKillSwitch] Staff ${staff._id} (${staff.fullName}) terminated by owner ${owner._id}. Reason: "${reason || 'None'}"`
      );
    }

    return {
      terminatedUserId: staff._id.toString(),
      status: 'deactivated'
    };
  }

  /**
   * Verify 4-digit Manager Override PIN (STORE_MANAGER, STORE_OWNER)
   */
  async verifyManagerPin(params: {
    userId: string;
    shopId?: string;
    pin: string;
    action: string;
    context?: any;
  }): Promise<{ overrideToken: string; authorizedBy: string; expiresInSeconds: number }> {
    const { userId, pin } = params;

    if (!/^\d{4}$/.test(pin)) {
      throw {
        code: 'VALIDATION_ERROR',
        status: 422,
        message: 'Manager PIN must be exactly 4 numeric digits',
        details: [{ field: 'pin', issue: 'Must be 4 numeric digits' }]
      } as ServiceError;
    }

    const manager = await User.findById(userId);
    if (!manager || !['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN'].includes(manager.role)) {
      throw {
        code: 'TENANT_ACCESS_DENIED',
        status: 403,
        message: 'User does not hold manager authorization to override PIN'
      } as ServiceError;
    }

    if (!manager.managerPinHash) {
      throw {
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Manager PIN has not been configured for this account'
      } as ServiceError;
    }

    const isValid = await verifyPassword(manager.managerPinHash, pin);
    if (!isValid) {
      throw {
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Invalid Manager Override PIN'
      } as ServiceError;
    }

    const resolvedShopId = (params as any).shopId || (manager.shopId ? manager.shopId.toString() : 'global');
    const tokenResult = await overrideTokenService.createToken({
      managerUserId: manager._id.toString(),
      shopId: resolvedShopId,
      action: params.action,
      context: params.context
    });

    return {
      overrideToken: tokenResult.overrideToken,
      authorizedBy: manager.fullName,
      expiresInSeconds: 60
    };
  }

  private async getUserShops(user: IUser): Promise<Array<{ id: string; name: string; role: string }>> {
    const shopList: Array<{ id: string; name: string; role: string }> = [];

    if (user.shopId) {
      const s = await Shop.findById(user.shopId);
      if (s) {
        shopList.push({ id: s._id.toString(), name: s.name, role: user.role });
      }
    }

    if (user.accessibleShopIds && user.accessibleShopIds.length > 0) {
      const accessible = await Shop.find({ _id: { $in: user.accessibleShopIds } });
      for (const s of accessible) {
        if (!shopList.some((item) => item.id === s._id.toString())) {
          shopList.push({ id: s._id.toString(), name: s.name, role: user.role });
        }
      }
    }

    if (shopList.length === 0) {
      const owned = await Shop.find({ ownerUserId: user._id });
      for (const s of owned) {
        shopList.push({ id: s._id.toString(), name: s.name, role: user.role });
      }
    }

    return shopList;
  }
}

export const authService = new AuthService();
