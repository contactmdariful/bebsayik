import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { authService } from '../services/auth/auth.service.js';
import { mockSmsDriver } from '../services/sms/mockSmsDriver.js';
import { SslWirelessDriver } from '../services/sms/sslWirelessDriver.js';
import { BulkSmsBdDriver } from '../services/sms/bulkSmsBdDriver.js';
import { rateLimiter } from '../services/rateLimiter/rateLimiter.js';
import { User, IUser } from '../models/User.js';
import { AuthOtp, IAuthOtp } from '../models/AuthOtp.js';
import { Shop } from '../models/Shop.js';
import { PhoneChangeRequest, IPhoneChangeRequest } from '../models/PhoneChangeRequest.js';
import {
  hashOtp,
  hashPassword,
  verifyPassword,
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  verifyRefreshToken
} from '../utils/security.js';

describe('Phase 2: Authentication, Identity Lifecycle & Security Gateways', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSmsDriver.clear();
    rateLimiter.clearMemory();
  });

  describe('1. SMS Driver & Passwordless OTP Service', () => {
    it('dispatches 6-digit numeric OTP and records SMS message in MockSmsDriver', async () => {
      const phone = '01712345678';
      let createdOtpPayload: any = null;

      vi.spyOn(AuthOtp, 'create').mockImplementation(async (payload: any) => {
        createdOtpPayload = payload;
        return payload as any;
      });

      const res = await authService.requestOtp({ phone, purpose: 'login' });

      expect(res.phone).toBe(phone);
      expect(res.expiresInSeconds).toBe(120);
      expect(res.purpose).toBe('login');

      // Verify SMS was delivered to MockSmsDriver
      const lastSms = mockSmsDriver.getLastMessage(phone);
      expect(lastSms).toBeDefined();
      expect(lastSms?.to).toBe(phone);
      expect(lastSms?.message).toMatch(/Your Bebsayik verification code is \d{6}\./);

      // Extract OTP from message and verify SHA-256 hash
      const otpMatch = lastSms?.message.match(/\d{6}/);
      expect(otpMatch).toBeDefined();
      const rawOtp = otpMatch![0];

      expect(createdOtpPayload.otpHash).toBe(hashOtp(rawOtp));
      expect(createdOtpPayload.consumed).toBe(false);
      expect(createdOtpPayload.attempts).toBe(0);
    });

    it('enforces strict sliding-window rate limit (max 3 OTP requests / 15 mins)', async () => {
      const phone = '01811223344';

      vi.spyOn(AuthOtp, 'create').mockResolvedValue({} as any);

      // Requests 1, 2, and 3 must succeed
      await expect(authService.requestOtp({ phone, purpose: 'login' })).resolves.toBeDefined();
      await expect(authService.requestOtp({ phone, purpose: 'login' })).resolves.toBeDefined();
      await expect(authService.requestOtp({ phone, purpose: 'login' })).resolves.toBeDefined();

      // Request 4 must fail with RATE_LIMIT_EXCEEDED
      await expect(authService.requestOtp({ phone, purpose: 'login' })).rejects.toMatchObject({
        code: 'RATE_LIMIT_EXCEEDED',
        status: 429
      });
    });

    it('rejects invalid Bangladeshi mobile phone formats', async () => {
      await expect(authService.requestOtp({ phone: '12345', purpose: 'login' })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 422
      });

      await expect(authService.requestOtp({ phone: '01234567890', purpose: 'login' })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 422
      });
    });

    it('successfully verifies OTP, issues JWT tokens, and sets consumed flag (Replay Protection)', async () => {
      const phone = '01912345678';
      const rawOtp = '654321';
      const hashed = hashOtp(rawOtp);

      const mockOtpDoc = {
        phone,
        otpHash: hashed,
        purpose: 'login',
        attempts: 0,
        consumed: false,
        createdAt: new Date(),
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(AuthOtp, 'findOne').mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockOtpDoc)
      } as any);

      const userId = new mongoose.Types.ObjectId();
      const shopId = new mongoose.Types.ObjectId();
      const mockUser = {
        _id: userId,
        phone,
        fullName: 'Sumon Dash',
        role: 'STORE_OWNER',
        shopId,
        isActive: true,
        tokenVersion: 1
      };

      vi.spyOn(User, 'findOne').mockResolvedValue(mockUser as any);
      vi.spyOn(Shop, 'findById').mockResolvedValue({
        _id: shopId,
        name: 'Eastern Plaza Outlet'
      } as any);

      const result = await authService.verifyOtp({ phone, otp: rawOtp, purpose: 'login' });

      expect(mockOtpDoc.consumed).toBe(true);
      expect(mockOtpDoc.save).toHaveBeenCalled();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.name).toBe('Sumon Dash');
      expect(result.shops).toHaveLength(1);

      // Verify JWT Access Token payload
      const decodedAccess = verifyAccessToken(result.accessToken);
      expect(decodedAccess.userId).toBe(userId.toString());
      expect(decodedAccess.role).toBe('STORE_OWNER');
      expect(decodedAccess.tokenVersion).toBe(1);

      // Verify JWT Refresh Token payload
      const decodedRefresh = verifyRefreshToken(result.refreshToken);
      expect(decodedRefresh.userId).toBe(userId.toString());
      expect(decodedRefresh.tokenVersion).toBe(1);
    });

    it('rejects expired OTP (>120s TTL) and already-consumed OTPs', async () => {
      const phone = '01700112233';
      const rawOtp = '112233';

      // 1. Expired OTP
      const expiredOtpDoc = {
        phone,
        otpHash: hashOtp(rawOtp),
        purpose: 'login',
        attempts: 0,
        consumed: false,
        createdAt: new Date(Date.now() - 125 * 1000), // 125s ago (> 120s)
        save: vi.fn()
      };

      vi.spyOn(AuthOtp, 'findOne').mockReturnValue({
        sort: vi.fn().mockResolvedValue(expiredOtpDoc)
      } as any);

      await expect(authService.verifyOtp({ phone, otp: rawOtp, purpose: 'login' })).rejects.toMatchObject({
        code: 'OTP_EXPIRED',
        status: 400
      });

      // 2. Already consumed OTP
      vi.spyOn(AuthOtp, 'findOne').mockReturnValue({
        sort: vi.fn().mockResolvedValue(null) // No unconsumed OTP found
      } as any);

      await expect(authService.verifyOtp({ phone, otp: rawOtp, purpose: 'login' })).rejects.toMatchObject({
        code: 'OTP_EXPIRED',
        status: 400
      });
    });

    it('rejects wrong OTP and invalidates challenge after 3 failed attempts', async () => {
      const phone = '01799887766';
      const mockOtpDoc = {
        phone,
        otpHash: hashOtp('123456'),
        purpose: 'login',
        attempts: 2,
        consumed: false,
        createdAt: new Date(),
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(AuthOtp, 'findOne').mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockOtpDoc)
      } as any);

      await expect(authService.verifyOtp({ phone, otp: '999999', purpose: 'login' })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 422
      });

      expect(mockOtpDoc.attempts).toBe(3);
      expect(mockOtpDoc.consumed).toBe(true);
      expect(mockOtpDoc.save).toHaveBeenCalled();
    });
  });

  describe('2. Argon2id Password Authentication & 5-Attempt Lockout (TC-29)', () => {
    it('authenticates user with Argon2id password hash', async () => {
      const phone = '01711223344';
      const password = 'StrongPassword123#';
      const passwordHash = await hashPassword(password);

      const userId = new mongoose.Types.ObjectId();
      const mockUser = {
        _id: userId,
        phone,
        fullName: 'Tanvir Ahmed',
        role: 'CASHIER',
        passwordHash,
        failedLoginAttempts: 0,
        isActive: true,
        tokenVersion: 2,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(User, 'findOne').mockResolvedValue(mockUser as any);
      vi.spyOn(Shop, 'find').mockResolvedValue([]);

      const result = await authService.loginWithPassword({ phone, password });

      expect(result.accessToken).toBeDefined();
      expect(result.user.name).toBe('Tanvir Ahmed');
      expect(mockUser.failedLoginAttempts).toBe(0);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('locks account for 15 minutes after 5 consecutive failed password attempts (TC-29)', async () => {
      const phone = '01711223344';
      const passwordHash = await hashPassword('CorrectPassword123#');

      const mockUser = {
        phone,
        passwordHash,
        failedLoginAttempts: 4, // 5th attempt will fail
        lockedUntil: undefined as Date | null | undefined,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(User, 'findOne').mockResolvedValue(mockUser as any);

      // 5th failed attempt triggers 15-min lockout
      await expect(authService.loginWithPassword({ phone, password: 'WrongPassword' })).rejects.toMatchObject({
        code: 'ACCOUNT_LOCKED',
        status: 429
      });

      expect(mockUser.failedLoginAttempts).toBe(5);
      expect(mockUser.lockedUntil).toBeDefined();
      expect(mockUser.lockedUntil!.getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000);
      expect(mockUser.save).toHaveBeenCalled();

      // Subsequent attempt while locked is blocked immediately
      await expect(authService.loginWithPassword({ phone, password: 'CorrectPassword123#' })).rejects.toMatchObject({
        code: 'ACCOUNT_LOCKED',
        status: 429
      });
    });
  });

  describe('3. JWT Lifecycle & Instant Session Revocation (<1s kill-switch)', () => {
    it('refreshes access token with valid refresh token', async () => {
      const userId = new mongoose.Types.ObjectId();
      const refreshToken = createRefreshToken({
        userId: userId.toString(),
        tokenVersion: 3
      });

      const mockUser = {
        _id: userId,
        phone: '01711223344',
        role: 'SALESPERSON',
        isActive: true,
        tokenVersion: 3
      };

      vi.spyOn(User, 'findById').mockResolvedValue(mockUser as any);
      vi.spyOn(Shop, 'find').mockResolvedValue([]);

      const result = await authService.refreshSession(refreshToken);
      expect(result.accessToken).toBeDefined();

      const decoded = verifyAccessToken(result.accessToken);
      expect(decoded.userId).toBe(userId.toString());
      expect(decoded.tokenVersion).toBe(3);
    });

    it('rejects refresh when user.tokenVersion has been incremented (Session Kill Switch)', async () => {
      const userId = new mongoose.Types.ObjectId();
      const staleRefreshToken = createRefreshToken({
        userId: userId.toString(),
        tokenVersion: 1 // Old version
      });

      const mockUser = {
        _id: userId,
        phone: '01711223344',
        role: 'SALESPERSON',
        isActive: true,
        tokenVersion: 2 // Incremented version
      };

      vi.spyOn(User, 'findById').mockResolvedValue(mockUser as any);

      await expect(authService.refreshSession(staleRefreshToken)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Session has been revoked or superseded'
      });
    });
  });

  describe('4. Password Recovery Flow (TC-51)', () => {
    it('resets password, updates Argon2id hash, and bumps tokenVersion to purge old sessions', async () => {
      const phone = '01712345678';
      const rawOtp = '987654';

      const mockOtpDoc = {
        phone,
        otpHash: hashOtp(rawOtp),
        purpose: 'password_reset',
        attempts: 0,
        consumed: false,
        createdAt: new Date(),
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(AuthOtp, 'findOne').mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockOtpDoc)
      } as any);

      const mockUser = {
        phone,
        passwordHash: 'old_hash',
        tokenVersion: 1,
        failedLoginAttempts: 2,
        lockedUntil: new Date(),
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(User, 'findOne').mockResolvedValue(mockUser as any);

      const result = await authService.resetPassword({
        phone,
        otp: rawOtp,
        newPassword: 'BrandNewSecurePassword2026!'
      });

      expect(result.success).toBe(true);
      expect(mockOtpDoc.consumed).toBe(true);
      expect(mockUser.tokenVersion).toBe(2); // Bumped to purge stale sessions
      expect(mockUser.failedLoginAttempts).toBe(0);
      expect(mockUser.lockedUntil).toBeNull();
      expect(await verifyPassword(mockUser.passwordHash, 'BrandNewSecurePassword2026!')).toBe(true);
    });
  });

  describe('5. 180s Dual-OTP Mobile Migration (TC-52)', () => {
    it('initiates dual OTP dispatch to current and new SIM', async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockUser = {
        _id: userId,
        phone: '01711111111',
        shopId: new mongoose.Types.ObjectId()
      };

      vi.spyOn(User, 'findById').mockResolvedValue(mockUser as any);
      vi.spyOn(User, 'findOne').mockResolvedValue(null); // new phone not registered
      vi.spyOn(PhoneChangeRequest, 'updateMany').mockResolvedValue({} as any);
      vi.spyOn(PhoneChangeRequest, 'create').mockResolvedValue({} as any);

      const res = await authService.initiatePhoneChange({
        userId: userId.toString(),
        newPhone: '01822222222'
      });

      expect(res.expiresInSeconds).toBe(180);

      const oldSms = mockSmsDriver.getLastMessage('01711111111');
      const newSms = mockSmsDriver.getLastMessage('01822222222');

      expect(oldSms?.message).toMatch(/current SIM verification OTP/);
      expect(newSms?.message).toMatch(/new SIM verification OTP/);
    });

    it('completes dual-OTP verification, updates phone atomically, and bumps tokenVersion', async () => {
      const userId = new mongoose.Types.ObjectId();
      const oldOtp = '111222';
      const newOtp = '333444';

      const mockRequest = {
        userId,
        oldPhone: '01711111111',
        newPhone: '01822222222',
        oldPhoneOtpHash: hashOtp(oldOtp),
        newPhoneOtpHash: hashOtp(newOtp),
        status: 'pending',
        createdAt: new Date(),
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(PhoneChangeRequest, 'findOne').mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockRequest)
      } as any);

      const mockUser = {
        _id: userId,
        phone: '01711111111',
        tokenVersion: 1,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(User, 'findById').mockResolvedValue(mockUser as any);

      const res = await authService.completePhoneChange({
        userId: userId.toString(),
        oldPhoneOtp: oldOtp,
        newPhoneOtp: newOtp
      });

      expect(res.newPhone).toBe('01822222222');
      expect(mockUser.phone).toBe('01822222222');
      expect(mockUser.tokenVersion).toBe(2);
      expect(mockRequest.status).toBe('completed');
    });

    it('rejects migration if only 1 OTP is correct or request has expired (>180s)', async () => {
      const userId = new mongoose.Types.ObjectId();

      const mockRequest = {
        userId,
        oldPhoneOtpHash: hashOtp('111222'),
        newPhoneOtpHash: hashOtp('333444'),
        status: 'pending',
        createdAt: new Date(),
        save: vi.fn()
      };

      vi.spyOn(PhoneChangeRequest, 'findOne').mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockRequest)
      } as any);

      // Wrong new phone OTP
      await expect(
        authService.completePhoneChange({
          userId: userId.toString(),
          oldPhoneOtp: '111222',
          newPhoneOtp: '000000'
        })
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 422
      });

      // Expired request (>180s)
      mockRequest.createdAt = new Date(Date.now() - 190 * 1000);
      await expect(
        authService.completePhoneChange({
          userId: userId.toString(),
          oldPhoneOtp: '111222',
          newPhoneOtp: '333444'
        })
      ).rejects.toMatchObject({
        code: 'OTP_EXPIRED',
        status: 400
      });
    });
  });

  describe('6. Staff Emergency Kill-Switch (TC-53)', () => {
    it('requires owner master password, deactivates staff, and kills active staff sessions in <1s', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const staffId = new mongoose.Types.ObjectId();
      const ownerPassword = 'OwnerMasterPassword2026#';
      const ownerPasswordHash = await hashPassword(ownerPassword);

      const mockOwner = {
        _id: ownerId,
        role: 'STORE_OWNER',
        passwordHash: ownerPasswordHash
      };

      const mockStaff = {
        _id: staffId,
        fullName: 'Tanvir Cashier',
        role: 'CASHIER',
        isActive: true,
        tokenVersion: 4,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(User, 'findById').mockImplementation(async (id: any) => {
        if (id.toString() === ownerId.toString()) return mockOwner as any;
        if (id.toString() === staffId.toString()) return mockStaff as any;
        return null;
      });

      const res = await authService.emergencyTerminateStaff({
        ownerUserId: ownerId.toString(),
        targetStaffId: staffId.toString(),
        ownerPassword,
        reason: 'Drawer cash discrepancy observed'
      });

      expect(res.status).toBe('deactivated');
      expect(mockStaff.isActive).toBe(false);
      expect(mockStaff.tokenVersion).toBe(5); // Bumped to invalidate current active token immediately!
      expect(mockStaff.save).toHaveBeenCalled();
    });

    it('rejects emergency termination if owner master password is wrong', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const staffId = new mongoose.Types.ObjectId();

      const mockOwner = {
        _id: ownerId,
        role: 'STORE_OWNER',
        passwordHash: await hashPassword('CorrectPassword123#')
      };

      vi.spyOn(User, 'findById').mockResolvedValue(mockOwner as any);

      await expect(
        authService.emergencyTerminateStaff({
          ownerUserId: ownerId.toString(),
          targetStaffId: staffId.toString(),
          ownerPassword: 'WrongPassword'
        })
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        status: 401
      });
    });
  });

  describe('7. Production SMS Gateway Drivers', () => {
    it('dispatches SMS successfully via SslWirelessDriver contract', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: async () => ({ status: 'SUCCESS', smsinfo: [{ sms_id: 'ssl_12345' }] })
      });
      vi.stubGlobal('fetch', mockFetch);

      const driver = new SslWirelessDriver({
        apiToken: 'test_token',
        sid: 'test_sid',
        domain: 'https://smsplus.sslwireless.com'
      });

      const res = await driver.sendSms('01712345678', 'Test message');
      expect(res.success).toBe(true);
      expect(res.messageId).toBe('ssl_12345');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://smsplus.sslwireless.com/api/v3/send-sms',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('dispatches SMS successfully via BulkSmsBdDriver contract', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: async () => ({ response_code: 200, message_id: 'bsms_9988' })
      });
      vi.stubGlobal('fetch', mockFetch);

      const driver = new BulkSmsBdDriver({
        apiKey: 'test_key',
        senderId: 'BEBSAYIK'
      });

      const res = await driver.sendSms('01811223344', 'Bulk test');
      expect(res.success).toBe(true);
      expect(res.messageId).toBe('bsms_9988');
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('8. Manager Override PIN Verification (api-spec.md Section 5.3)', () => {
    it('verifies 4-digit manager PIN and returns short-lived overrideToken (60s)', async () => {
      const managerId = new mongoose.Types.ObjectId();
      const pin = '4819';
      const managerPinHash = await hashPassword(pin);

      const mockManager = {
        _id: managerId,
        fullName: 'Manager Rafiqul',
        role: 'STORE_MANAGER',
        managerPinHash
      };

      vi.spyOn(User, 'findById').mockResolvedValue(mockManager as any);

      const res = await authService.verifyManagerPin({
        userId: managerId.toString(),
        pin: '4819',
        action: 'MSP_FLOOR_OVERRIDE'
      });

      expect(res.overrideToken).toMatch(/^ovr_token_/);
      expect(res.authorizedBy).toBe('Manager Rafiqul');
      expect(res.expiresInSeconds).toBe(60);
    });

    it('rejects invalid or non-4-digit manager PIN format', async () => {
      await expect(
        authService.verifyManagerPin({
          userId: 'mock_id',
          pin: '123',
          action: 'DISCOUNT_OVERRIDE'
        })
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 422
      });
    });

    it('rejects unauthorized role attempting manager PIN verification', async () => {
      const cashierId = new mongoose.Types.ObjectId();
      const mockCashier = {
        _id: cashierId,
        fullName: 'Tanvir Cashier',
        role: 'CASHIER',
        managerPinHash: await hashPassword('1234')
      };

      vi.spyOn(User, 'findById').mockResolvedValue(mockCashier as any);

      await expect(
        authService.verifyManagerPin({
          userId: cashierId.toString(),
          pin: '1234',
          action: 'OVERRIDE'
        })
      ).rejects.toMatchObject({
        code: 'TENANT_ACCESS_DENIED',
        status: 403
      });
    });
  });
});
