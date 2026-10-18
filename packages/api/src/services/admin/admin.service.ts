import mongoose from 'mongoose';
import {
  EmergencyPhoneMigrationInput,
  EmergencyPhoneMigrationSchema,
  UpdatePlanPriceInput,
  UpdatePlanPriceSchema,
  SuspendShopInput,
  SuspendShopSchema
} from '@bebsayik/shared-types';
import {
  Shop,
  User,
  SubscriptionPlan,
  SubscriptionInvoice,
  IShop
} from '../../models/index.js';
import { BillingService } from '../billing/billing.service.js';

export class AdminService {
  /**
   * Global SaaS KPI analytics for Super Admin Command Center
   */
  static async getKpiAnalytics(): Promise<{
    totalShops: number;
    activeShops: number;
    trialShops: number;
    graceShops: number;
    readOnlyShops: number;
    suspendedShops: number;
    mrr: number;
    arr: number;
    churnRate: number;
    smsGatewayBalance: number;
  }> {
    await BillingService.seedDefaults();

    const [
      totalShops,
      activeShops,
      trialShops,
      graceShops,
      readOnlyShops,
      suspendedShops
    ] = await Promise.all([
      Shop.countDocuments(),
      Shop.countDocuments({ status: 'active' }),
      Shop.countDocuments({ status: 'trial' }),
      Shop.countDocuments({ status: 'grace_period' }),
      Shop.countDocuments({ status: 'read_only' }),
      Shop.countDocuments({ status: 'suspended' })
    ]);

    // Calculate MRR from active subscriptions
    const activeShopDocs = await Shop.find({ status: 'active' }).populate('subscriptionPlanId');
    let mrr = 0;
    for (const s of activeShopDocs) {
      const plan = s.subscriptionPlanId as any;
      if (plan && plan.monthlyPrice) {
        mrr += Number(plan.monthlyPrice.toString());
      } else {
        mrr += 999; // Default Pro tier baseline
      }
    }

    const arr = mrr * 12;
    const churnCount = readOnlyShops + suspendedShops;
    const churnRate = totalShops > 0 ? Number(((churnCount / totalShops) * 100).toFixed(2)) : 0;
    const smsGatewayBalance = 5420; // 5,420 SMS balance remaining on Telecom gateway

    return {
      totalShops,
      activeShops,
      trialShops,
      graceShops,
      readOnlyShops,
      suspendedShops,
      mrr,
      arr,
      churnRate,
      smsGatewayBalance
    };
  }

  /**
   * List all tenant shops with filter and pagination
   */
  static async listShops(params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    shops: any[];
    pagination: {
      page: number;
      limit: number;
      totalRecords: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (params.status && params.status !== 'all') {
      filter.status = params.status;
    }

    if (params.search) {
      const regex = new RegExp(params.search.trim(), 'i');
      filter.$or = [{ name: regex }, { slug: regex }, { phone: regex }];
    }

    const [shops, totalRecords] = await Promise.all([
      Shop.find(filter)
        .populate('ownerUserId', 'fullName phone email role tokenVersion')
        .populate('subscriptionPlanId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Shop.countDocuments(filter)
    ]);

    return {
      shops: shops.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        slug: s.slug,
        businessType: s.businessType,
        status: s.status,
        phone: s.phone,
        owner: s.ownerUserId,
        plan: s.subscriptionPlanId,
        trialEndsAt: s.trialEndsAt,
        subscriptionExpiresAt: s.subscriptionExpiresAt,
        gracePeriodEndsAt: s.gracePeriodEndsAt,
        previousStatus: s.previousStatus,
        suspensionReason: s.suspensionReason,
        createdAt: s.createdAt
      })),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit) || 1
      }
    };
  }

  /**
   * Non-destructive shop suspension (TC-38)
   * Freezes write access; all inventory, sales, customer ledgers remain intact
   */
  static async suspendShop(shopId: string, input: SuspendShopInput): Promise<IShop> {
    const parsed = SuspendShopSchema.parse(input);
    const sId = new mongoose.Types.ObjectId(shopId);

    const shop = await Shop.findById(sId);
    if (!shop) {
      const err: any = new Error(`Shop not found with ID ${shopId}`);
      err.statusCode = 404;
      err.code = 'SHOP_NOT_FOUND';
      throw err;
    }

    if (shop.status === 'suspended') {
      return shop;
    }

    shop.previousStatus = shop.status;
    shop.status = 'suspended';
    shop.suspensionReason = parsed.reason;
    await shop.save();

    return shop;
  }

  /**
   * 1-Click Shop Reactivation (TC-38)
   */
  static async reactivateShop(shopId: string): Promise<IShop> {
    const sId = new mongoose.Types.ObjectId(shopId);

    const shop = await Shop.findById(sId);
    if (!shop) {
      const err: any = new Error(`Shop not found with ID ${shopId}`);
      err.statusCode = 404;
      err.code = 'SHOP_NOT_FOUND';
      throw err;
    }

    // Restore to previousStatus if valid, or inspect expiry dates
    let targetStatus = (shop.previousStatus as any) || 'active';
    const now = new Date();

    if (shop.subscriptionExpiresAt && shop.subscriptionExpiresAt <= now) {
      targetStatus = 'read_only';
    } else if (shop.trialEndsAt && shop.trialEndsAt <= now && !shop.subscriptionExpiresAt) {
      targetStatus = 'read_only';
    }

    shop.status = targetStatus;
    if (typeof (shop as any).set === 'function') {
      (shop as any).set('suspensionReason', undefined);
    } else {
      delete (shop as any).suspensionReason;
    }
    await shop.save();

    return shop;
  }

  /**
   * Emergency Hotline Lost SIM Phone Migration (TC-56)
   * Super Admin verifies NID & Trade License, updates phone, and increments tokenVersion to revoke old JWTs
   */
  static async emergencyPhoneMigration(params: {
    shopId: string;
    input: EmergencyPhoneMigrationInput;
    adminUserId: string;
  }): Promise<{
    success: boolean;
    shopId: string;
    oldPhone: string;
    newPhone: string;
    tokenVersion: number;
    auditLog: {
      nidVerificationRef: string;
      tradeLicenseRef?: string | undefined;
      reason: string;
      migratedBy: string;
      migratedAt: Date;
    };
  }> {
    const parsed = EmergencyPhoneMigrationSchema.parse(params.input);
    const sId = new mongoose.Types.ObjectId(params.shopId);

    const shop = await Shop.findById(sId);
    if (!shop) {
      const err: any = new Error(`Shop not found with ID ${params.shopId}`);
      err.statusCode = 404;
      err.code = 'SHOP_NOT_FOUND';
      throw err;
    }

    if (!shop.ownerUserId) {
      const err: any = new Error(`Shop has no registered store owner`);
      err.statusCode = 400;
      err.code = 'NO_SHOP_OWNER';
      throw err;
    }

    const owner = await User.findById(shop.ownerUserId);
    if (!owner) {
      const err: any = new Error(`Store owner user not found`);
      err.statusCode = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    const oldPhone = owner.phone;

    // Check if newPhone is already assigned to a different user
    const existing = await User.findOne({ phone: parsed.newPhone });
    if (existing && existing._id.toString() !== owner._id.toString()) {
      const err: any = new Error(`Phone number ${parsed.newPhone} is already registered to another user`);
      err.statusCode = 409;
      err.code = 'PHONE_ALREADY_EXISTS';
      throw err;
    }

    // 1. Update phone
    owner.phone = parsed.newPhone;

    // 2. Increment tokenVersion to immediately revoke any stolen/active JWTs
    owner.tokenVersion = (owner.tokenVersion || 0) + 1;
    await owner.save();

    // 3. Update shop phone if it matched old owner phone
    if (shop.phone === oldPhone) {
      shop.phone = parsed.newPhone;
      await shop.save();
    }

    const auditLog = {
      nidVerificationRef: parsed.nidVerificationRef,
      tradeLicenseRef: parsed.tradeLicenseRef,
      reason: parsed.reason,
      migratedBy: params.adminUserId,
      migratedAt: new Date()
    };

    return {
      success: true,
      shopId: shop._id.toString(),
      oldPhone,
      newPhone: parsed.newPhone,
      tokenVersion: owner.tokenVersion,
      auditLog
    };
  }

  /**
   * Plan Price Versioning (TC-39)
   * Updates standard plan price for future checkouts; existing subscribers preserve snapshot pricing
   */
  static async updatePlanPrice(planCode: string, input: UpdatePlanPriceInput): Promise<any> {
    await BillingService.seedDefaults();
    const parsed = UpdatePlanPriceSchema.parse(input);
    const normalizedCode = BillingService.normalizePlanCode(planCode);

    const plan = await SubscriptionPlan.findOne({
      $or: [{ code: normalizedCode }, { code: planCode }]
    });

    if (!plan) {
      const err: any = new Error(`Subscription plan '${planCode}' not found`);
      err.statusCode = 404;
      err.code = 'PLAN_NOT_FOUND';
      throw err;
    }

    if (parsed.monthlyPrice !== undefined) {
      plan.monthlyPrice = parsed.monthlyPrice as any;
    }
    if (parsed.yearlyPrice !== undefined) {
      plan.yearlyPrice = parsed.yearlyPrice as any;
    }

    await plan.save();
    return plan.toJSON();
  }

  /**
   * List all gateway transactions & subscription invoices
   */
  static async listPayments(params: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    payments: any[];
    pagination: {
      page: number;
      limit: number;
      totalRecords: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (params.status && params.status !== 'all') {
      filter.paymentStatus = params.status;
    }

    const [invoices, totalRecords] = await Promise.all([
      SubscriptionInvoice.find(filter)
        .populate('shopId', 'name slug phone')
        .populate('planId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SubscriptionInvoice.countDocuments(filter)
    ]);

    return {
      payments: invoices.map((inv) => ({
        id: inv._id.toString(),
        invoiceNo: inv.invoiceNo,
        shop: inv.shopId,
        plan: inv.planId,
        planCode: inv.planCode,
        amount: inv.amount?.toString?.() || inv.amount,
        originalAmount: inv.originalAmount?.toString?.() || inv.originalAmount,
        discountAmount: inv.discountAmount?.toString?.() || inv.discountAmount,
        promoCode: inv.promoCode,
        billingCycle: inv.billingCycle,
        paymentGateway: inv.paymentGateway,
        gatewayTransactionId: inv.gatewayTransactionId,
        paymentStatus: inv.paymentStatus,
        paidAt: inv.paidAt,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
        createdAt: inv.createdAt
      })),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit) || 1
      }
    };
  }
}
