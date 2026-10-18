import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { OnboardingService } from '../services/onboarding/onboarding.service.js';
import { MarketingLead, User, AuthOtp, Shop } from '../models/index.js';
import { authService } from '../services/auth/index.js';
import { getSmsDriver, MockSmsDriver } from '../services/sms/index.js';
import { hashOtp } from '../utils/security.js';

describe('Phase 11: Marketing Website & Lead Capture (TC-43 & TC-29)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (getSmsDriver() as MockSmsDriver).clear();
  });

  describe('1. Pre-Launch App Store Badge Lead Capture (TC-43)', () => {
    it('captures new mobile number into marketing_leads collection with google_play_badge source', async () => {
      vi.spyOn(MarketingLead, 'findOne').mockResolvedValue(null);
      const mockLeadDoc = {
        _id: new mongoose.Types.ObjectId(),
        phone: '01711223344',
        shopName: 'Chittagong Mobile Mart',
        contactName: 'Mohammad Faruk',
        leadSource: 'google_play_badge',
        status: 'new'
      };
      const createSpy = vi.spyOn(MarketingLead, 'create').mockResolvedValue(mockLeadDoc as any);

      const result = await OnboardingService.captureMarketingLead({
        phone: '01711223344',
        shopName: 'Chittagong Mobile Mart',
        contactName: 'Mohammad Faruk',
        leadSource: 'google_play_badge'
      });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '01711223344',
          shopName: 'Chittagong Mobile Mart',
          contactName: 'Mohammad Faruk',
          leadSource: 'google_play_badge',
          status: 'new'
        })
      );
      expect(result.phone).toBe('01711223344');
      expect(result.status).toBe('new');
    });

    it('idempotently updates existing lead when same phone submits again', async () => {
      const existingDoc = {
        _id: new mongoose.Types.ObjectId(),
        phone: '01711223344',
        shopName: 'Old Shop Name',
        contactName: 'Old Contact',
        leadSource: 'landing_page',
        status: 'new',
        save: vi.fn().mockResolvedValue(true)
      };
      vi.spyOn(MarketingLead, 'findOne').mockResolvedValue(existingDoc as any);

      const result = await OnboardingService.captureMarketingLead({
        phone: '01711223344',
        shopName: 'Updated Dokan Name',
        leadSource: 'google_play_badge'
      });

      expect(existingDoc.shopName).toBe('Updated Dokan Name');
      expect(existingDoc.leadSource).toBe('google_play_badge');
      expect(existingDoc.save).toHaveBeenCalled();
      expect(result.phone).toBe('01711223344');
    });

    it('rejects invalid Bangladeshi phone numbers in lead capture', async () => {
      await expect(
        OnboardingService.captureMarketingLead({
          phone: '123456', // Invalid BD mobile
          shopName: 'Bad Phone Dokan'
        })
      ).rejects.toThrow();

      await expect(
        OnboardingService.captureMarketingLead({
          phone: '01211223344', // 012 is invalid operator prefix in BD
          shopName: 'Bad Operator Dokan'
        })
      ).rejects.toThrow();
    });
  });

  describe('2. Passwordless Mobile OTP Registration Flow (TC-29 & TC-37)', () => {
    it('requests OTP and verifies successfully, provisioning user with STORE_OWNER role', async () => {
      const phone = '01811223344';
      const otpCode = '654321';
      const otpHash = hashOtp(otpCode);

      // 1. Mock OTP persistence & SMS dispatch
      vi.spyOn(AuthOtp, 'create').mockResolvedValue({} as any);

      const reqResult = await authService.requestOtp({
        phone,
        purpose: 'registration'
      });

      expect(reqResult.phone).toBe(phone);
      expect(reqResult.expiresInSeconds).toBe(120);

      // Verify SMS message was queued/sent
      const smsDriver = getSmsDriver() as MockSmsDriver;
      const sentMsgs = smsDriver.getMessages();
      expect(sentMsgs.length).toBe(1);
      expect(sentMsgs[0]?.to).toBe(phone);
      expect(sentMsgs[0]?.message).toContain('verification code');

      // 2. Mock OTP verification
      const mockOtpDoc = {
        _id: new mongoose.Types.ObjectId(),
        phone,
        otpHash,
        purpose: 'registration',
        consumed: false,
        attempts: 0,
        createdAt: new Date(),
        save: vi.fn().mockResolvedValue(true)
      };
      vi.spyOn(AuthOtp, 'findOne').mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockOtpDoc)
      } as any);

      // Mock user creation
      const mockCreatedUser = {
        _id: new mongoose.Types.ObjectId(),
        phone,
        fullName: 'Owner 3344',
        role: 'STORE_OWNER',
        isActive: true,
        tokenVersion: 0,
        save: vi.fn().mockResolvedValue(true)
      };
      vi.spyOn(User, 'findOne').mockResolvedValue(null);
      vi.spyOn(User, 'create').mockResolvedValue(mockCreatedUser as any);
      vi.spyOn(Shop, 'find').mockResolvedValue([]);

      const verifyResult = await authService.verifyOtp({
        phone,
        otp: otpCode,
        purpose: 'registration'
      });

      expect(mockOtpDoc.consumed).toBe(true);
      expect(mockOtpDoc.save).toHaveBeenCalled();
      expect(verifyResult.user.role).toBe('STORE_OWNER');
      expect(verifyResult.accessToken).toBeDefined();
      expect(verifyResult.refreshToken).toBeDefined();
    });
  });
});
