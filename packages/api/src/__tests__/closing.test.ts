import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { ClosingService } from '../services/closing/closing.service.js';
import { AccountsService } from '../services/accounts/accounts.service.js';
import { HrService } from '../services/hr/hr.service.js';
import { FreshStartService } from '../services/shop/freshStart.service.js';
import { AccountingService } from '../services/accounting/accounting.service.js';
import { getSmsDriver, MockSmsDriver } from '../services/sms/index.js';
import { hashPassword } from '../utils/security.js';
import {
  Shift,
  ShiftDenomination,
  Sale,
  SaleItem,
  HeldCart,
  MoneyReceipt,
  CustomerReturnVoucher,
  StockTransferNote,
  InventoryMovement,
  DamagedStockScrap,
  WarrantyClaim,
  GoodsReceivedNote,
  PurchaseReturnVoucher,
  PurchaseOrder,
  KistiContract,
  KistiInstallment,
  BuybackAgreement,
  ServiceJob,
  ServicePartsConsumed,
  Account,
  AccountTransaction,
  PersonalLedgerTransaction,
  User,
  Shop,
  EmployeeTarget,
  PayrollLedger,
  Customer,
  Supplier,
  Product,
  ProductVariant,
  ImeiSerial
} from '../models/index.js';

describe('Phase 10: Accounts, Shift Closing & HR Engine', () => {
  const shopId = new mongoose.Types.ObjectId();
  const cashierId = new mongoose.Types.ObjectId();
  const ownerId = new mongoose.Types.ObjectId();
  const technicianId = new mongoose.Types.ObjectId();
  const shiftId = new mongoose.Types.ObjectId();

  const mockShop = {
    _id: shopId,
    name: 'Kanchan Telecom Hub',
    binNumber: '001234567-0101',
    phone: '01711000000',
    ownerUserId: ownerId,
    status: 'active'
  };

  const mockCashier = {
    _id: cashierId,
    fullName: 'Rakib Cashier',
    phone: '01711223344',
    role: 'CASHIER',
    shopId
  };

  const mockTechnician = {
    _id: technicianId,
    fullName: 'Sumon Dash (Lead Tech)',
    phone: '01811556677',
    role: 'TECHNICIAN',
    shopId
  };

  function mockQueryWithSession<T>(result: T) {
    const promise = Promise.resolve(result);
    return Object.assign(promise, {
      session: vi.fn().mockReturnValue(promise)
    });
  }

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
    vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop as any);
    vi.spyOn(AccountingService, 'seedDefaultChartOfAccounts').mockResolvedValue(0);
    (getSmsDriver() as MockSmsDriver).clear();
  });

  describe('1. Day-End Cash Closing & Single Recount Grace Protocol (Decision 4)', () => {
    it('successfully opens shift with morning starting float and rejects duplicate open shift', async () => {
      vi.spyOn(Shift, 'findOne').mockResolvedValue(null);
      const mockSavedShift = {
        _id: shiftId,
        shopId,
        cashierUserId: cashierId,
        openingCash: 3000,
        status: 'open',
        openedAt: new Date(),
        recountCount: 0,
        save: vi.fn().mockResolvedValue(true)
      };
      vi.spyOn(Shift.prototype, 'save').mockImplementation(mockSavedShift.save);

      const opened = await ClosingService.openShift({
        shopId,
        cashierUserId: cashierId,
        openingCash: '3000.00'
      });

      expect(opened.status).toBe('open');
      expect(opened.openingCash).toBe('3000.00');

      // Attempt opening second shift while first is active
      vi.spyOn(Shift, 'findOne').mockResolvedValue(mockSavedShift as any);
      await expect(
        ClosingService.openShift({
          shopId,
          cashierUserId: cashierId,
          openingCash: '2000.00'
        })
      ).rejects.toThrow(/Cashier already has an active open shift/);
    });

    it('accurately computes physical note denomination count and system expected variance', async () => {
      const activeShift = {
        _id: shiftId,
        shopId,
        cashierUserId: cashierId,
        openingCash: 2000,
        status: 'open',
        openedAt: new Date(Date.now() - 3600000),
        recountCount: 0,
        save: vi.fn().mockResolvedValue(true)
      };
      vi.spyOn(Shift, 'findOne').mockResolvedValue(activeShift as any);
      vi.spyOn(ShiftDenomination, 'findOneAndUpdate').mockResolvedValue({} as any);

      // System activity during shift
      // Sales: cash 68,500.00
      vi.spyOn(Sale, 'find').mockResolvedValue([
        {
          paymentMethods: [{ method: 'cash', amount: 68500 }]
        }
      ] as any);
      // Due Collections: cash 12,000.00
      vi.spyOn(MoneyReceipt, 'find').mockResolvedValue([
        {
          paymentMethod: 'cash',
          amount: 12000
        }
      ] as any);
      // Customer Returns: cash refund 5,000.00
      vi.spyOn(CustomerReturnVoucher, 'find').mockResolvedValue([
        {
          refundMethod: 'cash',
          refundAmount: 5000
        }
      ] as any);
      // Account transactions (e.g. OPEX expense 2,500 + supplier paid 20,000)
      vi.spyOn(Account, 'findOne').mockResolvedValue({ _id: new mongoose.Types.ObjectId() } as any);
      vi.spyOn(AccountTransaction, 'find').mockResolvedValue([
        { credit: 22500, debit: 0 }
      ] as any);

      // Expected Cash: 2000 + 68500 + 12000 - 5000 - 22500 = 55,000.00
      // Cashier submits physical notes:
      // 1000 x 42 = 42,000
      // 500  x 15 =  7,500
      // 200  x 10 =  2,000
      // 100  x 25 =  2,500
      // 50   x 12 =    600
      // 20   x 20 =    400
      // Total Physical: 55,000.00 -> Variance 0.00
      const countResult = await ClosingService.submitBlindCount({
        shopId,
        cashierUserId: cashierId,
        shiftId: shiftId.toString(),
        denominations: {
          note1000: 42,
          note500: 15,
          note200: 10,
          note100: 25,
          note50: 12,
          note20: 20,
          coins: 0
        }
      });

      expect(countResult.physicalCountedCash).toBe('55000.00');
      expect(countResult.expectedCash).toBe('55000.00');
      expect(countResult.cashDiscrepancy).toBe('0.00');
      expect(countResult.hasMismatch).toBe(false);
      expect(countResult.canRecount).toBe(true);
    });

    it('enforces Single Recount Grace Protocol: allows 1 recount, locks register and throws 422 on second recount', async () => {
      const activeShift = {
        _id: shiftId,
        shopId,
        cashierUserId: cashierId,
        openingCash: 5000,
        status: 'open',
        openedAt: new Date(),
        recountCount: 0,
        save: vi.fn().mockResolvedValue(true)
      };
      vi.spyOn(Shift, 'findOne').mockResolvedValue(activeShift as any);
      vi.spyOn(ShiftDenomination, 'findOneAndUpdate').mockResolvedValue({} as any);
      vi.spyOn(Sale, 'find').mockResolvedValue([]);
      vi.spyOn(MoneyReceipt, 'find').mockResolvedValue([]);
      vi.spyOn(CustomerReturnVoucher, 'find').mockResolvedValue([]);
      vi.spyOn(Account, 'findOne').mockResolvedValue(null);

      // Attempt recount 1: allowed
      const firstRecount = await ClosingService.submitBlindCount({
        shopId,
        cashierUserId: cashierId,
        shiftId: shiftId.toString(),
        denominations: { note1000: 5 },
        requestRecount: true
      });
      expect(firstRecount.recountCount).toBe(1);
      expect(firstRecount.canRecount).toBe(false);

      // Attempt recount 2: must throw RECOUNT_LIMIT_EXCEEDED
      activeShift.recountCount = 1;
      await expect(
        ClosingService.submitBlindCount({
          shopId,
          cashierUserId: cashierId,
          shiftId: shiftId.toString(),
          denominations: { note1000: 5 },
          requestRecount: true
        })
      ).rejects.toThrow(/RECOUNT_LIMIT_EXCEEDED/);
    });

    it('requires discrepancy reason when variance !== 0, produces Z-Report payload and owner SMS', async () => {
      const activeShift = {
        _id: shiftId,
        shopId,
        cashierUserId: cashierId,
        openingCash: 5000,
        closingCashExpected: 5000,
        closingCashActual: 4800, // Shortage ৳200
        cashDiscrepancy: -200,
        recountCount: 1,
        status: 'open',
        openedAt: new Date(Date.now() - 7200000),
        save: vi.fn().mockResolvedValue(true)
      };
      vi.spyOn(Shift, 'findOne').mockResolvedValue(activeShift as any);
      vi.spyOn(ShiftDenomination, 'findOne').mockResolvedValue({
        note1000: 4,
        note500: 1,
        note200: 1,
        note100: 1
      } as any);
      vi.spyOn(Shop, 'findById').mockResolvedValue(mockShop as any);
      vi.spyOn(User, 'findById').mockResolvedValue(mockCashier as any);

      // 1. Throws error if variance != 0 and no reason provided
      await expect(
        ClosingService.finalizeShift({
          shopId,
          cashierUserId: cashierId,
          shiftId: shiftId.toString(),
          reason: ''
        })
      ).rejects.toThrow(/DISCREPANCY_REASON_REQUIRED/);

      // 2. Succeeds when reason is provided
      const finalized = await ClosingService.finalizeShift({
        shopId,
        cashierUserId: cashierId,
        shiftId: shiftId.toString(),
        reason: 'Counter drawer change rounding shortage'
      });

      expect(finalized.status).toBe('closed');
      expect(finalized.discrepancy).toBe('-200.00');
      expect(finalized.smsSent).toBe(true);
      expect(finalized.printData).toBeDefined();

      const smsDriver = getSmsDriver() as MockSmsDriver;
      const lastSms = smsDriver.getLastMessage(mockShop.phone);
      expect(lastSms).toBeDefined();
      expect(lastSms?.message).toContain('Z-REPORT');
      expect(lastSms?.message).toContain('-200.00');
    });
  });

  describe('2. Chart of Accounts, Inter-Account Transfers & OPEX Vouchers', () => {
    it('executes inter-account transfer with funds validation and balanced double-entry journal', async () => {
      const fromAcct = {
        _id: new mongoose.Types.ObjectId(),
        shopId,
        code: '1.1.01',
        name: 'Cash in Drawer',
        accountType: 'asset',
        normalBalance: 'debit',
        currentBalance: 50000
      };
      const toAcct = {
        _id: new mongoose.Types.ObjectId(),
        shopId,
        code: '1.2.01',
        name: 'Bank Current Account',
        accountType: 'asset',
        normalBalance: 'debit',
        currentBalance: 100000
      };

      vi.spyOn(Account, 'findOne').mockImplementation(((filter: any) => {
        if (filter.code === '1.1.01') return mockQueryWithSession(fromAcct as any);
        if (filter.code === '1.2.01') return mockQueryWithSession(toAcct as any);
        return mockQueryWithSession(null);
      }) as any);

      vi.spyOn(AccountingService, 'postDoubleEntryJournal').mockResolvedValue({
        voucherNo: 'TRF-TEST',
        txnCode: 'TX_TRANSFER',
        totalDebits: '25000.00',
        totalCredits: '25000.00',
        transactionCount: 2
      });

      const transfer = await AccountsService.transferFunds({
        shopId,
        fromAccountCode: '1.1.01',
        toAccountCode: '1.2.01',
        amount: '25000.00',
        notes: 'Deposit excess cash to BRAC Bank',
        postedByUserId: ownerId
      });

      expect(transfer.amount).toBe('25000.00');
      expect(transfer.journalResult.totalDebits).toBe('25000.00');
      expect(transfer.journalResult.totalCredits).toBe('25000.00');

      // Rejects transfer when funds are insufficient
      await expect(
        AccountsService.transferFunds({
          shopId,
          fromAccountCode: '1.1.01',
          toAccountCode: '1.2.01',
          amount: '75000.00', // Greater than 50,000 available
          postedByUserId: ownerId
        })
      ).rejects.toThrow(/Insufficient funds/);
    });

    it('records OPEX petty expense voucher with balanced double-entry general ledger posting', async () => {
      const cashAcct = {
        _id: new mongoose.Types.ObjectId(),
        shopId,
        code: '1.1.01',
        name: 'Cash in Drawer',
        accountType: 'asset',
        normalBalance: 'debit',
        currentBalance: 5000
      };

      vi.spyOn(Account, 'findOne').mockImplementation(((filter: any) => {
        if (filter.code === '1.1.01') return mockQueryWithSession(cashAcct as any);
        return mockQueryWithSession(null);
      }) as any);

      vi.spyOn(AccountingService, 'postDoubleEntryJournal').mockResolvedValue({
        voucherNo: 'EXP-TEST',
        txnCode: 'TX_EXPENSE_PETTY',
        totalDebits: '350.00',
        totalCredits: '350.00',
        transactionCount: 2
      });

      const expense = await AccountsService.recordExpense({
        shopId,
        categoryCode: '6.1.04', // Tea & Entertainment OPEX
        paidFromAccountCode: '1.1.01',
        amount: '350.00',
        payeeName: 'Mamun Tea Stall',
        notes: 'Afternoon snacks for showroom team',
        postedByUserId: cashierId
      });

      expect(expense.amount).toBe('350.00');
      expect(expense.payeeName).toBe('Mamun Tea Stall');
      expect(expense.journalResult.totalDebits).toBe('350.00');
      expect(expense.journalResult.totalCredits).toBe('350.00');
    });
  });

  describe('3. HR, Sales Targets & Technician 50% Labor Split Payroll (TX-18)', () => {
    it('aggregates technician 50% split and disburses salary with balanced TX-18 journal & SMS', async () => {
      vi.spyOn(User, 'find').mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockResolvedValue([mockTechnician])
        })
      } as any);

      vi.spyOn(User, 'findById').mockResolvedValue(mockTechnician as any);

      // 24 completed repair jobs with ৳28,000 total labor billed -> ৳14,000 technician 50% share
      vi.spyOn(ServiceJob, 'aggregate').mockResolvedValue([
        {
          _id: technicianId,
          totalLaborBilled: 28000,
          totalTechnicianShare: 14000,
          jobCount: 24
        }
      ]);

      vi.spyOn(EmployeeTarget, 'find').mockResolvedValue([]);
      vi.spyOn(Sale, 'aggregate').mockResolvedValue([]);
      vi.spyOn(PayrollLedger, 'find').mockResolvedValue([]);
      vi.spyOn(PayrollLedger, 'findOneAndUpdate').mockResolvedValue({} as any);

      const bankAcct = {
        _id: new mongoose.Types.ObjectId(),
        shopId,
        code: '1.2.01',
        name: 'Bank Current Account',
        accountType: 'asset',
        normalBalance: 'debit',
        currentBalance: 50000
      };
      vi.spyOn(Account, 'findOne').mockImplementation(((filter: any) => {
        if (filter.code === '1.2.01') return mockQueryWithSession(bankAcct as any);
        return mockQueryWithSession(null);
      }) as any);

      vi.spyOn(AccountingService, 'postDoubleEntryJournal').mockResolvedValue({
        voucherNo: 'PAY-202610-001',
        txnCode: 'TX_PAYROLL_DISBURSEMENT',
        totalDebits: '29000.00',
        totalCredits: '29000.00',
        transactionCount: 3
      });

      // Payroll calculation: Base (15,000) + Tech Split (14,000) = 29,000.00
      const summary = await HrService.getPayrollSummary(shopId, '2026-10');
      expect(summary.items[0]?.repairCommission).toBe('14000.00');
      expect(summary.items[0]?.netPayable).toBe('29000.00');

      const disburseResult = await HrService.disbursePayroll({
        shopId,
        employeeUserId: technicianId,
        monthYear: '2026-10',
        disburseMethod: 'bank_transfer',
        postedByUserId: ownerId
      });

      expect(disburseResult.netPayable).toBe('29000.00');
      expect(disburseResult.journalResult.totalDebits).toBe('29000.00');
      expect(disburseResult.journalResult.totalCredits).toBe('29000.00');

      const smsDriver = getSmsDriver() as MockSmsDriver;
      const techSms = smsDriver.getLastMessage(mockTechnician.phone);
      expect(techSms).toBeDefined();
      expect(techSms?.message).toContain('29000.00');
    });

    it('rejects duplicate payroll disbursement for the same employee and period', async () => {
      vi.spyOn(User, 'find').mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockResolvedValue([mockTechnician])
        })
      } as any);
      vi.spyOn(User, 'findById').mockResolvedValue(mockTechnician as any);
      vi.spyOn(ServiceJob, 'aggregate').mockResolvedValue([]);
      vi.spyOn(EmployeeTarget, 'find').mockResolvedValue([]);
      vi.spyOn(Sale, 'aggregate').mockResolvedValue([]);

      // Existing disbursed ledger
      vi.spyOn(PayrollLedger, 'find').mockResolvedValue([
        {
          employeeUserId: technicianId,
          monthYear: '2026-10',
          baseSalary: 15000,
          repairCommission: 0,
          salesBonus: 0,
          deductions: 0,
          netPayable: 15000,
          paymentStatus: 'disbursed',
          payrollNo: 'PAY-202610-001'
        }
      ] as any);

      await expect(
        HrService.disbursePayroll({
          shopId,
          employeeUserId: technicianId,
          monthYear: '2026-10',
          postedByUserId: ownerId
        })
      ).rejects.toThrow(/already been disbursed/);
    });
  });

  describe('4. Pre-Launch Fresh Start Reset Protocol (TC-18)', () => {
    it('executes 2FA-secured purge of test data while strictly preserving master catalog and settings', async () => {
      const ownerPassword = 'SecretMasterPassword123!';
      const passwordHash = await hashPassword(ownerPassword);

      const ownerUser = {
        _id: ownerId,
        fullName: 'Kanchan Dhar (Owner)',
        phone: '01711000000',
        role: 'STORE_OWNER',
        passwordHash
      };

      vi.spyOn(User, 'findById').mockResolvedValue(ownerUser as any);

      // Mock deletion across all purged collections
      const dummyDelete = { deletedCount: 15 } as any;
      const dummyUpdate = { modifiedCount: 8 } as any;

      vi.spyOn(Sale, 'find').mockResolvedValue([{ _id: new mongoose.Types.ObjectId() }] as any);
      vi.spyOn(SaleItem, 'deleteMany').mockResolvedValue({ deletedCount: 25 } as any);
      vi.spyOn(Sale, 'deleteMany').mockResolvedValue({ deletedCount: 15 } as any);
      vi.spyOn(HeldCart, 'deleteMany').mockResolvedValue(dummyDelete);
      vi.spyOn(CustomerReturnVoucher, 'deleteMany').mockResolvedValue(dummyDelete);
      vi.spyOn(MoneyReceipt, 'deleteMany').mockResolvedValue(dummyDelete);

      vi.spyOn(Shift, 'find').mockResolvedValue([{ _id: new mongoose.Types.ObjectId() }] as any);
      vi.spyOn(ShiftDenomination, 'deleteMany').mockResolvedValue(dummyDelete);
      vi.spyOn(Shift, 'deleteMany').mockResolvedValue({ deletedCount: 3 } as any);

      vi.spyOn(StockTransferNote, 'deleteMany').mockResolvedValue(dummyDelete);
      vi.spyOn(InventoryMovement, 'deleteMany').mockResolvedValue(dummyDelete);
      vi.spyOn(DamagedStockScrap, 'deleteMany').mockResolvedValue(dummyDelete);
      vi.spyOn(WarrantyClaim, 'deleteMany').mockResolvedValue(dummyDelete);
      vi.spyOn(GoodsReceivedNote, 'deleteMany').mockResolvedValue(dummyDelete);
      vi.spyOn(PurchaseReturnVoucher, 'deleteMany').mockResolvedValue(dummyDelete);
      vi.spyOn(PurchaseOrder, 'deleteMany').mockResolvedValue(dummyDelete);

      vi.spyOn(KistiInstallment, 'deleteMany').mockResolvedValue(dummyDelete);
      vi.spyOn(KistiContract, 'deleteMany').mockResolvedValue(dummyDelete);
      vi.spyOn(BuybackAgreement, 'deleteMany').mockResolvedValue(dummyDelete);

      vi.spyOn(ServiceJob, 'find').mockResolvedValue([] as any);
      vi.spyOn(ServicePartsConsumed, 'deleteMany').mockResolvedValue(dummyDelete);
      vi.spyOn(ServiceJob, 'deleteMany').mockResolvedValue(dummyDelete);

      vi.spyOn(AccountTransaction, 'deleteMany').mockResolvedValue({ deletedCount: 30 } as any);
      vi.spyOn(PersonalLedgerTransaction, 'deleteMany').mockResolvedValue(dummyDelete);
      vi.spyOn(EmployeeTarget, 'deleteMany').mockResolvedValue(dummyDelete);
      vi.spyOn(PayrollLedger, 'deleteMany').mockResolvedValue(dummyDelete);

      vi.spyOn(ImeiSerial, 'updateMany').mockResolvedValue({ modifiedCount: 8 } as any);
      vi.spyOn(Customer, 'updateMany').mockResolvedValue(dummyUpdate);
      vi.spyOn(Supplier, 'updateMany').mockResolvedValue(dummyUpdate);
      vi.spyOn(Account, 'updateMany').mockResolvedValue(dummyUpdate);
      vi.spyOn(ProductVariant, 'updateMany').mockResolvedValue(dummyUpdate);

      // Verify master catalog queries are NOT touched for deletion
      const productDeleteSpy = vi.spyOn(Product, 'deleteMany');

      // Attempt with wrong password: must fail
      await expect(
        FreshStartService.executeFreshStartReset({
          shopId,
          ownerUserId: ownerId,
          masterPassword: 'wrong-password',
          confirmationPhrase: 'PURGE-TEST-TRANSACTIONS'
        })
      ).rejects.toThrow(/2FA authorization failed/);

      // Attempt with valid password & confirmation phrase: succeeds
      const result = await FreshStartService.executeFreshStartReset({
        shopId,
        ownerUserId: ownerId,
        masterPassword: ownerPassword,
        confirmationPhrase: 'PURGE-TEST-TRANSACTIONS'
      });

      expect(result.success).toBe(true);
      expect(result.purgeMetrics.sales).toBe(15);
      expect(result.purgeMetrics.shifts).toBe(3);
      expect(result.purgeMetrics.accountTransactions).toBe(30);
      expect(result.purgeMetrics.imeisReset).toBe(8);

      // STRICT PRESERVATION INVARIANT: Product catalog was NOT deleted
      expect(productDeleteSpy).not.toHaveBeenCalled();
    });
  });
});
