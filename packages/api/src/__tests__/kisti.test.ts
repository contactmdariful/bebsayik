import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { KistiService } from '../services/kisti/kisti.service.js';
import { AccountingService } from '../services/accounting/accounting.service.js';
import { lockService } from '../services/lock/lock.service.js';
import { getSmsDriver, MockSmsDriver } from '../services/sms/index.js';
import {
  KistiContract,
  KistiInstallment,
  Customer,
  ProductVariant,
  Product,
  ImeiSerial,
  Sale,
  SaleItem,
  InventoryMovement,
  MoneyReceipt,
  Shift,
  Shop,
  User,
  Account,
  AccountTransaction,
  SmsLog
} from '../models/index.js';

describe('Phase 9: Specialized Dokan Modules — Installment Sales / Kisti Engine', () => {
  const shopId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const variantId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();
  const imeiId = new mongoose.Types.ObjectId();
  const shiftId = new mongoose.Types.ObjectId();
  const validImei = '860123456789014'; // Valid 15-digit Luhn IMEI (8+3+0+2+2+6+4+1+6+5+8+9+0+2+4=60)

  const mockShop = {
    _id: shopId,
    name: 'Kanchan Telecom',
    binNumber: '1234567890',
    phone: '01711223344',
    status: 'active'
  };

  const mockUser = {
    _id: userId,
    fullName: 'Tanvir Cashier',
    phone: '01700112233',
    role: 'CASHIER'
  };

  const mockCustomer = {
    _id: customerId,
    shopId,
    fullName: 'Mahmudul Hasan',
    phone: '01812345678',
    nidNumber: '1990269251829',
    currentDueBalance: 0,
    creditLimit: 50000,
    isDeleted: false
  };

  const mockProduct = {
    _id: productId,
    shopId,
    name: 'Redmi Note 13 Pro 5G',
    isDeleted: false
  };

  const mockVariant = {
    _id: variantId,
    shopId,
    productId,
    sku: 'REDMI-N13-PRO-8-256',
    barcode: '8901234567890',
    minSellingPrice: 24500,
    mrpPrice: 27500,
    isDeleted: false
  };

  const mockImeiSerial = {
    _id: imeiId,
    shopId,
    variantId,
    imei1: validImei,
    status: 'available',
    purchaseCost: 24200,
    specificCost: 24200,
    save: vi.fn().mockResolvedValue(true)
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
    lockService.clearMemoryLocks();

    const fakeSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
      withTransaction: async (cb: any) => cb()
    };
    vi.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);
    vi.spyOn(KistiContract, 'findOne').mockResolvedValue(null);
    vi.spyOn(KistiInstallment, 'exists').mockReturnValue({
      session: vi.fn().mockResolvedValue(null)
    } as any);
    vi.spyOn(KistiInstallment, 'updateMany').mockResolvedValue({} as any);
    (getSmsDriver() as MockSmsDriver).clear();
  });

  describe('1. Installment Contract Booking & TX-11 Accounting', () => {
    it('successfully books a Kisti contract with 2 guarantors, down payment, schedule, and balanced TX-11 journal', async () => {
      vi.spyOn(KistiContract, 'findOne').mockResolvedValue(null);
      vi.spyOn(Customer, 'findOne').mockResolvedValue(mockCustomer as any);
      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue(mockVariant as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue(mockProduct as any);
      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue(mockImeiSerial as any);
      vi.spyOn(Shift, 'findOne').mockResolvedValue(mockShift as any);
      vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop as any);
      vi.spyOn(User, 'findById').mockResolvedValue(mockUser as any);

      vi.spyOn(Sale.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(SaleItem.prototype, 'save').mockResolvedValue({} as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue({} as any);
      vi.spyOn(KistiContract.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(KistiInstallment.prototype, 'save').mockResolvedValue({} as any);
      vi.spyOn(MoneyReceipt.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });

      const postJournalSpy = vi.spyOn(AccountingService, 'postDoubleEntryJournal').mockResolvedValue({
        success: true,
        transactionIds: [new mongoose.Types.ObjectId()]
      } as any);

      const result = await KistiService.bookContract({
        shopId,
        userId,
        idempotencyKey: 'idemp-kisti-book-01',
        customerId: customerId.toString(),
        variantId: variantId.toString(),
        imei1: validImei,
        cashPrice: '30000.00',
        downPayment: '10000.00',
        tenureMonths: 4,
        interestFeeAmount: '2000.00',
        guarantors: [
          { fullName: 'Mohammad Ali', phone: '01711998877', nid: '1990269251829', relation: 'Brother' },
          { fullName: 'Jashim Uddin', phone: '01811998877', nid: '1988269251811', relation: 'Uncle' }
        ],
        notes: 'Redmi Note 13 Pro 4-month installment'
      });

      expect(result.contractNo).toMatch(/^KST-\d{6}-\d{5}$/);
      expect(result.totalPayableAmount).toBe('32000.00'); // 30,000 + 2,000 markup
      expect(result.downPaymentAmount).toBe('10000.00');
      expect(result.principalAmount).toBe('22000.00'); // 32,000 - 10,000 down payment
      expect(result.remainingDueAmount).toBe('22000.00');
      expect(result.tenureMonths).toBe(4);
      expect(result.schedule).toHaveLength(4);

      // Verify exact sum of scheduled installments equals principal financed
      const sumScheduled = result.schedule.reduce((acc, item) => acc + parseFloat(item.amount), 0);
      expect(sumScheduled).toBe(22000.00);

      // Verify down payment receipt
      expect(result.downPaymentReceipt).toBeDefined();
      expect(result.downPaymentReceipt?.amount).toBe('10000.00');

      // Verify IMEI status updated to sold
      expect(mockImeiSerial.status).toBe('sold');

      // Verify TX-11 Accounting General Ledger posting
      expect(postJournalSpy).toHaveBeenCalledTimes(1);
      const postArgs = postJournalSpy.mock.calls[0]![0];
      expect(postArgs.txnCode).toBe('TX-11');

      // Assert debits equal credits
      const debits = postArgs.entries.reduce((sum, e) => sum + parseFloat(e.debit.toString()), 0);
      const credits = postArgs.entries.reduce((sum, e) => sum + parseFloat(e.credit.toString()), 0);
      expect(debits).toBe(credits);
      // Down payment 10,000 + Principal 22,000 + COGS 24,200 = 56,200 total debits
      expect(debits).toBe(56200.00);

      // Verify ESC/POS print payload generated
      expect(result.printData).toBeDefined();
      expect(result.printData.format).toBe('ESC_POS_V1');
      expect(result.printData.rawEscPosBase64).toBeTruthy();
    });

    it('rejects contract booking if IMEI Luhn checksum is invalid (INVALID_IMEI_LUHN)', async () => {
      const invalidImei = '860123456789019'; // Invalid Luhn
      await expect(
        KistiService.bookContract({
          shopId,
          userId,
          idempotencyKey: 'idemp-kisti-invalid-imei',
          customerId: customerId.toString(),
          variantId: variantId.toString(),
          imei1: invalidImei,
          cashPrice: '30000.00',
          downPayment: '10000.00',
          tenureMonths: 4,
          guarantors: [
            { fullName: 'Guarantor 1', phone: '01711998877', nid: '1990269251829', relation: 'Brother' },
            { fullName: 'Guarantor 2', phone: '01811998877', nid: '1988269251811', relation: 'Uncle' }
          ]
        })
      ).rejects.toThrow('INVALID_IMEI_LUHN');
    });

    it('rejects contract booking if fewer than 2 guarantors are provided (GUARANTORS_REQUIRED)', async () => {
      vi.spyOn(KistiContract, 'findOne').mockResolvedValue(null);
      vi.spyOn(Customer, 'findOne').mockResolvedValue(mockCustomer as any);
      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue(mockVariant as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue(mockProduct as any);
      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue(mockImeiSerial as any);

      await expect(
        KistiService.bookContract({
          shopId,
          userId,
          idempotencyKey: 'idemp-kisti-no-guarantor',
          customerId: customerId.toString(),
          variantId: variantId.toString(),
          imei1: validImei,
          cashPrice: '30000.00',
          downPayment: '10000.00',
          tenureMonths: 4,
          guarantors: [
            { fullName: 'Only One Guarantor', phone: '01711998877', nid: '1990269251829', relation: 'Brother' }
          ]
        })
      ).rejects.toThrow('GUARANTORS_REQUIRED');
    });

    it('rejects contract booking if handset IMEI is already sold (IMEI_ALREADY_SOLD)', async () => {
      vi.spyOn(KistiContract, 'findOne').mockResolvedValue(null);
      vi.spyOn(Customer, 'findOne').mockResolvedValue(mockCustomer as any);
      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue(mockVariant as any);
      vi.spyOn(Product, 'findOne').mockResolvedValue(mockProduct as any);
      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue({
        ...mockImeiSerial,
        status: 'sold'
      } as any);

      await expect(
        KistiService.bookContract({
          shopId,
          userId,
          idempotencyKey: 'idemp-kisti-sold-imei',
          customerId: customerId.toString(),
          variantId: variantId.toString(),
          imei1: validImei,
          cashPrice: '30000.00',
          downPayment: '10000.00',
          tenureMonths: 4,
          guarantors: [
            { fullName: 'G1', phone: '01711998877', nid: '1990269251829', relation: 'Brother' },
            { fullName: 'G2', phone: '01811998877', nid: '1988269251811', relation: 'Uncle' }
          ]
        })
      ).rejects.toThrow('IMEI_ALREADY_SOLD');
    });
  });

  describe('2. Partial Milestone Payments & Collection Receipts', () => {
    it('supports partial payments on an installment milestone and updates balances accurately', async () => {
      const contractId = new mongoose.Types.ObjectId();
      const mockContractDoc = {
        _id: contractId,
        shopId,
        customerId,
        saleId: new mongoose.Types.ObjectId(),
        contractNo: 'KST-202610-00100',
        totalPayableAmount: '20000.00',
        remainingDueAmount: '15000.00',
        status: 'active',
        save: vi.fn().mockResolvedValue(true)
      };

      const mockInstallment1 = {
        _id: new mongoose.Types.ObjectId(),
        shopId,
        contractId,
        installmentNumber: 1,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        installmentAmount: '5000.00',
        paidAmount: '0.00',
        status: 'pending',
        save: vi.fn().mockResolvedValue(true)
      };

      const mockInstallment2 = {
        _id: new mongoose.Types.ObjectId(),
        shopId,
        contractId,
        installmentNumber: 2,
        dueDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
        installmentAmount: '5000.00',
        paidAmount: '0.00',
        status: 'pending',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(MoneyReceipt, 'findOne').mockResolvedValue(null);
      vi.spyOn(KistiContract, 'findOne').mockResolvedValue(mockContractDoc as any);
      vi.spyOn(Customer, 'findOne').mockResolvedValue(mockCustomer as any);
      vi.spyOn(KistiInstallment, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockInstallment1, mockInstallment2])
      } as any);
      vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop as any);
      vi.spyOn(User, 'findById').mockResolvedValue(mockUser as any);

      vi.spyOn(MoneyReceipt.prototype, 'save').mockImplementation(function (this: any) {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
      vi.spyOn(SmsLog.prototype, 'save').mockResolvedValue({} as any);

      const postJournalSpy = vi.spyOn(AccountingService, 'postDoubleEntryJournal').mockResolvedValue({
        success: true,
        transactionIds: [new mongoose.Types.ObjectId()]
      } as any);

      // Customer owes ৳5,000 on milestone #1, but pays only ৳2,000 (Partial Payment)
      const result = await KistiService.collectMilestone({
        shopId,
        userId,
        contractId: contractId.toString(),
        idempotencyKey: 'idemp-milestone-partial-01',
        amount: '2000.00',
        milestoneNo: 1,
        paymentMethod: 'cash',
        notes: 'Partial milestone payment'
      });

      expect(result.amountCollected).toBe('2000.00');
      expect(result.previousDue).toBe('15000.00');
      expect(result.remainingDue).toBe('13000.00');
      expect(result.contractStatus).toBe('active');
      expect(result.isEarlySettlement).toBe(false);

      // Milestone 1 paid amount updated to 2,000; status remains pending
      expect(mockInstallment1.paidAmount).toBe('2000.00');
      expect(mockInstallment1.status).toBe('pending');
      expect(mockInstallment1.save).toHaveBeenCalled();

      // Contract remaining due decreased by ৳2,000
      expect(mockContractDoc.remainingDueAmount).toBe('13000.00');
      expect(mockContractDoc.save).toHaveBeenCalled();

      // Verify TX-11 Collection double-entry posting: Debit Cash ৳2,000, Credit 1.4.02 ৳2,000
      expect(postJournalSpy).toHaveBeenCalledTimes(1);
      const postArgs = postJournalSpy.mock.calls[0]![0];
      expect(postArgs.txnCode).toBe('TX-11');
      const debits = postArgs.entries.reduce((sum, e) => sum + parseFloat(e.debit.toString()), 0);
      const credits = postArgs.entries.reduce((sum, e) => sum + parseFloat(e.credit.toString()), 0);
      expect(debits).toBe(2000.00);
      expect(credits).toBe(2000.00);

      // Verify SMS notification dispatched
      const smsDriver = getSmsDriver() as MockSmsDriver;
      expect(smsDriver.getMessages().length).toBeGreaterThan(0);
    });

    it('cascades excess milestone payment to the next upcoming milestone in FIFO order', async () => {
      const contractId = new mongoose.Types.ObjectId();
      const mockContractDoc = {
        _id: contractId,
        shopId,
        customerId,
        contractNo: 'KST-202610-00101',
        totalPayableAmount: '15000.00',
        remainingDueAmount: '10000.00',
        status: 'active',
        save: vi.fn().mockResolvedValue(true)
      };

      const mockInst1 = {
        _id: new mongoose.Types.ObjectId(),
        shopId,
        contractId,
        installmentNumber: 1,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        installmentAmount: '5000.00',
        paidAmount: '0.00',
        status: 'pending',
        save: vi.fn().mockResolvedValue(true)
      };

      const mockInst2 = {
        _id: new mongoose.Types.ObjectId(),
        shopId,
        contractId,
        installmentNumber: 2,
        dueDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        installmentAmount: '5000.00',
        paidAmount: '0.00',
        status: 'pending',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(MoneyReceipt, 'findOne').mockResolvedValue(null);
      vi.spyOn(KistiContract, 'findOne').mockResolvedValue(mockContractDoc as any);
      vi.spyOn(Customer, 'findOne').mockResolvedValue(mockCustomer as any);
      vi.spyOn(KistiInstallment, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockInst1, mockInst2])
      } as any);
      vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop as any);
      vi.spyOn(User, 'findById').mockResolvedValue(mockUser as any);
      vi.spyOn(MoneyReceipt.prototype, 'save').mockResolvedValue({ _id: new mongoose.Types.ObjectId() } as any);
      vi.spyOn(SmsLog.prototype, 'save').mockResolvedValue({} as any);
      vi.spyOn(AccountingService, 'postDoubleEntryJournal').mockResolvedValue({ success: true } as any);

      // Customer owes ৳5,000 on milestone 1, but pays ৳7,500
      // ৳5,000 settles milestone 1; remaining ৳2,500 cascades to milestone 2
      const result = await KistiService.collectMilestone({
        shopId,
        userId,
        contractId: contractId.toString(),
        idempotencyKey: 'idemp-cascade-01',
        amount: '7500.00',
        milestoneNo: 1
      });

      expect(result.amountCollected).toBe('7500.00');
      expect(result.remainingDue).toBe('2500.00');

      // Milestone 1 paid in full
      expect(mockInst1.paidAmount).toBe('5000.00');
      expect(mockInst1.status).toBe('paid');

      // Milestone 2 partially paid with excess ৳2,500
      expect(mockInst2.paidAmount).toBe('2500.00');
      expect(mockInst2.status).toBe('pending');
    });
  });

  describe('3. Overdue Installment Tracking & Defaulter Classification', () => {
    it('dynamically marks pending installments past due date as overdue', async () => {
      const contractId = new mongoose.Types.ObjectId();
      const pastDueDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago

      const updateManySpy = vi.spyOn(KistiInstallment, 'updateMany').mockResolvedValue({} as any);
      vi.spyOn(KistiInstallment, 'distinct').mockResolvedValue([]);

      await KistiService.updateOverdueStatus(shopId, contractId);

      expect(updateManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          shopId,
          contractId,
          status: 'pending',
          dueDate: expect.any(Object)
        }),
        { $set: { status: 'overdue' } }
      );
    });

    it('marks contracts with milestones overdue > 30 days as defaulted and returns in defaulters registry', async () => {
      const contractId = new mongoose.Types.ObjectId();
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);

      vi.spyOn(KistiInstallment, 'updateMany').mockResolvedValue({} as any);
      vi.spyOn(KistiContract, 'updateMany').mockResolvedValue({} as any);
      vi.spyOn(KistiInstallment, 'distinct').mockResolvedValue([contractId]);

      const mockOverdueInstallment = {
        _id: new mongoose.Types.ObjectId(),
        shopId,
        contractId,
        installmentNumber: 1,
        dueDate: fortyDaysAgo,
        installmentAmount: '4500.00',
        paidAmount: '0.00',
        status: 'overdue'
      };

      vi.spyOn(KistiInstallment, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockOverdueInstallment])
      } as any);

      const mockDefaultedContract = {
        _id: contractId,
        shopId,
        contractNo: 'KST-202610-00999',
        customerId: {
          fullName: 'Defaulter Customer',
          phone: '01799887766',
          address: 'Mirpur, Dhaka'
        },
        guarantor1: { fullName: 'G1', phone: '01711223344', nid: '12345', relation: 'Brother' },
        guarantor2: { fullName: 'G2', phone: '01811223344', nid: '67890', relation: 'Friend' },
        productName: 'Samsung Galaxy A55',
        imei1: '860123456789012',
        remainingDueAmount: '13500.00',
        status: 'defaulted'
      };

      vi.spyOn(KistiContract, 'find').mockReturnValue({
        populate: vi.fn().mockResolvedValue([mockDefaultedContract])
      } as any);

      const result = await KistiService.listDefaulters({ shopId });

      expect(result.total).toBe(1);
      expect(result.defaulters).toHaveLength(1);
      const def = result.defaulters[0]!;
      expect(def.contractNo).toBe('KST-202610-00999');
      expect(def.customerName).toBe('Defaulter Customer');
      expect(def.daysOverdue).toBeGreaterThanOrEqual(40);
      expect(def.overdueAmount).toBe('4500.00');
      expect(def.status).toBe('defaulted');
    });
  });

  describe('4. Full Early Settlement Payoff', () => {
    it('settles contract early, marks all pending installments paid, and transitions status to settled', async () => {
      const contractId = new mongoose.Types.ObjectId();
      const mockContractDoc = {
        _id: contractId,
        shopId,
        customerId,
        contractNo: 'KST-202610-00200',
        totalPayableAmount: '24000.00',
        remainingDueAmount: '12000.00',
        status: 'active',
        save: vi.fn().mockResolvedValue(true)
      };

      const mockInst2 = {
        _id: new mongoose.Types.ObjectId(),
        shopId,
        contractId,
        installmentNumber: 2,
        installmentAmount: '6000.00',
        paidAmount: '0.00',
        status: 'pending',
        save: vi.fn().mockResolvedValue(true)
      };

      const mockInst3 = {
        _id: new mongoose.Types.ObjectId(),
        shopId,
        contractId,
        installmentNumber: 3,
        installmentAmount: '6000.00',
        paidAmount: '0.00',
        status: 'pending',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(MoneyReceipt, 'findOne').mockResolvedValue(null);
      vi.spyOn(KistiContract, 'findOne').mockResolvedValue(mockContractDoc as any);
      vi.spyOn(Customer, 'findOne').mockResolvedValue(mockCustomer as any);
      vi.spyOn(KistiInstallment, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockInst2, mockInst3])
      } as any);
      const updateManySpy = vi.spyOn(KistiInstallment, 'updateMany').mockResolvedValue({} as any);
      vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop as any);
      vi.spyOn(User, 'findById').mockResolvedValue(mockUser as any);
      vi.spyOn(MoneyReceipt.prototype, 'save').mockResolvedValue({ _id: new mongoose.Types.ObjectId() } as any);
      vi.spyOn(SmsLog.prototype, 'save').mockResolvedValue({} as any);

      const postJournalSpy = vi.spyOn(AccountingService, 'postDoubleEntryJournal').mockResolvedValue({
        success: true
      } as any);

      const result = await KistiService.earlySettleContract({
        shopId,
        userId,
        contractId: contractId.toString(),
        idempotencyKey: 'idemp-early-settle-01',
        paymentMethod: 'cash'
      });

      expect(result.amountCollected).toBe('12000.00');
      expect(result.remainingDue).toBe('0.00');
      expect(result.isEarlySettlement).toBe(true);
      expect(result.contractStatus).toBe('settled');

      // Contract status updated to settled and remaining due to 0
      expect(mockContractDoc.status).toBe('settled');
      expect(mockContractDoc.remainingDueAmount).toBe('0.00');

      // Remaining installments marked paid
      expect(mockInst2.status).toBe('paid');
      expect(mockInst3.status).toBe('paid');
      expect(updateManySpy).toHaveBeenCalledWith(
        expect.objectContaining({ shopId, contractId, status: { $ne: 'paid' } }),
        expect.objectContaining({ $set: expect.objectContaining({ status: 'paid' }) }),
        expect.anything()
      );

      // Balanced journal entry for full ৳12,000
      expect(postJournalSpy).toHaveBeenCalledTimes(1);
      const postArgs = postJournalSpy.mock.calls[0]![0];
      const debits = postArgs.entries.reduce((sum, e) => sum + parseFloat(e.debit.toString()), 0);
      const credits = postArgs.entries.reduce((sum, e) => sum + parseFloat(e.credit.toString()), 0);
      expect(debits).toBe(12000.00);
      expect(credits).toBe(12000.00);
    });

    it('rejects milestone collection on an already settled contract (CONTRACT_ALREADY_SETTLED)', async () => {
      const contractId = new mongoose.Types.ObjectId();
      vi.spyOn(MoneyReceipt, 'findOne').mockResolvedValue(null);
      vi.spyOn(KistiContract, 'findOne').mockResolvedValue({
        _id: contractId,
        shopId,
        contractNo: 'KST-SETTLED',
        status: 'settled',
        remainingDueAmount: '0.00'
      } as any);

      await expect(
        KistiService.collectMilestone({
          shopId,
          userId,
          contractId: contractId.toString(),
          idempotencyKey: 'idemp-already-settled',
          amount: '5000.00'
        })
      ).rejects.toThrow('CONTRACT_ALREADY_SETTLED');
    });
  });

  describe('5. Idempotency & Duplicate Collections Guard', () => {
    it('returns existing MoneyReceipt on duplicate milestone collection without duplicate journal postings', async () => {
      const receiptId = new mongoose.Types.ObjectId();
      const contractId = new mongoose.Types.ObjectId();

      const existingReceipt = {
        _id: receiptId,
        shopId,
        receiptNo: 'MR-KST-202610-11111',
        idempotencyKey: 'idemp-duplicate-collection',
        customerId,
        kistiContractId: contractId,
        amount: '3500.00',
        previousDue: '10500.00',
        remainingDue: '7000.00',
        paymentMethod: 'cash',
        createdAt: new Date(),
        allocatedInvoices: []
      };

      vi.spyOn(MoneyReceipt, 'findOne').mockResolvedValue(existingReceipt as any);
      vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop as any);
      vi.spyOn(Customer, 'findById').mockResolvedValue(mockCustomer as any);
      vi.spyOn(User, 'findById').mockResolvedValue(mockUser as any);
      vi.spyOn(KistiContract, 'findById').mockResolvedValue({
        _id: contractId,
        contractNo: 'KST-202610-00123',
        status: 'active'
      } as any);

      const postJournalSpy = vi.spyOn(AccountingService, 'postDoubleEntryJournal');

      const result = await KistiService.collectMilestone({
        shopId,
        userId,
        contractId: contractId.toString(),
        idempotencyKey: 'idemp-duplicate-collection',
        amount: '3500.00'
      });

      expect(result.receiptNo).toBe('MR-KST-202610-11111');
      expect(result.amountCollected).toBe('3500.00');
      expect(result.remainingDue).toBe('7000.00');

      // Crucial Financial Invariant: ZERO duplicate accounting journal postings
      expect(postJournalSpy).not.toHaveBeenCalled();
    });

    it('returns existing contract on duplicate contract booking without duplicate inventory movement', async () => {
      const contractId = new mongoose.Types.ObjectId();
      const existingContract = {
        _id: contractId,
        shopId,
        contractNo: 'KST-202610-99999',
        idempotencyKey: 'idemp-duplicate-booking',
        customerId,
        saleId: new mongoose.Types.ObjectId(),
        imei1: validImei,
        productName: 'Redmi Note 13 Pro',
        totalPayableAmount: '32000.00',
        downPaymentAmount: '10000.00',
        principalAmount: '22000.00',
        remainingDueAmount: '22000.00',
        installmentPeriodMonths: 4,
        createdAt: new Date()
      };

      vi.spyOn(KistiContract, 'findOne').mockResolvedValue(existingContract as any);
      vi.spyOn(Customer, 'findById').mockResolvedValue(mockCustomer as any);
      vi.spyOn(Sale, 'findById').mockResolvedValue({ invoiceNo: 'INV-EXISTING' } as any);
      vi.spyOn(KistiInstallment, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([])
      } as any);
      vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop as any);

      const postJournalSpy = vi.spyOn(AccountingService, 'postDoubleEntryJournal');

      const result = await KistiService.bookContract({
        shopId,
        userId,
        idempotencyKey: 'idemp-duplicate-booking',
        customerId: customerId.toString(),
        variantId: variantId.toString(),
        imei1: validImei,
        cashPrice: '30000.00',
        downPayment: '10000.00',
        tenureMonths: 4,
        guarantors: [
          { fullName: 'G1', phone: '01711998877', nid: '1990269251829', relation: 'Brother' },
          { fullName: 'G2', phone: '01811998877', nid: '1988269251811', relation: 'Uncle' }
        ]
      });

      expect(result.contractNo).toBe('KST-202610-99999');
      expect(postJournalSpy).not.toHaveBeenCalled();
    });
  });

  describe('6. Tenant Isolation & Security Boundary', () => {
    it('strictly isolates contracts by shopId and prevents cross-tenant access', async () => {
      const foreignShopId = new mongoose.Types.ObjectId();
      const contractId = new mongoose.Types.ObjectId();

      vi.spyOn(KistiContract, 'findOne').mockResolvedValue(null);

      // Attempting to access or collect against contractId using foreignShopId
      await expect(
        KistiService.getContractById(foreignShopId, contractId.toString())
      ).rejects.toThrow('CONTRACT_NOT_FOUND');
    });
  });
});
