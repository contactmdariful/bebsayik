import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { BillingService } from '../services/billing/billing.service.js';
import { PosService } from '../services/pos/pos.service.js';
import {
  Shop,
  SubscriptionPlan,
  SubscriptionInvoice,
  PromoCode
} from '../models/index.js';

describe('Phase 12: SaaS Billing Engine & Webhooks', () => {
  const shopId = new mongoose.Types.ObjectId();
  const planId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(BillingService, 'seedDefaults').mockResolvedValue(undefined);
  });

  describe('1. Promo Discount Coupon Validation', () => {
    it('validates percentage discount coupon correctly', async () => {
      const mockPromo = {
        code: 'EID2026',
        discountType: 'percentage',
        discountValue: 20,
        validUntil: new Date(Date.now() + 86400000),
        usageLimit: 100,
        timesUsed: 5,
        isActive: true
      };
      vi.spyOn(PromoCode, 'findOne').mockResolvedValue(mockPromo as any);

      const result = await BillingService.validateCoupon({
        code: 'EID2026',
        planAmount: 1000
      });

      expect(result.valid).toBe(true);
      expect(result.code).toBe('EID2026');
      expect(result.discountType).toBe('percentage');
      expect(result.discountAmount).toBe('200.00');
      expect(result.payableAmount).toBe('800.00');
    });

    it('validates fixed amount coupon correctly', async () => {
      const mockPromo = {
        code: 'SAVE100',
        discountType: 'fixed_amount',
        discountValue: 100,
        validUntil: new Date(Date.now() + 86400000),
        usageLimit: 50,
        timesUsed: 10,
        isActive: true
      };
      vi.spyOn(PromoCode, 'findOne').mockResolvedValue(mockPromo as any);

      const result = await BillingService.validateCoupon({
        code: 'SAVE100',
        planAmount: 499
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe('100.00');
      expect(result.payableAmount).toBe('399.00');
    });

    it('rejects coupon when usage limit has been reached', async () => {
      const mockPromo = {
        code: 'MAXEDOUT',
        discountType: 'percentage',
        discountValue: 10,
        validUntil: new Date(Date.now() + 86400000),
        usageLimit: 10,
        timesUsed: 10,
        isActive: true
      };
      vi.spyOn(PromoCode, 'findOne').mockResolvedValue(mockPromo as any);

      await expect(
        BillingService.validateCoupon({ code: 'MAXEDOUT', planAmount: 1000 })
      ).rejects.toThrow('maximum usage limit');
    });

    it('rejects expired coupon', async () => {
      const mockPromo = {
        code: 'EXPIRED2024',
        discountType: 'percentage',
        discountValue: 10,
        validUntil: new Date(Date.now() - 86400000),
        usageLimit: 10,
        timesUsed: 0,
        isActive: true
      };
      vi.spyOn(PromoCode, 'findOne').mockResolvedValue(mockPromo as any);

      await expect(
        BillingService.validateCoupon({ code: 'EXPIRED2024', planAmount: 1000 })
      ).rejects.toThrow('expired');
    });
  });

  describe('2. Subscription Checkout Generator', () => {
    it('creates pending SubscriptionInvoice with correct billing cycle and discount', async () => {
      const mockShop: any = {
        _id: shopId,
        name: 'Eastern Mobile',
        status: 'trial'
      };
      const mockPlan: any = {
        _id: planId,
        code: 'pro',
        monthlyPrice: 999,
        yearlyPrice: 9990
      };

      vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop);
      vi.spyOn(SubscriptionPlan, 'findOne').mockResolvedValue(mockPlan);
      vi.spyOn(SubscriptionInvoice.prototype, 'save').mockResolvedValue(true as any);

      const checkout = await BillingService.createCheckout({
        shopId,
        input: {
          planCode: 'pro',
          billingCycle: 'monthly',
          paymentGateway: 'paystation'
        }
      });

      expect(checkout.invoice).toBeDefined();
      expect(checkout.invoice.planCode).toBe('pro');
      expect(checkout.invoice.billingCycle).toBe('monthly');
      expect(checkout.invoice.paymentStatus).toBe('pending');
      expect(checkout.checkoutUrl).toContain('paystation.com.bd');
      expect(checkout.checkoutUrl).toContain('invoiceNo=INV-SUB-');
    });
  });

  describe('3. Timing-Safe HMAC Signature Verification', () => {
    it('verifies valid HMAC-SHA256 signature', () => {
      const payload = JSON.stringify({ invoiceNo: 'INV-123', status: 'SUCCESS' });
      const signature = BillingService.signPayload(payload, 'paystation');
      const isValid = BillingService.verifyWebhookSignature(payload, signature, 'paystation');
      expect(isValid).toBe(true);
    });

    it('rejects tampered webhook payload with invalid signature', () => {
      const payload = JSON.stringify({ invoiceNo: 'INV-123', status: 'SUCCESS' });
      const signature = BillingService.signPayload(payload, 'paystation');
      const tamperedPayload = JSON.stringify({ invoiceNo: 'INV-123', status: 'SUCCESS', extra: 'tampered' });
      const isValid = BillingService.verifyWebhookSignature(tamperedPayload, signature, 'paystation');
      expect(isValid).toBe(false);
    });

    it('rejects webhook call when signature is missing or wrong secret', async () => {
      const payload = { invoiceNo: 'INV-123', status: 'SUCCESS' };
      const rawBody = JSON.stringify(payload);

      await expect(
        BillingService.processWebhook({
          gateway: 'paystation',
          rawBody,
          signature: 'invalid_hex_signature_length_64_0000000000000000000000000000000000000',
          payload
        })
      ).rejects.toThrow('Invalid timing-safe HMAC signature');
    });
  });

  describe('4. Webhook Processing & Subscription Extension', () => {
    it('processes successful payment and extends active subscription', async () => {
      const mockShop: any = {
        _id: shopId,
        name: 'Eastern Mobile',
        status: 'trial',
        subscriptionExpiresAt: undefined,
        save: vi.fn().mockResolvedValue(true)
      };
      const mockInvoice: any = {
        _id: new mongoose.Types.ObjectId(),
        invoiceNo: 'INV-SUB-001',
        shopId,
        planId,
        billingCycle: 'monthly',
        paymentStatus: 'pending',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(SubscriptionInvoice, 'findOne').mockImplementation(((q: any) => {
        if (q?.gatewayTransactionId) return Promise.resolve(null);
        return Promise.resolve(mockInvoice);
      }) as any);
      vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop);

      const payload = {
        invoiceNo: 'INV-SUB-001',
        trxId: 'PS_TXN_123456',
        status: 'SUCCESS'
      };
      const rawBody = JSON.stringify(payload);
      const signature = BillingService.signPayload(rawBody, 'paystation');

      const result = await BillingService.processWebhook({
        gateway: 'paystation',
        rawBody,
        signature,
        payload
      });

      expect(result.status).toBe('success');
      expect(mockInvoice.paymentStatus).toBe('paid');
      expect(mockInvoice.gatewayTransactionId).toBe('PS_TXN_123456');
      expect(mockShop.status).toBe('active');
      expect(mockShop.subscriptionExpiresAt).toBeDefined();
    });

    it('processes failed webhook and records failure without extending subscription', async () => {
      const mockInvoice: any = {
        _id: new mongoose.Types.ObjectId(),
        invoiceNo: 'INV-SUB-002',
        shopId,
        planId,
        billingCycle: 'monthly',
        paymentStatus: 'pending',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(SubscriptionInvoice, 'findOne').mockImplementation(((q: any) => {
        if (q?.gatewayTransactionId) return Promise.resolve(null);
        return Promise.resolve(mockInvoice);
      }) as any);

      const payload = {
        invoiceNo: 'INV-SUB-002',
        trxId: 'PS_FAIL_999',
        status: 'FAILED'
      };
      const rawBody = JSON.stringify(payload);
      const signature = BillingService.signPayload(rawBody, 'paystation');

      const result = await BillingService.processWebhook({
        gateway: 'paystation',
        rawBody,
        signature,
        payload
      });

      expect(result.status).toBe('failed');
      expect(mockInvoice.paymentStatus).toBe('failed');
    });

    it('enforces webhook idempotency on duplicate transaction (TC-34)', async () => {
      const mockInvoice: any = {
        _id: new mongoose.Types.ObjectId(),
        invoiceNo: 'INV-SUB-003',
        shopId,
        planId,
        billingCycle: 'monthly',
        paymentStatus: 'paid', // already marked as paid
        save: vi.fn()
      };

      vi.spyOn(SubscriptionInvoice, 'findOne').mockResolvedValue(mockInvoice);
      vi.spyOn(Shop, 'findById').mockResolvedValue({
        _id: shopId,
        subscriptionExpiresAt: new Date('2027-01-01')
      } as any);

      const payload = {
        invoiceNo: 'INV-SUB-003',
        trxId: 'PS_DUPLICATE_TRX',
        status: 'SUCCESS'
      };
      const rawBody = JSON.stringify(payload);
      const signature = BillingService.signPayload(rawBody, 'paystation');

      const result = await BillingService.processWebhook({
        gateway: 'paystation',
        rawBody,
        signature,
        payload
      });

      expect(result.status).toBe('already_processed');
      expect(mockInvoice.save).not.toHaveBeenCalled(); // No double extension
    });

    it('rejects cross-invoice replay attack when existing trxId is reused on a different unpaid invoice', async () => {
      const unpaidInvoice: any = {
        _id: new mongoose.Types.ObjectId(),
        invoiceNo: 'INV-SUB-ATTACK',
        shopId,
        planId,
        billingCycle: 'monthly',
        paymentStatus: 'pending',
        save: vi.fn()
      };

      const paidInvoice: any = {
        _id: new mongoose.Types.ObjectId(),
        invoiceNo: 'INV-SUB-LEGIT',
        shopId,
        gatewayTransactionId: 'TRX_REPLAY_123',
        paymentStatus: 'paid'
      };

      vi.spyOn(SubscriptionInvoice, 'findOne').mockImplementation(((query: any) => {
        if (query.invoiceNo === 'INV-SUB-ATTACK') return Promise.resolve(unpaidInvoice);
        if (query.gatewayTransactionId === 'TRX_REPLAY_123' && query.paymentStatus === 'paid') return Promise.resolve(paidInvoice);
        return Promise.resolve(null);
      }) as any);

      vi.spyOn(Shop, 'findById').mockResolvedValue({
        _id: shopId,
        subscriptionExpiresAt: new Date('2026-11-01')
      } as any);

      const payload = {
        invoiceNo: 'INV-SUB-ATTACK',
        trxId: 'TRX_REPLAY_123',
        status: 'SUCCESS'
      };
      const rawBody = JSON.stringify(payload);
      const signature = BillingService.signPayload(rawBody, 'paystation');

      const result = await BillingService.processWebhook({
        gateway: 'paystation',
        rawBody,
        signature,
        payload
      });

      expect(result.status).toBe('already_processed');
      expect(result.message).toContain('was already processed on invoice INV-SUB-LEGIT');
      expect(unpaidInvoice.save).not.toHaveBeenCalled(); // Malicious invoice was NOT activated!
    });
  });

  describe('5. Subscription Lifecycle Sweeper (TC-25 & TC-35)', () => {
    it('sweeps expired trials into grace_period and expired grace into read_only', async () => {
      const trialShop: any = {
        status: 'trial',
        trialEndsAt: new Date(Date.now() - 1000),
        save: vi.fn().mockResolvedValue(true)
      };
      const graceShop: any = {
        status: 'grace_period',
        gracePeriodEndsAt: new Date(Date.now() - 1000),
        save: vi.fn().mockResolvedValue(true)
      };

      // Mock consecutive queries in sweepSubscriptionLifecycles:
      // 1. lapsedTrials
      // 2. lapsedActive
      // 3. lapsedGrace
      const findSpy = vi.spyOn(Shop, 'find');
      findSpy.mockResolvedValueOnce([trialShop] as any);
      findSpy.mockResolvedValueOnce([] as any);
      findSpy.mockResolvedValueOnce([graceShop] as any);

      const sweep = await BillingService.sweepSubscriptionLifecycles();

      expect(sweep.trialsExpired).toBe(1);
      expect(trialShop.status).toBe('grace_period');
      expect(trialShop.gracePeriodEndsAt).toBeDefined();

      expect(sweep.readOnlyEnforced).toBe(1);
      expect(graceShop.status).toBe('read_only');
    });
  });

  describe('6. Read-Only Mode POS Restriction (TC-25 & TC-26)', () => {
    it('blocks POS checkout with HTTP 403 SUBSCRIPTION_READ_ONLY when shop is in read_only mode', async () => {
      const mockReadOnlyShop = {
        _id: shopId,
        status: 'read_only'
      };
      vi.spyOn(Shop, 'findById').mockResolvedValue(mockReadOnlyShop as any);

      await expect(
        PosService.processCheckout({
          shopId,
          userId: new mongoose.Types.ObjectId(),
          idempotencyKey: 'test_idemp_key_001',
          payload: {
            items: [{ variantId: 'var_01', quantity: 1, unitPrice: 500 }],
            payments: [{ paymentMethod: 'cash', amountReceived: 500, amountApplied: 500 }]
          }
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'SUBSCRIPTION_READ_ONLY'
      });
    });

    it('blocks POS checkout with HTTP 403 SHOP_SUSPENDED when shop is suspended (TC-38)', async () => {
      const mockSuspendedShop = {
        _id: shopId,
        status: 'suspended'
      };
      vi.spyOn(Shop, 'findById').mockResolvedValue(mockSuspendedShop as any);

      await expect(
        PosService.processCheckout({
          shopId,
          userId: new mongoose.Types.ObjectId(),
          idempotencyKey: 'test_idemp_key_002',
          payload: {
            items: [{ variantId: 'var_01', quantity: 1, unitPrice: 500 }],
            payments: [{ paymentMethod: 'cash', amountReceived: 500, amountApplied: 500 }]
          }
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'SHOP_SUSPENDED'
      });
    });
  });

  describe('7. 3-Minute Gateway Invoice Sweeper (TC-49)', () => {
    it('sweeps pending invoices older than 3 minutes and recovers eligible test transactions', async () => {
      const mockInvoice: any = {
        _id: new mongoose.Types.ObjectId(),
        shopId,
        planId,
        billingCycle: 'monthly',
        paymentStatus: 'pending',
        gatewayTransactionId: 'TEST_RECOVER_9999',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(SubscriptionInvoice, 'find').mockResolvedValue([mockInvoice] as any);
      vi.spyOn(Shop, 'findById').mockResolvedValue({
        _id: shopId,
        status: 'trial',
        save: vi.fn().mockResolvedValue(true)
      } as any);

      const result = await BillingService.sweepPendingGatewayInvoices(3);

      expect(result.sweptCount).toBe(1);
      expect(result.recoveredCount).toBe(1);
      expect(mockInvoice.paymentStatus).toBe('paid');
    });
  });
});
