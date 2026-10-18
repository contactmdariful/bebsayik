import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { OnboardingService } from '../services/onboarding/onboarding.service.js';
import { AccountingService } from '../services/accounting/accounting.service.js';
import { Shop, User, Account, AccountTransaction } from '../models/index.js';
import { verifyPassword } from '../utils/security.js';

describe('Phase 11: Dokan Onboarding & Opening Balance Engine', () => {
  const userId = new mongoose.Types.ObjectId();
  const shopId = new mongoose.Types.ObjectId();

  const mockUser: any = {
    _id: userId,
    phone: '01711223344',
    fullName: 'Sumon Retailer',
    role: 'SALESPERSON',
    tokenVersion: 0,
    accessibleShopIds: [] as mongoose.Types.ObjectId[],
    passwordHash: undefined,
    managerPinHash: undefined,
    shopId: undefined,
    save: vi.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    const fakeSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
      withTransaction: async (cb: any) => cb()
    };
    vi.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);
  });

  describe('1. 3-Step Dokan Setup Wizard Tenant Creation (TC-30)', () => {
    it('atomically creates shop tenant, assigns user as STORE_OWNER, and provisions default COA', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockUser as any);
      vi.spyOn(Shop, 'findOne').mockResolvedValue(null); // Slug is free
      const saveShopSpy = vi.spyOn(Shop.prototype, 'save').mockImplementation(async function (this: any) {
        this._id = shopId;
        return this;
      });
      const seedCoaSpy = vi.spyOn(AccountingService, 'seedDefaultChartOfAccounts').mockResolvedValue(15);

      const result = await OnboardingService.createShopTenant({
        userId,
        input: {
          shopName: 'City Gadget',
          address: 'Shop #42, Level 2, Eastern Plaza, Hatirpool, Dhaka',
          phone: '01711223344',
          binNumber: '001234567-0101',
          primaryOutletName: 'Showroom Counter 01',
          godownName: 'Central Godown',
          businessType: 'single_store',
          permanentPassword: 'MasterPassword2026',
          managerPin: '1234'
        }
      });

      expect(result.shop).toBeDefined();
      expect(result.shop.name).toBe('City Gadget');
      expect(result.shop.slug).toBe('city-gadget');
      expect(result.shop.status).toBe('trial');
      expect(result.user.role).toBe('STORE_OWNER');
      expect(result.user.shopId).toBe(shopId.toString());
      expect(result.accessToken).toBeDefined();

      expect(saveShopSpy).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(seedCoaSpy).toHaveBeenCalledWith(shopId, expect.anything());

      // Verify password and PIN hashing
      expect(mockUser.passwordHash).toBeDefined();
      expect(mockUser.managerPinHash).toBeDefined();
      const isPasswordValid = await verifyPassword(mockUser.passwordHash!, 'MasterPassword2026');
      expect(isPasswordValid).toBe(true);
      const isPinValid = await verifyPassword(mockUser.managerPinHash!, '1234');
      expect(isPinValid).toBe(true);
    });

    it('generates unique slug when shop name collision occurs', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockUser as any);
      // First call finds collision, second call finds null (free)
      vi.spyOn(Shop, 'findOne')
        .mockResolvedValueOnce({ _id: new mongoose.Types.ObjectId(), slug: 'city-gadget' } as any)
        .mockResolvedValueOnce(null);
      vi.spyOn(Shop.prototype, 'save').mockImplementation(async function (this: any) {
        this._id = shopId;
        return this;
      });
      vi.spyOn(AccountingService, 'seedDefaultChartOfAccounts').mockResolvedValue(15);

      const result = await OnboardingService.createShopTenant({
        userId,
        input: {
          shopName: 'City Gadget',
          address: 'Motijheel Branch, Dhaka',
          permanentPassword: 'MasterPassword2026',
          managerPin: '4321'
        }
      });

      expect(result.shop.slug).toBe('city-gadget-1');
    });

    it('rejects onboarding setup with invalid manager PIN or weak password', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockUser as any);

      await expect(
        OnboardingService.createShopTenant({
          userId,
          input: {
            shopName: 'City Gadget',
            address: 'Dhaka',
            permanentPassword: '123', // Too short (< 6)
            managerPin: '1234'
          }
        })
      ).rejects.toThrow();

      await expect(
        OnboardingService.createShopTenant({
          userId,
          input: {
            shopName: 'City Gadget',
            address: 'Dhaka',
            permanentPassword: 'ValidPassword123',
            managerPin: '12' // Not 4 digits
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('2. Opening Balance Wizard & Equity Invariant (TC-24)', () => {
    it('balances ৳2,00,000 stock, ৳50,000 cash, ৳40,000 due, ৳30,000 payable into Opening Equity of ৳2,60,000 with 0.00% P&L impact', async () => {
      const postDoubleEntrySpy = vi.spyOn(AccountingService, 'postDoubleEntryJournal').mockResolvedValue({
        voucherNo: `OB-${shopId.toString().slice(-6).toUpperCase()}-001`,
        txnCode: 'TX-19',
        totalDebits: '290000.00',
        totalCredits: '290000.00',
        transactionCount: 6
      });

      const result = await OnboardingService.postOpeningBalances({
        shopId,
        postedByUserId: userId,
        input: {
          openingStock: '200000.00',
          cashInDrawer: '50000.00',
          bankBalance: '0.00',
          customerReceivables: '40000.00',
          supplierPayables: '30000.00'
        }
      });

      // Verification of TC-24 invariants:
      // Total Assets = 200,000 + 50,000 + 0 + 40,000 = 290,000.00
      // Supplier Payables = 30,000.00
      // Opening Equity = Assets - Payables = 260,000.00
      // Net P&L impact = 0.00
      expect(result.totalAssets).toBe('290000.00');
      expect(result.supplierPayables).toBe('30000.00');
      expect(result.openingEquity).toBe('260000.00');
      expect(result.netProfitImpact).toBe('0.00');
      expect(result.totalDebits).toBe('290000.00');
      expect(result.totalCredits).toBe('290000.00');

      expect(postDoubleEntrySpy).toHaveBeenCalled();
      const calledEntries = postDoubleEntrySpy.mock.calls[0]![0].entries;

      // Verify exact 6 double-entry journal items matching TX-19 matrix
      const cashEntry = calledEntries.find((e) => e.accountCode === '1.1.01');
      const bankEntry = calledEntries.find((e) => e.accountCode === '1.2.01');
      const stockEntry = calledEntries.find((e) => e.accountCode === '1.5.01');
      const dueEntry = calledEntries.find((e) => e.accountCode === '1.4.01');
      const payableEntry = calledEntries.find((e) => e.accountCode === '2.1.01');
      const equityEntry = calledEntries.find((e) => e.accountCode === '3.1.01');

      expect(cashEntry?.debit).toBe('50000.00');
      expect(bankEntry?.debit).toBe('0.00');
      expect(stockEntry?.debit).toBe('200000.00');
      expect(dueEntry?.debit).toBe('40000.00');
      expect(payableEntry?.credit).toBe('30000.00');
      expect(equityEntry?.credit).toBe('260000.00');
    });

    it('balances clean setup with only cash float and zero payables', async () => {
      const postDoubleEntrySpy = vi.spyOn(AccountingService, 'postDoubleEntryJournal').mockResolvedValue({
        voucherNo: `OB-${shopId.toString().slice(-6).toUpperCase()}-001`,
        txnCode: 'TX-19',
        totalDebits: '15000.00',
        totalCredits: '15000.00',
        transactionCount: 6
      });

      const result = await OnboardingService.postOpeningBalances({
        shopId,
        postedByUserId: userId,
        input: {
          openingStock: '0.00',
          cashInDrawer: '15000.00',
          bankBalance: '0.00',
          customerReceivables: '0.00',
          supplierPayables: '0.00'
        }
      });

      expect(result.totalAssets).toBe('15000.00');
      expect(result.supplierPayables).toBe('0.00');
      expect(result.openingEquity).toBe('15000.00');
      expect(result.netProfitImpact).toBe('0.00');
      expect(postDoubleEntrySpy).toHaveBeenCalled();
    });
  });
});
