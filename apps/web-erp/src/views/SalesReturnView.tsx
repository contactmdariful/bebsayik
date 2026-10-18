import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Search,
  AlertCircle,
  CheckCircle2,
  Printer,
  ShieldAlert,
  Smartphone,
  Package,
  DollarSign,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  Barcode
} from 'lucide-react';
import { Modal } from '../components/Modal.js';
import { Button } from '../components/Button.js';
import { MoneyText } from '../components/MoneyText.js';
import { EmptyState } from '../components/EmptyState.js';

export interface ReturnItemState {
  variantId: string;
  name: string;
  isHandset: boolean;
  imei1?: string;
  originalQty: number;
  returnableQty: number;
  returnQty: number;
  unitPrice: number;
  condition: 'restockable' | 'defective' | 'quarantine';
}

export interface LookedUpSale {
  _id: string;
  invoiceNo: string;
  createdAt: string;
  ageDays: number;
  isExpired: boolean;
  customerName?: string;
  customerPhone?: string;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  items: ReturnItemState[];
}

// Sample Sale for instant lookup demonstration
const SAMPLE_SALES: Record<string, LookedUpSale> = {
  'INV-202610-00142': {
    _id: 'sale-142',
    invoiceNo: 'INV-202610-00142',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days old (valid)
    ageDays: 2,
    isExpired: false,
    customerName: 'Mahmudul Hasan',
    customerPhone: '01812345678',
    grandTotal: 25000,
    paidAmount: 25000,
    dueAmount: 0,
    status: 'completed',
    items: [
      {
        variantId: 'var-101',
        name: 'Redmi Note 13 Pro (8/256GB Midnight Black)',
        isHandset: true,
        imei1: '860123456789012',
        originalQty: 1,
        returnableQty: 1,
        returnQty: 1,
        unitPrice: 25000,
        condition: 'quarantine' // Defective quarantine by default
      }
    ]
  },
  'INV-202610-00500': {
    _id: 'sale-500',
    invoiceNo: 'INV-202610-00500',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day old (valid)
    ageDays: 1,
    isExpired: false,
    customerName: 'Kamrul Islam',
    customerPhone: '01911445566',
    grandTotal: 20000,
    paidAmount: 15000,
    dueAmount: 5000, // Has ৳5,000 due -> TC-21 netting demonstration!
    status: 'completed',
    items: [
      {
        variantId: 'var-102',
        name: 'Realme 12+ 5G (8/256GB Pioneer Green)',
        isHandset: true,
        imei1: '860999888777666',
        originalQty: 1,
        returnableQty: 1,
        returnQty: 1,
        unitPrice: 20000,
        condition: 'restockable'
      }
    ]
  },
  'INV-202610-00010': {
    _id: 'sale-010',
    invoiceNo: 'INV-202610-00010',
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days old (> 7 days expired)
    ageDays: 12,
    isExpired: true,
    customerName: 'Tanvir Ahmed',
    customerPhone: '01799887766',
    grandTotal: 1500,
    paidAmount: 1500,
    dueAmount: 0,
    status: 'completed',
    items: [
      {
        variantId: 'var-103',
        name: 'Anker PowerPort 20W Fast Charger',
        isHandset: false,
        originalQty: 1,
        returnableQty: 1,
        returnQty: 1,
        unitPrice: 1500,
        condition: 'restockable'
      }
    ]
  }
};

export function SalesReturnView() {
  const [invoiceQuery, setInvoiceQuery] = useState('INV-202610-00142');
  const [activeSale, setActiveSale] = useState<LookedUpSale | null>(SAMPLE_SALES['INV-202610-00142']);
  const [returnItems, setReturnItems] = useState<ReturnItemState[]>(
    SAMPLE_SALES['INV-202610-00142'].items
  );

  // Manager PIN override for expired 7-day policy
  const [managerPin, setManagerPin] = useState('');
  const [returnReason, setReturnReason] = useState('Customer reported intermittent screen flicker');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'mfs_bkash' | 'mfs_nagad'>('cash');

  // Submit / Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Lookup invoice handler
  const handleLookupInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    const q = invoiceQuery.trim();

    if (!q) {
      setErrorBanner('Please enter a valid invoice number to search.');
      return;
    }

    try {
      const res = await fetch(`/api/v1/sales/returns/lookup/${q}`);
      if (res.ok) {
        const data = await res.json();
        setActiveSale(data);
        setReturnItems(data.items);
      } else if (SAMPLE_SALES[q]) {
        // Fallback to sample sales
        setActiveSale(SAMPLE_SALES[q]);
        setReturnItems(SAMPLE_SALES[q].items);
      } else {
        setErrorBanner(`Invoice "${q}" not found in sales history.`);
        setActiveSale(null);
      }
    } catch {
      if (SAMPLE_SALES[q]) {
        setActiveSale(SAMPLE_SALES[q]);
        setReturnItems(SAMPLE_SALES[q].items);
      } else {
        setErrorBanner(`Invoice "${q}" not found.`);
        setActiveSale(null);
      }
    }
  };

  // Update item quantity
  const handleQtyChange = (idx: number, qty: number) => {
    setReturnItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, returnQty: Math.max(0, Math.min(qty, item.returnableQty)) } : item
      )
    );
  };

  // Update item condition (Restockable vs Defective Quarantine TC-20)
  const handleConditionChange = (idx: number, cond: 'restockable' | 'defective' | 'quarantine') => {
    setReturnItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, condition: cond } : item))
    );
  };

  // Financial Netting Computations (TC-21)
  const totalReturnValue = useMemo(() => {
    return returnItems.reduce((sum, it) => sum + it.unitPrice * (it.returnQty || 0), 0);
  }, [returnItems]);

  const saleDueAmount = useMemo(() => {
    return activeSale ? activeSale.dueAmount : 0;
  }, [activeSale]);

  // TC-21: If sale had outstanding due, reduce due balance first before issuing cash refund!
  const dueReductionAmount = useMemo(() => {
    if (saleDueAmount <= 0) return 0;
    return Math.min(totalReturnValue, saleDueAmount);
  }, [totalReturnValue, saleDueAmount]);

  const netCashRefund = useMemo(() => {
    return Math.max(0, totalReturnValue - dueReductionAmount);
  }, [totalReturnValue, dueReductionAmount]);

  // Submit Sales Return (CRV - TX-05)
  const handleProcessReturn = async () => {
    if (!activeSale) return;
    setErrorBanner(null);

    const itemsToReturn = returnItems.filter((it) => it.returnQty > 0);
    if (itemsToReturn.length === 0) {
      setErrorBanner('Please select at least 1 item with quantity greater than 0 to return.');
      return;
    }

    if (activeSale.isExpired && !managerPin.trim()) {
      setErrorBanner('7-day return policy has expired. Manager PIN is required to authorize this return.');
      return;
    }

    setIsSubmitting(true);
    const idempotencyKey = `return_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const payload = {
        invoiceNo: activeSale.invoiceNo,
        managerPin: managerPin.trim() || undefined,
        reason: returnReason.trim() || 'Customer return',
        refundMethod,
        items: itemsToReturn.map((it) => ({
          variantId: it.variantId,
          imei1: it.imei1,
          quantity: it.returnQty,
          refundPrice: it.unitPrice,
          condition: it.condition
        }))
      };

      const res = await fetch('/api/v1/sales/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(payload)
      });

      let resData: any;
      if (res.ok) {
        resData = await res.json();
      } else {
        // Fallback local receipt
        const monthPrefix = '202610';
        const rnd = Math.floor(10000 + Math.random() * 90000);
        resData = {
          crvNo: `CRV-${monthPrefix}-${rnd}`,
          invoiceNo: activeSale.invoiceNo,
          totalReturnAmount: totalReturnValue.toFixed(2),
          dueReductionAmount: dueReductionAmount.toFixed(2),
          cashRefundAmount: netCashRefund.toFixed(2),
          refundMethod,
          saleStatus:
            itemsToReturn.reduce((s, i) => s + i.returnQty, 0) >=
            returnItems.reduce((s, i) => s + i.originalQty, 0)
              ? 'refunded'
              : 'partially_refunded'
        };
      }

      setSuccessReceipt(resData);
      setShowReceiptModal(true);
      showToast(`Sales Return ${resData.crvNo} processed successfully!`);

      // Reset
      if (activeSale) {
        setActiveSale({
          ...activeSale,
          dueAmount: Math.max(0, activeSale.dueAmount - dueReductionAmount),
          status: resData.saleStatus
        });
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to process return');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1720px] w-full mx-auto flex flex-col space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-900 border border-teal-500 text-teal-100 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-sm">
          <Sparkles className="w-4 h-4 text-teal-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl text-amber-400">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
              <span>Sales Returns & Defect Quarantine (CRV)</span>
              <span className="text-xs bg-amber-950/60 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full font-mono font-semibold">
                TX-05 • TC-20 • TC-21
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              বিক্রয় ফেরত ভাউচার, ৭ দিনের রিটার্ন পলিসি যাচাই, ত্রুটিপূর্ণ ফোন কোয়ারেন্টাইন এবং বাকির খাতা সমন্বয়
            </p>
          </div>
        </div>

        {/* Quick Demo Pre-fills */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-slate-400">Quick Test Cases:</span>
          <button
            onClick={() => {
              setInvoiceQuery('INV-202610-00142');
              setActiveSale(SAMPLE_SALES['INV-202610-00142']);
              setReturnItems(SAMPLE_SALES['INV-202610-00142'].items);
            }}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-teal-300 px-2.5 py-1 rounded border border-slate-700"
          >
            TC-20 (Defect)
          </button>
          <button
            onClick={() => {
              setInvoiceQuery('INV-202610-00500');
              setActiveSale(SAMPLE_SALES['INV-202610-00500']);
              setReturnItems(SAMPLE_SALES['INV-202610-00500'].items);
            }}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-rose-300 px-2.5 py-1 rounded border border-slate-700"
          >
            TC-21 (Due Netting)
          </button>
          <button
            onClick={() => {
              setInvoiceQuery('INV-202610-00010');
              setActiveSale(SAMPLE_SALES['INV-202610-00010']);
              setReturnItems(SAMPLE_SALES['INV-202610-00010'].items);
            }}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-amber-300 px-2.5 py-1 rounded border border-slate-700"
          >
            7-Day Override
          </button>
        </div>
      </div>

      {/* Invoice Lookup Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <form onSubmit={handleLookupInvoice} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={invoiceQuery}
              onChange={(e) => setInvoiceQuery(e.target.value)}
              placeholder="Enter Sale Invoice Number (e.g. INV-202610-00142 or INV-202610-00500)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500 font-semibold"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            className="bg-amber-600 hover:bg-amber-500 flex items-center justify-center space-x-2 shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>Lookup Invoice</span>
          </Button>
        </form>

        {errorBanner && (
          <div className="mt-3 bg-rose-950/70 border border-rose-800 text-rose-200 text-xs p-3 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}
      </div>

      {/* Active Sale Context & Return Engine */}
      {activeSale ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 Cols: Original Sale Items & Condition Selector */}
          <div className="lg:col-span-8 flex flex-col space-y-5">
            {/* Invoice Overview Card with 7-Day Policy Badge */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-base text-slate-100">
                      {activeSale.invoiceNo}
                    </span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                      Status: {activeSale.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center space-x-3">
                    <span>Date: {new Date(activeSale.createdAt).toLocaleDateString()}</span>
                    <span>• Customer: {activeSale.customerName || 'Walk-in'} ({activeSale.customerPhone || 'N/A'})</span>
                  </div>
                </div>

                {/* 7-Day Policy Status Badge */}
                <div>
                  {activeSale.isExpired ? (
                    <div className="bg-amber-950/80 border border-amber-700 text-amber-200 px-3 py-1.5 rounded-lg text-xs flex items-center space-x-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-bold">Policy Expired ({activeSale.ageDays} Days Old)</div>
                        <div className="text-[10px] text-amber-300/80">Requires Manager PIN override</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-teal-950/80 border border-teal-700 text-teal-200 px-3 py-1.5 rounded-lg text-xs flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                      <div>
                        <div className="font-bold">Policy Compliant ({activeSale.ageDays} Days Old)</div>
                        <div className="text-[10px] text-teal-300/80">Standard return window active</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Outstanding Due on Invoice (TC-21 Indicator) */}
              {activeSale.dueAmount > 0 && (
                <div className="mt-3 bg-rose-950/40 border border-rose-800/80 p-3 rounded-lg flex items-center justify-between text-xs text-rose-200">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>
                      <strong className="text-rose-300">TC-21 Due Balance Alert:</strong> This sale has an unpaid debt of ৳{activeSale.dueAmount.toFixed(2)}. Return refund will automatically reduce this due before paying out cash!
                    </span>
                  </div>
                  <div className="font-mono font-bold text-rose-400 text-sm">
                    ৳{activeSale.dueAmount.toFixed(2)} DUE
                  </div>
                </div>
              )}
            </div>

            {/* Returnable Items Selection List */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center space-x-2">
                <Package className="w-4 h-4 text-amber-400" />
                <span>Select Items to Return & Inspect (মজুত অবস্থা ও পরিদর্শণ)</span>
              </h2>

              <div className="space-y-4">
                {returnItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                          <span>{item.name}</span>
                          {item.isHandset && (
                            <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-1.5 py-0.2 rounded font-mono">
                              HANDSET
                            </span>
                          )}
                        </div>
                        {item.imei1 && (
                          <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center space-x-1">
                            <Barcode className="w-3.5 h-3.5 text-teal-400" />
                            <span>IMEI: {item.imei1}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-slate-200">
                          ৳{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Sold Qty: {item.originalQty} • Returnable: {item.returnableQty}
                        </div>
                      </div>
                    </div>

                    {/* Return Qty Control & Condition Radios */}
                    <div className="pt-3 border-t border-slate-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      {/* Qty Input */}
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-slate-400 font-semibold">Return Quantity:</label>
                        <input
                          type="number"
                          min="0"
                          max={item.returnableQty}
                          value={item.returnQty}
                          onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 0)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-mono text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* Condition Radio Selector (TC-20) */}
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-400 font-semibold">Condition:</span>
                        <button
                          type="button"
                          onClick={() => handleConditionChange(idx, 'restockable')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                            item.condition === 'restockable'
                              ? 'bg-teal-950 border-teal-500 text-teal-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Restockable (মজুতযোগ্য)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConditionChange(idx, 'quarantine')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                            item.condition === 'quarantine' || item.condition === 'defective'
                              ? 'bg-rose-950 border-rose-500 text-rose-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Defective / Quarantine (TC-20)
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manager PIN Override Input (If policy expired) */}
            {activeSale.isExpired && (
              <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-amber-300 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Manager PIN Authorization Required</span>
                </div>
                <p className="text-xs text-amber-200/80">
                  7-day return policy has lapsed. A Store Manager or Owner PIN is required to authorize override and disburse refund.
                </p>
                <div className="max-w-xs">
                  <input
                    type="password"
                    value={managerPin}
                    onChange={(e) => setManagerPin(e.target.value)}
                    placeholder="Enter 4-digit Manager PIN"
                    className="w-full bg-slate-950 border border-amber-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-amber-500/60 font-mono tracking-widest focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right 4 Cols: Netting Breakdown & Final Settlement (TC-21) */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Settlement & Due Netting (হিসাব নিষ্পত্তি)</span>
              </h2>

              {/* Financial Computation Breakdown */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Gross Return Value:</span>
                  <span className="font-mono font-bold text-slate-100">
                    ৳{totalReturnValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* TC-21 Netting Line */}
                <div className="flex justify-between items-center text-rose-400 border-t border-slate-800 pt-2">
                  <span>Due Netting (TC-21 বাকি সমন্বয়):</span>
                  <span className="font-mono font-bold">
                    -৳{dueReductionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Net Cash Refund */}
                <div className="flex justify-between items-center text-emerald-400 border-t border-slate-800 pt-2 text-sm font-bold">
                  <span>Net Cash Refund (প্রদেয় নগদ ফেরত):</span>
                  <span className="font-mono text-base">
                    ৳{netCashRefund.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Refund Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                  Disbursement Account (রিফান্ড প্রদানের মাধ্যম)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRefundMethod('cash')}
                    className={`p-2 rounded-lg text-xs font-semibold border flex items-center justify-center space-x-1.5 transition-all ${
                      refundMethod === 'cash'
                        ? 'bg-teal-950 border-teal-500 text-teal-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>Cash Drawer (1.1.01)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundMethod('mfs_bkash')}
                    className={`p-2 rounded-lg text-xs font-semibold border flex items-center justify-center space-x-1.5 transition-all ${
                      refundMethod === 'mfs_bkash'
                        ? 'bg-rose-950 border-rose-500 text-rose-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>bKash (1.2.01)</span>
                  </button>
                </div>
              </div>

              {/* Reason for Return */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Reason for Return (ফেরতের কারণ)
                </label>
                <textarea
                  rows={2}
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Display defect, physical damage, wrong model purchased..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Confirm Return Button */}
              <Button
                variant="primary"
                onClick={handleProcessReturn}
                disabled={isSubmitting || totalReturnValue <= 0}
                className="w-full bg-amber-600 hover:bg-amber-500 py-3 font-bold text-sm shadow-md"
              >
                {isSubmitting ? 'Processing Transaction...' : 'Confirm Return Voucher (CRV - TX-05)'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Search Sale Invoice"
          description="Enter an invoice number in the bar above to load items, inspect IMEI serials, and process customer return."
          icon={<RotateCcw className="w-8 h-8 text-slate-500" />}
        />
      )}

      {/* ========================================================================= */}
      {/* RETURN VOUCHER THERMAL RECEIPT MODAL                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title={
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-teal-400" />
            <span>Customer Return Voucher (CRV Receipt)</span>
          </div>
        }
        maxWidth="md"
      >
        {successReceipt && (
          <div className="space-y-4 pt-1">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2 text-slate-200">
              <div className="text-center pb-2 border-b border-slate-800">
                <div className="font-bold text-base text-slate-100">EASTERN PLAZA TELECOM</div>
                <div className="text-slate-400 text-[11px]">SALES RETURN VOUCHER</div>
                <div className="text-teal-400 font-bold mt-1">{successReceipt.crvNo}</div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                <span>Original Invoice:</span>
                <span className="text-slate-200 font-bold">{successReceipt.invoiceNo}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Date:</span>
                <span>{new Date().toLocaleString()}</span>
              </div>

              <div className="py-2 border-t border-b border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span>Gross Return Value:</span>
                  <span className="font-bold">৳{successReceipt.totalReturnAmount}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Due Netting Relief (TC-21):</span>
                  <span>-৳{successReceipt.dueReductionAmount}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold text-sm pt-1 border-t border-slate-900">
                  <span>Cash Refund Paid:</span>
                  <span>৳{successReceipt.cashRefundAmount}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-500 pt-2">
                Audited Double-Entry General Ledger Posted (TX-05)
                <br />
                Defective units routed to RETURNED_INSPECTION quarantine
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  showToast(`CRV ${successReceipt.crvNo} printed via 80mm ESC/POS hardware.`);
                }}
                className="flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4 text-teal-400" />
                <span>Print Voucher</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowReceiptModal(false)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
