import mongoose from 'mongoose';
import {
  OnboardingSetupInput,
  OnboardingSetupSchema,
  OpeningBalancesInput,
  OpeningBalancesSchema,
  MarketingLeadInput,
  MarketingLeadSchema
} from '@bebsayik/shared-types';
import { Shop } from '../../models/Shop.js';
import { User } from '../../models/User.js';
import { MarketingLead, IMarketingLead } from '../../models/MarketingLead.js';
import { AccountingService } from '../accounting/accounting.service.js';
import { buildTx19OpeningBalances } from '../accounting/journalMatrices.js';
import { toDecimal, formatMoney } from '../../utils/money.js';
import { hashPassword, createAccessToken } from '../../utils/security.js';
import { withTransaction } from '../../database/transaction.js';
import { slugify } from '../catalog/index.js';

export class OnboardingService {
  /**
   * TC-30: Atomically provisions a shop tenant, sets user as STORE_OWNER, and provisions default COA.
   */
  static async createShopTenant(params: {
    userId: string | mongoose.Types.ObjectId;
    input: OnboardingSetupInput;
  }): Promise<{
    shop: {
      id: string;
      name: string;
      slug: string;
      businessType: string;
      status: string;
      address: any;
    };
    user: {
      id: string;
      fullName: string;
      phone: string;
      role: string;
      shopId: string;
    };
    accessToken: string;
  }> {
    const parsed = OnboardingSetupSchema.parse(params.input);
    const userId = new mongoose.Types.ObjectId(params.userId);

    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found with ID ${userId}`);
    }

    const baseSlug = slugify(parsed.slug || parsed.shopName) || 'dokan';
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await Shop.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${counter++}`;
    }

    const passwordHash = await hashPassword(parsed.permanentPassword);
    const managerPinHash = await hashPassword(parsed.managerPin);

    return await withTransaction(async (session) => {
      // 1. Create shop
      const shop = new Shop({
        name: parsed.shopName,
        slug: uniqueSlug,
        subdomain: uniqueSlug,
        businessType: parsed.businessType || 'single_store',
        binNumber: parsed.binNumber || undefined,
        phone: parsed.phone || user.phone,
        address: {
          location: parsed.address,
          primaryOutletName: parsed.primaryOutletName,
          godownName: parsed.godownName
        },
        receiptHeader: `${parsed.shopName}\n${parsed.address}`,
        receiptFooter: 'Dhonnobad! Abar ashaben.',
        returnPolicyDays: 7,
        currency: 'BDT',
        status: 'trial', // 14-day Gold trial
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        ownerUserId: user._id
      });

      await shop.save({ session });

      // 2. Assign user as STORE_OWNER with updated shopId and credentials
      user.role = 'STORE_OWNER';
      user.shopId = shop._id;
      if (!user.accessibleShopIds) {
        user.accessibleShopIds = [];
      }
      if (!user.accessibleShopIds.some((id) => id.toString() === shop._id.toString())) {
        user.accessibleShopIds.push(shop._id);
      }
      user.passwordHash = passwordHash;
      user.managerPinHash = managerPinHash;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save({ session });

      // 3. Provision default Chart of Accounts (COA)
      await AccountingService.seedDefaultChartOfAccounts(shop._id, session);

      // 4. Issue fresh scoped JWT access token
      const accessToken = createAccessToken({
        userId: user._id.toString(),
        phone: user.phone,
        role: 'STORE_OWNER',
        shopId: shop._id.toString(),
        tokenVersion: user.tokenVersion
      });

      return {
        shop: {
          id: shop._id.toString(),
          name: shop.name,
          slug: shop.slug,
          businessType: shop.businessType,
          status: shop.status,
          address: shop.address
        },
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          shopId: shop._id.toString()
        },
        accessToken
      };
    });
  }

  /**
   * TC-24: Opening Balance Ingestion & Owner Equity balancing with 0.00% P&L impact.
   */
  static async postOpeningBalances(params: {
    shopId: string | mongoose.Types.ObjectId;
    postedByUserId: string | mongoose.Types.ObjectId;
    input: OpeningBalancesInput;
  }): Promise<{
    voucherNo: string;
    txnCode: string;
    totalDebits: string;
    totalCredits: string;
    totalAssets: string;
    supplierPayables: string;
    openingEquity: string;
    netProfitImpact: string;
  }> {
    const parsed = OpeningBalancesSchema.parse(params.input);
    const shopId = new mongoose.Types.ObjectId(params.shopId);
    const postedByUserId = new mongoose.Types.ObjectId(params.postedByUserId);

    const stock = toDecimal(parsed.openingStock || 0);
    const cash = toDecimal(parsed.cashInDrawer || 0);
    const bank = toDecimal(parsed.bankBalance || 0);
    const dues = toDecimal(parsed.customerReceivables || 0);
    const supplierPayables = toDecimal(parsed.supplierPayables || 0);

    // Assets = Cash + Bank + Stock + Receivables
    const totalAssets = stock.plus(cash).plus(bank).plus(dues);
    // Opening Owner Equity = Total Assets - Supplier Payables
    const openingEquity = totalAssets.minus(supplierPayables);

    const voucherNo = `OB-${shopId.toString().slice(-6).toUpperCase()}-001`;

    const entries = buildTx19OpeningBalances({
      cash: formatMoney(cash),
      bank: formatMoney(bank),
      stock: formatMoney(stock),
      dues: formatMoney(dues),
      supplierPayables: formatMoney(supplierPayables),
      openingEquity: formatMoney(openingEquity)
    });

    const journalResult = await withTransaction(async (session) => {
      return await AccountingService.postDoubleEntryJournal({
        shopId,
        voucherNo,
        txnCode: 'TX-19',
        sourceDocType: 'OPENING_BALANCE',
        postedByUserId,
        entries,
        session
      });
    });

    return {
      voucherNo: journalResult.voucherNo,
      txnCode: journalResult.txnCode,
      totalDebits: journalResult.totalDebits,
      totalCredits: journalResult.totalCredits,
      totalAssets: formatMoney(totalAssets),
      supplierPayables: formatMoney(supplierPayables),
      openingEquity: formatMoney(openingEquity),
      netProfitImpact: '0.00'
    };
  }

  /**
   * TC-43: Pre-launch Google Play / App Store badge marketing lead capture.
   */
  static async captureMarketingLead(input: MarketingLeadInput): Promise<IMarketingLead> {
    const parsed = MarketingLeadSchema.parse(input);

    const existingLead = await MarketingLead.findOne({ phone: parsed.phone });
    if (existingLead) {
      if (parsed.shopName) existingLead.shopName = parsed.shopName;
      if (parsed.contactName) existingLead.contactName = parsed.contactName;
      if (parsed.leadSource) existingLead.leadSource = parsed.leadSource;
      if (parsed.notes) existingLead.notes = parsed.notes;
      await existingLead.save();
      return existingLead;
    }

    return await MarketingLead.create({
      phone: parsed.phone,
      shopName: parsed.shopName,
      contactName: parsed.contactName,
      leadSource: parsed.leadSource || 'google_play_badge',
      status: 'new',
      notes: parsed.notes
    });
  }
}
