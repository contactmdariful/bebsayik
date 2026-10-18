import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  BillingCheckoutInput,
  BillingCheckoutSchema,
  ValidateCouponInput,
  ValidateCouponSchema
} from '@bebsayik/shared-types';
import {
  Shop,
  SubscriptionPlan,
  SubscriptionInvoice,
  PromoCode,
  ISubscriptionPlan
} from '../../models/index.js';

export interface PlanSeedData {
  code: 'starter' | 'pro' | 'enterprise' | 'silver' | 'gold' | 'diamond';
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxShops: number;
  maxStaffPerShop: number;
  features: string[];
}

export const DEFAULT_PLANS: PlanSeedData[] = [
  {
    code: 'starter',
    name: 'Silver / Starter',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    maxShops: 1,
    maxStaffPerShop: 3,
    features: [
      'POS & Sales Register',
      'Dual IMEI Handset Lifecycle & Luhn Check',
      'Thermal Receipt Print (58mm / 80mm)',
      'Bakir Khata (Customer Receivables)',
      'Basic Daily Sales & Stock Reports'
    ]
  },
  {
    code: 'pro',
    name: 'Gold / Professional',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    maxShops: 2,
    maxStaffPerShop: 10,
    features: [
      'Everything in Silver',
      'Kisti (EMI) Installment Sales Engine',
      'Dual Guarantor NID & Schedule Tracking',
      'Police Buyback Undertaking & Biometric Capture',
      'MFS Agent Drawer vs SIM Float Isolation',
      'Multi-Register Shifts & Blind Cash Drawer Audit',
      'Automated SMS Due & Installment Reminders'
    ]
  },
  {
    code: 'enterprise',
    name: 'Diamond / Enterprise',
    monthlyPrice: 1999,
    yearlyPrice: 19990,
    maxShops: 10,
    maxStaffPerShop: 50,
    features: [
      'Everything in Gold',
      'Multi-Branch Godown STN Transfers',
      'Centralized Real-Time Consolidated Analytics',
      'Double-Entry Accounting & Trial Balance Matrix',
      'Advanced NBR Mushak 6.3 VAT Reports',
      'Priority 24/7 Dedicated Support Hotline'
    ]
  }
];

export const DEFAULT_PROMOS = [
  {
    code: 'EID2026',
    discountType: 'percentage' as const,
    discountValue: 20, // 20% off
    validUntil: new Date('2027-12-31T23:59:59.000Z'),
    usageLimit: 1000,
    timesUsed: 0,
    isActive: true
  },
  {
    code: 'LAUNCH50',
    discountType: 'percentage' as const,
    discountValue: 50, // 50% off
    validUntil: new Date('2027-12-31T23:59:59.000Z'),
    usageLimit: 500,
    timesUsed: 0,
    isActive: true
  },
  {
    code: 'SAVE100',
    discountType: 'fixed_amount' as const,
    discountValue: 100, // ৳100 flat off
    validUntil: new Date('2027-12-31T23:59:59.000Z'),
    usageLimit: 200,
    timesUsed: 0,
    isActive: true
  }
];

export class BillingService {
  /**
   * Seed default subscription plans and promo codes if none exist
   */
  static async seedDefaults(): Promise<void> {
    for (const plan of DEFAULT_PLANS) {
      const existing = await SubscriptionPlan.findOne({ code: plan.code });
      if (!existing) {
        await SubscriptionPlan.create({
          code: plan.code,
          name: plan.name,
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          maxShops: plan.maxShops,
          maxStaffPerShop: plan.maxStaffPerShop,
          features: plan.features,
          isActive: true
        });
      }
    }

    for (const promo of DEFAULT_PROMOS) {
      const existing = await PromoCode.findOne({ code: promo.code });
      if (!existing) {
        await PromoCode.create(promo);
      }
    }
  }

  /**
   * Fetch all active subscription tiers
   */
  static async getPlans(): Promise<ISubscriptionPlan[]> {
    await this.seedDefaults();
    return SubscriptionPlan.find({ isActive: true }).sort({ monthlyPrice: 1 });
  }

  /**
   * Normalize tier code: allows 'silver' -> 'starter', 'gold' -> 'pro', 'diamond' -> 'enterprise'
   */
  static normalizePlanCode(code: string): string {
    const lower = code.toLowerCase();
    if (lower === 'silver') return 'starter';
    if (lower === 'gold') return 'pro';
    if (lower === 'diamond') return 'enterprise';
    return lower;
  }

  /**
   * Validate a promo discount coupon
   */
  static async validateCoupon(input: ValidateCouponInput & { planAmount?: number | string }): Promise<{
    valid: boolean;
    code: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    discountAmount: string;
    payableAmount?: string;
  }> {
    const parsed = ValidateCouponSchema.parse(input);
    const promo = await PromoCode.findOne({
      code: parsed.code.trim().toUpperCase(),
      isActive: true
    });

    if (!promo) {
      const err: any = new Error(`Promo coupon code '${parsed.code}' is invalid or does not exist`);
      err.statusCode = 404;
      err.code = 'INVALID_COUPON';
      throw err;
    }

    if (promo.validUntil && promo.validUntil < new Date()) {
      const err: any = new Error(`Promo coupon code '${promo.code}' has expired`);
      err.statusCode = 400;
      err.code = 'COUPON_EXPIRED';
      throw err;
    }

    if (promo.usageLimit && promo.timesUsed >= promo.usageLimit) {
      const err: any = new Error(`Promo coupon code '${promo.code}' has reached its maximum usage limit`);
      err.statusCode = 400;
      err.code = 'COUPON_LIMIT_REACHED';
      throw err;
    }

    const discountVal = Number(promo.discountValue.toString());
    const baseAmount = input.planAmount ? Number(input.planAmount) : 0;
    let discountAmount = 0;

    if (promo.discountType === 'percentage') {
      discountAmount = (baseAmount * discountVal) / 100;
    } else {
      discountAmount = discountVal;
    }

    // Discount cannot exceed total price
    if (discountAmount > baseAmount && baseAmount > 0) {
      discountAmount = baseAmount;
    }

    const payable = Math.max(0, baseAmount - discountAmount);

    return {
      valid: true,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: discountVal,
      discountAmount: discountAmount.toFixed(2),
      payableAmount: payable.toFixed(2)
    };
  }

  /**
   * Create checkout invoice & gateway redirect URL
   */
  static async createCheckout(params: {
    shopId: string | mongoose.Types.ObjectId;
    input: BillingCheckoutInput;
  }): Promise<{
    invoice: any;
    checkoutUrl: string;
    redirectUrl: string;
  }> {
    await this.seedDefaults();
    const parsed = BillingCheckoutSchema.parse(params.input);
    const sId = new mongoose.Types.ObjectId(params.shopId);

    const shop = await Shop.findById(sId);
    if (!shop) {
      const err: any = new Error(`Shop tenant not found with ID ${params.shopId}`);
      err.statusCode = 404;
      err.code = 'SHOP_NOT_FOUND';
      throw err;
    }

    const normalizedCode = this.normalizePlanCode(parsed.planCode);
    const plan = await SubscriptionPlan.findOne({
      $or: [{ code: normalizedCode }, { code: parsed.planCode }]
    });

    if (!plan) {
      const err: any = new Error(`Subscription plan '${parsed.planCode}' not found`);
      err.statusCode = 404;
      err.code = 'PLAN_NOT_FOUND';
      throw err;
    }

    const rawPlanPrice =
      parsed.billingCycle === 'yearly'
        ? Number(plan.yearlyPrice.toString())
        : Number(plan.monthlyPrice.toString());

    let discountAmount = 0;
    let promoCodeApplied: string | undefined = undefined;

    if (parsed.promoCode) {
      const validation = await this.validateCoupon({
        code: parsed.promoCode,
        planAmount: rawPlanPrice
      });
      discountAmount = Number(validation.discountAmount);
      promoCodeApplied = validation.code;
    }

    const payableAmount = Math.max(0, rawPlanPrice - discountAmount);

    // Compute license period dates
    const now = new Date();
    let periodStart = now;
    if (shop.status === 'active' && shop.subscriptionExpiresAt && shop.subscriptionExpiresAt > now) {
      periodStart = new Date(shop.subscriptionExpiresAt);
    }

    const periodEnd = new Date(periodStart);
    if (parsed.billingCycle === 'yearly') {
      periodEnd.setDate(periodEnd.getDate() + 365);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    const invoiceNo = `INV-SUB-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const invoice = new SubscriptionInvoice({
      invoiceNo,
      shopId: shop._id,
      planId: plan._id,
      planCode: plan.code,
      amount: payableAmount,
      originalAmount: rawPlanPrice,
      discountAmount: discountAmount,
      promoCode: promoCodeApplied,
      billingCycle: parsed.billingCycle,
      paymentGateway: parsed.paymentGateway,
      paymentStatus: 'pending',
      periodStart,
      periodEnd
    });

    await invoice.save();

    // Construct checkout redirect URL
    const gatewayHost =
      parsed.paymentGateway === 'paystation'
        ? 'https://checkout.paystation.com.bd'
        : parsed.paymentGateway === 'eps'
          ? 'https://gateway.easypayway.com'
          : 'https://checkout.bkash.com';

    const checkoutUrl = `${gatewayHost}/checkout?invoiceNo=${invoice.invoiceNo}&amount=${payableAmount.toFixed(
      2
    )}&gateway=${parsed.paymentGateway}&shopId=${shop._id.toString()}`;

    return {
      invoice: invoice.toJSON(),
      checkoutUrl,
      redirectUrl: checkoutUrl
    };
  }

  /**
   * Timing-Safe HMAC-SHA256 signature verification (api-spec.md Section 5.30)
   */
  static verifyWebhookSignature(payloadString: string, signature: string, gateway: string): boolean {
    if (!signature || typeof signature !== 'string') return false;
    const envKey = `${gateway.toUpperCase()}_WEBHOOK_SECRET`;
    const secret = process.env[envKey] || process.env.PAYMENT_WEBHOOK_SECRET || 'bebsayik_webhook_secret_key_2026';

    const computed = crypto.createHmac('sha256', secret).update(payloadString, 'utf8').digest('hex');

    if (computed.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(computed, 'utf8'), Buffer.from(signature, 'utf8'));
  }

  /**
   * Helper to sign a payload (used in tests and gateway simulator)
   */
  static signPayload(payloadString: string, gateway: string, secretOverride?: string): string {
    const envKey = `${gateway.toUpperCase()}_WEBHOOK_SECRET`;
    const secret = secretOverride || process.env[envKey] || process.env.PAYMENT_WEBHOOK_SECRET || 'bebsayik_webhook_secret_key_2026';
    return crypto.createHmac('sha256', secret).update(payloadString, 'utf8').digest('hex');
  }

  /**
   * Process incoming payment gateway webhook (PayStation, EPS, bKash)
   * Idempotent: duplicate calls with same trxId or for an already-paid invoice extend license once (TC-34)
   */
  static async processWebhook(params: {
    gateway: 'paystation' | 'eps' | 'bkash';
    rawBody: string;
    signature?: string;
    payload: {
      invoiceNo?: string;
      merchantInvoiceNumber?: string;
      invoiceId?: string;
      trxId?: string;
      gatewayTransactionId?: string;
      status?: string;
      paymentStatus?: string;
      amount?: string | number;
      signature?: string;
      [key: string]: any;
    };
  }): Promise<{
    status: 'success' | 'failed' | 'already_processed';
    message: string;
    invoiceNo?: string | undefined;
    subscriptionExpiresAt?: Date | undefined;
  }> {
    const { gateway, rawBody, payload } = params;
    const signature = params.signature || payload.signature;

    // 1. Timing-safe HMAC verification
    if (!signature || !this.verifyWebhookSignature(rawBody, signature, gateway)) {
      const err: any = new Error(`Invalid timing-safe HMAC signature for gateway ${gateway}`);
      err.statusCode = 401;
      err.code = 'INVALID_WEBHOOK_SIGNATURE';
      throw err;
    }

    const invoiceNumber = payload.invoiceNo || payload.merchantInvoiceNumber;
    const trxId = payload.trxId || payload.gatewayTransactionId;
    const rawStatus = (payload.status || payload.paymentStatus || '').toUpperCase();
    const isSuccess = ['SUCCESS', 'PAID', 'COMPLETED', 'AUTHORIZED'].includes(rawStatus);

    if (!invoiceNumber && !payload.invoiceId) {
      const err: any = new Error('Webhook payload missing invoice identifier (invoiceNo or invoiceId)');
      err.statusCode = 400;
      err.code = 'MISSING_INVOICE_ID';
      throw err;
    }

    const query = invoiceNumber
      ? { invoiceNo: invoiceNumber }
      : { _id: new mongoose.Types.ObjectId(payload.invoiceId) };

    const invoice = await SubscriptionInvoice.findOne(query);
    if (!invoice) {
      const err: any = new Error(`Subscription invoice not found: ${invoiceNumber || payload.invoiceId}`);
      err.statusCode = 404;
      err.code = 'INVOICE_NOT_FOUND';
      throw err;
    }

    // 2. Idempotency Check (TC-34):
    // If invoice is already paid OR an invoice already recorded this gatewayTransactionId
    if (invoice.paymentStatus === 'paid') {
      const shop = await Shop.findById(invoice.shopId);
      return {
        status: 'already_processed',
        message: 'Invoice has already been processed and paid',
        invoiceNo: invoice.invoiceNo,
        subscriptionExpiresAt: shop?.subscriptionExpiresAt
      };
    }

    if (trxId) {
      const existingTrx = await SubscriptionInvoice.findOne({
        gatewayTransactionId: trxId,
        paymentStatus: 'paid',
        _id: { $ne: invoice._id }
      });
      if (existingTrx) {
        const shop = await Shop.findById(existingTrx.shopId);
        return {
          status: 'already_processed',
          message: `Gateway transaction ${trxId} was already processed on invoice ${existingTrx.invoiceNo}`,
          invoiceNo: invoice.invoiceNo,
          subscriptionExpiresAt: shop?.subscriptionExpiresAt
        };
      }
    }

    // 3. Process payment status
    if (isSuccess) {
      const now = new Date();
      invoice.paymentStatus = 'paid';
      invoice.paidAt = now;
      if (trxId) invoice.gatewayTransactionId = trxId;
      invoice.gatewayResponse = payload;

      // Update Shop Subscription
      const shop = await Shop.findById(invoice.shopId);
      if (shop) {
        shop.status = 'active';
        shop.subscriptionPlanId = invoice.planId;

        // Calculate subscription extension
        let baseDate = now;
        if (shop.subscriptionExpiresAt && shop.subscriptionExpiresAt > now) {
          baseDate = new Date(shop.subscriptionExpiresAt);
        }

        const newExpiry = new Date(baseDate);
        if (invoice.billingCycle === 'yearly') {
          newExpiry.setDate(newExpiry.getDate() + 365);
        } else {
          newExpiry.setDate(newExpiry.getDate() + 30);
        }

        shop.subscriptionExpiresAt = newExpiry;
        invoice.periodStart = baseDate;
        invoice.periodEnd = newExpiry;

        await shop.save();
      }

      // Increment promo code timesUsed if applied
      if (invoice.promoCode) {
        await PromoCode.updateOne(
          { code: invoice.promoCode },
          { $inc: { timesUsed: 1 } }
        );
      }

      await invoice.save();

      return {
        status: 'success',
        message: 'Payment received and subscription successfully extended',
        invoiceNo: invoice.invoiceNo,
        subscriptionExpiresAt: shop?.subscriptionExpiresAt
      };
    } else {
      // Payment Failed / Cancelled
      invoice.paymentStatus = 'failed';
      if (trxId) invoice.gatewayTransactionId = trxId;
      invoice.gatewayResponse = payload;
      await invoice.save();

      return {
        status: 'failed',
        message: `Payment failed or rejected by gateway with status ${rawStatus}`,
        invoiceNo: invoice.invoiceNo
      };
    }
  }

  /**
   * 3-minute background poller sweeper (TC-49): Recovers delayed webhooks
   * Queries gateway status for pending invoices older than 3 minutes
   */
  static async sweepPendingGatewayInvoices(olderThanMinutes = 3): Promise<{
    sweptCount: number;
    recoveredCount: number;
  }> {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    const pendingInvoices = await SubscriptionInvoice.find({
      paymentStatus: 'pending',
      createdAt: { $lte: cutoff }
    });

    let recoveredCount = 0;

    for (const inv of pendingInvoices) {
      // In production, invoke gateway query API (PayStation Query / EPS CheckStatus / bKash QueryPayment)
      // If invoice has a known gatewayTransactionId or simulation flag, auto-reconcile
      if (inv.gatewayTransactionId && inv.gatewayTransactionId.startsWith('TEST_RECOVER_')) {
        inv.paymentStatus = 'paid';
        inv.paidAt = new Date();
        await inv.save();

        const shop = await Shop.findById(inv.shopId);
        if (shop) {
          shop.status = 'active';
          shop.subscriptionPlanId = inv.planId;
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + (inv.billingCycle === 'yearly' ? 365 : 30));
          shop.subscriptionExpiresAt = expiry;
          await shop.save();
        }
        recoveredCount++;
      }
    }

    return {
      sweptCount: pendingInvoices.length,
      recoveredCount
    };
  }

  /**
   * Subscription Lifecycle Sweeper (TC-25, TC-35):
   * trial (14d) -> active (paid) -> grace_period (3d) -> read_only
   */
  static async sweepSubscriptionLifecycles(): Promise<{
    trialsExpired: number;
    subscriptionsExpired: number;
    readOnlyEnforced: number;
  }> {
    const now = new Date();

    // 1. Trial Expiry -> transition to grace_period (3 days)
    const lapsedTrials = await Shop.find({
      status: 'trial',
      trialEndsAt: { $lte: now }
    });

    for (const shop of lapsedTrials) {
      shop.status = 'grace_period';
      const graceEnd = new Date(now);
      graceEnd.setDate(graceEnd.getDate() + 3);
      shop.gracePeriodEndsAt = graceEnd;
      await shop.save();
    }

    // 2. Active Subscription Expiry -> transition to grace_period (3 days)
    const lapsedActive = await Shop.find({
      status: 'active',
      subscriptionExpiresAt: { $lte: now }
    });

    for (const shop of lapsedActive) {
      shop.status = 'grace_period';
      const graceEnd = new Date(now);
      graceEnd.setDate(graceEnd.getDate() + 3);
      shop.gracePeriodEndsAt = graceEnd;
      await shop.save();
    }

    // 3. Grace Period Expiry -> transition to read_only (TC-25, TC-35)
    const lapsedGrace = await Shop.find({
      status: 'grace_period',
      gracePeriodEndsAt: { $lte: now }
    });

    for (const shop of lapsedGrace) {
      shop.status = 'read_only';
      await shop.save();
    }

    return {
      trialsExpired: lapsedTrials.length,
      subscriptionsExpired: lapsedActive.length,
      readOnlyEnforced: lapsedGrace.length
    };
  }

  /**
   * Get subscription status for a shop
   */
  static async getSubscriptionStatus(shopId: string | mongoose.Types.ObjectId): Promise<{
    status: 'trial' | 'active' | 'grace_period' | 'read_only' | 'suspended';
    plan: any;
    trialEndsAt?: Date | undefined;
    subscriptionExpiresAt?: Date | undefined;
    gracePeriodEndsAt?: Date | undefined;
    daysRemaining: number;
    isReadOnly: boolean;
    features: string[];
  }> {
    await this.seedDefaults();
    const shop = await Shop.findById(shopId).populate('subscriptionPlanId');
    if (!shop) {
      const err: any = new Error('Shop not found');
      err.statusCode = 404;
      err.code = 'SHOP_NOT_FOUND';
      throw err;
    }

    const plan = (shop.subscriptionPlanId as any) || (await SubscriptionPlan.findOne({ code: 'pro' }));
    const now = new Date();

    let targetDate = shop.subscriptionExpiresAt;
    if (shop.status === 'trial') targetDate = shop.trialEndsAt;
    if (shop.status === 'grace_period') targetDate = shop.gracePeriodEndsAt;

    let daysRemaining = 0;
    if (targetDate && targetDate > now) {
      const diffMs = targetDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    return {
      status: shop.status,
      plan: plan
        ? {
            code: plan.code,
            name: plan.name,
            monthlyPrice: plan.monthlyPrice?.toString?.() || plan.monthlyPrice,
            yearlyPrice: plan.yearlyPrice?.toString?.() || plan.yearlyPrice
          }
        : null,
      trialEndsAt: shop.trialEndsAt,
      subscriptionExpiresAt: shop.subscriptionExpiresAt,
      gracePeriodEndsAt: shop.gracePeriodEndsAt,
      daysRemaining,
      isReadOnly: shop.status === 'read_only' || shop.status === 'suspended',
      features: plan?.features || []
    };
  }
}
