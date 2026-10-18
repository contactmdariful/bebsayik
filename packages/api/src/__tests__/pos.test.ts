import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import argon2 from 'argon2';
import crypto from 'crypto';
import { PosService } from '../services/pos/pos.service.js';
import { HardwareService } from '../services/hardware/hardware.service.js';
import { AccountingService } from '../services/accounting/accounting.service.js';
import { overrideTokenService } from '../services/security/overrideToken.service.js';
import { lockService } from '../services/lock/lock.service.js';
import {
  Sale,
  SaleItem,
  HeldCart,
  Product,
  ProductVariant,
  ImeiSerial,
  InventoryMovement,
  Shift,
  Shop,
  Customer,
  User,
  Account,
  AccountTransaction,
  ShopHardwareConfig
} from '../models/index.js';

describe('Phase 7: POS Counter Sales, Multi-Tender Checkout, Hardware Drivers & Settings', () => {
  const shopId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const managerId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const shiftId = new mongoose.Types.ObjectId();

  const mockShop = {
    _id: shopId,
    name: 'Kanchan Telecom',
    binNumber: '1234567890',
    phone: '01711223344',
    status: 'active'
  };

  const mockCashier = {
    _id: userId,
    fullName: 'Tanvir Cashier',
    phone: '01700112233',
    role: 'CASHIER'
  };

  const mockManager = {
    _id: managerId,
    fullName: 'Sumon Manager',
    phone: '01799887766',
    role: 'STORE_MANAGER',
    managerPinHash: '$argon2id$v=19$m=65536,t=3,p=4$fakeHashForPin1234$fake'
  };

  const mockCustomer = {
    _id: customerId,
    shopId,
    fullName: 'Jashim Uddin',
    phone: '01811223344',
    currentDueBalance: 0,
    creditLimit: 50000
  };

  const mockShift = {
    _id: shiftId,
    shopId,
    cashierUserId: userId,
    status: 'open',
    openingCash: 5000
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    overrideTokenService.clearMemory();
    lockService.clearMemoryLocks();

    const fakeSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
      withTransaction: vi.fn().mockImplementation(async (cb: any) => cb())
    } as any;
    vi.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession);

    // Default Spies
    vi.spyOn(Sale, 'findOne').mockResolvedValue(null);
    vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop as any);
    (vi.spyOn(User, 'findById') as any).mockImplementation(async (id: any) => {
      if (id?.toString() === userId.toString()) return mockCashier as any;
      if (id?.toString() === managerId.toString()) return mockManager as any;
      return mockCashier as any;
    });
    vi.spyOn(Customer, 'findById').mockResolvedValue(mockCustomer as any);
    vi.spyOn(Customer, 'findOne').mockResolvedValue(mockCustomer as any);
    vi.spyOn(Customer, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any);
    vi.spyOn(Shift, 'findOne').mockResolvedValue(mockShift as any);

    // Accounting Journal Spy
    vi.spyOn(AccountingService, 'postDoubleEntryJournal').mockResolvedValue({
      voucherNo: 'VCH-TEST',
      txnCode: 'TX-02',
      totalDebits: '1000.00',
      totalCredits: '1000.00',
      transactionCount: 2
    });
  });

  // =========================================================================
  // 1. TC-01: FULL CASH SALE & SPECIFIC IDENTIFICATION COGS
  // =========================================================================
  describe('TC-01: Full Cash Sale & Specific Identification COGS (TX-01)', () => {
    it('executes atomic full cash sale with exact IMEI purchase cost COGS', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();
      const imeiId = new mongoose.Types.ObjectId();
      const imeiNum = '860123456789012';

      const mockProduct = {
        _id: productId,
        shopId,
        name: 'Redmi Note 13 Pro 5G',
        productType: 'handset',
        hasImei: true
      };

      const mockVariant = {
        _id: variantId,
        productId,
        shopId,
        variantName: '8GB / 256GB - Forest Green',
        msp: 26000,
        mrp: 28500,
        purchaseCost: 24500,
        currentStock: 5,
        isDeleted: false
      };

      const mockImei = {
        _id: imeiId,
        shopId,
        variantId,
        imei1: imeiNum,
        purchaseCost: 24750, // Specific Landed Cost (different from generic variant cost)
        specificCost: 24750,
        status: 'AVAILABLE',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue(mockVariant as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue(mockProduct as any);
      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue(mockImei as any);
      vi.spyOn(Sale.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(SaleItem.prototype, 'save').mockResolvedValue(true as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);

      const idempotencyKey = crypto.randomUUID();
      const checkoutRes = await PosService.processCheckout({
        shopId,
        userId,
        idempotencyKey,
        payload: {
          items: [
            {
              variantId: variantId.toString(),
              imei1: imeiNum,
              quantity: 1,
              unitPrice: 27500,
              discountAmount: 500
            }
          ],
          payments: [
            {
              paymentMethod: 'cash',
              amountReceived: 27000,
              amountApplied: 27000
            }
          ]
        }
      });

      expect(checkoutRes.grandTotal).toBe('27000.00');
      expect(checkoutRes.paidAmount).toBe('27000.00');
      expect(checkoutRes.dueAmount).toBe('0.00');
      expect(checkoutRes.changeGiven).toBe('0.00');
      expect(mockImei.status).toBe('SOLD');

      // Verify accounting call used exact specific IMEI cost (24750.00)
      const postJournalCall = vi.mocked(AccountingService.postDoubleEntryJournal).mock.calls[0][0];
      const cogsDebit = postJournalCall.entries.find((e) => e.accountCode === '5.1.01');
      const invCredit = postJournalCall.entries.find((e) => e.accountCode === '1.5.01');

      expect(Number(cogsDebit?.debit)).toBe(24750);
      expect(Number(invCredit?.credit)).toBe(24750);
      expect(Number(postJournalCall.entries.find((e) => e.accountCode === '1.1.01')?.debit)).toBe(27000);
      expect(Number(postJournalCall.entries.find((e) => e.accountCode === '4.1.01')?.credit)).toBe(27000);
    });
  });

  // =========================================================================
  // 2. TC-02: MULTI-TENDER SPLIT SALE & CUSTOMER DUE
  // =========================================================================
  describe('TC-02: Multi-Tender Split Sale (Cash + bKash + Customer Due) (TX-02)', () => {
    it('allocates split tenders to Cash, bKash, and Accounts Receivable', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        variantName: 'Baseus 65W GaN Charger',
        msp: 1800,
        purchaseCost: 1400,
        currentStock: 10,
        isDeleted: false
      } as any);

      vi.spyOn(Product, 'findOne').mockResolvedValue({
        _id: productId,
        shopId,
        name: 'Baseus 65W GaN Charger',
        productType: 'accessory',
        hasImei: false
      } as any);

      vi.spyOn(ProductVariant, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any);
      vi.spyOn(Sale.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(SaleItem.prototype, 'save').mockResolvedValue(true as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);

      const idempotencyKey = crypto.randomUUID();
      const checkoutRes = await PosService.processCheckout({
        shopId,
        userId,
        idempotencyKey,
        payload: {
          customerId: customerId.toString(),
          items: [
            {
              variantId: variantId.toString(),
              quantity: 2,
              unitPrice: 2000,
              discountAmount: 0
            }
          ],
          payments: [
            { paymentMethod: 'cash', amountReceived: 1500, amountApplied: 1500 },
            { paymentMethod: 'bkash_merchant', amountReceived: 1500, amountApplied: 1500, trxReference: 'BJK99112' },
            { paymentMethod: 'customer_due', amountReceived: 1000, amountApplied: 1000 }
          ]
        }
      });

      expect(checkoutRes.grandTotal).toBe('4000.00');
      expect(checkoutRes.paidAmount).toBe('3000.00');
      expect(checkoutRes.dueAmount).toBe('1000.00');

      // Verify General Ledger entries balance: Debits === Credits
      const postCall = vi.mocked(AccountingService.postDoubleEntryJournal).mock.calls[0][0];
      const cashEntry = postCall.entries.find((e) => e.accountCode === '1.1.01');
      const digitalEntry = postCall.entries.find((e) => e.accountCode === '1.2.01');
      const dueEntry = postCall.entries.find((e) => e.accountCode === '1.4.01');
      const revenueEntry = postCall.entries.find((e) => e.accountCode === '4.1.02');

      expect(Number(cashEntry?.debit)).toBe(1500);
      expect(Number(digitalEntry?.debit)).toBe(1500);
      expect(Number(dueEntry?.debit)).toBe(1000);
      expect(Number(revenueEntry?.credit)).toBe(4000);

      // Customer due ledger increment
      expect(Customer.updateOne).toHaveBeenCalledWith(
        { _id: customerId },
        { $inc: { currentDueBalance: '1000.00' } },
        expect.anything()
      );
    });

    it('rejects sale with outstanding due if customer profile is missing', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        msp: 1000,
        purchaseCost: 800,
        currentStock: 5,
        isDeleted: false
      } as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue({ _id: productId, shopId, productType: 'accessory', hasImei: false } as any);

      await expect(
        PosService.processCheckout({
          shopId,
          userId,
          idempotencyKey: crypto.randomUUID(),
          payload: {
            items: [{ variantId: variantId.toString(), quantity: 1, unitPrice: 1200 }],
            payments: [{ paymentMethod: 'cash', amountReceived: 500, amountApplied: 500 }]
          }
        })
      ).rejects.toThrow('Customer profile is mandatory for sales with outstanding due');
    });
  });

  // =========================================================================
  // 3. TC-03 & TX-04: OVERPAYMENT & CASH CHANGE HANDLING
  // =========================================================================
  describe('TC-03 & TX-04: Overpayment & Cash Change Handling', () => {
    it('records received tender note and change dispensed credit cleanly', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        variantName: 'Remax 9H Tempered Glass',
        msp: 350,
        purchaseCost: 150,
        currentStock: 20,
        isDeleted: false
      } as any);

      vi.spyOn(Product, 'findOne').mockResolvedValue({ _id: productId, shopId, productType: 'accessory', hasImei: false } as any);
      vi.spyOn(ProductVariant, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any);
      vi.spyOn(Sale.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(SaleItem.prototype, 'save').mockResolvedValue(true as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);

      // Bill total = 400 BDT, customer hands over a 1000 BDT note -> change = 600 BDT
      const checkoutRes = await PosService.processCheckout({
        shopId,
        userId,
        idempotencyKey: crypto.randomUUID(),
        payload: {
          items: [{ variantId: variantId.toString(), quantity: 1, unitPrice: 400 }],
          payments: [{ paymentMethod: 'cash', amountReceived: 1000, amountApplied: 1000 }]
        }
      });

      expect(checkoutRes.grandTotal).toBe('400.00');
      expect(checkoutRes.changeGiven).toBe('600.00');

      const postCall = vi.mocked(AccountingService.postDoubleEntryJournal).mock.calls[0][0];
      const cashReceivedDebit = postCall.entries.find((e) => e.accountCode === '1.1.01' && Number(e.debit) === 1000);
      const cashChangeCredit = postCall.entries.find((e) => e.accountCode === '1.1.01' && Number(e.credit) === 600);
      const revenueCredit = postCall.entries.find((e) => e.accountCode === '4.1.02');

      expect(cashReceivedDebit).toBeDefined();
      expect(cashChangeCredit).toBeDefined();
      expect(Number(revenueCredit?.credit)).toBe(400);

      // Audit Verification: Net Cash is +400 and Journal entries balance
      const netCashDebit = Number(cashReceivedDebit?.debit) - Number(cashChangeCredit?.credit);
      expect(netCashDebit).toBe(400);

      const totalDebits = postCall.entries.reduce((sum, e) => sum + Number(e.debit || 0), 0);
      const totalCredits = postCall.entries.reduce((sum, e) => sum + Number(e.credit || 0), 0);
      expect(totalDebits).toBe(totalCredits);
    });
  });

  // =========================================================================
  // 4. SHIFT INVARIANT: SHIFT_NOT_OPEN
  // =========================================================================
  describe('Shift Invariant: SHIFT_NOT_OPEN', () => {
    it('rejects checkout when cashier shift has not been opened', async () => {
      vi.spyOn(Shift, 'findOne').mockResolvedValue(null);

      await expect(
        PosService.processCheckout({
          shopId,
          userId,
          idempotencyKey: crypto.randomUUID(),
          payload: {
            items: [{ variantId: new mongoose.Types.ObjectId().toString(), quantity: 1, unitPrice: 500 }],
            payments: [{ paymentMethod: 'cash', amountReceived: 500, amountApplied: 500 }]
          }
        })
      ).rejects.toThrow('SHIFT_NOT_OPEN');
    });
  });

  // =========================================================================
  // 5. MINIMUM SELLING PRICE (MSP) FLOOR & MANAGER PIN OVERRIDE
  // =========================================================================
  describe('MSP Floor Invariant & Manager PIN Override', () => {
    it('rejects price below MSP when manager authorization is omitted', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        msp: 25000,
        mrp: 27000,
        purchaseCost: 23000,
        currentStock: 5,
        isDeleted: false
      } as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue({ _id: productId, shopId, productType: 'accessory', hasImei: false } as any);

      // Attempting to sell at 24000 (breaching 25000 MSP floor)
      await expect(
        PosService.processCheckout({
          shopId,
          userId,
          idempotencyKey: crypto.randomUUID(),
          payload: {
            items: [{ variantId: variantId.toString(), quantity: 1, unitPrice: 24000 }],
            payments: [{ paymentMethod: 'cash', amountReceived: 24000, amountApplied: 24000 }]
          }
        })
      ).rejects.toThrow('MSP_FLOOR_BREACH');
    });

    it('allows sale below MSP when valid override token is presented', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        msp: 25000,
        purchaseCost: 22000,
        currentStock: 5,
        isDeleted: false
      } as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue({ _id: productId, shopId, productType: 'accessory', hasImei: false } as any);
      vi.spyOn(ProductVariant, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any);
      vi.spyOn(Sale.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(SaleItem.prototype, 'save').mockResolvedValue(true as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);

      const { overrideToken } = await overrideTokenService.createToken({
        managerUserId: managerId.toString(),
        shopId: shopId.toString(),
        action: 'MSP_OVERRIDE'
      });

      const res = await PosService.processCheckout({
        shopId,
        userId,
        idempotencyKey: crypto.randomUUID(),
        payload: {
          overrideToken,
          items: [{ variantId: variantId.toString(), quantity: 1, unitPrice: 24000 }],
          payments: [{ paymentMethod: 'cash', amountReceived: 24000, amountApplied: 24000 }]
        }
      });

      expect(res.grandTotal).toBe('24000.00');
    });
  });

  // =========================================================================
  // 6. IDEMPOTENCY RETRY PROTECTION
  // =========================================================================
  describe('Idempotency Retry Protection', () => {
    it('returns existing sale without duplicate journals or stock mutations', async () => {
      const existingKey = crypto.randomUUID();
      const mockExistingSale = {
        _id: new mongoose.Types.ObjectId(),
        shopId,
        invoiceNo: 'INV-202610-12345',
        idempotencyKey: existingKey,
        subtotalAmount: '20000.00',
        discountAmount: '0.00',
        vatAmount: '0.00',
        grandTotalAmount: '20000.00',
        paidAmount: '20000.00',
        dueAmount: '0.00',
        changeAmount: '0.00',
        reprintCount: 0,
        soldByUserId: userId,
        createdAt: new Date()
      };

      vi.spyOn(Sale, 'findOne').mockResolvedValue(mockExistingSale as any);
      vi.spyOn(SaleItem, 'find').mockReturnValue({
        populate: vi.fn().mockResolvedValue([
          { variantId: { variantName: 'Phone' }, quantity: 1, unitPrice: '20000.00', total: '20000.00' }
        ])
      } as any);

      const res = await PosService.processCheckout({
        shopId,
        userId,
        idempotencyKey: existingKey,
        payload: {
          items: [{ variantId: new mongoose.Types.ObjectId().toString(), quantity: 1, unitPrice: 20000 }],
          payments: [{ paymentMethod: 'cash', amountReceived: 20000, amountApplied: 20000 }]
        }
      });

      expect(res.invoiceNo).toBe('INV-202610-12345');
      // AccountingService should NOT be invoked a second time
      expect(AccountingService.postDoubleEntryJournal).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 7. CONCURRENT IMEI LOCKING & RACE CONDITIONS
  // =========================================================================
  describe('Concurrent IMEI Locking & Unavailable Status Rejections', () => {
    it('rejects concurrent terminal attempt when lock is already acquired', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();
      const imeiNum = '860999888777666';

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        msp: 20000,
        purchaseCost: 18000,
        currentStock: 1,
        isDeleted: false
      } as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue({ _id: productId, shopId, productType: 'handset', hasImei: true } as any);

      // Pre-acquire lock to simulate another terminal in flight
      await lockService.acquireLock(`lock:imei:${imeiNum}`, 15);

      await expect(
        PosService.processCheckout({
          shopId,
          userId,
          idempotencyKey: crypto.randomUUID(),
          payload: {
            items: [{ variantId: variantId.toString(), imei1: imeiNum, quantity: 1, unitPrice: 22000 }],
            payments: [{ paymentMethod: 'cash', amountReceived: 22000, amountApplied: 22000 }]
          }
        })
      ).rejects.toThrow('IMEI_ALREADY_SOLD');
    });

    it('rejects IN_TRANSIT or SCRAPPED handsets from counter sale', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();
      const imeiNum = '860111222333444';

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        msp: 10000,
        purchaseCost: 8000,
        currentStock: 1,
        isDeleted: false
      } as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue({ _id: productId, shopId, productType: 'handset', hasImei: true } as any);

      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        shopId,
        imei1: imeiNum,
        status: 'IN_TRANSIT' // unavailable state
      } as any);

      await expect(
        PosService.processCheckout({
          shopId,
          userId,
          idempotencyKey: crypto.randomUUID(),
          payload: {
            items: [{ variantId: variantId.toString(), imei1: imeiNum, quantity: 1, unitPrice: 12000 }],
            payments: [{ paymentMethod: 'cash', amountReceived: 12000, amountApplied: 12000 }]
          }
        })
      ).rejects.toThrow('unavailable for sale');
    });

    it('concurrent checkout of the exact same IMEI by two terminals results in exactly one success and one rejection', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();
      const imeiNum = '860777888999000';

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        msp: 15000,
        purchaseCost: 12000,
        currentStock: 1,
        isDeleted: false
      } as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue({ _id: productId, shopId, productType: 'handset', hasImei: true } as any);

      const mockImeiDoc = {
        _id: new mongoose.Types.ObjectId(),
        shopId,
        imei1: imeiNum,
        purchaseCost: 12000,
        status: 'AVAILABLE',
        save: vi.fn().mockResolvedValue(true)
      };
      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue(mockImeiDoc as any);
      vi.spyOn(Sale.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(SaleItem.prototype, 'save').mockResolvedValue(true as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);

      const t1 = PosService.processCheckout({
        shopId,
        userId,
        idempotencyKey: crypto.randomUUID(),
        payload: {
          items: [{ variantId: variantId.toString(), imei1: imeiNum, quantity: 1, unitPrice: 16000 }],
          payments: [{ paymentMethod: 'cash', amountReceived: 16000, amountApplied: 16000 }]
        }
      });

      const t2 = PosService.processCheckout({
        shopId,
        userId: managerId,
        idempotencyKey: crypto.randomUUID(),
        payload: {
          items: [{ variantId: variantId.toString(), imei1: imeiNum, quantity: 1, unitPrice: 16000 }],
          payments: [{ paymentMethod: 'cash', amountReceived: 16000, amountApplied: 16000 }]
        }
      });

      const results = await Promise.allSettled([t1, t2]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason.message).toContain('IMEI_ALREADY_SOLD');
    });
  });

  // =========================================================================
  // 8. TC-47: INVOICE REPRINTING & AUDIT COUNTER
  // =========================================================================
  describe('TC-47: Auditable Invoice Reprinting', () => {
    it('increments reprint_count to exactly 3 with zero financial ledger mutations', async () => {
      let currentReprintCount = 0;
      const invoiceNo = 'INV-202610-99887';
      const mockSale = {
        _id: new mongoose.Types.ObjectId(),
        shopId,
        invoiceNo,
        subtotalAmount: '15000.00',
        discountAmount: '0.00',
        vatAmount: '0.00',
        grandTotalAmount: '15000.00',
        paidAmount: '15000.00',
        dueAmount: '0.00',
        changeAmount: '0.00',
        reprintCount: 0,
        soldByUserId: userId,
        createdAt: new Date()
      };

      (vi.spyOn(Sale, 'findOneAndUpdate') as any).mockImplementation(async () => {
        currentReprintCount += 1;
        return { ...mockSale, reprintCount: currentReprintCount } as any;
      });
      vi.spyOn(SaleItem, 'find').mockReturnValue({ populate: vi.fn().mockResolvedValue([]) } as any);

      // Execute 3 successive reprint calls
      const rep1 = await PosService.reprintInvoice(shopId, invoiceNo);
      const rep2 = await PosService.reprintInvoice(shopId, invoiceNo);
      const rep3 = await PosService.reprintInvoice(shopId, invoiceNo);

      expect(rep1.reprintCount).toBe(1);
      expect(rep2.reprintCount).toBe(2);
      expect(rep3.reprintCount).toBe(3);
      expect(currentReprintCount).toBe(3);

      // Zero ledger transactions posted
      expect(AccountingService.postDoubleEntryJournal).not.toHaveBeenCalled();

      // Check watermark is included in printData
      expect(rep3.printData.rawEscPosBase64).toBeDefined();
      const decodedEscPos = Buffer.from(rep3.printData.rawEscPosBase64, 'base64').toString('ascii');
      expect(decodedEscPos).toContain('*** DUPLICATE REPRINT (COPY #3) ***');
    });
  });

  // =========================================================================
  // 9. TC-48: OFFLINE ACCESSORY QUEUE & HANDSET PROHIBITION
  // =========================================================================
  describe('TC-48: Offline Accessory Queue & Handset Prohibition', () => {
    it('strictly rejects offline sync if any item contains an IMEI', async () => {
      await expect(
        PosService.syncOfflineBatch(shopId, userId, {
          syncedBatchId: 'batch_offline_001',
          transactions: [
            {
              offlineSaleId: 'off_01',
              timestamp: new Date().toISOString(),
              items: [
                {
                  variantId: new mongoose.Types.ObjectId().toString(),
                  quantity: 1,
                  unitPrice: 25000,
                  imei1: '860123456789012' // Serialized handset attempted offline!
                }
              ],
              paidAmount: 25000,
              paymentMethod: 'cash'
            }
          ]
        })
      ).rejects.toThrow('OFFLINE_HANDSET_SALE_PROHIBITED');
    });

    it('processes eligible non-serialized accessory offline sync batch cleanly', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        msp: 200,
        purchaseCost: 100,
        currentStock: 50,
        isDeleted: false
      } as any);
      vi.spyOn(ProductVariant, 'findById').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        msp: 200,
        purchaseCost: 100,
        currentStock: 50
      } as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue({ _id: productId, shopId, productType: 'accessory', hasImei: false } as any);
      vi.spyOn(Product, 'findById').mockResolvedValue({ _id: productId, shopId, productType: 'accessory', hasImei: false } as any);
      vi.spyOn(ProductVariant, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any);
      vi.spyOn(Sale.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(SaleItem.prototype, 'save').mockResolvedValue(true as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);

      const syncResult = await PosService.syncOfflineBatch(shopId, userId, {
        syncedBatchId: 'batch_offline_002',
        transactions: [
          {
            offlineSaleId: 'off_10',
            timestamp: new Date().toISOString(),
            items: [{ variantId: variantId.toString(), quantity: 2, unitPrice: 300 }],
            paidAmount: 600,
            paymentMethod: 'cash'
          }
        ]
      });

      expect(syncResult.totalSynced).toBe(1);
      expect(syncResult.sales[0].offlineSaleId).toBe('off_10');
    });

    it('revalidates stock and rejects offline sync if accessory stock is exhausted', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        msp: 200,
        purchaseCost: 100,
        currentStock: 0, // Out of stock!
        isDeleted: false
      } as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue({ _id: productId, shopId, productType: 'accessory', hasImei: false } as any);

      await expect(
        PosService.syncOfflineBatch(shopId, userId, {
          syncedBatchId: 'batch_offline_003',
          transactions: [
            {
              offlineSaleId: 'off_out_of_stock',
              timestamp: new Date().toISOString(),
              items: [{ variantId: variantId.toString(), quantity: 1, unitPrice: 300 }],
              paidAmount: 300,
              paymentMethod: 'cash'
            }
          ]
        })
      ).rejects.toThrow('Insufficient stock');
    });

    it('revalidates shop ownership and rejects variant belonging to different shop', async () => {
      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue(null);

      await expect(
        PosService.syncOfflineBatch(shopId, userId, {
          syncedBatchId: 'batch_offline_004',
          transactions: [
            {
              offlineSaleId: 'off_wrong_shop',
              timestamp: new Date().toISOString(),
              items: [{ variantId: new mongoose.Types.ObjectId().toString(), quantity: 1, unitPrice: 300 }],
              paidAmount: 300,
              paymentMethod: 'cash'
            }
          ]
        })
      ).rejects.toThrow('not found in shop');
    });
  });

  // =========================================================================
  // 10. CART HOLD & RECALL (F5 / F6)
  // =========================================================================
  describe('Cart Hold & Recall (F5 / F6)', () => {
    it('holds active cart and recalls cleanly', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const heldCartId = new mongoose.Types.ObjectId();

      const mockSavedCart = {
        _id: heldCartId,
        shopId,
        cartSlot: 'F5',
        customerName: 'Walk-in Brother',
        items: [{ variantId, quantity: 1, unitPrice: '1500.00' }],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(HeldCart.prototype, 'save').mockResolvedValue(mockSavedCart as any);
      vi.spyOn(HeldCart, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockSavedCart])
      } as any);
      vi.spyOn(HeldCart, 'deleteOne').mockResolvedValue({ deletedCount: 1 } as any);

      const held = await PosService.holdCart({
        shopId,
        userId,
        data: {
          customerName: 'Walk-in Brother',
          items: [{ variantId: variantId.toString(), quantity: 1, unitPrice: 1500 }]
        }
      });
      expect(held).toBeDefined();

      const recalledList = await PosService.getHeldCarts(shopId);
      expect(recalledList.length).toBe(1);

      const deleted = await PosService.deleteHeldCart(shopId, heldCartId.toString());
      expect(deleted).toBe(true);
    });
  });

  // =========================================================================
  // 11. HARDWARE STATION SETTINGS & ESC/POS BYTE CONTRACT
  // =========================================================================
  describe('Hardware Settings & ESC/POS Raw Byte Generation', () => {
    it('generates ESC/POS byte sequence containing cash drawer pulse and monospace alignment', async () => {
      const receiptData = {
        shopName: 'Kanchan Telecom',
        branch: 'Eastern Plaza (Shop #304)',
        invoiceNo: 'INV-202610-00142',
        date: '12-Oct-2026 05:30 PM',
        cashier: 'Tanvir Cashier',
        customer: 'Walk-in Brother',
        items: [
          {
            name: 'Redmi Note 13 Pro 5G',
            imei: '860123456789012',
            qty: 1,
            price: '27000.00',
            total: '27000.00'
          }
        ],
        subTotal: '27000.00',
        discount: '0.00',
        grandTotal: '27000.00',
        paid: '27000.00',
        due: '0.00',
        change: '0.00'
      };

      const payload = HardwareService.buildEscPosPayload(receiptData, 80, true);
      expect(payload.format).toBe('ESC_POS_V1');
      expect(payload.paperWidth).toBe(80);
      expect(payload.kickDrawer).toBe(true);
      expect(payload.rawEscPosBase64).toBeDefined();

      const binaryBuf = Buffer.from(payload.rawEscPosBase64, 'base64');
      // Verifying RJ11 Drawer Pulse: 0x1B 0x70 0x00 0x19 0xFA
      const pulseIndex = binaryBuf.indexOf(Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]));
      expect(pulseIndex).toBeGreaterThanOrEqual(0);

      // Verifying Shop Name in ASCII bytes
      expect(binaryBuf.toString('ascii')).toContain('Kanchan Telecom');
    });

    it('persists and retrieves station hardware configs scoped to shop', async () => {
      const mockConfig = {
        shopId,
        counterId: 'Counter-1',
        terminalName: 'Front Gate Counter 1',
        paperWidthMm: 80,
        printerConnectionType: 'webusb',
        kickDrawerOnSale: true,
        scannerWedgeSuffix: 'ENTER'
      };

      vi.spyOn(ShopHardwareConfig, 'findOne').mockResolvedValue(mockConfig as any);
      vi.spyOn(ShopHardwareConfig, 'findOneAndUpdate').mockResolvedValue(mockConfig as any);

      const saved = await HardwareService.saveStationConfig(shopId, {
        counterId: 'Counter-1',
        terminalName: 'Front Gate Counter 1',
        paperWidthMm: 80,
        kickDrawerOnSale: true
      });

      expect(saved.terminalName).toBe('Front Gate Counter 1');
      const retrieved = await HardwareService.getStationConfig(shopId, 'Counter-1');
      expect(retrieved.counterId).toBe('Counter-1');
    });
  });

  // =========================================================================
  // 12. IN-MEMORY SIMULATION: 100-CONSECUTIVE-SALE STRESS TEST & LOGICAL BENCHMARK
  // =========================================================================
  describe('In-Memory Simulation: 100-Consecutive-Sale Stress Test & Logical Benchmark', () => {
    it('executes 100 consecutive sales with 100% ledger reconciliation and latency tracking (in-memory unit simulation)', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        msp: 500,
        purchaseCost: 300,
        currentStock: 500,
        isDeleted: false
      } as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue({ _id: productId, shopId, productType: 'accessory', hasImei: false } as any);
      vi.spyOn(ProductVariant, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any);
      vi.spyOn(Sale.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(SaleItem.prototype, 'save').mockResolvedValue(true as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);

      const latencies: number[] = [];
      const totalSales = 100;

      for (let i = 0; i < totalSales; i++) {
        const start = performance.now();
        const res = await PosService.processCheckout({
          shopId,
          userId,
          idempotencyKey: `stress_${i}_${crypto.randomUUID()}`,
          payload: {
            items: [{ variantId: variantId.toString(), quantity: 1, unitPrice: 650 }],
            payments: [{ paymentMethod: 'cash', amountReceived: 650, amountApplied: 650 }]
          }
        });
        const elapsed = performance.now() - start;
        latencies.push(elapsed);
        expect(res.grandTotal).toBe('650.00');
      }

      // Sort latencies to compute percentiles
      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(totalSales * 0.5)];
      const p95 = latencies[Math.floor(totalSales * 0.95)];
      const p99 = latencies[Math.floor(totalSales * 0.99)];

      console.log(`[POS In-Memory Simulation Benchmark (Vitest Unit/Mocked — not remote Mongo I/O)] 100 Sales: p50 = ${p50.toFixed(2)}ms, p95 = ${p95.toFixed(2)}ms, p99 = ${p99.toFixed(2)}ms`);

      // Verify latency target < 250ms for p95 in execution environment
      expect(p95).toBeLessThan(250);
      expect(vi.mocked(AccountingService.postDoubleEntryJournal)).toHaveBeenCalledTimes(totalSales);
    });
  });

  // =========================================================================
  // 13. CONCURRENT POS DOUBLE-SELL RACE PREVENTION & IMEI LOCK SAFETY
  // =========================================================================
  describe('13. Concurrent POS Double-Sell Race Prevention & IMEI Lock Safety', () => {
    it('prevents concurrent checkout race: exactly one checkout succeeds and second terminal is rejected with 409 IMEI_ALREADY_SOLD', async () => {
      const imeiToSell = '864000112233445';
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();
      const imeiId = new mongoose.Types.ObjectId();

      const mockHandsetDoc: any = {
        _id: imeiId,
        shopId,
        variantId,
        imei1: imeiToSell,
        purchaseCost: '18000.00',
        specificCost: '18000.00',
        sellingPrice: '22000.00',
        status: 'AVAILABLE',
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        })
      };

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        variantName: 'Redmi Note 13 8/256GB',
        msp: 20000,
        purchaseCost: 18000,
        currentStock: 1,
        isDeleted: false
      } as any);

      vi.spyOn(Product, 'findOne').mockResolvedValue({
        _id: productId,
        shopId,
        name: 'Redmi Note 13',
        productType: 'handset',
        hasImei: true
      } as any);

      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue(mockHandsetDoc);

      vi.spyOn(Sale.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(SaleItem.prototype, 'save').mockResolvedValue(true as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);

      // Scenario 1: Terminal B attempts checkout while Terminal A holds the distributed lock
      const { lockService } = await import('../services/lock/lock.service.js');
      const lockRes = await lockService.acquireLock(`lock:imei:${imeiToSell}`, 15);
      expect(lockRes.acquired).toBe(true);

      // Terminal B attempt MUST fail with 409 IMEI_ALREADY_SOLD
      await expect(
        PosService.processCheckout({
          shopId,
          userId,
          idempotencyKey: 'terminal_b_concurrent_race',
          payload: {
            items: [{ variantId: variantId.toString(), imei1: imeiToSell, quantity: 1, unitPrice: 22000 }],
            payments: [{ paymentMethod: 'cash', amountReceived: 22000, amountApplied: 22000 }]
          }
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'IMEI_ALREADY_SOLD'
      });

      // Release lock held by Terminal A
      await lockService.releaseLock(`lock:imei:${imeiToSell}`, lockRes.token);

      // Scenario 2: Terminal A completes sale and updates IMEI doc status to 'SOLD'
      mockHandsetDoc.status = 'SOLD';

      // Terminal B retries after lock release but encounters 'SOLD' status in DB
      await expect(
        PosService.processCheckout({
          shopId,
          userId,
          idempotencyKey: 'terminal_b_retry_after_sold',
          payload: {
            items: [{ variantId: variantId.toString(), imei1: imeiToSell, quantity: 1, unitPrice: 22000 }],
            payments: [{ paymentMethod: 'cash', amountReceived: 22000, amountApplied: 22000 }]
          }
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'IMEI_ALREADY_SOLD'
      });
    });
  });
});
