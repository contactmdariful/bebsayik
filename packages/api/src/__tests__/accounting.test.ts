import { describe, it, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import { AccountingService } from '../services/accounting/accounting.service.js';
import { Account, AccountTransaction } from '../models/index.js';

describe('Double-Entry General Ledger Engine (AccountingService)', () => {
  const shopId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  it('rejects postings where session is missing', async () => {
    await expect(AccountingService.postDoubleEntryJournal({
      shopId,
      voucherNo: 'V-001',
      txnCode: 'TX-01',
      sourceDocType: 'INV',
      postedByUserId: userId,
      entries: [
        { accountCode: '1.1.01', debit: '1000.00', credit: '0.00', description: 'Cash' },
        { accountCode: '4.1.01', debit: '0.00', credit: '1000.00', description: 'Revenue' }
      ],
      session: null as unknown as mongoose.ClientSession
    })).rejects.toThrow('Mandatory Mongoose ClientSession required');
  });

  it('rejects unbalanced journal entries where Debits !== Credits', async () => {
    const fakeSession = {} as mongoose.ClientSession;

    await expect(AccountingService.postDoubleEntryJournal({
      shopId,
      voucherNo: 'V-002',
      txnCode: 'TX-01',
      sourceDocType: 'INV',
      postedByUserId: userId,
      entries: [
        { accountCode: '1.1.01', debit: '1000.00', credit: '0.00', description: 'Cash' },
        { accountCode: '4.1.01', debit: '0.00', credit: '950.00', description: 'Revenue with disparity' }
      ],
      session: fakeSession
    })).rejects.toThrow('Double-entry imbalance');
  });

  it('rejects journals with fewer than 2 entries', async () => {
    const fakeSession = {} as mongoose.ClientSession;

    await expect(AccountingService.postDoubleEntryJournal({
      shopId,
      voucherNo: 'V-003',
      txnCode: 'TX-01',
      sourceDocType: 'INV',
      postedByUserId: userId,
      entries: [
        { accountCode: '1.1.01', debit: '1000.00', credit: '0.00', description: 'One leg only' }
      ],
      session: fakeSession
    })).rejects.toThrow('at least 2 entries');
  });

  it('successfully executes balanced multi-leg journal transaction', async () => {
    // Mock Account findOne and save, and AccountTransaction save
    const mockAccountCash = {
      _id: new mongoose.Types.ObjectId(),
      shopId,
      code: '1.1.01',
      name: 'Cash in Drawer',
      accountType: 'asset',
      normalBalance: 'debit',
      currentBalance: '5000.00',
      save: vi.fn().mockResolvedValue(true)
    };

    const mockAccountRevenue = {
      _id: new mongoose.Types.ObjectId(),
      shopId,
      code: '4.1.01',
      name: 'Sales Revenue',
      accountType: 'revenue',
      normalBalance: 'credit',
      currentBalance: '150000.00',
      save: vi.fn().mockResolvedValue(true)
    };

    vi.spyOn(Account, 'findOne').mockImplementation(((query: { code?: string }) => {
      const execSession = {
        session: vi.fn().mockResolvedValue(query.code === '1.1.01' ? mockAccountCash : mockAccountRevenue)
      };
      return execSession as any;
    }) as any);

    vi.spyOn(AccountTransaction, 'findOne').mockImplementation((() => ({
      session: vi.fn().mockResolvedValue(null)
    })) as any);

    vi.spyOn(AccountTransaction.prototype, 'save').mockResolvedValue(true as any);

    const fakeSession = {} as mongoose.ClientSession;

    const result = await AccountingService.postDoubleEntryJournal({
      shopId,
      voucherNo: 'V-202610-001',
      txnCode: 'TX-01',
      sourceDocType: 'INV',
      postedByUserId: userId,
      entries: [
        { accountCode: '1.1.01', debit: '25000.00', credit: '0.00', description: 'Handset Sale Cash Received' },
        { accountCode: '4.1.01', debit: '0.00', credit: '25000.00', description: 'Handset Sales Revenue Gross' }
      ],
      session: fakeSession
    });

    expect(result.voucherNo).toBe('V-202610-001');
    expect(result.totalDebits).toBe('25000.00');
    expect(result.totalCredits).toBe('25000.00');
    expect(result.transactionCount).toBe(2);
  });

  it('rejects duplicate voucher posting with idempotency violation error', async () => {
    vi.spyOn(AccountTransaction, 'findOne').mockImplementation((() => ({
      session: vi.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(), voucherNo: 'V-DUP-001' })
    })) as any);

    const fakeSession = {} as mongoose.ClientSession;

    await expect(AccountingService.postDoubleEntryJournal({
      shopId,
      voucherNo: 'V-DUP-001',
      txnCode: 'TX-01',
      sourceDocType: 'INV',
      postedByUserId: userId,
      entries: [
        { accountCode: '1.1.01', debit: '1000.00', credit: '0.00', description: 'Cash' },
        { accountCode: '4.1.01', debit: '0.00', credit: '1000.00', description: 'Revenue' }
      ],
      session: fakeSession
    })).rejects.toThrow('Idempotency violation: Voucher V-DUP-001 has already been posted');
  });

  it('validates Standard Chart of Accounts (COA) integrity and uniqueness', async () => {
    const { STANDARD_CHART_OF_ACCOUNTS } = await import('../services/accounting/journalMatrices.js');
    expect(STANDARD_CHART_OF_ACCOUNTS.length).toBe(37);

    const codes = new Set<string>();
    const names = new Set<string>();
    for (const acct of STANDARD_CHART_OF_ACCOUNTS) {
      expect(codes.has(acct.code)).toBe(false);
      codes.add(acct.code);
      expect(names.has(acct.name)).toBe(false);
      names.add(acct.name);
      expect(['asset', 'liability', 'equity', 'revenue', 'cogs', 'expense']).toContain(acct.accountType);
      expect(['debit', 'credit']).toContain(acct.normalBalance);
    }
  });

  it('verifies TX-01 to TX-19 builders produce balanced debit === credit entries', async () => {
    const m = await import('../services/accounting/journalMatrices.js');
    const { toDecimal, isMoneyEqual, addMoney } = await import('../utils/money.js');

    const testMatrices = [
      m.buildTx01CashSale({ grossBill: '27500.00', landedCost: '24200.00', isHandset: true }),
      m.buildTx02SplitTenderSale({ cashAmount: '10000.00', digitalAmount: '12500.00', dueAmount: '5000.00', grossTotal: '27500.00', landedCost: '24200.00', isHandset: true }),
      m.buildTx03AgentCashOutTender({ billAmount: '10000.00', telcoCommission: '41.00', landedCost: '8500.00' }),
      m.buildTx04OverpaymentChange({ tenderNoteReceived: '500.00', changeDispensed: '100.00', netBill: '400.00' }),
      m.buildTx05SalesReturn({ refundAmount: '400.00', restockCost: '250.00' }),
      m.buildTx06DueCollection({ amount: '5000.00' }),
      m.buildTx07SupplierProcurement({ invoiceTotal: '150000.00' }),
      m.buildTx08SupplierPayment({ amount: '50000.00' }),
      m.buildTx08PurchaseReturn({ amount: '24200.00' }),
      m.buildTx09RepairServicing({ totalBill: '3500.00', partsPrice: '2500.00', partsCost: '1800.00', laborTotal: '1000.00', technicianShare: '500.00', storeShare: '500.00' }),
      m.buildTx10BuybackIntake({ assessedValue: '12000.00' }),
      m.buildTx11KistiSale({ downPayment: '8000.00', principalAmount: '20000.00', grossPrice: '28000.00', landedCost: '22000.00' }),
      m.buildTx11KistiCollection({ installmentAmount: '2500.00' }),
      m.buildTx12MfsCashIn({ amount: '5000.00', telcoCommission: '20.50' }),
      m.buildTx13MfsCashOut({ amount: '5000.00', telcoCommission: '20.50' }),
      m.buildTx14AmanatDeposit({ amount: '10000.00' }),
      m.buildTx14AmanatReturn({ amount: '10000.00' }),
      m.buildTx15HawlatGiven({ amount: '3000.00' }),
      m.buildTx15HawlatRepaid({ amount: '3000.00' }),
      m.buildTx16ExpenseOnBehalf({ amount: '750.00' }),
      m.buildTx17ScrapWriteOff({ landedCost: '15000.00' }),
      m.buildTx18PayrollDisbursement({ baseSalary: '15000.00', technicianSplits: '8500.00', totalDisbursed: '23500.00' }),
      m.buildTx19OpeningBalances({ cash: '50000.00', bank: '100000.00', stock: '250000.00', dues: '30000.00', supplierPayables: '80000.00', openingEquity: '350000.00' })
    ];

    for (const entries of testMatrices) {
      let totalDebits = toDecimal(0);
      let totalCredits = toDecimal(0);
      for (const entry of entries) {
        totalDebits = addMoney(totalDebits, entry.debit);
        totalCredits = addMoney(totalCredits, entry.credit);
      }
      expect(isMoneyEqual(totalDebits, totalCredits)).toBe(true);
    }
  });
});

