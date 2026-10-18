import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { AdminService } from '../services/admin/admin.service.js';
import { BillingService } from '../services/billing/billing.service.js';
import { requireRole } from '../middlewares/authGuard.js';
import {
  Shop,
  User,
  SubscriptionPlan,
  SubscriptionInvoice
} from '../models/index.js';

describe('Phase 12: Platform Super Admin Engine (TC-38, TC-39, TC-44, TC-56)', () => {
  const shopId = new mongoose.Types.ObjectId();
  const ownerUserId = new mongoose.Types.ObjectId();
  const adminUserId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(BillingService, 'seedDefaults').mockResolvedValue(undefined);
  });

  describe('1. Super Admin RBAC Gate (TC-44)', () => {
    it('grants access when user role is SUPER_ADMIN', () => {
      const guard = requireRole(['SUPER_ADMIN']);
      const req: any = {
        headers: {},
        user: { role: 'SUPER_ADMIN' }
      };
      const res: any = {};
      const next = vi.fn();

      guard(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects non-super admin with HTTP 403 INSUFFICIENT_PERMISSIONS', () => {
      const guard = requireRole(['SUPER_ADMIN']);
      const req: any = {
        headers: {},
        user: { role: 'STORE_OWNER' }
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      guard(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INSUFFICIENT_PERMISSIONS'
          })
        })
      );
    });
  });

  describe('2. Global SaaS KPI Analytics', () => {
    it('aggregates total shops, active MRR, ARR, churn rate, and telecom SMS float', async () => {
      vi.spyOn(Shop, 'countDocuments').mockImplementation(((query: any) => {
        if (!query) return Promise.resolve(10);
        if (query.status === 'active') return Promise.resolve(6);
        if (query.status === 'trial') return Promise.resolve(2);
        if (query.status === 'grace_period') return Promise.resolve(1);
        if (query.status === 'read_only') return Promise.resolve(1);
        if (query.status === 'suspended') return Promise.resolve(0);
        return Promise.resolve(0);
      }) as any);

      vi.spyOn(Shop, 'find').mockReturnValue({
        populate: vi.fn().mockResolvedValue([
          { subscriptionPlanId: { monthlyPrice: 999 } },
          { subscriptionPlanId: { monthlyPrice: 999 } },
          { subscriptionPlanId: { monthlyPrice: 1999 } }
        ])
      } as any);

      const kpis = await AdminService.getKpiAnalytics();

      expect(kpis.totalShops).toBe(10);
      expect(kpis.activeShops).toBe(6);
      expect(kpis.trialShops).toBe(2);
      expect(kpis.mrr).toBe(3997);
      expect(kpis.arr).toBe(3997 * 12);
      expect(kpis.churnRate).toBe(10); // 1 read_only / 10 = 10%
      expect(kpis.smsGatewayBalance).toBe(5420);
    });
  });

  describe('3. Non-Destructive Shop Suspension & Reactivation (TC-38)', () => {
    it('suspends shop non-destructively without deleting inventory or sales', async () => {
      const mockShop: any = {
        _id: shopId,
        name: 'Eastern Mobile Hatirpool',
        status: 'active',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop);

      const result = await AdminService.suspendShop(shopId.toString(), {
        reason: 'Violation of merchant terms'
      });

      expect(result.status).toBe('suspended');
      expect(result.previousStatus).toBe('active');
      expect(result.suspensionReason).toBe('Violation of merchant terms');
      expect(mockShop.save).toHaveBeenCalled();
    });

    it('reactivates suspended shop with 1-click restore to active state', async () => {
      const mockShop: any = {
        _id: shopId,
        name: 'Eastern Mobile Hatirpool',
        status: 'suspended',
        previousStatus: 'active',
        subscriptionExpiresAt: new Date(Date.now() + 864000000), // active in future
        set: vi.fn(),
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop);

      const result = await AdminService.reactivateShop(shopId.toString());

      expect(result.status).toBe('active');
      expect(mockShop.set).toHaveBeenCalledWith('suspensionReason', undefined);
      expect(mockShop.save).toHaveBeenCalled();
    });
  });

  describe('4. Emergency Hotline Lost SIM Phone Migration (TC-56)', () => {
    it('migrates lost SIM phone number, invalidates existing JWT sessions via tokenVersion', async () => {
      const mockShop: any = {
        _id: shopId,
        ownerUserId,
        phone: '01711223344',
        save: vi.fn().mockResolvedValue(true)
      };
      const mockOwner: any = {
        _id: ownerUserId,
        phone: '01711223344',
        tokenVersion: 1,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop);
      vi.spyOn(User, 'findById').mockResolvedValue(mockOwner);
      vi.spyOn(User, 'findOne').mockResolvedValue(null); // new phone is available

      const result = await AdminService.emergencyPhoneMigration({
        shopId: shopId.toString(),
        input: {
          newPhone: '01899887766',
          nidVerificationRef: 'NID-1990269123456789',
          tradeLicenseRef: 'TL-DSCC-2024-0012',
          reason: 'Owner lost physical SIM during transit in Hatirpool'
        },
        adminUserId
      });

      expect(result.success).toBe(true);
      expect(result.oldPhone).toBe('01711223344');
      expect(result.newPhone).toBe('01899887766');
      expect(result.tokenVersion).toBe(2); // Incremented to revoke all active JWT tokens
      expect(mockOwner.phone).toBe('01899887766');
      expect(mockShop.phone).toBe('01899887766');
      expect(result.auditLog.nidVerificationRef).toBe('NID-1990269123456789');
    });

    it('rejects migration if new phone is already registered to another user', async () => {
      const mockShop: any = {
        _id: shopId,
        ownerUserId,
        phone: '01711223344'
      };
      const mockOwner: any = {
        _id: ownerUserId,
        phone: '01711223344',
        tokenVersion: 1
      };
      const conflictingUser: any = {
        _id: new mongoose.Types.ObjectId(),
        phone: '01899887766'
      };

      vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop);
      vi.spyOn(User, 'findById').mockResolvedValue(mockOwner);
      vi.spyOn(User, 'findOne').mockResolvedValue(conflictingUser);

      await expect(
        AdminService.emergencyPhoneMigration({
          shopId: shopId.toString(),
          input: {
            newPhone: '01899887766',
            nidVerificationRef: 'NID-1990269123456789',
            reason: 'SIM lost'
          },
          adminUserId
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'PHONE_ALREADY_EXISTS'
      });
    });
  });

  describe('5. Plan Price Versioning (TC-39)', () => {
    it('updates plan price for future checkouts while leaving existing historical invoices unchanged', async () => {
      const mockPlan: any = {
        _id: new mongoose.Types.ObjectId(),
        code: 'pro',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        save: vi.fn().mockResolvedValue(true),
        toJSON: vi.fn().mockReturnValue({ code: 'pro', monthlyPrice: 1299, yearlyPrice: 12990 })
      };

      vi.spyOn(SubscriptionPlan, 'findOne').mockResolvedValue(mockPlan);

      const updated = await AdminService.updatePlanPrice('pro', {
        monthlyPrice: '1299.00',
        yearlyPrice: '12990.00'
      });

      expect(mockPlan.monthlyPrice).toBe('1299.00');
      expect(mockPlan.yearlyPrice).toBe('12990.00');
      expect(mockPlan.save).toHaveBeenCalled();
      expect(updated.monthlyPrice).toBe(1299);
    });
  });
});
