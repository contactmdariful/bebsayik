import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Printer,
  Send,
  ArrowRightLeft,
  Receipt,
  Users,
  ShieldAlert,
  Smartphone,
  ChevronRight,
  TrendingUp,
  FileText,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Wallet,
  Coffee,
  Check,
  Building2,
  Wrench,
  Percent
} from 'lucide-react';
import { Button } from '../components/Button.js';
import { MoneyText } from '../components/MoneyText.js';
import { Modal } from '../components/Modal.js';
import { EmptyState } from '../components/EmptyState.js';

export interface DenominationState {
  note1000: number;
  note500: number;
  note200: number;
  note100: number;
  note50: number;
  note20: number;
  note10: number;
  coins: number;
}

export function ClosingAndAccountsHub() {
  const [activeTab, setActiveTab] = useState<'CLOSING' | 'ACCOUNTS' | 'HR' | 'SMS_RESET'>('CLOSING');

  // --- TAB 1: SHIFT CLOSING STATE ---
  const [shiftStatus, setShiftStatus] = useState<'closed' | 'open' | 'finalized'>('open');
  const [openingFloat, setOpeningFloat] = useState<number>(2000);
  const [denominations, setDenominations] = useState<DenominationState>({
    note1000: 42,
    note500: 15,
    note200: 10,
    note100: 25,
    note50: 12,
    note20: 20,
    note10: 0,
    coins: 0
  });
  const [recountCount, setRecountCount] = useState<number>(0);
  const [discrepancyReason, setDiscrepancyReason] = useState<string>('');
  const [showZReportModal, setShowZReportModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // System Sales Activity During Shift (Mocked for interactive Counter Closing)
  const systemMetrics = {
    todaySalesCash: 68500,
    dueCollectionsCash: 12000,
    supplierPaymentsCash: 20000,
    dayOpexExpensesCash: 2500,
    customerRefundsCash: 5000
  };

  const physicalCountedCash = useMemo(() => {
    return (
      denominations.note1000 * 1000 +
      denominations.note500 * 500 +
      denominations.note200 * 200 +
      denominations.note100 * 100 +
      denominations.note50 * 50 +
      denominations.note20 * 20 +
      denominations.note10 * 10 +
      denominations.coins
    );
  }, [denominations]);

  const expectedDrawerCash = useMemo(() => {
    return (
      openingFloat +
      systemMetrics.todaySalesCash +
      systemMetrics.dueCollectionsCash -
      systemMetrics.supplierPaymentsCash -
      systemMetrics.dayOpexExpensesCash -
      systemMetrics.customerRefundsCash
    );
  }, [openingFloat, systemMetrics]);

  const variance = physicalCountedCash - expectedDrawerCash;
  const isBalanced = variance === 0;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRecount = () => {
    if (recountCount >= 1) {
      showToast('⚠️ RECOUNT_LIMIT_EXCEEDED: Exactly one recount grace attempt is permitted. Register is locked.');
      return;
    }
    setRecountCount((prev) => prev + 1);
    showToast('Recount attempt registered. You have 0 recount attempts remaining.');
  };

  const handleFinalizeShift = () => {
    if (variance !== 0 && !discrepancyReason.trim()) {
      showToast('⚠️ DISCREPANCY_REASON_REQUIRED: Variance of ৳' + variance.toLocaleString() + ' requires an explanatory note.');
      return;
    }
    setShiftStatus('finalized');
    setShowZReportModal(true);
    showToast('Shift closed successfully. Register locked & SMS digest dispatched to owner phone.');
  };

  // --- TAB 2: ACCOUNTS & TRANSFERS STATE ---
  const [accountsList, setAccountsList] = useState([
    { code: '1.1.01', name: 'Cash in Drawer (Counter 1)', type: 'asset', balance: 55000 },
    { code: '1.2.01', name: 'BRAC Bank Current A/C #1002', type: 'asset', balance: 245000 },
    { code: '1.3.01', name: 'bKash Agent SIM Slot 1 Float', type: 'asset', balance: 42500 },
    { code: '1.3.02', name: 'Nagad Agent SIM Slot 2 Float', type: 'asset', balance: 35000 },
    { code: '6.1.04', name: 'Refreshment & Tea OPEX', type: 'expense', balance: 4200 },
    { code: '6.1.02', name: 'Electricity & Utilities OPEX', type: 'expense', balance: 8500 }
  ]);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState('1.1.01');
  const [transferTo, setTransferTo] = useState('1.2.01');
  const [transferAmount, setTransferAmount] = useState('20000');
  const [transferNotes, setTransferNotes] = useState('Excess drawer cash deposit to commercial bank');

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('6.1.04');
  const [expenseAmount, setExpenseAmount] = useState('350');
  const [expensePayee, setExpensePayee] = useState('Mamun Tea Stall');
  const [expenseNotes, setExpenseNotes] = useState('Hospitality tea & biscuits for showroom customers');

  const handleExecuteTransfer = () => {
    const amt = parseFloat(transferAmount) || 0;
    if (amt <= 0) return;
    setAccountsList((prev) =>
      prev.map((acc) => {
        if (acc.code === transferFrom) return { ...acc, balance: acc.balance - amt };
        if (acc.code === transferTo) return { ...acc, balance: acc.balance + amt };
        return acc;
      })
    );
    setTransferModalOpen(false);
    showToast(`Transfer of ৳${amt.toLocaleString()} executed. Balanced journal posted.`);
  };

  const handleExecuteExpense = () => {
    const amt = parseFloat(expenseAmount) || 0;
    if (amt <= 0) return;
    setAccountsList((prev) =>
      prev.map((acc) => {
        if (acc.code === '1.1.01') return { ...acc, balance: acc.balance - amt };
        if (acc.code === expenseCategory) return { ...acc, balance: acc.balance + amt };
        return acc;
      })
    );
    setExpenseModalOpen(false);
    showToast(`Expense voucher ৳${amt.toLocaleString()} posted. Paid from Cash Drawer.`);
  };

  // --- TAB 3: HR & PAYROLL STATE ---
  const [payrollMonth, setPayrollMonth] = useState('2026-10');
  const staffPayroll = [
    {
      id: 'emp-1',
      name: 'Sumon Dash',
      role: 'TECHNICIAN',
      baseSalary: 15000,
      repairShare: 14000,
      repairJobs: 24,
      salesBonus: 0,
      netPayable: 29000,
      status: 'pending'
    },
    {
      id: 'emp-2',
      name: 'Tanvir Ahmed',
      role: 'SALESPERSON',
      baseSalary: 10000,
      repairShare: 0,
      repairJobs: 0,
      salesBonus: 4200,
      netPayable: 14200,
      status: 'disbursed'
    },
    {
      id: 'emp-3',
      name: 'Rakib Cashier',
      role: 'CASHIER',
      baseSalary: 12000,
      repairShare: 0,
      repairJobs: 0,
      salesBonus: 1000,
      netPayable: 13000,
      status: 'pending'
    }
  ];

  const handleDisburseStaff = (name: string, amount: number) => {
    showToast(`Disbursed salary ৳${amount.toLocaleString()} to ${name}. Balanced TX-18 posted & SMS sent.`);
  };

  // --- TAB 4: SMS DESK & FRESH START STATE ---
  const [freshStartPassword, setFreshStartPassword] = useState('');
  const [freshStartPhrase, setFreshStartPhrase] = useState('');
  const [freshStartModalOpen, setFreshStartModalOpen] = useState(false);
  const [freshStartSuccess, setFreshStartSuccess] = useState<string | null>(null);

  const [smsTemplates, setSmsTemplates] = useState([
    {
      tag: 'DAY_END_Z_REPORT',
      body: 'Z-REPORT [{{shop_name}}]: Shift closed. Expected: ৳{{expected}}, Actual: ৳{{cash}}, Variance: ৳{{variance}}. Register locked.'
    },
    {
      tag: 'PAYROLL_DISBURSED',
      body: 'Dear {{employee_name}}, your compensation of BDT {{amount}} for {{month}} has been disbursed via {{method}}. {{shop_name}}.'
    },
    {
      tag: 'INVOICE_BILLING',
      body: 'Dear {{customer_name}}, thank you for shopping at {{shop_name}}. Invoice: {{invoice_no}}, Paid: ৳{{paid_amount}}, Due: ৳{{due_amount}}.'
    }
  ]);

  const handleExecuteFreshStart = () => {
    if (freshStartPhrase !== 'PURGE-TEST-TRANSACTIONS') {
      showToast('⚠️ Must enter exact confirmation phrase: PURGE-TEST-TRANSACTIONS');
      return;
    }
    if (!freshStartPassword) {
      showToast('⚠️ Master password is required for 2FA authorization.');
      return;
    }
    setFreshStartSuccess('Pre-Launch Fresh Start Reset Executed: Test sales, stock movements, and vouchers purged. Product catalog, categories, and settings strictly preserved (TC-18).');
    setFreshStartModalOpen(false);
    showToast('Fresh Start Reset completed successfully!');
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] w-full mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900 border border-teal-500 text-teal-200 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-xs animate-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Landmark className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              Accounts, Daily Closing & HR Engine
            </h1>
            <span className="bg-teal-500/10 text-teal-300 border border-teal-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold">
              Phase 10 Production
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Blind note count reconciliation (Z-Report), Chart of Accounts, inter-account transfers, technician 50% split payroll, and TC-18 fresh start.
          </p>
        </div>

        {/* Global Tab Switcher */}
        <div className="flex flex-wrap items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1">
          <button
            onClick={() => setActiveTab('CLOSING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'CLOSING'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Shift Closing (Z-Report)</span>
          </button>
          <button
            onClick={() => setActiveTab('ACCOUNTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'ACCOUNTS'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Accounts & Drawers</span>
          </button>
          <button
            onClick={() => setActiveTab('HR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'HR'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>HR & Payroll</span>
          </button>
          <button
            onClick={() => setActiveTab('SMS_RESET')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'SMS_RESET'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>SMS Desk & Fresh Start</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAY-END CASH CLOSING & BLIND RECONCILIATION */}
      {/* ========================================================================= */}
      {activeTab === 'CLOSING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Blind Currency Denomination Counter */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-teal-400" />
                  <span>Physical Note Breakdown Counter</span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Cashier enters physical currency notes found in counter drawer.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Physical Count Total</span>
                <span className="text-lg font-black text-teal-400 font-mono">
                  ৳{physicalCountedCash.toLocaleString('en-US')}.00
                </span>
              </div>
            </div>

            {/* Denomination Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { note: '1,000', key: 'note1000' as const, val: 1000 },
                { note: '500', key: 'note500' as const, val: 500 },
                { note: '200', key: 'note200' as const, val: 200 },
                { note: '100', key: 'note100' as const, val: 100 },
                { note: '50', key: 'note50' as const, val: 50 },
                { note: '20', key: 'note20' as const, val: 20 },
                { note: '10', key: 'note10' as const, val: 10 },
                { note: 'Coins', key: 'coins' as const, val: 1 }
              ].map((item) => {
                const count = denominations[item.key];
                const sub = count * item.val;
                return (
                  <div key={item.key} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300">৳{item.note}</span>
                      <span className="text-[10px] text-slate-500 font-mono">৳{sub.toLocaleString()}</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={count}
                      disabled={shiftStatus === 'finalized'}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setDenominations({ ...denominations, [item.key]: Math.max(0, val) });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>

            {/* Decision 4: Single Recount Grace Protocol Warning */}
            <div className="bg-slate-950/70 border border-amber-900/50 p-3.5 rounded-xl flex items-start space-x-3 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-amber-300">
                  Single Recount Grace Protocol (Strategic Decision 4):
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Cashiers are granted exactly <strong>one recount attempt</strong> before the terminal is permanently locked. Recount count: <code className="text-amber-400 font-mono">{recountCount} / 1 used</code>.
                </p>
                {shiftStatus !== 'finalized' && (
                  <div className="pt-1">
                    <button
                      onClick={handleRecount}
                      disabled={recountCount >= 1}
                      className={`text-[11px] px-3 py-1 rounded-lg font-semibold flex items-center space-x-1.5 transition-all ${
                        recountCount >= 1
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          : 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-600/50'
                      }`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{recountCount >= 1 ? 'Recount Limit Exceeded (Locked)' : 'Recount Drawer Once (1 Attempt Left)'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: System Expected Balance & Reconciliation Breakdown */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2 border-b border-slate-800 pb-3">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              <span>Shift Reconciliation & Variance</span>
            </h2>

            {/* Activity Line Items */}
            <div className="space-y-2 text-xs divide-y divide-slate-800/60 font-mono">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Starting Morning Float:</span>
                <span className="text-slate-200">৳{openingFloat.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between py-1.5 text-emerald-400">
                <span>(+) Today's Cash Sales:</span>
                <span>+৳{systemMetrics.todaySalesCash.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between py-1.5 text-teal-400">
                <span>(+) Customer Due Cash Collected:</span>
                <span>+৳{systemMetrics.dueCollectionsCash.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between py-1.5 text-rose-400">
                <span>(-) Supplier Mohajon Cash Paid:</span>
                <span>-৳{systemMetrics.supplierPaymentsCash.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between py-1.5 text-amber-400">
                <span>(-) Day OPEX Petty Expenses:</span>
                <span>-৳{systemMetrics.dayOpexExpensesCash.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between py-1.5 text-rose-400">
                <span>(-) Customer Cash Refunds (CRV):</span>
                <span>-৳{systemMetrics.customerRefundsCash.toLocaleString()}.00</span>
              </div>
            </div>

            {/* Summary Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Expected Cash in Drawer:</span>
                <span className="text-slate-100 font-bold font-mono">৳{expectedDrawerCash.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Counted Physical Cash:</span>
                <span className="text-teal-400 font-bold font-mono">৳{physicalCountedCash.toLocaleString()}.00</span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Variance:</span>
                <span
                  className={`text-sm font-black font-mono px-2.5 py-0.5 rounded-lg ${
                    isBalanced
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : variance < 0
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {isBalanced ? '৳0.00 (BALANCED)' : (variance < 0 ? `-৳${Math.abs(variance).toLocaleString()}.00 (SHORTAGE)` : `+৳${variance.toLocaleString()}.00 (EXCESS)`)}
                </span>
              </div>
            </div>

            {/* Discrepancy Reason Input if mismatch */}
            {!isBalanced && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-amber-300 block">
                  Mandatory Discrepancy Justification:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Counter drawer coin rounding shortage..."
                  value={discrepancyReason}
                  onChange={(e) => setDiscrepancyReason(e.target.value)}
                  disabled={shiftStatus === 'finalized'}
                  className="w-full bg-slate-950 border border-amber-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                />
              </div>
            )}

            {/* Actions */}
            {shiftStatus !== 'finalized' ? (
              <button
                onClick={handleFinalizeShift}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-teal-900/30 transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>Commit Day-End Closing & Lock Register</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="bg-emerald-950/60 border border-emerald-800 p-3 rounded-xl flex items-center space-x-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Shift finalized and register locked. Z-Report thermal payload ready.</span>
                </div>
                <button
                  onClick={() => setShowZReportModal(true)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 border border-slate-700"
                >
                  <Printer className="w-4 h-4 text-teal-400" />
                  <span>View & Print Thermal Z-Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ACCOUNTS, DRAWERS & OPEX EXPENSE VOUCHERS */}
      {/* ========================================================================= */}
      {activeTab === 'ACCOUNTS' && (
        <div className="space-y-6">
          {/* Top Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-teal-400" />
                <span>Chart of Accounts & Real-Time Float Balances</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Track physical counter registers, commercial bank deposits, and digital MFS SIM floats.
              </p>
            </div>
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setExpenseModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-all shadow-sm"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>+ OPEX Petty Expense</span>
              </button>
              <button
                onClick={() => setTransferModalOpen(true)}
                className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-all shadow-sm"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Inter-Account Transfer</span>
              </button>
            </div>
          </div>

          {/* Accounts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountsList.map((acc) => (
              <div
                key={acc.code}
                className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 hover:border-slate-700 transition-all shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-teal-400 bg-teal-950/60 border border-teal-800/60 px-2 py-0.5 rounded font-bold">
                      {acc.code}
                    </span>
                    <h3 className="text-xs font-bold text-slate-200 mt-1">{acc.name}</h3>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {acc.type}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex justify-between items-end">
                  <span className="text-[11px] text-slate-400">Current Balance:</span>
                  <span className="text-base font-black font-mono text-slate-100">
                    ৳{acc.balance.toLocaleString('en-US')}.00
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HR, SALES QUOTAS & TECHNICIAN 50% PAYROLL */}
      {/* ========================================================================= */}
      {activeTab === 'HR' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Users className="w-4 h-4 text-teal-400" />
                <span>Monthly Staff Compensation & Commission Engine</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Aggregates technician 50% repair labor splits and salesperson quota incentives.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-semibold">Pay Period:</span>
              <input
                type="month"
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-100 rounded-lg px-2.5 py-1.5 font-mono"
              />
            </div>
          </div>

          {/* Staff Roster Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3.5">Employee Name & Role</th>
                  <th className="p-3.5">Base Salary</th>
                  <th className="p-3.5">Tech 50% Split</th>
                  <th className="p-3.5">Sales Commission</th>
                  <th className="p-3.5">Net Payable</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-slate-200">
                {staffPayroll.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-sans">
                      <div className="font-bold text-slate-100">{emp.name}</div>
                      <div className="text-[10px] text-teal-400 uppercase font-mono">{emp.role}</div>
                    </td>
                    <td className="p-3.5">৳{emp.baseSalary.toLocaleString()}.00</td>
                    <td className="p-3.5">
                      {emp.repairShare > 0 ? (
                        <div>
                          <span className="text-emerald-400 font-bold">+৳{emp.repairShare.toLocaleString()}.00</span>
                          <span className="text-[10px] text-slate-500 block font-sans">({emp.repairJobs} repair jobs)</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {emp.salesBonus > 0 ? (
                        <span className="text-teal-400 font-bold">+৳{emp.salesBonus.toLocaleString()}.00</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-3.5 font-black text-slate-100 text-sm">
                      ৳{emp.netPayable.toLocaleString()}.00
                    </td>
                    <td className="p-3.5 font-sans">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          emp.status === 'disbursed'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-sans">
                      {emp.status === 'pending' ? (
                        <button
                          onClick={() => handleDisburseStaff(emp.name, emp.netPayable)}
                          className="bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                        >
                          Disburse TX-18
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">Disbursed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SMS DESK & TC-18 FRESH START RESET */}
      {/* ========================================================================= */}
      {activeTab === 'SMS_RESET' && (
        <div className="space-y-6">
          {/* SMS Notification Gateway Monitor */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-teal-400" />
                  <span>SMS Notification Templates & Telecom Gateway</span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Monitor gateway balance and customize transactional templates.
                </p>
              </div>
              <div className="flex items-center space-x-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400">Available Balance:</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">1,420 SMS (৳497.00)</span>
              </div>
            </div>

            <div className="space-y-3">
              {smsTemplates.map((tpl) => (
                <div key={tpl.tag} className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-teal-400">{tpl.tag}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Enabled</span>
                  </div>
                  <input
                    type="text"
                    value={tpl.body}
                    onChange={(e) => {
                      const updated = e.target.value;
                      setSmsTemplates(smsTemplates.map((t) => (t.tag === tpl.tag ? { ...t, body: updated } : t)));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-teal-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Pre-Launch Fresh Start Reset Protocol (TC-18) */}
          <div className="bg-rose-950/20 border border-rose-900/60 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-900/40 border border-rose-700/60 flex items-center justify-center text-rose-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-rose-200 flex items-center space-x-2">
                  <span>Pre-Launch Fresh Start Reset Protocol (TC-18)</span>
                  <span className="bg-rose-950 text-rose-300 border border-rose-800 text-[10px] px-2 py-0.5 rounded font-mono uppercase">
                    Owner 2FA Required
                  </span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Safely clears all mock sales, inventory ledger movements, and testing vouchers prior to grand showroom opening.
                  <strong className="text-rose-300"> Strictly preserves master catalog products, categories, brands, users, and outlet settings.</strong>
                </p>
              </div>
            </div>

            {freshStartSuccess && (
              <div className="bg-emerald-950/60 border border-emerald-800 p-3 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{freshStartSuccess}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => setFreshStartModalOpen(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center space-x-2"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Initiate Pre-Launch Fresh Start Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INTER-ACCOUNT TRANSFER */}
      {/* ========================================================================= */}
      {transferModalOpen && (
        <Modal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          title="Inter-Account Fund Transfer"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Source Account (From):</label>
              <select
                value={transferFrom}
                onChange={(e) => setTransferFrom(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              >
                {accountsList.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} - {a.name} (৳{a.balance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Account (To):</label>
              <select
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              >
                {accountsList.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} - {a.name} (৳{a.balance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Transfer Amount (BDT):</label>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Description:</label>
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="ghost" onClick={() => setTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleExecuteTransfer}>
                Confirm Transfer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: OPEX PETTY EXPENSE */}
      {/* ========================================================================= */}
      {expenseModalOpen && (
        <Modal
          isOpen={expenseModalOpen}
          onClose={() => setExpenseModalOpen(false)}
          title="Record OPEX Petty Expense Voucher"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Expense Category:</label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              >
                <option value="6.1.04">6.1.04 - Refreshment & Tea OPEX</option>
                <option value="6.1.02">6.1.02 - Electricity & Utilities OPEX</option>
                <option value="6.1.01">6.1.01 - Showroom Commercial Rent OPEX</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Payee Name:</label>
              <input
                type="text"
                value={expensePayee}
                onChange={(e) => setExpensePayee(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Expense Amount (BDT):</label>
              <input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Notes:</label>
              <input
                type="text"
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="ghost" onClick={() => setExpenseModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleExecuteExpense}>
                Post Expense Slip
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FRESH START RESET (TC-18) */}
      {/* ========================================================================= */}
      {freshStartModalOpen && (
        <Modal
          isOpen={freshStartModalOpen}
          onClose={() => setFreshStartModalOpen(false)}
          title="⚠️ Confirm Pre-Launch Fresh Start Reset (TC-18)"
        >
          <div className="space-y-4">
            <div className="bg-rose-950/40 border border-rose-800 p-3 rounded-xl text-xs text-rose-300 leading-relaxed">
              This action will permanently delete all test POS sales, customer dues, stock movements, and shift records.
              <strong> Catalog products, categories, and settings will remain 100% intact.</strong>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Store Owner Master Password:</label>
              <input
                type="password"
                placeholder="Enter owner password..."
                value={freshStartPassword}
                onChange={(e) => setFreshStartPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Type exact confirmation phrase <code className="text-rose-400 font-mono">PURGE-TEST-TRANSACTIONS</code>:
              </label>
              <input
                type="text"
                value={freshStartPhrase}
                onChange={(e) => setFreshStartPhrase(e.target.value)}
                className="w-full bg-slate-950 border border-rose-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="ghost" onClick={() => setFreshStartModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={freshStartPhrase !== 'PURGE-TEST-TRANSACTIONS' || !freshStartPassword}
                onClick={handleExecuteFreshStart}
              >
                Execute 2FA Reset
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: THERMAL ESC/POS Z-REPORT PREVIEW */}
      {/* ========================================================================= */}
      {showZReportModal && (
        <Modal
          isOpen={showZReportModal}
          onClose={() => setShowZReportModal(false)}
          title="Day-End Thermal Z-Report Receipt"
        >
          <div className="space-y-4">
            <div className="bg-white text-slate-900 p-5 rounded-lg font-mono text-xs shadow-inner select-none space-y-2 border border-slate-200">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <div className="text-base font-black tracking-wider uppercase">Kanchan Telecom</div>
                <div className="text-[10px] text-slate-600">Day-End Blind Cash Closing (Z-Report)</div>
                <div className="text-[10px] text-slate-600">Terminal Register #01 • Mushak 6.3</div>
                <div className="text-[10px] font-bold mt-1 text-slate-800">
                  DATE: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Starting Float:</span>
                  <span>৳{openingFloat.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Expected Drawer Cash:</span>
                  <span>৳{expectedDrawerCash.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Physical Counted Cash:</span>
                  <span>৳{physicalCountedCash.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-300">
                  <span>VARIANCE:</span>
                  <span>{isBalanced ? '৳0.00 (BALANCED)' : `৳${variance.toLocaleString()}.00`}</span>
                </div>
                {discrepancyReason && (
                  <div className="text-[10px] text-slate-600 pt-1">
                    Reason: {discrepancyReason}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-600 space-y-0.5 pt-1 border-b border-dashed border-slate-400 pb-2">
                <div>Notes Count: 1k({denominations.note1000}) 500({denominations.note500}) 200({denominations.note200}) 100({denominations.note100})</div>
                <div>Recounts: {recountCount} / 1 Used • Register Permanently Locked</div>
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-600">
                <div>Audit Digest Dispatched via SMS to Owner Phone</div>
                <div className="font-semibold text-slate-800 mt-0.5">Powered by Bebsayik.com ERP</div>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setShowZReportModal(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  window.print();
                  setShowZReportModal(false);
                }}
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print ESC/POS
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
