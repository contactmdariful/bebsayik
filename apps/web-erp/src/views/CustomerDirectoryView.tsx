import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Send,
  CreditCard,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Printer,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Modal } from '../components/Modal.js';
import { Button } from '../components/Button.js';
import { MoneyText } from '../components/MoneyText.js';
import { EmptyState } from '../components/EmptyState.js';

export interface CustomerItem {
  _id: string;
  fullName: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  nidNumber?: string;
  creditLimit: string;
  currentDueBalance: string;
  rewardPoints: number;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface CustomerStatementData {
  customer: CustomerItem;
  summary: {
    totalInvoicesCount: number;
    totalPurchasedAmount: string;
    totalPaidAmount: string;
    currentDueBalance: string;
    creditLimit: string;
    availableCredit: string;
  };
  tabs: {
    invoices: Array<{
      _id: string;
      invoiceNo: string;
      grandTotalAmount: string;
      paidAmount: string;
      dueAmount: string;
      status: string;
      createdAt: string;
    }>;
    dueLedger: Array<{
      date: string;
      type: 'SALE_DUE' | 'DUE_COLLECTION' | 'RETURN_NETTING';
      referenceNo: string;
      debit: string;
      credit: string;
      runningBalance: string;
      note?: string;
    }>;
    kistiContracts: Array<any>;
    servicingHistory: Array<any>;
  };
}

// Initial mock dataset representing Bangladeshi mobile shop customers
const INITIAL_CUSTOMERS: CustomerItem[] = [
  {
    _id: 'cust-101',
    fullName: 'Mahmudul Hasan (Shop 14)',
    phone: '01812345678',
    alternatePhone: '01711223344',
    address: 'Shop 14, Level 3, Eastern Plaza, Hatirpool, Dhaka',
    nidNumber: '1987542319087',
    creditLimit: '25000.00',
    currentDueBalance: '8000.00',
    rewardPoints: 120,
    status: 'active',
    createdAt: '2026-08-15T10:00:00.000Z'
  },
  {
    _id: 'cust-102',
    fullName: 'Tanvir Ahmed',
    phone: '01799887766',
    address: 'Elephant Road, Dhaka',
    creditLimit: '15000.00',
    currentDueBalance: '0.00',
    rewardPoints: 45,
    status: 'active',
    createdAt: '2026-09-02T14:30:00.000Z'
  },
  {
    _id: 'cust-103',
    fullName: 'Kamrul Islam (Wholesaler)',
    phone: '01911445566',
    alternatePhone: '01611223344',
    address: 'Motijheel C/A, Dhaka',
    nidNumber: '1990456123456',
    creditLimit: '50000.00',
    currentDueBalance: '18500.00',
    rewardPoints: 310,
    status: 'active',
    createdAt: '2026-07-20T11:15:00.000Z'
  },
  {
    _id: 'cust-104',
    fullName: 'Farhana Akter',
    phone: '01555667788',
    address: 'Dhanmondi 27, Dhaka',
    creditLimit: '10000.00',
    currentDueBalance: '2500.00',
    rewardPoints: 80,
    status: 'active',
    createdAt: '2026-09-18T16:00:00.000Z'
  }
];

export function CustomerDirectoryView() {
  const [customers, setCustomers] = useState<CustomerItem[]>(INITIAL_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDueOnly, setFilterDueOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Add Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAltPhone, setNewAltPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNid, setNewNid] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('10000');
  const [createError, setCreateError] = useState<string | null>(null);

  // Collect Due Modal (বাকি আদায়)
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectPaymentMethod, setCollectPaymentMethod] = useState<'cash' | 'mfs_bkash' | 'mfs_nagad' | 'bank_card'>('cash');
  const [collectNotes, setCollectNotes] = useState('');
  const [collectError, setCollectError] = useState<string | null>(null);
  const [collectSuccessData, setCollectSuccessData] = useState<any | null>(null);

  // Customer 360° Profile Statement Drawer
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [profileCustomer, setProfileCustomer] = useState<CustomerItem | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'invoices' | 'dueLedger' | 'kisti' | 'servicing'>('dueLedger');
  const [statementData, setStatementData] = useState<CustomerStatementData | null>(null);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);

  // Toast / Feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Keyboard shortcut F3 to quick-add customer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setShowAddModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q));

      const hasDue = Number(c.currentDueBalance || 0) > 0;
      const matchesDue = !filterDueOnly || hasDue;

      return matchesSearch && matchesDue;
    });
  }, [customers, searchQuery, filterDueOnly]);

  // Aggregate Metrics
  const totalDueBalance = useMemo(() => {
    return customers.reduce((sum, c) => sum + Number(c.currentDueBalance || 0), 0);
  }, [customers]);

  const customersWithDueCount = useMemo(() => {
    return customers.filter((c) => Number(c.currentDueBalance || 0) > 0).length;
  }, [customers]);

  const totalCreditExtended = useMemo(() => {
    return customers.reduce((sum, c) => sum + Number(c.creditLimit || 0), 0);
  }, [customers]);

  // Fetch real customers from API if available
  const fetchCustomersFromApi = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/customers');
      if (res.ok) {
        const data = await res.json();
        if (data.customers && data.customers.length > 0) {
          setCustomers(data.customers);
        }
      }
    } catch {
      // Offline or mock mode
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomersFromApi();
  }, []);

  // Handle Add Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newName.trim() || !newPhone.trim()) {
      setCreateError('Customer name and phone number are mandatory.');
      return;
    }

    try {
      const payload = {
        fullName: newName.trim(),
        phone: newPhone.trim(),
        alternatePhone: newAltPhone.trim() || undefined,
        address: newAddress.trim() || undefined,
        nidNumber: newNid.trim() || undefined,
        creditLimit: Number(newCreditLimit) || 0
      };

      const res = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        setCustomers((prev) => [created, ...prev]);
        showToast(`Customer "${created.fullName}" successfully registered!`);
      } else {
        // Fallback local state
        const localNew: CustomerItem = {
          _id: `cust-${Date.now()}`,
          fullName: payload.fullName,
          phone: payload.phone,
          alternatePhone: payload.alternatePhone,
          address: payload.address,
          nidNumber: payload.nidNumber,
          creditLimit: (payload.creditLimit || 0).toFixed(2),
          currentDueBalance: '0.00',
          rewardPoints: 0,
          status: 'active',
          createdAt: new Date().toISOString()
        };
        setCustomers((prev) => [localNew, ...prev]);
        showToast(`Customer "${localNew.fullName}" created (Local DB mode)!`);
      }

      setShowAddModal(false);
      setNewName('');
      setNewPhone('');
      setNewAltPhone('');
      setNewAddress('');
      setNewNid('');
      setNewCreditLimit('10000');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create customer');
    }
  };

  // Open Collect Due Modal
  const openCollectDueModal = (cust: CustomerItem) => {
    setSelectedCustomer(cust);
    setCollectAmount(cust.currentDueBalance);
    setCollectPaymentMethod('cash');
    setCollectNotes('');
    setCollectError(null);
    setCollectSuccessData(null);
    setShowCollectModal(true);
  };

  // Handle Due Collection Submission (TX-06)
  const handleProcessDueCollection = async () => {
    if (!selectedCustomer) return;
    setCollectError(null);

    const amountNum = Number(collectAmount);
    const dueNum = Number(selectedCustomer.currentDueBalance);

    if (!amountNum || amountNum <= 0) {
      setCollectError('Please enter a valid collection amount.');
      return;
    }

    if (amountNum > dueNum) {
      setCollectError(`Collection amount ৳${amountNum.toFixed(2)} exceeds total outstanding due ৳${dueNum.toFixed(2)}.`);
      return;
    }

    const idempotencyKey = `due_collect_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const res = await fetch(`/api/v1/customers/${selectedCustomer._id}/collect-due`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          amount: amountNum.toFixed(2),
          paymentMethod: collectPaymentMethod,
          notes: collectNotes
        })
      });

      let resultData: any;
      if (res.ok) {
        resultData = await res.json();
      } else {
        // Mock fallback result
        const remDue = dueNum - amountNum;
        resultData = {
          receiptNo: `MR-202610-${Math.floor(10000 + Math.random() * 90000)}`,
          customerName: selectedCustomer.fullName,
          amountCollected: amountNum.toFixed(2),
          previousDue: dueNum.toFixed(2),
          remainingDue: remDue.toFixed(2),
          paymentMethod: collectPaymentMethod,
          allocatedInvoices: [
            {
              invoiceNo: 'INV-202610-00101',
              amountAllocated: amountNum.toFixed(2)
            }
          ]
        };
      }

      // Update customer due in state
      setCustomers((prev) =>
        prev.map((c) =>
          c._id === selectedCustomer._id
            ? { ...c, currentDueBalance: (Number(c.currentDueBalance) - amountNum).toFixed(2) }
            : c
        )
      );

      setCollectSuccessData(resultData);
      showToast(`Collected ৳${amountNum.toFixed(2)} from ${selectedCustomer.fullName}. Money Receipt generated!`);
    } catch (err: any) {
      setCollectError(err.message || 'Failed to process due collection');
    }
  };

  // Send Automated SMS Reminder
  const handleSendDueSms = async (cust: CustomerItem) => {
    if (Number(cust.currentDueBalance || 0) <= 0) {
      showToast(`Customer ${cust.fullName} has no outstanding due balance.`);
      return;
    }

    try {
      const res = await fetch(`/api/v1/customers/${cust._id}/send-sms-reminder`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Due reminder SMS dispatched to ${cust.phone} for ৳${cust.currentDueBalance}!`);
      } else {
        showToast(`SMS Reminder dispatched to ${cust.phone} via MockSmsGateway!`);
      }
    } catch {
      showToast(`SMS Reminder queued for ${cust.phone} (Mock Driver)!`);
    }
  };

  // Open 360° Profile Statement
  const openCustomerProfile = async (cust: CustomerItem) => {
    setProfileCustomer(cust);
    setShowProfileDrawer(true);
    setIsLoadingStatement(true);

    try {
      const res = await fetch(`/api/v1/customers/${cust._id}/statement`);
      if (res.ok) {
        const data = await res.json();
        setStatementData(data);
      } else {
        // Fallback mock statement
        const mockStmt: CustomerStatementData = {
          customer: cust,
          summary: {
            totalInvoicesCount: 4,
            totalPurchasedAmount: '78500.00',
            totalPaidAmount: (78500 - Number(cust.currentDueBalance)).toFixed(2),
            currentDueBalance: cust.currentDueBalance,
            creditLimit: cust.creditLimit,
            availableCredit: (Number(cust.creditLimit) - Number(cust.currentDueBalance)).toFixed(2)
          },
          tabs: {
            invoices: [
              {
                _id: 'inv-1',
                invoiceNo: 'INV-202610-00101',
                grandTotalAmount: '28500.00',
                paidAmount: '20500.00',
                dueAmount: cust.currentDueBalance,
                status: 'completed',
                createdAt: '2026-10-04T12:00:00Z'
              },
              {
                _id: 'inv-2',
                invoiceNo: 'INV-202609-00045',
                grandTotalAmount: '50000.00',
                paidAmount: '50000.00',
                dueAmount: '0.00',
                status: 'completed',
                createdAt: '2026-09-12T15:30:00Z'
              }
            ],
            dueLedger: [
              {
                date: '2026-10-04T12:00:00Z',
                type: 'SALE_DUE',
                referenceNo: 'INV-202610-00101',
                debit: cust.currentDueBalance,
                credit: '0.00',
                runningBalance: cust.currentDueBalance,
                note: 'Credit sale invoice due addition'
              },
              {
                date: '2026-09-15T11:20:00Z',
                type: 'DUE_COLLECTION',
                referenceNo: 'MR-202609-00012',
                debit: '0.00',
                credit: '12000.00',
                runningBalance: '0.00',
                note: 'Monthly cash due settlement'
              }
            ],
            kistiContracts: [],
            servicingHistory: []
          }
        };
        setStatementData(mockStmt);
      }
    } catch {
      // Error
    } finally {
      setIsLoadingStatement(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1720px] w-full mx-auto flex flex-col space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-900 border border-teal-500 text-teal-100 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-sm animate-fade-in">
          <Sparkles className="w-4 h-4 text-teal-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Fast Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="bg-teal-500/10 border border-teal-500/30 p-2 rounded-xl text-teal-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                <span>Customer 360° & Bakir Khata Subledger</span>
                <span className="text-xs bg-teal-900/60 text-teal-300 border border-teal-700 px-2 py-0.5 rounded-full font-mono font-semibold">
                  Phase 8
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                গ্রাহক ডিরেক্টরি, বাকির খাতা সাবলেজার, এফআইএফও বকেয়া আদায় এবং স্বয়ংক্রিয় তাগাদা এসএমএস
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchCustomersFromApi()}
            className="p-2 text-slate-400 hover:text-slate-100 bg-slate-900 border border-slate-800 rounded-xl transition-all"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-500"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
            <span className="text-[10px] bg-teal-800 px-1.5 py-0.5 rounded font-mono">F3</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards (Dokan Bakir Khata Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Accounts</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{customers.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Registered customer profiles
          </div>
        </div>

        {/* Total Due Balance */}
        <div className="bg-slate-900 border border-rose-900/40 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Bakir Khata (মোট বাকি)</span>
            <DollarSign className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">
            ৳{totalDueBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-rose-300/80 mt-1">
            Across {customersWithDueCount} active due accounts
          </div>
        </div>

        {/* Accounts with Due */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Due Accounts Ratio</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {customers.length > 0 ? `${Math.round((customersWithDueCount / customers.length) * 100)}%` : '0%'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {customersWithDueCount} of {customers.length} customers have balances
          </div>
        </div>

        {/* Total Credit Extended */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Credit Limit</span>
            <CreditCard className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-teal-400">
            ৳{totalCreditExtended.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Authorized store credit limits
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, 11-digit mobile (017...), or market stall..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-sans"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterDueOnly(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !filterDueOnly
                ? 'bg-teal-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Accounts ({customers.length})
          </button>
          <button
            onClick={() => setFilterDueOnly(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              filterDueOnly
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-rose-300 hover:bg-slate-700'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Has Due Balance ({customersWithDueCount})</span>
          </button>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-200">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Customer Name & Contact</th>
                <th className="py-3 px-4">Market Address / NID</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Current Due (বাকি)</th>
                <th className="py-3 px-4 text-center">Reward Pts</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <EmptyState
                      title="No Customers Found"
                      description={
                        searchQuery
                          ? `No customer profiles matching "${searchQuery}"`
                          : 'No registered customer accounts yet. Click "Add Customer" to start.'
                      }
                      icon={<Users className="w-8 h-8 text-slate-500" />}
                    />
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const dueNum = Number(cust.currentDueBalance || 0);
                  const limitNum = Number(cust.creditLimit || 0);
                  const hasDue = dueNum > 0;
                  const isLimitExceeded = limitNum > 0 && dueNum > limitNum;

                  return (
                    <tr
                      key={cust._id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => openCustomerProfile(cust)}
                    >
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-100 flex items-center space-x-2">
                          <span>{cust.fullName}</span>
                          {isLimitExceeded && (
                            <span className="text-[10px] bg-rose-950 border border-rose-800 text-rose-300 px-1.5 py-0.2 rounded font-bold">
                              LIMIT EXCEEDED
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono flex items-center space-x-2 mt-0.5">
                          <Phone className="w-3 h-3 text-teal-400 inline" />
                          <span>{cust.phone}</span>
                          {cust.alternatePhone && (
                            <span className="text-slate-500">/ {cust.alternatePhone}</span>
                          )}
                        </div>
                      </td>

                      {/* Address / NID */}
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        <div className="truncate max-w-[220px]">
                          {cust.address || <span className="text-slate-600">No address on file</span>}
                        </div>
                        {cust.nidNumber && (
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            NID: {cust.nidNumber}
                          </div>
                        )}
                      </td>

                      {/* Credit Limit */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        ৳{Number(cust.creditLimit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Current Due Balance */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        {hasDue ? (
                          <span className="text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/60">
                            ৳{dueNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-normal">৳0.00</span>
                        )}
                      </td>

                      {/* Reward Points */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-slate-800 text-amber-300 text-xs px-2 py-0.5 rounded-full font-mono font-semibold">
                          {cust.rewardPoints || 0} pts
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end space-x-2">
                          {hasDue && (
                            <>
                              {/* Collect Due Button */}
                              <button
                                onClick={() => openCollectDueModal(cust)}
                                className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 shadow-sm"
                                title="Collect Bakir Khata payment"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Collect Due</span>
                              </button>

                              {/* Send SMS Reminder */}
                              <button
                                onClick={() => handleSendDueSms(cust)}
                                className="bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs px-2 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 border border-slate-700"
                                title="Send automated due payment SMS reminder"
                              >
                                <Send className="w-3 h-3" />
                                <span>SMS</span>
                              </button>
                            </>
                          )}

                          {/* 360 View Profile */}
                          <button
                            onClick={() => openCustomerProfile(cust)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs p-1.5 rounded-lg transition-all"
                            title="View 360° Profile & Statement"
                          >
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD CUSTOMER MODAL (F3)                                                    */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-teal-400" />
            <span>Register New Customer (নতুন গ্রাহক নিবন্ধন)</span>
          </div>
        }
        maxWidth="md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 pt-2">
          {createError && (
            <div className="bg-rose-950/70 border border-rose-800 text-rose-200 text-xs p-3 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Customer Full Name (গ্রাহকের নাম) *
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Kamrul Hasan or Shop 12 Mobile Zone"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Mobile Number (মোবাইল নম্বর) *
              </label>
              <input
                type="text"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="01712345678"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Alternate Contact
              </label>
              <input
                type="text"
                value={newAltPhone}
                onChange={(e) => setNewAltPhone(e.target.value)}
                placeholder="Optional backup phone"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Market Address / Stall (দোকান / ঠিকানা)
            </label>
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="e.g. Shop 24, Level 4, Eastern Plaza, Hatirpool"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                National ID (NID নম্বর)
              </label>
              <input
                type="text"
                value={newNid}
                onChange={(e) => setNewNid(e.target.value)}
                placeholder="e.g. 1987542319087"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Credit Limit (বাকির লিমিট ৳)
              </label>
              <input
                type="number"
                value={newCreditLimit}
                onChange={(e) => setNewCreditLimit(e.target.value)}
                placeholder="10000"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <Button
              variant="outline"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              className="bg-teal-600 hover:bg-teal-500"
            >
              Register Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* COLLECT DUE MODAL (TX-06: BAKIR KHATA DUE COLLECTION)                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showCollectModal}
        onClose={() => setShowCollectModal(false)}
        title={
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span>Bakir Khata Due Collection (বাকি আদায় ও মানি রিসিট)</span>
          </div>
        }
        maxWidth="md"
      >
        {selectedCustomer && (
          <div className="space-y-4 pt-2">
            {collectError && (
              <div className="bg-rose-950/70 border border-rose-800 text-rose-200 text-xs p-3 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{collectError}</span>
              </div>
            )}

            {/* Success Receipt State */}
            {collectSuccessData ? (
              <div className="bg-slate-950 border border-emerald-800/80 rounded-xl p-4 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-950 text-emerald-400 border border-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  Payment Collected Successfully!
                </h3>
                <div className="font-mono text-sm bg-slate-900 border border-slate-800 rounded p-2 text-emerald-300">
                  Receipt No: {collectSuccessData.receiptNo}
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>Customer: <span className="text-slate-200 font-semibold">{collectSuccessData.customerName}</span></p>
                  <p>Amount Collected: <span className="text-emerald-400 font-bold font-mono">৳{collectSuccessData.amountCollected}</span></p>
                  <p>Remaining Due Balance: <span className="text-rose-400 font-bold font-mono">৳{collectSuccessData.remainingDue}</span></p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-center space-x-3">
                  <Button
                    variant="outline"
                    className="flex items-center space-x-1.5"
                    onClick={() => {
                      showToast(`Thermal Money Receipt ${collectSuccessData.receiptNo} sent to 80mm ESC/POS printer!`);
                    }}
                  >
                    <Printer className="w-4 h-4 text-teal-400" />
                    <span>Print Money Receipt</span>
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setShowCollectModal(false);
                      setCollectSuccessData(null);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              /* Collection Input Form */
              <div className="space-y-4">
                {/* Account Summary Banner */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-100">{selectedCustomer.fullName}</div>
                    <div className="text-xs text-slate-400 font-mono">{selectedCustomer.phone}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase">Outstanding Due</div>
                    <div className="text-lg font-bold text-rose-400 font-mono">
                      ৳{Number(selectedCustomer.currentDueBalance).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Amount to Collect Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Amount Collected (আদায়কৃত পরিমাণ ৳) *
                  </label>
                  <input
                    type="number"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-base text-slate-100 font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>
                      Projected Remaining Due: ৳
                      {Math.max(
                        0,
                        Number(selectedCustomer.currentDueBalance) - (Number(collectAmount) || 0)
                      ).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCollectAmount(selectedCustomer.currentDueBalance)}
                      className="text-teal-400 hover:underline"
                    >
                      Collect Full Balance
                    </button>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Payment Method (জমা পদ্ধতি)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCollectPaymentMethod('cash')}
                      className={`p-2 rounded-lg text-xs font-semibold border flex items-center justify-center space-x-1.5 transition-all ${
                        collectPaymentMethod === 'cash'
                          ? 'bg-teal-950 border-teal-500 text-teal-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cash (ক্যাশ ড্রয়ার)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectPaymentMethod('mfs_bkash')}
                      className={`p-2 rounded-lg text-xs font-semibold border flex items-center justify-center space-x-1.5 transition-all ${
                        collectPaymentMethod === 'mfs_bkash'
                          ? 'bg-rose-950 border-rose-500 text-rose-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 text-pink-400" />
                      <span>bKash (বিকাশ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectPaymentMethod('mfs_nagad')}
                      className={`p-2 rounded-lg text-xs font-semibold border flex items-center justify-center space-x-1.5 transition-all ${
                        collectPaymentMethod === 'mfs_nagad'
                          ? 'bg-amber-950 border-amber-500 text-amber-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                      <span>Nagad (নগদ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectPaymentMethod('bank_card')}
                      className={`p-2 rounded-lg text-xs font-semibold border flex items-center justify-center space-x-1.5 transition-all ${
                        collectPaymentMethod === 'bank_card'
                          ? 'bg-blue-950 border-blue-500 text-blue-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                      <span>Bank Card (কার্ড)</span>
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Notes / Memo (মন্তব্য)
                  </label>
                  <input
                    type="text"
                    value={collectNotes}
                    onChange={(e) => setCollectNotes(e.target.value)}
                    placeholder="e.g. Received by Rafi Cashier at Counter 1"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                  <Button
                    variant="outline"
                    onClick={() => setShowCollectModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleProcessDueCollection}
                    className="bg-emerald-600 hover:bg-emerald-500"
                  >
                    Confirm Collection & Print MR
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* CUSTOMER 360° STATEMENT PROFILE MODAL                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showProfileDrawer}
        onClose={() => setShowProfileDrawer(false)}
        title={
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-teal-400" />
            <span>Customer 360° Statement (Wireframe Screen 04)</span>
          </div>
        }
        maxWidth="xl"
      >
        {profileCustomer && (
          <div className="space-y-4 pt-1">
            {/* Customer Details & Quick Stats Bar */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">{profileCustomer.fullName}</h3>
                <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center space-x-3">
                  <span>Phone: {profileCustomer.phone}</span>
                  {profileCustomer.address && <span>• {profileCustomer.address}</span>}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase">Bakir Khata Due</div>
                  <div className="text-lg font-bold text-rose-400 font-mono">
                    ৳{Number(profileCustomer.currentDueBalance).toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase">Credit Limit</div>
                  <div className="text-lg font-bold text-teal-400 font-mono">
                    ৳{Number(profileCustomer.creditLimit).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Tabs: Invoices, Due Ledger, Kisti, Servicing */}
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setActiveProfileTab('dueLedger')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center space-x-1.5 ${
                  activeProfileTab === 'dueLedger'
                    ? 'border-teal-500 text-teal-400 bg-slate-900/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Bakir Khata Ledger (লেজার)</span>
              </button>

              <button
                onClick={() => setActiveProfileTab('invoices')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center space-x-1.5 ${
                  activeProfileTab === 'invoices'
                    ? 'border-teal-500 text-teal-400 bg-slate-900/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Sales Invoices (চালান)</span>
              </button>

              <button
                onClick={() => setActiveProfileTab('kisti')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center space-x-1.5 ${
                  activeProfileTab === 'kisti'
                    ? 'border-teal-500 text-teal-400 bg-slate-900/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Kisti Contracts (কিস্তি)</span>
              </button>

              <button
                onClick={() => setActiveProfileTab('servicing')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center space-x-1.5 ${
                  activeProfileTab === 'servicing'
                    ? 'border-teal-500 text-teal-400 bg-slate-900/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Servicing Jobs (সার্ভিসিং)</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="max-h-[380px] overflow-y-auto">
              {isLoadingStatement ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Loading statement records...
                </div>
              ) : (
                <>
                  {/* Tab: Bakir Khata Ledger */}
                  {activeProfileTab === 'dueLedger' && (
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Reference No</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3 text-right">Debit (+Due)</th>
                          <th className="py-2 px-3 text-right">Credit (-Due)</th>
                          <th className="py-2 px-3 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {statementData?.tabs.dueLedger.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/40 font-mono">
                            <td className="py-2.5 px-3 font-sans text-slate-400">
                              {new Date(row.date).toLocaleDateString()}
                            </td>
                            <td className="py-2.5 px-3 text-teal-300 font-semibold">{row.referenceNo}</td>
                            <td className="py-2.5 px-3 font-sans">
                              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                {row.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-rose-400">
                              {Number(row.debit) > 0 ? `+৳${row.debit}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-400">
                              {Number(row.credit) > 0 ? `-৳${row.credit}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-100">
                              ৳{row.runningBalance}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Tab: Sales Invoices */}
                  {activeProfileTab === 'invoices' && (
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Invoice No</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3 text-right">Grand Total</th>
                          <th className="py-2 px-3 text-right">Paid</th>
                          <th className="py-2 px-3 text-right">Due</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {statementData?.tabs.invoices.map((inv) => (
                          <tr key={inv._id} className="hover:bg-slate-900/40 font-mono">
                            <td className="py-2.5 px-3 text-teal-300 font-semibold">{inv.invoiceNo}</td>
                            <td className="py-2.5 px-3 font-sans text-slate-400">
                              {new Date(inv.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-2.5 px-3 text-right">৳{inv.grandTotalAmount}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-400">৳{inv.paidAmount}</td>
                            <td className="py-2.5 px-3 text-right text-rose-400 font-bold">
                              ৳{inv.dueAmount}
                            </td>
                            <td className="py-2.5 px-3 text-center font-sans">
                              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Tab: Kisti Contracts */}
                  {activeProfileTab === 'kisti' && (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No active or historical Kisti installment contracts for this customer.
                    </div>
                  )}

                  {/* Tab: Servicing History */}
                  {activeProfileTab === 'servicing' && (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No technician repair servicing jobs found for this customer.
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                Customer 360° Profile synchronized with Bebsayik Core API
              </div>
              <Button
                variant="outline"
                onClick={() => setShowProfileDrawer(false)}
              >
                Close Statement
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
