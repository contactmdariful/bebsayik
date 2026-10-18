import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import argon2 from 'argon2';
import {
  Customer,
  Sale,
  SaleItem,
  CustomerReturnVoucher,
  MoneyReceipt,
  Product,
  ProductVariant,
  ImeiSerial,
  InventoryMovement,
  Shop,
  User,
  Shift,
  SmsLog,
  KistiContract,
  ServiceJob
} from '../models/index.js';
import { ReturnsService } from '../services/returns/returns.service.js';
import { CustomerService } from '../services/customers/customer.service.js';
import { PosService } from '../services/pos/pos.service.js';
import { AccountingService } from '../services/accounting/accounting.service.js';
import { lockService } from '../services/lock/lock.service.js';
import { overrideTokenService } from '../services/security/overrideToken.service.js';
import { mockSmsDriver } from '../services/sms/mockSmsDriver.js';

describe('Phase 8: Sales Returns, Customer Dues & Bakir Khata Subledger', () => {
  const shopId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const managerId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();

  const mockShop = {
    _id: shopId,
    name: 'Eastern Plaza Telecom',
    returnPolicyDays: 7,
    binNumber: '123456789-0101',
    phone: '01700000000'
  };

  const mockCashier = {
    _id: userId,
    fullName: 'Rafi Cashier',
    phone: '01711223344',
    role: 'CASHIER'
  };

  const mockManager = {
    _id: managerId,
    fullName: 'Sumon Manager',
    phone: '01799887766',
    role: 'STORE_MANAGER',
    managerPinHash: '$argon2id$v=19$m=65536,t=3,p=4$fakeHash$fake'
  };

  const mockCustomer = {
    _id: customerId,
    shopId,
    fullName: 'Mahmudul Hasan',
    phone: '01812345678',
    address: 'Shantinagar, Dhaka',
    creditLimit: '20000.00',
    currentDueBalance: '5000.00',
    rewardPoints: 10,
    isDeleted: false,
    save: vi.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    overrideTokenService.clearMemory();
    lockService.clearMemoryLocks();
    mockSmsDriver.clear();

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
    vi.spyOn(CustomerReturnVoucher, 'findOne').mockResolvedValue(null);
    vi.spyOn(CustomerReturnVoucher, 'find').mockResolvedValue([]);
    vi.spyOn(MoneyReceipt, 'findOne').mockResolvedValue(null);
    vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop as any);
    (vi.spyOn(User, 'findById') as any).mockImplementation(async (id: any) => {
      if (id?.toString() === userId.toString()) return mockCashier as any;
      if (id?.toString() === managerId.toString()) return mockManager as any;
      return mockCashier as any;
    });
    vi.spyOn(User, 'find').mockResolvedValue([mockManager] as any);
    vi.spyOn(Customer, 'findById').mockResolvedValue(mockCustomer as any);
    vi.spyOn(Customer, 'findOne').mockResolvedValue(mockCustomer as any);
    vi.spyOn(Customer, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any);
    vi.spyOn(CustomerReturnVoucher.prototype, 'save').mockImplementation(function (this: any) {
      this._id = new mongoose.Types.ObjectId();
      return Promise.resolve(this);
    });
    vi.spyOn(MoneyReceipt.prototype, 'save').mockImplementation(function (this: any) {
      this._id = new mongoose.Types.ObjectId();
      return Promise.resolve(this);
    });
    vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);
    vi.spyOn(SmsLog.prototype, 'save').mockResolvedValue(true as any);

    // Accounting Journal Spy
    vi.spyOn(AccountingService, 'postDoubleEntryJournal').mockResolvedValue({
      voucherNo: 'VCH-TEST',
      txnCode: 'TX-05',
      totalDebits: '20000.00',
      totalCredits: '20000.00',
      transactionCount: 2
    });
  });

  // =========================================================================
  // 1. TC-20: SALES RETURN 7-DAY POLICY & CONDITION INSPECTION QUARANTINE
  // =========================================================================
  describe('TC-20: Sales Return Policy & Inspection Quarantine', () => {
    it('quarantines defective returned phone into RETURNED_INSPECTION state (TC-20)', async () => {
      const saleId = new mongoose.Types.ObjectId();
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();
      const imeiDocId = new mongoose.Types.ObjectId();
      const imeiNum = '860123456789012';

      const mockSale = {
        _id: saleId,
        shopId,
        invoiceNo: 'INV-202610-00142',
        customerId,
        status: 'completed',
        dueAmount: '0.00',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days old (valid within 7-day policy)
        save: vi.fn().mockResolvedValue(true)
      };

      const mockSaleItem = {
        saleId,
        variantId,
        imeiId: imeiDocId,
        quantity: 1,
        unitPrice: '25000.00'
      };

      const mockImeiDoc = {
        _id: imeiDocId,
        shopId,
        imei1: imeiNum,
        saleId,
        status: 'SOLD',
        purchaseCost: '22000.00',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Sale, 'findOne').mockResolvedValue(mockSale as any);
      vi.spyOn(SaleItem, 'find').mockResolvedValue([mockSaleItem] as any);
      vi.spyOn(CustomerReturnVoucher, 'find').mockResolvedValue([]);
      vi.spyOn(CustomerReturnVoucher.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        purchaseCost: '22000.00',
        isDeleted: false
      } as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue({
        _id: productId,
        shopId,
        hasImei: true,
        productType: 'handset'
      } as any);
      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue(mockImeiDoc as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);

      // Return defective phone 2 days after purchase
      const returnResult = await ReturnsService.processSalesReturn({
        shopId,
        userId,
        idempotencyKey: crypto.randomUUID(),
        invoiceNo: 'INV-202610-00142',
        items: [
          {
            variantId: variantId.toString(),
            imei1: imeiNum,
            quantity: 1,
            refundPrice: '25000.00',
            condition: 'quarantine' // Defective needs inspection
          }
        ],
        refundMethod: 'cash',
        reason: 'Display flickering intermittently'
      });

      expect(returnResult.totalReturnAmount).toBe('25000.00');
      expect(returnResult.cashRefundAmount).toBe('25000.00');
      expect(returnResult.dueReductionAmount).toBe('0.00');

      // Invariant TC-20: IMEI transitions to RETURNED_INSPECTION (quarantined, not sellable)
      expect(mockImeiDoc.status).toBe('RETURNED_INSPECTION');

      // Sale status transitions to refunded
      expect(mockSale.status).toBe('refunded');
    });

    it('rejects sales return after 7-day policy expiration without manager override', async () => {
      const saleId = new mongoose.Types.ObjectId();
      const variantId = new mongoose.Types.ObjectId();

      const expiredSale = {
        _id: saleId,
        shopId,
        invoiceNo: 'INV-202610-00010',
        status: 'completed',
        dueAmount: '0.00',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days old (> 7 days)
      };

      vi.spyOn(Sale, 'findOne').mockResolvedValue(expiredSale as any);
      vi.spyOn(SaleItem, 'find').mockResolvedValue([{ variantId, quantity: 1, unitPrice: '1000.00' }] as any);

      await expect(
        ReturnsService.processSalesReturn({
          shopId,
          userId,
          idempotencyKey: crypto.randomUUID(),
          invoiceNo: 'INV-202610-00010',
          items: [{ variantId: variantId.toString(), quantity: 1, refundPrice: '1000.00' }]
        })
      ).rejects.toThrow('RETURN_POLICY_EXPIRED');
    });

    it('permits return after 7 days when authorized Manager PIN is provided', async () => {
      const saleId = new mongoose.Types.ObjectId();
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();

      const expiredSale = {
        _id: saleId,
        shopId,
        invoiceNo: 'INV-202610-00011',
        status: 'completed',
        dueAmount: '0.00',
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days old
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Sale, 'findOne').mockResolvedValue(expiredSale as any);
      vi.spyOn(SaleItem, 'find').mockResolvedValue([{ variantId, quantity: 1, unitPrice: '1500.00' }] as any);
      vi.spyOn(CustomerReturnVoucher, 'find').mockResolvedValue([]);
      vi.spyOn(CustomerReturnVoucher.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        purchaseCost: '1000.00',
        isDeleted: false
      } as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue({ _id: productId, shopId, productType: 'accessory', hasImei: false } as any);
      vi.spyOn(ProductVariant, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);

      vi.spyOn(User, 'find').mockResolvedValue([mockManager] as any);
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);

      const res = await ReturnsService.processSalesReturn({
        shopId,
        userId,
        idempotencyKey: crypto.randomUUID(),
        invoiceNo: 'INV-202610-00011',
        items: [{ variantId: variantId.toString(), quantity: 1, refundPrice: '1500.00', condition: 'restockable' }],
        managerPin: '1234' // Manager override
      });

      expect(res.cashRefundAmount).toBe('1500.00');
      expect(res.saleStatus).toBe('refunded');
    });
  });

  // =========================================================================
  // 2. TC-21: SALES RETURN DUE REDUCTION NETTING
  // =========================================================================
  describe('TC-21: Sales Return Due Reduction Netting', () => {
    it('nets outstanding due first before disbursing cash refund (TC-21)', async () => {
      // Scenario from PRD TC-21:
      // Customer bought ৳20,000 phone with ৳5,000 due. Customer returns phone.
      // Customer due decreases by ৳5,000; cash refund issued for ৳15,000; zero excess cash disbursed!
      const saleId = new mongoose.Types.ObjectId();
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();
      const imeiDocId = new mongoose.Types.ObjectId();
      const imeiNum = '860999888777666';

      const mockSaleWithDue = {
        _id: saleId,
        shopId,
        invoiceNo: 'INV-202610-00500',
        customerId,
        status: 'completed',
        dueAmount: '5000.00', // ৳5,000 due
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        save: vi.fn().mockResolvedValue(true)
      };

      const mockSaleItem = {
        saleId,
        variantId,
        imeiId: imeiDocId,
        quantity: 1,
        unitPrice: '20000.00' // ৳20,000 purchase price
      };

      const mockImeiDoc = {
        _id: imeiDocId,
        shopId,
        imei1: imeiNum,
        saleId,
        status: 'SOLD',
        purchaseCost: '17500.00',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Sale, 'findOne').mockResolvedValue(mockSaleWithDue as any);
      vi.spyOn(SaleItem, 'find').mockResolvedValue([mockSaleItem] as any);
      vi.spyOn(CustomerReturnVoucher, 'find').mockResolvedValue([]);
      vi.spyOn(CustomerReturnVoucher.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        purchaseCost: '17500.00',
        isDeleted: false
      } as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue({ _id: productId, shopId, productType: 'handset', hasImei: true } as any);
      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue(mockImeiDoc as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);

      const returnRes = await ReturnsService.processSalesReturn({
        shopId,
        userId,
        idempotencyKey: crypto.randomUUID(),
        invoiceNo: 'INV-202610-00500',
        items: [
          {
            variantId: variantId.toString(),
            imei1: imeiNum,
            quantity: 1,
            refundPrice: '20000.00',
            condition: 'restockable'
          }
        ],
        refundMethod: 'cash'
      });

      // TC-21 Invariants:
      // Total Return Value = ৳20,000
      expect(returnRes.totalReturnAmount).toBe('20000.00');
      // Due reduction amount = ৳5,000
      expect(returnRes.dueReductionAmount).toBe('5000.00');
      // Cash refund amount = ৳15,000
      expect(returnRes.cashRefundAmount).toBe('15000.00');

      // Customer due decreased by ৳5,000
      expect(Customer.updateOne).toHaveBeenCalledWith(
        { _id: customerId, shopId },
        { $inc: { currentDueBalance: -5000 } },
        expect.anything()
      );

      // Verify General Ledger Journal:
      const postCall = vi.mocked(AccountingService.postDoubleEntryJournal).mock.calls[0][0];
      const revenueDebit = postCall.entries.find((e) => e.accountCode === '4.1.01');
      const dueCredit = postCall.entries.find((e) => e.accountCode === '1.4.01');
      const cashCredit = postCall.entries.find((e) => e.accountCode === '1.1.01');

      expect(Number(revenueDebit?.debit)).toBe(20000);
      expect(Number(dueCredit?.credit)).toBe(5000);
      expect(Number(cashCredit?.credit)).toBe(15000);

      // Total Debits === Total Credits (balanced ledger)
      const totalDebits = postCall.entries.reduce((sum, e) => sum + Number(e.debit || 0), 0);
      const totalCredits = postCall.entries.reduce((sum, e) => sum + Number(e.credit || 0), 0);
      expect(totalDebits).toBe(totalCredits);
    });
  });

  // =========================================================================
  // 3. PARTIAL RETURNS & QUANTITY LIMIT ENFORCEMENT
  // =========================================================================
  describe('Partial Returns & Quantity Limits', () => {
    it('processes partial return and marks invoice partially_refunded', async () => {
      const saleId = new mongoose.Types.ObjectId();
      const variant1 = new mongoose.Types.ObjectId();
      const variant2 = new mongoose.Types.ObjectId();
      const product1 = new mongoose.Types.ObjectId();

      const mockSale = {
        _id: saleId,
        shopId,
        invoiceNo: 'INV-202610-00700',
        status: 'completed',
        dueAmount: '0.00',
        createdAt: new Date(),
        save: vi.fn().mockResolvedValue(true)
      };

      const saleItems = [
        { variantId: variant1, quantity: 2, unitPrice: '500.00' },
        { variantId: variant2, quantity: 1, unitPrice: '1200.00' }
      ];

      vi.spyOn(Sale, 'findOne').mockResolvedValue(mockSale as any);
      vi.spyOn(SaleItem, 'find').mockResolvedValue(saleItems as any);
      vi.spyOn(CustomerReturnVoucher, 'find').mockResolvedValue([]);
      vi.spyOn(CustomerReturnVoucher.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variant1,
        productId: product1,
        shopId,
        purchaseCost: '300.00',
        isDeleted: false
      } as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue({ _id: product1, shopId, productType: 'accessory', hasImei: false } as any);
      vi.spyOn(ProductVariant, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);

      // Customer returns 1 out of 2 units of variant1
      const res = await ReturnsService.processSalesReturn({
        shopId,
        userId,
        idempotencyKey: crypto.randomUUID(),
        invoiceNo: 'INV-202610-00700',
        items: [{ variantId: variant1.toString(), quantity: 1, refundPrice: '500.00' }]
      });

      expect(res.totalReturnAmount).toBe('500.00');
      expect(res.cashRefundAmount).toBe('500.00');
      expect(res.saleStatus).toBe('partially_refunded');
    });

    it('rejects attempt to return more than sold quantity', async () => {
      const saleId = new mongoose.Types.ObjectId();
      const variant1 = new mongoose.Types.ObjectId();

      const mockSale = {
        _id: saleId,
        shopId,
        invoiceNo: 'INV-202610-00701',
        status: 'completed',
        dueAmount: '0.00',
        createdAt: new Date()
      };

      vi.spyOn(Sale, 'findOne').mockResolvedValue(mockSale as any);
      vi.spyOn(SaleItem, 'find').mockResolvedValue([{ variantId: variant1, quantity: 1, unitPrice: '500.00' }] as any);
      vi.spyOn(CustomerReturnVoucher, 'find').mockResolvedValue([]);

      await expect(
        ReturnsService.processSalesReturn({
          shopId,
          userId,
          idempotencyKey: crypto.randomUUID(),
          invoiceNo: 'INV-202610-00701',
          items: [{ variantId: variant1.toString(), quantity: 3, refundPrice: '500.00' }] // Requested 3, sold only 1!
        })
      ).rejects.toThrow('RETURN_QUANTITY_EXCEEDED');
    });
  });

  // =========================================================================
  // 4. CUSTOMER CREDIT LIMIT ENFORCEMENT & MANAGER PIN OVERRIDE
  // =========================================================================
  describe('Customer Credit Limit Enforcement (Bakir Khata)', () => {
    it('blocks credit sale when projected due exceeds customer creditLimit without manager override', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();

      vi.spyOn(Shift, 'findOne').mockResolvedValue({ _id: new mongoose.Types.ObjectId(), status: 'open' } as any);
      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        msp: 10000,
        purchaseCost: 8000,
        currentStock: 10,
        isDeleted: false
      } as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue({ _id: productId, shopId, productType: 'accessory', hasImei: false } as any);

      // Customer has credit limit ৳10,000, current due ৳2,000. New credit claimed ৳10,000 -> Projected = ৳12,000 > ৳10,000!
      vi.spyOn(Customer, 'findOne').mockResolvedValue({
        _id: customerId,
        shopId,
        fullName: 'Mahmudul Hasan',
        creditLimit: '10000.00',
        currentDueBalance: '2000.00',
        isDeleted: false
      } as any);

      await expect(
        PosService.processCheckout({
          shopId,
          userId,
          idempotencyKey: crypto.randomUUID(),
          payload: {
            customerId: customerId.toString(),
            items: [{ variantId: variantId.toString(), quantity: 1, unitPrice: 10000 }],
            payments: [{ paymentMethod: 'customer_due', amountReceived: 0, amountApplied: 10000 }]
          }
        })
      ).rejects.toThrow('CREDIT_LIMIT_EXCEEDED');
    });

    it('permits credit sale exceeding limit when authorized Manager PIN override is supplied', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const productId = new mongoose.Types.ObjectId();

      vi.spyOn(Shift, 'findOne').mockResolvedValue({ _id: new mongoose.Types.ObjectId(), status: 'open' } as any);
      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({
        _id: variantId,
        productId,
        shopId,
        msp: 10000,
        purchaseCost: 8000,
        currentStock: 10,
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

      vi.spyOn(Customer, 'findOne').mockResolvedValue({
        _id: customerId,
        shopId,
        fullName: 'Mahmudul Hasan',
        creditLimit: '10000.00',
        currentDueBalance: '2000.00',
        isDeleted: false
      } as any);

      vi.spyOn(User, 'find').mockResolvedValue([mockManager] as any);
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);

      const checkoutRes = await PosService.processCheckout({
        shopId,
        userId,
        idempotencyKey: crypto.randomUUID(),
        payload: {
          customerId: customerId.toString(),
          managerPin: '1234',
          items: [{ variantId: variantId.toString(), quantity: 1, unitPrice: 10000 }],
          payments: [{ paymentMethod: 'customer_due', amountReceived: 0, amountApplied: 10000 }]
        }
      });

      expect(checkoutRes.dueAmount).toBe('10000.00');
    });
  });

  // =========================================================================
  // 5. TX-06: BAKIR KHATA DUE COLLECTION & FIFO ALLOCATION
  // =========================================================================
  describe('TX-06: Bakir Khata Due Collection & FIFO Allocation', () => {
    it('allocates collected due across multiple unpaid sales in FIFO order and dispatches automated SMS', async () => {
      // Customer has 2 unpaid invoices:
      // Invoice 1 (older): ৳3,000 due
      // Invoice 2 (newer): ৳5,000 due
      // Total due = ৳8,000
      // Cashier collects ৳5,000 cash payment:
      // FIFO: Invoice 1 gets ৳3,000 (its due becomes 0); Invoice 2 gets ৳2,000 (its due becomes ৳3,000).
      // Customer remaining due = ৳3,000.
      const sale1 = {
        _id: new mongoose.Types.ObjectId(),
        invoiceNo: 'INV-202610-00101',
        dueAmount: '3000.00',
        paidAmount: '2000.00',
        createdAt: new Date('2026-10-01'),
        save: vi.fn().mockResolvedValue(true)
      };

      const sale2 = {
        _id: new mongoose.Types.ObjectId(),
        invoiceNo: 'INV-202610-00102',
        dueAmount: '5000.00',
        paidAmount: '10000.00',
        createdAt: new Date('2026-10-05'),
        save: vi.fn().mockResolvedValue(true)
      };

      const customerWithDue = {
        _id: customerId,
        shopId,
        fullName: 'Mahmudul Hasan',
        phone: '01812345678',
        currentDueBalance: '8000.00',
        isDeleted: false,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Customer, 'findOne').mockResolvedValue(customerWithDue as any);
      vi.spyOn(MoneyReceipt, 'findOne').mockResolvedValue(null);
      vi.spyOn(MoneyReceipt.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(SmsLog.prototype, 'save').mockResolvedValue(true as any);

      // Return sales in FIFO order
      vi.spyOn(Sale, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([sale1, sale2])
      } as any);

      const collectResult = await CustomerService.collectDue({
        shopId,
        userId,
        customerId: customerId.toString(),
        idempotencyKey: crypto.randomUUID(),
        amount: '5000.00',
        paymentMethod: 'cash',
        notes: 'Monthly due installment'
      });

      expect(collectResult.amountCollected).toBe('5000.00');
      expect(collectResult.previousDue).toBe('8000.00');
      expect(collectResult.remainingDue).toBe('3000.00');
      expect(collectResult.allocatedInvoices).toHaveLength(2);

      // Invoice 1 received ৳3,000 (fully paid off)
      expect(collectResult.allocatedInvoices[0].invoiceNo).toBe('INV-202610-00101');
      expect(collectResult.allocatedInvoices[0].amountAllocated).toBe('3000.00');
      expect(sale1.dueAmount).toBe('0.00');

      // Invoice 2 received ৳2,000 (remaining due ৳3,000)
      expect(collectResult.allocatedInvoices[1].invoiceNo).toBe('INV-202610-00102');
      expect(collectResult.allocatedInvoices[1].amountAllocated).toBe('2000.00');
      expect(sale2.dueAmount).toBe('3000.00');

      // Customer remaining due updated
      expect(customerWithDue.currentDueBalance).toBe('3000.00');

      // Verify Double-Entry Journal (TX-06):
      const postCall = vi.mocked(AccountingService.postDoubleEntryJournal).mock.calls[0][0];
      const cashDebit = postCall.entries.find((e) => e.accountCode === '1.1.01');
      const arCredit = postCall.entries.find((e) => e.accountCode === '1.4.01');

      expect(Number(cashDebit?.debit)).toBe(5000);
      expect(Number(arCredit?.credit)).toBe(5000);

      // Verify Automated SMS Dispatch:
      const sentSms = mockSmsDriver.getMessages();
      expect(sentSms.length).toBeGreaterThanOrEqual(1);
      const lastSms = sentSms[sentSms.length - 1];
      expect(lastSms.to).toBe('01812345678');
      expect(lastSms.message).toContain('received ৳5000.00 for Bakir Khata');
      expect(lastSms.message).toContain('Remaining due: ৳3000.00');
    });

    it('rejects collection amount exceeding customer outstanding due', async () => {
      vi.spyOn(Customer, 'findOne').mockResolvedValue({
        _id: customerId,
        shopId,
        fullName: 'Mahmudul Hasan',
        currentDueBalance: '1500.00',
        isDeleted: false
      } as any);

      await expect(
        CustomerService.collectDue({
          shopId,
          userId,
          customerId: customerId.toString(),
          idempotencyKey: crypto.randomUUID(),
          amount: '2000.00', // ৳2,000 > ৳1,500 due
          paymentMethod: 'cash'
        })
      ).rejects.toThrow('AMOUNT_EXCEEDS_DUE');
    });
  });

  // =========================================================================
  // 6. IDEMPOTENCY RETRY & DEDUPLICATION
  // =========================================================================
  describe('Idempotency Retry & Deduplication', () => {
    it('returns existing return voucher on duplicate idempotency key without duplicate journals', async () => {
      const crvId = new mongoose.Types.ObjectId();
      const mockExistingCrv = {
        _id: crvId,
        shopId,
        crvNo: 'CRV-202610-00999',
        invoiceNo: 'INV-202610-00142',
        idempotencyKey: 'dup_key_return',
        totalReturnAmount: '5000.00',
        dueReductionAmount: '0.00',
        refundAmount: '5000.00',
        refundMethod: 'cash',
        returnedItems: [{ quantity: 1, refundPrice: '5000.00' }]
      };

      vi.spyOn(CustomerReturnVoucher, 'findOne').mockResolvedValue(mockExistingCrv as any);

      const res = await ReturnsService.processSalesReturn({
        shopId,
        userId,
        idempotencyKey: 'dup_key_return',
        invoiceNo: 'INV-202610-00142',
        items: [{ variantId: new mongoose.Types.ObjectId().toString(), quantity: 1, refundPrice: '5000.00' }]
      });

      expect(res.crvNo).toBe('CRV-202610-00999');
      expect(AccountingService.postDoubleEntryJournal).not.toHaveBeenCalled();
    });

    it('returns existing money receipt on duplicate idempotency key without double-collecting', async () => {
      const receiptId = new mongoose.Types.ObjectId();
      const mockExistingReceipt = {
        _id: receiptId,
        shopId,
        receiptNo: 'MR-202610-00888',
        customerId,
        amount: '2000.00',
        previousDue: '5000.00',
        remainingDue: '3000.00',
        paymentMethod: 'cash',
        allocatedInvoices: [{ saleId: new mongoose.Types.ObjectId(), invoiceNo: 'INV-01', amountAllocated: '2000.00' }]
      };

      vi.spyOn(MoneyReceipt, 'findOne').mockResolvedValue(mockExistingReceipt as any);

      const res = await CustomerService.collectDue({
        shopId,
        userId,
        customerId: customerId.toString(),
        idempotencyKey: 'dup_key_due',
        amount: '2000.00',
        paymentMethod: 'cash'
      });

      expect(res.receiptNo).toBe('MR-202610-00888');
      expect(AccountingService.postDoubleEntryJournal).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 7. CUSTOMER 360° STATEMENT & AUTOMATED SMS REMINDERS
  // =========================================================================
  describe('Customer 360° Statement & SMS Reminders', () => {
    it('dispatches one-click due SMS reminder to customer with outstanding balance', async () => {
      vi.spyOn(Customer, 'findOne').mockResolvedValue({
        _id: customerId,
        shopId,
        fullName: 'Mahmudul Hasan',
        phone: '01812345678',
        currentDueBalance: '4500.00',
        isDeleted: false
      } as any);
      vi.spyOn(SmsLog.prototype, 'save').mockResolvedValue(true as any);

      const res = await CustomerService.sendDueSmsReminder(shopId, customerId.toString());

      expect(res.success).toBe(true);
      expect(res.recipientPhone).toBe('01812345678');
      expect(res.currentDue).toBe('4500.00');

      const sent = mockSmsDriver.getMessages();
      expect(sent[sent.length - 1].message).toContain('outstanding balance at Eastern Plaza Telecom is ৳4500.00');
    });

    it('rejects sending due SMS reminder if customer has zero due', async () => {
      vi.spyOn(Customer, 'findOne').mockResolvedValue({
        _id: customerId,
        shopId,
        fullName: 'Mahmudul Hasan',
        phone: '01812345678',
        currentDueBalance: '0.00',
        isDeleted: false
      } as any);

      await expect(
        CustomerService.sendDueSmsReminder(shopId, customerId.toString())
      ).rejects.toThrow('NO_OUTSTANDING_DUE');
    });

    it('retrieves comprehensive 360° statement across all 4 customer tabs', async () => {
      vi.spyOn(Customer, 'findOne').mockResolvedValue({
        _id: customerId,
        shopId,
        fullName: 'Mahmudul Hasan',
        phone: '01812345678',
        creditLimit: '25000.00',
        currentDueBalance: '3000.00',
        isDeleted: false,
        toObject: () => ({ fullName: 'Mahmudul Hasan', phone: '01812345678' })
      } as any);

      // Invoices
      vi.spyOn(Sale, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue([
            {
              invoiceNo: 'INV-001',
              grandTotalAmount: '15000.00',
              paidAmount: '12000.00',
              dueAmount: '3000.00',
              createdAt: new Date()
            }
          ])
        })
      } as any);

      // Money Receipts
      vi.spyOn(MoneyReceipt, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue([
            {
              receiptNo: 'MR-001',
              amount: '2000.00',
              paymentMethod: 'cash',
              createdAt: new Date()
            }
          ])
        })
      } as any);

      // Returns
      vi.spyOn(CustomerReturnVoucher, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([])
      } as any);

      // Kisti
      vi.spyOn(KistiContract, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue([])
        })
      } as any);

      // Service
      vi.spyOn(ServiceJob, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([])
      } as any);

      const statement = await CustomerService.getCustomerStatement(shopId, customerId.toString());

      expect(statement.summary.currentDueBalance).toBe('3000.00');
      expect(statement.summary.creditLimit).toBe('25000.00');
      expect(statement.summary.availableCredit).toBe('22000.00'); // 25,000 - 3,000 = 22,000
      expect(statement.tabs.invoices).toHaveLength(1);
      expect(statement.tabs.dueLedger.length).toBeGreaterThanOrEqual(1);
    });
  });
});
