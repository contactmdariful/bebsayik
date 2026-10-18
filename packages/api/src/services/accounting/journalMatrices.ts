import { JournalEntry } from './accounting.service.js';
import { MonetaryInput, toDecimal } from '../../utils/money.js';

export interface StandardAccountDef {
  code: string;
  name: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'cogs' | 'expense';
  normalBalance: 'debit' | 'credit';
  description: string;
}

/**
 * Standard Chart of Accounts (COA) from DATABASE.md Section 22.2
 */
export const STANDARD_CHART_OF_ACCOUNTS: StandardAccountDef[] = [
  { code: '1.1.01', name: 'Cash in Drawer (Counter 1)', accountType: 'asset', normalBalance: 'debit', description: 'Physical cash in primary POS cash drawer' },
  { code: '1.1.02', name: 'Cash in Drawer (Counter 2)', accountType: 'asset', normalBalance: 'debit', description: 'Physical cash in secondary counter drawer' },
  { code: '1.1.05', name: 'Main Cash Vault / Safe', accountType: 'asset', normalBalance: 'debit', description: 'Master shop safe storage' },
  { code: '1.2.01', name: 'Bank Account (Current / Savings)', accountType: 'asset', normalBalance: 'debit', description: 'Commercial bank balances' },
  { code: '1.3.01', name: 'bKash Agent SIM Float', accountType: 'asset', normalBalance: 'debit', description: 'Digital float on bKash agent SIM card' },
  { code: '1.3.02', name: 'Nagad Agent SIM Float', accountType: 'asset', normalBalance: 'debit', description: 'Digital float on Nagad agent SIM card' },
  { code: '1.3.03', name: 'Rocket Agent SIM Float', accountType: 'asset', normalBalance: 'debit', description: 'Digital float on Rocket agent SIM card' },
  { code: '1.4.01', name: 'Accounts Receivable (Customer Dues)', accountType: 'asset', normalBalance: 'debit', description: 'Outstanding balances owed by credit customers' },
  { code: '1.4.02', name: 'Kisti Loans Receivable', accountType: 'asset', normalBalance: 'debit', description: 'Principal installments receivable under Kisti agreements' },
  { code: '1.5.01', name: 'Merchandise Inventory — Handsets', accountType: 'asset', normalBalance: 'debit', description: 'Specific purchase cost valuation of handset inventory' },
  { code: '1.5.02', name: 'Merchandise Inventory — Accessories', accountType: 'asset', normalBalance: 'debit', description: 'Landed cost valuation of non-serialized accessories' },
  { code: '1.5.03', name: 'Spare Parts Inventory', accountType: 'asset', normalBalance: 'debit', description: 'Repair components (displays, batteries, charging ports)' },
  { code: '2.1.01', name: 'Accounts Payable (Supplier Mohajon)', accountType: 'liability', normalBalance: 'credit', description: 'Balances owed to wholesale suppliers' },
  { code: '2.2.01', name: 'Customer Advance Deposits', accountType: 'liability', normalBalance: 'credit', description: 'Advance deposits received for upcoming pre-orders / trade-in' },
  { code: '2.3.01', name: 'Amanat Deposits (Personal Liability)', accountType: 'liability', normalBalance: 'credit', description: 'Third-party personal money held in trust (0% P&L)' },
  { code: '2.4.01', name: 'Accrued Technician Split Payable', accountType: 'liability', normalBalance: 'credit', description: 'Earned 50% labor commissions awaiting month-end payout' },
  { code: '2.4.02', name: 'Accrued Sales Staff Commission', accountType: 'liability', normalBalance: 'credit', description: 'Sales target bonuses awaiting monthly payroll' },
  { code: '2.5.01', name: 'Output VAT Payable (Mushak 6.3)', accountType: 'liability', normalBalance: 'credit', description: 'NBR sales tax collected from customers' },
  { code: '3.1.01', name: 'Opening Owner Equity', accountType: 'equity', normalBalance: 'credit', description: 'Initial balancing equity upon shop onboarding' },
  { code: '3.2.01', name: 'Owner Capital Contributions', accountType: 'equity', normalBalance: 'credit', description: 'Capital invested by shop owner' },
  { code: '3.3.01', name: 'Owner Drawings', accountType: 'equity', normalBalance: 'debit', description: 'Personal withdrawals taken by shop owner' },
  { code: '3.4.01', name: 'Retained Earnings', accountType: 'equity', normalBalance: 'credit', description: 'Accumulated net earnings from prior fiscal periods' },
  { code: '4.1.01', name: 'Sales Revenue — Handsets', accountType: 'revenue', normalBalance: 'credit', description: 'Gross revenue from mobile handset sales' },
  { code: '4.1.02', name: 'Sales Revenue — Accessories', accountType: 'revenue', normalBalance: 'credit', description: 'Gross revenue from accessories and gadgets' },
  { code: '4.2.01', name: 'Service & Repair Labor Revenue', accountType: 'revenue', normalBalance: 'credit', description: 'Store share of repair servicing labor fees' },
  { code: '4.3.01', name: 'MFS Agent Commission Income', accountType: 'revenue', normalBalance: 'credit', description: 'Telco commissions earned on Cash In / Cash Out / POS' },
  { code: '5.1.01', name: 'COGS — Mobile Handsets', accountType: 'cogs', normalBalance: 'debit', description: 'Specific identification purchase cost of sold handsets' },
  { code: '5.1.02', name: 'COGS — Accessories', accountType: 'cogs', normalBalance: 'debit', description: 'Landed cost of sold accessories' },
  { code: '5.1.03', name: 'Cost of Repair Spare Parts Used', accountType: 'cogs', normalBalance: 'debit', description: 'Purchase cost of components consumed during repair' },
  { code: '6.1.01', name: 'Operating Expense — Shop Rent', accountType: 'expense', normalBalance: 'debit', description: 'Monthly commercial showroom rent' },
  { code: '6.1.02', name: 'Operating Expense — Electricity & Power', accountType: 'expense', normalBalance: 'debit', description: 'Commercial utility expenses' },
  { code: '6.1.03', name: 'Operating Expense — Salaries & Wages', accountType: 'expense', normalBalance: 'debit', description: 'Base monthly staff compensation' },
  { code: '6.1.04', name: 'Operating Expense — Refreshment & Tea', accountType: 'expense', normalBalance: 'debit', description: 'Daily hospitality and refreshments' },
  { code: '6.1.05', name: 'Operating Expense — Software Subscription', accountType: 'expense', normalBalance: 'debit', description: 'Bebsayik SaaS subscription fees' },
  { code: '7.1.01', name: 'Loss on Damaged & Scrapped Inventory', accountType: 'expense', normalBalance: 'debit', description: 'Scrap write-off voucher (SWV) cost absorption' },
  { code: '5020', name: 'Damaged Stock Loss (5020)', accountType: 'expense', normalBalance: 'debit', description: '5020-Damaged-Stock-Loss' },
  { code: '1210', name: 'Handset Inventory (1210)', accountType: 'asset', normalBalance: 'debit', description: '1210-Handset-Inventory' }
];

/**
 * TX-01: POS Cash Sale (Full Cash Payment)
 */
export function buildTx01CashSale(params: {
  grossBill: MonetaryInput;
  landedCost?: MonetaryInput;
  isHandset?: boolean;
}): JournalEntry[] {
  const entries: JournalEntry[] = [
    { accountCode: '1.1.01', debit: params.grossBill, credit: 0, description: 'Cash in Drawer (POS Cash Sale)' },
    { accountCode: params.isHandset ? '4.1.01' : '4.1.02', debit: 0, credit: params.grossBill, description: 'Sales Revenue' }
  ];

  if (params.landedCost && toDecimal(params.landedCost).greaterThan(0)) {
    entries.push(
      { accountCode: params.isHandset ? '5.1.01' : '5.1.02', debit: params.landedCost, credit: 0, description: 'Cost of Goods Sold' },
      { accountCode: params.isHandset ? '1.5.01' : '1.5.02', debit: 0, credit: params.landedCost, description: 'Merchandise Inventory Relief' }
    );
  }

  return entries;
}

/**
 * TX-02: POS Split Tender Sale (Cash + Merchant QR + Customer Due)
 */
export function buildTx02SplitTenderSale(params: {
  cashAmount: MonetaryInput;
  digitalAmount: MonetaryInput;
  dueAmount: MonetaryInput;
  grossTotal: MonetaryInput;
  landedCost?: MonetaryInput;
  isHandset?: boolean;
}): JournalEntry[] {
  const entries: JournalEntry[] = [];

  if (toDecimal(params.cashAmount).greaterThan(0)) {
    entries.push({ accountCode: '1.1.01', debit: params.cashAmount, credit: 0, description: 'Cash Tender' });
  }
  if (toDecimal(params.digitalAmount).greaterThan(0)) {
    entries.push({ accountCode: '1.2.01', debit: params.digitalAmount, credit: 0, description: 'Bank / Merchant MFS QR' });
  }
  if (toDecimal(params.dueAmount).greaterThan(0)) {
    entries.push({ accountCode: '1.4.01', debit: params.dueAmount, credit: 0, description: 'Customer Accounts Receivable' });
  }

  entries.push({ accountCode: params.isHandset ? '4.1.01' : '4.1.02', debit: 0, credit: params.grossTotal, description: 'Sales Revenue' });

  if (params.landedCost && toDecimal(params.landedCost).greaterThan(0)) {
    entries.push(
      { accountCode: params.isHandset ? '5.1.01' : '5.1.02', debit: params.landedCost, credit: 0, description: 'COGS Relief' },
      { accountCode: params.isHandset ? '1.5.01' : '1.5.02', debit: 0, credit: params.landedCost, description: 'Merchandise Inventory Relief' }
    );
  }

  return entries;
}

/**
 * TX-03: POS Agent Cash Out Tender
 */
export function buildTx03AgentCashOutTender(params: {
  billAmount: MonetaryInput;
  telcoCommission: MonetaryInput;
  landedCost?: MonetaryInput;
  mfsAccountCode?: string; // default 1.3.01
}): JournalEntry[] {
  const mfsCode = params.mfsAccountCode || '1.3.01';
  const entries: JournalEntry[] = [
    { accountCode: mfsCode, debit: params.billAmount, credit: 0, description: 'MFS Agent SIM Float received' },
    { accountCode: '4.1.01', debit: 0, credit: params.billAmount, description: 'Sales Revenue — Handsets' }
  ];

  if (toDecimal(params.telcoCommission).greaterThan(0)) {
    entries.push(
      { accountCode: mfsCode, debit: params.telcoCommission, credit: 0, description: 'Telco MFS Commission' },
      { accountCode: '4.3.01', debit: 0, credit: params.telcoCommission, description: 'MFS Agent Commission Income' }
    );
  }

  if (params.landedCost && toDecimal(params.landedCost).greaterThan(0)) {
    entries.push(
      { accountCode: '5.1.01', debit: params.landedCost, credit: 0, description: 'COGS — Handsets' },
      { accountCode: '1.5.01', debit: 0, credit: params.landedCost, description: 'Merchandise Inventory — Handsets' }
    );
  }

  return entries;
}

/**
 * TX-04: Overpayment & Cash Change Handling
 */
export function buildTx04OverpaymentChange(params: {
  tenderNoteReceived: MonetaryInput;
  changeDispensed: MonetaryInput;
  netBill: MonetaryInput;
  isHandset?: boolean;
}): JournalEntry[] {
  return [
    { accountCode: '1.1.01', debit: params.tenderNoteReceived, credit: 0, description: 'Cash Tender Note Received' },
    { accountCode: '1.1.01', debit: 0, credit: params.changeDispensed, description: 'Cash Change Dispensed' },
    { accountCode: params.isHandset ? '4.1.01' : '4.1.02', debit: 0, credit: params.netBill, description: 'Net Sales Revenue' }
  ];
}

/**
 * TX-05: Customer Sales Return & Refund (Restocked)
 */
export function buildTx05SalesReturn(params: {
  refundAmount: MonetaryInput;
  restockCost?: MonetaryInput;
  isHandset?: boolean;
}): JournalEntry[] {
  const entries: JournalEntry[] = [
    { accountCode: params.isHandset ? '4.1.01' : '4.1.02', debit: params.refundAmount, credit: 0, description: 'Sales Revenue Refund' },
    { accountCode: '1.1.01', debit: 0, credit: params.refundAmount, description: 'Cash Refund Dispensed' }
  ];

  if (params.restockCost && toDecimal(params.restockCost).greaterThan(0)) {
    entries.push(
      { accountCode: params.isHandset ? '1.5.01' : '1.5.02', debit: params.restockCost, credit: 0, description: 'Merchandise Restocked' },
      { accountCode: params.isHandset ? '5.1.01' : '5.1.02', debit: 0, credit: params.restockCost, description: 'COGS Reversal' }
    );
  }

  return entries;
}

/**
 * TX-06: Customer Due Collection
 */
export function buildTx06DueCollection(params: {
  amount: MonetaryInput;
  targetAccountCode?: string; // default 1.1.01 Cash
}): JournalEntry[] {
  return [
    { accountCode: params.targetAccountCode || '1.1.01', debit: params.amount, credit: 0, description: 'Due Collection Tender' },
    { accountCode: '1.4.01', debit: 0, credit: params.amount, description: 'Customer Accounts Receivable Cleared' }
  ];
}

/**
 * TX-07: Supplier Procurement (GRN on Credit)
 */
export function buildTx07SupplierProcurement(params: {
  invoiceTotal: MonetaryInput;
  inventoryAccountCode?: string; // default 1.5.01
}): JournalEntry[] {
  return [
    { accountCode: params.inventoryAccountCode || '1.5.01', debit: params.invoiceTotal, credit: 0, description: 'Merchandise Inventory Landed Cost' },
    { accountCode: '2.1.01', debit: 0, credit: params.invoiceTotal, description: 'Accounts Payable (Supplier Mohajon)' }
  ];
}

/**
 * TX-08: Supplier Payment & Purchase Return (PRV)
 */
export function buildTx08SupplierPayment(params: {
  amount: MonetaryInput;
  sourceAccountCode?: string; // default 1.2.01 Bank
}): JournalEntry[] {
  return [
    { accountCode: '2.1.01', debit: params.amount, credit: 0, description: 'Supplier Accounts Payable Settled' },
    { accountCode: params.sourceAccountCode || '1.2.01', debit: 0, credit: params.amount, description: 'Payment Disbursed' }
  ];
}

export function buildTx08PurchaseReturn(params: {
  amount: MonetaryInput;
  inventoryAccountCode?: string; // default 1.5.01
}): JournalEntry[] {
  return [
    { accountCode: '2.1.01', debit: params.amount, credit: 0, description: 'Supplier Accounts Payable Debited (PRV)' },
    { accountCode: params.inventoryAccountCode || '1.5.01', debit: 0, credit: params.amount, description: 'Inventory Returned to Supplier' }
  ];
}

/**
 * TX-09: Mobile Repair Servicing (50% Maker Labor Split)
 */
export function buildTx09RepairServicing(params: {
  totalBill: MonetaryInput;
  partsPrice: MonetaryInput;
  partsCost: MonetaryInput;
  laborTotal: MonetaryInput;
  technicianShare: MonetaryInput;
  storeShare: MonetaryInput;
}): JournalEntry[] {
  return [
    { accountCode: '1.1.01', debit: params.totalBill, credit: 0, description: 'Repair Cash Collected' },
    { accountCode: '4.1.02', debit: 0, credit: params.partsPrice, description: 'Sales Revenue — Spare Parts' },
    { accountCode: '4.2.01', debit: 0, credit: params.storeShare, description: 'Store Share — Labor Revenue' },
    { accountCode: '2.4.01', debit: 0, credit: params.technicianShare, description: 'Accrued Technician Split Payable' },
    { accountCode: '5.1.03', debit: params.partsCost, credit: 0, description: 'Cost of Repair Spare Parts Used' },
    { accountCode: '1.5.03', debit: 0, credit: params.partsCost, description: 'Spare Parts Inventory Relieved' }
  ];
}

/**
 * TX-10: Used Phone Buyback & Trade-In Voucher (TV)
 */
export function buildTx10BuybackIntake(params: {
  assessedValue: MonetaryInput;
}): JournalEntry[] {
  return [
    { accountCode: '1.5.01', debit: params.assessedValue, credit: 0, description: 'Pre-owned Handset Inventory Ingestion' },
    { accountCode: '2.2.01', debit: 0, credit: params.assessedValue, description: 'Customer Trade-In Credit / Advance' }
  ];
}

/**
 * TX-11: Installment (Kisti/EMI) Agreement & Milestone Collections
 */
export function buildTx11KistiSale(params: {
  downPayment: MonetaryInput;
  principalAmount: MonetaryInput;
  grossPrice: MonetaryInput;
  landedCost?: MonetaryInput;
  downPaymentAccountCode?: string;
}): JournalEntry[] {
  const entries: JournalEntry[] = [];

  if (toDecimal(params.downPayment).greaterThan(0)) {
    entries.push({
      accountCode: params.downPaymentAccountCode || '1.1.01',
      debit: params.downPayment,
      credit: 0,
      description: 'Kisti Down Payment Cash'
    });
  }

  entries.push(
    { accountCode: '1.4.02', debit: params.principalAmount, credit: 0, description: 'Kisti Loans Receivable' },
    { accountCode: '4.1.01', debit: 0, credit: params.grossPrice, description: 'Sales Revenue — Handsets' }
  );

  if (params.landedCost && toDecimal(params.landedCost).greaterThan(0)) {
    entries.push(
      { accountCode: '5.1.01', debit: params.landedCost, credit: 0, description: 'COGS Relief' },
      { accountCode: '1.5.01', debit: 0, credit: params.landedCost, description: 'Merchandise Inventory Relief' }
    );
  }

  return entries;
}

export function buildTx11KistiCollection(params: {
  installmentAmount: MonetaryInput;
  targetAccountCode?: string;
}): JournalEntry[] {
  return [
    { accountCode: params.targetAccountCode || '1.1.01', debit: params.installmentAmount, credit: 0, description: 'Kisti Milestone Installment Collected' },
    { accountCode: '1.4.02', debit: 0, credit: params.installmentAmount, description: 'Kisti Loans Receivable Cleared' }
  ];
}

/**
 * TX-12: MFS Agent Cash In (Customer Gives Cash)
 */
export function buildTx12MfsCashIn(params: {
  amount: MonetaryInput;
  telcoCommission?: MonetaryInput;
  mfsAccountCode?: string;
}): JournalEntry[] {
  const mfsCode = params.mfsAccountCode || '1.3.01';
  const entries: JournalEntry[] = [
    { accountCode: '1.1.01', debit: params.amount, credit: 0, description: 'MFS Cash In Note Received' },
    { accountCode: mfsCode, debit: 0, credit: params.amount, description: 'MFS Float Deducted' }
  ];

  if (params.telcoCommission && toDecimal(params.telcoCommission).greaterThan(0)) {
    entries.push(
      { accountCode: mfsCode, debit: params.telcoCommission, credit: 0, description: 'Telco MFS Cash In Commission' },
      { accountCode: '4.3.01', debit: 0, credit: params.telcoCommission, description: 'MFS Agent Commission Income' }
    );
  }

  return entries;
}

/**
 * TX-13: MFS Agent Cash Out (Customer Sends Digital Money)
 */
export function buildTx13MfsCashOut(params: {
  amount: MonetaryInput;
  telcoCommission?: MonetaryInput;
  mfsAccountCode?: string;
}): JournalEntry[] {
  const mfsCode = params.mfsAccountCode || '1.3.01';
  const entries: JournalEntry[] = [
    { accountCode: mfsCode, debit: params.amount, credit: 0, description: 'MFS Float Received from Customer' },
    { accountCode: '1.1.01', debit: 0, credit: params.amount, description: 'Cash Dispensed to Customer' }
  ];

  if (params.telcoCommission && toDecimal(params.telcoCommission).greaterThan(0)) {
    entries.push(
      { accountCode: mfsCode, debit: params.telcoCommission, credit: 0, description: 'Telco MFS Cash Out Commission' },
      { accountCode: '4.3.01', debit: 0, credit: params.telcoCommission, description: 'MFS Agent Commission Income' }
    );
  }

  return entries;
}

/**
 * TX-14: Amanat Deposit & Return (Strict 0.00% Store P&L Impact)
 */
export function buildTx14AmanatDeposit(params: {
  amount: MonetaryInput;
}): JournalEntry[] {
  return [
    { accountCode: '1.1.01', debit: params.amount, credit: 0, description: 'Amanat Cash Deposit (Personal Trust)' },
    { accountCode: '2.3.01', debit: 0, credit: params.amount, description: 'Amanat Liability (0% P&L Impact)' }
  ];
}

export function buildTx14AmanatReturn(params: {
  amount: MonetaryInput;
}): JournalEntry[] {
  return [
    { accountCode: '2.3.01', debit: params.amount, credit: 0, description: 'Amanat Trust Returned (0% P&L Impact)' },
    { accountCode: '1.1.01', debit: 0, credit: params.amount, description: 'Amanat Cash Paid Out' }
  ];
}

/**
 * TX-15: Hawlat Given & Repaid (0.00% Store P&L Impact)
 */
export function buildTx15HawlatGiven(params: {
  amount: MonetaryInput;
}): JournalEntry[] {
  return [
    { accountCode: '2.3.01', debit: params.amount, credit: 0, description: 'Hawlat Lent Out (0% P&L Impact)' },
    { accountCode: '1.1.01', debit: 0, credit: params.amount, description: 'Cash Drawer Disbursed' }
  ];
}

export function buildTx15HawlatRepaid(params: {
  amount: MonetaryInput;
}): JournalEntry[] {
  return [
    { accountCode: '1.1.01', debit: params.amount, credit: 0, description: 'Hawlat Repayment Received in Cash' },
    { accountCode: '2.3.01', debit: 0, credit: params.amount, description: 'Hawlat Cleared (0% P&L Impact)' }
  ];
}

/**
 * TX-16: Expense on Behalf of Personal Contact (0.00% Store P&L Impact)
 */
export function buildTx16ExpenseOnBehalf(params: {
  amount: MonetaryInput;
  description?: string;
}): JournalEntry[] {
  return [
    { accountCode: '2.3.01', debit: params.amount, credit: 0, description: params.description || 'Expense on Behalf of Personal Contact' },
    { accountCode: '1.1.01', debit: 0, credit: params.amount, description: 'Cash Drawer Disbursed (0% Store OPEX)' }
  ];
}

/**
 * TX-17: Scrap Write-Off Voucher (SWV — Shattered Device)
 */
export function buildTx17ScrapWriteOff(params: {
  landedCost: MonetaryInput;
  inventoryAccountCode?: string; // default 1210 (or 1.5.01)
  lossAccountCode?: string; // default 5020 (or 7.1.01)
}): JournalEntry[] {
  const lossCode = params.lossAccountCode || '5020';
  const invCode = params.inventoryAccountCode || '1210';
  return [
    { accountCode: lossCode, debit: params.landedCost, credit: 0, description: 'Loss on Damaged & Scrapped Inventory (5020)' },
    { accountCode: invCode, debit: 0, credit: params.landedCost, description: 'Inventory Relieved from Active Stock (1210)' }
  ];
}

/**
 * TX-18: Month-End Payroll & Technician Split Disbursement
 */
export function buildTx18PayrollDisbursement(params: {
  baseSalary: MonetaryInput;
  technicianSplits?: MonetaryInput;
  salesBonuses?: MonetaryInput;
  totalDisbursed: MonetaryInput;
  sourceAccountCode?: string; // default 1.2.01 Bank
}): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const baseDec = toDecimal(params.baseSalary);
  const techDec = params.technicianSplits ? toDecimal(params.technicianSplits) : toDecimal(0);
  const bonusDec = params.salesBonuses ? toDecimal(params.salesBonuses) : toDecimal(0);

  if (baseDec.greaterThan(0)) {
    entries.push({ accountCode: '6.1.03', debit: params.baseSalary, credit: 0, description: 'Salaries & Wages OPEX' });
  }
  if (techDec.greaterThan(0)) {
    entries.push({ accountCode: '2.4.01', debit: params.technicianSplits!, credit: 0, description: 'Accrued Technician Split Cleared' });
  }
  if (bonusDec.greaterThan(0)) {
    entries.push({ accountCode: '2.4.02', debit: params.salesBonuses!, credit: 0, description: 'Accrued Sales Staff Commission Cleared' });
  }
  entries.push({
    accountCode: params.sourceAccountCode || '1.2.01',
    debit: 0,
    credit: params.totalDisbursed,
    description: 'Payroll Disbursed'
  });
  return entries;
}

/**
 * Inter-Account Fund Transfer (e.g. Counter Cash Drawer to Bank Deposit)
 */
export function buildTxInterAccountTransfer(params: {
  fromAccountCode: string;
  toAccountCode: string;
  amount: MonetaryInput;
  description?: string;
}): JournalEntry[] {
  return [
    {
      accountCode: params.toAccountCode,
      debit: params.amount,
      credit: 0,
      description: params.description || `Transfer to ${params.toAccountCode}`
    },
    {
      accountCode: params.fromAccountCode,
      debit: 0,
      credit: params.amount,
      description: params.description || `Transfer from ${params.fromAccountCode}`
    }
  ];
}

/**
 * OPEX Petty Expense Voucher (e.g. Tea, Electricity, Rent)
 */
export function buildTxExpenseVoucher(params: {
  categoryCode: string;
  paidFromAccountCode?: string;
  amount: MonetaryInput;
  description?: string;
}): JournalEntry[] {
  const sourceCode = params.paidFromAccountCode || '1.1.01';
  return [
    {
      accountCode: params.categoryCode,
      debit: params.amount,
      credit: 0,
      description: params.description || `Operating Expense (${params.categoryCode})`
    },
    {
      accountCode: sourceCode,
      debit: 0,
      credit: params.amount,
      description: `Cash Disbursed for Expense from ${sourceCode}`
    }
  ];
}

/**
 * TX-19: Opening Balance Ingestion & Equity Balancing
 */
export function buildTx19OpeningBalances(params: {
  cash: MonetaryInput;
  bank: MonetaryInput;
  stock: MonetaryInput;
  dues: MonetaryInput;
  supplierPayables: MonetaryInput;
  openingEquity: MonetaryInput;
}): JournalEntry[] {
  return [
    { accountCode: '1.1.01', debit: params.cash, credit: 0, description: 'Opening Cash in Drawer' },
    { accountCode: '1.2.01', debit: params.bank, credit: 0, description: 'Opening Bank Balances' },
    { accountCode: '1.5.01', debit: params.stock, credit: 0, description: 'Opening Handset Merchandise Stock' },
    { accountCode: '1.4.01', debit: params.dues, credit: 0, description: 'Opening Customer Accounts Receivable' },
    { accountCode: '2.1.01', debit: 0, credit: params.supplierPayables, description: 'Opening Supplier Accounts Payable' },
    { accountCode: '3.1.01', debit: 0, credit: params.openingEquity, description: 'Opening Owner Equity' }
  ];
}

