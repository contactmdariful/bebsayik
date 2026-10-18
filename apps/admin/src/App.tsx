import React, { useState } from 'react';
import {
  ShieldAlert,
  Store,
  CreditCard,
  PhoneCall,
  DollarSign,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  Server,
  KeyRound,
  FileText,
  UserCheck,
  Send,
  Zap,
  HelpCircle,
  Eye,
  Search,
  ExternalLink
} from 'lucide-react';

interface ShopItem {
  id: string;
  name: string;
  slug: string;
  phone: string;
  ownerName: string;
  status: 'trial' | 'active' | 'grace_period' | 'read_only' | 'suspended';
  plan: 'silver' | 'gold' | 'diamond';
  expiryDate: string;
  daysRemaining: number;
}

const INITIAL_SHOPS: ShopItem[] = [
  {
    id: 'shp_001',
    name: 'Kanchan Telecom Eastern Plaza',
    slug: 'kanchan-telecom',
    phone: '01711223344',
    ownerName: 'Al-Haj Md. Nurul Islam',
    status: 'active',
    plan: 'gold',
    expiryDate: '2027-04-14',
    daysRemaining: 182
  },
  {
    id: 'shp_002',
    name: 'City Gadget Motijheel',
    slug: 'city-gadget',
    phone: '01822334455',
    ownerName: 'Tanvir Hossain',
    status: 'active',
    plan: 'diamond',
    expiryDate: '2027-10-14',
    daysRemaining: 365
  },
  {
    id: 'shp_003',
    name: 'Chittagong Mobile Mart GEC',
    slug: 'ctg-mobile-mart',
    phone: '01933445566',
    ownerName: 'Rashidul Karim',
    status: 'trial',
    plan: 'gold',
    expiryDate: '2026-10-28',
    daysRemaining: 14
  },
  {
    id: 'shp_004',
    name: 'Sylhet Digital Point',
    slug: 'sylhet-digital',
    phone: '01644556677',
    ownerName: 'Syed Farhan',
    status: 'grace_period',
    plan: 'silver',
    expiryDate: '2026-10-17',
    daysRemaining: 3
  },
  {
    id: 'shp_005',
    name: 'Bogra Handset Zone',
    slug: 'bogra-handset',
    phone: '01555667788',
    ownerName: 'Mahbub Alam',
    status: 'read_only',
    plan: 'silver',
    expiryDate: '2026-10-12',
    daysRemaining: 0
  },
  {
    id: 'shp_006',
    name: 'Rajshahi Telecom Bazaar',
    slug: 'rajshahi-telecom',
    phone: '01799887766',
    ownerName: 'Zahid Hasan',
    status: 'suspended',
    plan: 'gold',
    expiryDate: '2026-11-01',
    daysRemaining: 18
  }
];

export function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'migration' | 'pricing' | 'webhooks'>('overview');
  const [shops, setShops] = useState<ShopItem[]>(INITIAL_SHOPS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // KPI Metrics State
  const [mrr, setMrr] = useState(184850);
  const [arr, setArr] = useState(2218200);
  const [smsBalance, setSmsBalance] = useState(5420);
  const [sweeperNotification, setSweeperNotification] = useState<string | null>(null);

  // Suspension Modal State
  const [suspensionModalShop, setSuspensionModalShop] = useState<ShopItem | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('Terms of Service non-compliance / Audit verification pending');

  // Emergency Phone Migration State
  const [selectedShopId, setSelectedShopId] = useState(INITIAL_SHOPS[0].id);
  const [migrationNewPhone, setMigrationNewPhone] = useState('');
  const [nidRef, setNidRef] = useState('');
  const [tradeLicenseRef, setTradeLicenseRef] = useState('');
  const [migrationReason, setMigrationReason] = useState('');
  const [migrationSuccessMsg, setMigrationSuccessMsg] = useState<{
    oldPhone: string;
    newPhone: string;
    tokenVersion: number;
  } | null>(null);

  // Plan Pricing Management State
  const [plans, setPlans] = useState([
    { code: 'starter', name: 'Silver / Starter', monthly: 499, yearly: 4990, activeSubscribers: 42 },
    { code: 'pro', name: 'Gold / Professional', monthly: 999, yearly: 9990, activeSubscribers: 128 },
    { code: 'enterprise', name: 'Diamond / Enterprise', monthly: 1999, yearly: 19990, activeSubscribers: 19 }
  ]);
  const [priceUpdateSuccess, setPriceUpdateSuccess] = useState<string | null>(null);

  // Webhook Simulator State
  const [webhookGateway, setWebhookGateway] = useState<'paystation' | 'eps' | 'bkash'>('paystation');
  const [webhookTrxId, setWebhookTrxId] = useState(`TRX_${Date.now().toString().slice(-8)}`);
  const [webhookInvoiceNo, setWebhookInvoiceNo] = useState(`INV-SUB-202610-101`);
  const [webhookStatus, setWebhookStatus] = useState<'SUCCESS' | 'FAILED'>('SUCCESS');
  const [webhookLog, setWebhookLog] = useState<Array<{
    id: string;
    gateway: string;
    invoiceNo: string;
    trxId: string;
    status: string;
    time: string;
    result: string;
  }>>([
    {
      id: 'log_01',
      gateway: 'paystation',
      invoiceNo: 'INV-SUB-202610-098',
      trxId: 'PS_TXN_98765432',
      status: 'SUCCESS',
      time: '13:30:15',
      result: 'HTTP 200: License extended +30 days'
    },
    {
      id: 'log_02',
      gateway: 'bkash',
      invoiceNo: 'INV-SUB-202610-097',
      trxId: 'BK_9A8B7C6D5E',
      status: 'SUCCESS',
      time: '12:15:40',
      result: 'HTTP 200: License extended +365 days (Yearly)'
    },
    {
      id: 'log_03',
      gateway: 'eps',
      invoiceNo: 'INV-SUB-202610-096',
      trxId: 'EPS_001928374',
      status: 'FAILED',
      time: '11:02:18',
      result: 'HTTP 200: Recorded as failed'
    }
  ]);

  // Handlers
  const handleToggleSuspend = (shop: ShopItem) => {
    if (shop.status === 'suspended') {
      // 1-Click Reactivation
      setShops((prev) =>
        prev.map((s) => (s.id === shop.id ? { ...s, status: 'active' } : s))
      );
      setSweeperNotification(`Dokan [${shop.name}] has been successfully reactivated.`);
      setTimeout(() => setSweeperNotification(null), 4000);
    } else {
      setSuspensionModalShop(shop);
    }
  };

  const confirmSuspension = () => {
    if (!suspensionModalShop) return;
    setShops((prev) =>
      prev.map((s) => (s.id === suspensionModalShop.id ? { ...s, status: 'suspended' } : s))
    );
    setSweeperNotification(`Dokan [${suspensionModalShop.name}] has been non-destructively suspended. Sales POS blocked; historical data preserved.`);
    setSuspensionModalShop(null);
    setTimeout(() => setSweeperNotification(null), 5000);
  };

  const handleRunLifecycleSweeper = () => {
    let trialsExp = 0;
    let graceExp = 0;
    setShops((prev) =>
      prev.map((s) => {
        if (s.status === 'trial' && s.daysRemaining <= 0) {
          trialsExp++;
          return { ...s, status: 'grace_period', daysRemaining: 3 };
        }
        if (s.status === 'grace_period' && s.daysRemaining <= 0) {
          graceExp++;
          return { ...s, status: 'read_only' };
        }
        return s;
      })
    );
    setSweeperNotification(`Lifecycle Sweeper Complete: ${trialsExp} trial(s) moved to 3-day Grace Period, ${graceExp} moved to Read-Only Mode.`);
    setTimeout(() => setSweeperNotification(null), 5000);
  };

  const handleRunInvoiceSweeper = () => {
    setSweeperNotification(`3-Minute Background Invoice Sweeper executed. 0 unverified gateway invoices recovered.`);
    setTimeout(() => setSweeperNotification(null), 4000);
  };

  const handleMigratePhone = (e: React.FormEvent) => {
    e.preventDefault();
    const targetShop = shops.find((s) => s.id === selectedShopId);
    if (!targetShop) return;

    if (!/^01[3-9]\d{8}$/.test(migrationNewPhone.trim())) {
      alert('Please enter a valid 11-digit Bangladeshi mobile number (017XXXXXXXX)');
      return;
    }
    if (!nidRef.trim() || !migrationReason.trim()) {
      alert('NID verification reference and reason are mandatory.');
      return;
    }

    const oldPhone = targetShop.phone;
    setShops((prev) =>
      prev.map((s) => (s.id === targetShop.id ? { ...s, phone: migrationNewPhone.trim() } : s))
    );

    setMigrationSuccessMsg({
      oldPhone,
      newPhone: migrationNewPhone.trim(),
      tokenVersion: 2
    });
  };

  const handlePriceUpdate = (code: string, newMonthly: number, newYearly: number) => {
    setPlans((prev) =>
      prev.map((p) => (p.code === code ? { ...p, monthly: newMonthly, yearly: newYearly } : p))
    );
    setPriceUpdateSuccess(`Plan [${code.toUpperCase()}] pricing updated. Note: Existing active subscribers preserve original pricing snapshot (TC-39).`);
    setTimeout(() => setPriceUpdateSuccess(null), 5000);
  };

  const handleSimulateWebhook = () => {
    const isSuccess = webhookStatus === 'SUCCESS';
    const logEntry = {
      id: `log_${Date.now()}`,
      gateway: webhookGateway,
      invoiceNo: webhookInvoiceNo,
      trxId: webhookTrxId,
      status: webhookStatus,
      time: new Date().toLocaleTimeString(),
      result: isSuccess
        ? 'HTTP 200: Timing-safe HMAC verified. License extended +30 days.'
        : 'HTTP 200: Recorded as failed by gateway.'
    };

    setWebhookLog((prev) => [logEntry, ...prev]);
    setWebhookTrxId(`TRX_${Date.now().toString().slice(-8)}`);
    setSweeperNotification(`Webhook simulated successfully: ${logEntry.result}`);
    setTimeout(() => setSweeperNotification(null), 4000);
  };

  const filteredShops = shops.filter((s) => {
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      s.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalShops = shops.length;
  const activeCount = shops.filter((s) => s.status === 'active').length;
  const trialCount = shops.filter((s) => s.status === 'trial').length;
  const graceCount = shops.filter((s) => s.status === 'grace_period').length;
  const readOnlyCount = shops.filter((s) => s.status === 'read_only').length;
  const suspendedCount = shops.filter((s) => s.status === 'suspended').length;
  const churnRate = ((readOnlyCount + suspendedCount) / totalShops) * 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Top Super Admin Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20">
            <ShieldAlert className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-tight text-white">Bebsayik</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                SUPER_ADMIN PORTAL
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Canonical Domain: <span className="font-mono text-slate-300">admin.bebsayik.com</span> | Gateway Version: v7.9.0
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">Cluster SLA: 99.98% Operational</span>
          </div>

          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
            <Server className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-slate-300 font-mono">BTRC / Telecom SMS: {smsBalance.toLocaleString()} Left</span>
          </div>
        </div>
      </header>

      {/* Sweeper / Alert Notification Banner */}
      {sweeperNotification && (
        <div className="bg-gradient-to-r from-teal-900/80 to-emerald-900/80 border-b border-teal-500/30 px-6 py-2.5 flex items-center justify-between text-sm text-teal-200 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-300 shrink-0" />
            <span>{sweeperNotification}</span>
          </div>
          <button
            onClick={() => setSweeperNotification(null)}
            className="text-xs text-teal-300 hover:text-white underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-6 gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 space-y-2 shrink-0">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'overview'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>SaaS Command Center</span>
            </button>

            <button
              onClick={() => setActiveTab('tenants')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'tenants'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Tenant Dokan Directory</span>
            </button>

            <button
              onClick={() => setActiveTab('migration')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'migration'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>Emergency Hotline SIM (TC-56)</span>
            </button>

            <button
              onClick={() => setActiveTab('pricing')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'pricing'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Plan Versioning (TC-39)</span>
            </button>

            <button
              onClick={() => setActiveTab('webhooks')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'webhooks'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Gateway Webhook Ledger</span>
            </button>
          </div>

          {/* Sweeper Controls Panel */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3 text-xs">
            <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
              <span>Engine Sweepers</span>
            </div>
            <button
              onClick={handleRunLifecycleSweeper}
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition"
            >
              <div className="font-medium text-teal-300">1. Lifecycle Sweeper (TC-25)</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Trials → Grace (3d) → Read-Only</div>
            </button>

            <button
              onClick={handleRunInvoiceSweeper}
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition"
            >
              <div className="font-medium text-teal-300">2. Gateway Sweeper (TC-49)</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Recover 3-Min delayed webhooks</div>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 space-y-6">
          {/* TAB 1: OVERVIEW & SAAS KPIS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Platform Command Center</h1>
                <p className="text-sm text-slate-400">
                  Global multi-tenant metrics, Monthly Recurring Revenue (MRR), and lifecycle enforcement.
                </p>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 hover:border-teal-500/30 transition shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Recurring (MRR)</span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">৳{mrr.toLocaleString()}</div>
                  <p className="mt-1 text-xs text-slate-400">+14.2% vs last calendar month</p>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 hover:border-teal-500/30 transition shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Annual Run-Rate (ARR)</span>
                    <TrendingUp className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-teal-400 font-mono">৳{arr.toLocaleString()}</div>
                  <p className="mt-1 text-xs text-slate-400">Snapshot annualized revenue</p>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 hover:border-teal-500/30 transition shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Paid Tenants</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-white font-mono">{activeCount} Dokans</div>
                  <p className="mt-1 text-xs text-slate-400">Across 64 Districts in BD</p>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 hover:border-teal-500/30 transition shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tenant Churn Rate</span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-amber-300 font-mono">{churnRate.toFixed(1)}%</div>
                  <p className="mt-1 text-xs text-slate-400">Read-Only + Suspended</p>
                </div>
              </div>

              {/* Lifecycle Distribution Bar */}
              <div className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-teal-400" />
                    <span>Tenant Subscription State Distribution (TC-25, TC-35)</span>
                  </h3>
                  <span className="text-xs text-slate-400">Total Registered Tenants: {totalShops}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <span className="text-xs text-emerald-300 font-medium">Active (Paid)</span>
                    <div className="text-xl font-black text-emerald-400 mt-1">{activeCount}</div>
                    <span className="text-[10px] text-slate-400">Full POS & Cloud</span>
                  </div>

                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <span className="text-xs text-blue-300 font-medium">14-Day Free Trial</span>
                    <div className="text-xl font-black text-blue-400 mt-1">{trialCount}</div>
                    <span className="text-[10px] text-slate-400">Gold Tier Entitlement</span>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <span className="text-xs text-amber-300 font-medium">3-Day Grace Period</span>
                    <div className="text-xl font-black text-amber-400 mt-1">{graceCount}</div>
                    <span className="text-[10px] text-slate-400">Renewal Warning</span>
                  </div>

                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <span className="text-xs text-rose-300 font-medium">Read-Only Mode</span>
                    <div className="text-xl font-black text-rose-400 mt-1">{readOnlyCount}</div>
                    <span className="text-[10px] text-slate-400">POS Blocked (TC-25)</span>
                  </div>

                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <span className="text-xs text-purple-300 font-medium">Suspended</span>
                    <div className="text-xl font-black text-purple-400 mt-1">{suspendedCount}</div>
                    <span className="text-[10px] text-slate-400">Admin Audit (TC-38)</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">Read-Only Mode Invariant (TC-25, TC-26):</div>
                  <p>
                    When subscription lapses past the 3-day grace period, POS checkouts return HTTP 403 <code className="text-rose-400">SUBSCRIPTION_READ_ONLY</code>. Historical handsets lookup, Bakir Khata customer due collections (<code className="text-teal-400">CustomerService.collectDue</code>), accounting reports, and Excel/CSV data exports remain 100% operational.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TENANT DOKAN DIRECTORY */}
          {activeTab === 'tenants' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight">Tenant Dokan Directory</h1>
                  <p className="text-sm text-slate-400">
                    Live directory of registered mobile dokans with non-destructive suspension and 1-click reactivation (TC-38).
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search dokan, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 w-48 sm:w-64"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="grace_period">Grace Period</option>
                    <option value="read_only">Read-Only</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="bg-slate-900/70 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Shop & Slug</th>
                        <th className="px-4 py-3">Owner & Phone</th>
                        <th className="px-4 py-3">Plan Tier</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Expiry / Countdown</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {filteredShops.map((shop) => (
                        <tr key={shop.id} className="hover:bg-slate-800/30 transition">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-white text-sm">{shop.name}</div>
                            <div className="font-mono text-[11px] text-teal-400">{shop.slug}.bebsayik.com</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-slate-200">{shop.ownerName}</div>
                            <div className="font-mono text-slate-400">{shop.phone}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full font-semibold uppercase text-[10px] ${
                                shop.plan === 'diamond'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : shop.plan === 'gold'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                              }`}
                            >
                              {shop.plan}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full font-semibold text-[11px] ${
                                shop.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : shop.status === 'trial'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : shop.status === 'grace_period'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : shop.status === 'read_only'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              }`}
                            >
                              {shop.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs">
                            <div>{shop.expiryDate}</div>
                            <div className="text-[11px] text-slate-400">{shop.daysRemaining} days left</div>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-2">
                            <button
                              onClick={() => {
                                setSelectedShopId(shop.id);
                                setActiveTab('migration');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] transition"
                            >
                              Migrate SIM
                            </button>

                            <button
                              onClick={() => handleToggleSuspend(shop)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                                shop.status === 'suspended'
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  : 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800'
                              }`}
                            >
                              {shop.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EMERGENCY HOTLINE SIM MIGRATION (TC-56) */}
          {activeTab === 'migration' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                  <PhoneCall className="w-6 h-6 text-amber-400" />
                  <span>Emergency Hotline Lost SIM Phone Migration (TC-56)</span>
                </h1>
                <p className="text-sm text-slate-400">
                  Allows Super Admin at Dhaka Headquarters (Level 7, Eastern Plaza) to migrate a lost or stolen SIM number upon physical NID and Trade License verification, atomically incrementing <code className="text-teal-300">tokenVersion</code> to invalidate all existing sessions.
                </p>
              </div>

              {migrationSuccessMsg && (
                <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-200 text-sm space-y-1">
                  <div className="font-bold flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Emergency Migration Authorized & Executed Successfully!</span>
                  </div>
                  <p>Old Registered Mobile: <span className="font-mono text-white">{migrationSuccessMsg.oldPhone}</span></p>
                  <p>New Registered Mobile: <span className="font-mono text-white">{migrationSuccessMsg.newPhone}</span></p>
                  <p>User <code className="font-mono text-teal-300">tokenVersion</code> incremented to <span className="font-mono text-white">{migrationSuccessMsg.tokenVersion}</span> (All prior JWT tokens and stolen mobile sessions immediately revoked).</p>
                </div>
              )}

              <form onSubmit={handleMigratePhone} className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Target Tenant Dokan
                    </label>
                    <select
                      value={selectedShopId}
                      onChange={(e) => setSelectedShopId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      {shops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.phone}) - {s.ownerName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      New Verified Bangladeshi Mobile Number (11 Digits)
                    </label>
                    <input
                      type="text"
                      placeholder="017XXXXXXXX"
                      value={migrationNewPhone}
                      onChange={(e) => setMigrationNewPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      National ID (NID) Physical Verification Reference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. NID-1988269123456789"
                      value={nidRef}
                      onChange={(e) => setNidRef(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Municipal Trade License Reference Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TL-DSCC-2024-00918"
                      value={tradeLicenseRef}
                      onChange={(e) => setTradeLicenseRef(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Super Admin Verification Notes & Reason
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Document owner verification reason, hotline call ID, or in-person Eastern Plaza verification notes..."
                    value={migrationReason}
                    onChange={(e) => setMigrationReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Authorize Emergency Migration & Revoke Prior Sessions</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: PLAN PRICING & PROMO ENGINE (TC-39) */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">SaaS Subscription Plans & Pricing (TC-39)</h1>
                <p className="text-sm text-slate-400">
                  Version subscription tier pricing. Under Section 5.24 & TC-39, price updates apply strictly to new subscriptions; existing active subscribers maintain original snapshot renewal pricing.
                </p>
              </div>

              {priceUpdateSuccess && (
                <div className="p-4 bg-teal-950/80 border border-teal-500/40 rounded-xl text-teal-200 text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>{priceUpdateSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <div key={plan.code} className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-400 font-mono">
                        {plan.code}
                      </span>
                      <span className="text-xs text-slate-400">{plan.activeSubscribers} Active Dokans</span>
                    </div>

                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>

                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                          Monthly Fee (৳)
                        </label>
                        <input
                          type="number"
                          value={plan.monthly}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setPlans((prev) =>
                              prev.map((p) => (p.code === plan.code ? { ...p, monthly: val } : p))
                            );
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                          Yearly Fee (৳)
                        </label>
                        <input
                          type="number"
                          value={plan.yearly}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setPlans((prev) =>
                              prev.map((p) => (p.code === plan.code ? { ...p, yearly: val } : p))
                            );
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <button
                        onClick={() => handlePriceUpdate(plan.code, plan.monthly, plan.yearly)}
                        className="w-full py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-xs font-semibold transition"
                      >
                        Save Updated Price
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Discount Engine */}
              <div className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-teal-400" />
                    <span>Active Promotional Discount Coupons</span>
                  </h3>
                  <span className="text-xs text-teal-400 font-mono">POST /api/v1/billing/validate-coupon</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-teal-300">EID2026</span>
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Active</span>
                    </div>
                    <div className="text-sm text-slate-300 font-medium">20% Off All Subscription Tiers</div>
                    <div className="text-[11px] text-slate-400">Used: 142 / 1000 limit | Expires: Dec 2027</div>
                  </div>

                  <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-teal-300">LAUNCH50</span>
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Active</span>
                    </div>
                    <div className="text-sm text-slate-300 font-medium">50% Off Early Bird Campaign</div>
                    <div className="text-[11px] text-slate-400">Used: 89 / 500 limit | Expires: Dec 2027</div>
                  </div>

                  <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-teal-300">SAVE100</span>
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Active</span>
                    </div>
                    <div className="text-sm text-slate-300 font-medium">৳100 Flat Discount on Starter</div>
                    <div className="text-[11px] text-slate-400">Used: 31 / 200 limit | Expires: Dec 2027</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GATEWAY WEBHOOKS & PAYMENT LEDGER */}
          {activeTab === 'webhooks' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                  <Zap className="w-6 h-6 text-teal-400" />
                  <span>Payment Gateway Webhook Ledger & Live Simulator</span>
                </h1>
                <p className="text-sm text-slate-400">
                  Inspect incoming PayStation, Easy Pay Way (EPS), and bKash webhook events. All webhooks strictly enforce timing-safe HMAC-SHA256 signature verification and idempotent single-extension guarantees (TC-34).
                </p>
              </div>

              {/* Webhook Simulator Form */}
              <div className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Send className="w-4 h-4 text-teal-400" />
                    <span>Live Webhook Simulator (Test Dispatch)</span>
                  </h3>
                  <span className="text-xs text-slate-400">HMAC algorithm: crypto.timingSafeEqual</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Gateway</label>
                    <select
                      value={webhookGateway}
                      onChange={(e) => setWebhookGateway(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="paystation">PayStation</option>
                      <option value="eps">Easy Pay Way (EPS)</option>
                      <option value="bkash">bKash Merchant</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Invoice No</label>
                    <input
                      type="text"
                      value={webhookInvoiceNo}
                      onChange={(e) => setWebhookInvoiceNo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Gateway Trx ID</label>
                    <input
                      type="text"
                      value={webhookTrxId}
                      onChange={(e) => setWebhookTrxId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Status</label>
                    <select
                      value={webhookStatus}
                      onChange={(e) => setWebhookStatus(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="SUCCESS">SUCCESS (Extend License)</option>
                      <option value="FAILED">FAILED (Record Rejection)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    onClick={handleSimulateWebhook}
                    className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center space-x-2 transition shadow-lg shadow-teal-500/20"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Dispatch Verified Webhook</span>
                  </button>
                </div>
              </div>

              {/* Webhook Log */}
              <div className="bg-slate-900/70 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Recent Webhook Execution Ledger</h3>
                  <span className="text-xs text-slate-400">{webhookLog.length} Events Logged</span>
                </div>
                <div className="divide-y divide-slate-800/60">
                  {webhookLog.map((log) => (
                    <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center space-x-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            log.status === 'SUCCESS' ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        <div>
                          <span className="font-bold text-white uppercase">{log.gateway}</span>
                          <span className="font-mono text-slate-400 ml-2">Invoice: {log.invoiceNo}</span>
                          <span className="font-mono text-teal-400 ml-2">Trx: {log.trxId}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <span className="text-slate-300 font-medium">{log.result}</span>
                        <span className="font-mono text-slate-500 text-[11px]">{log.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Suspension Modal (TC-38) */}
      {suspensionModalShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Non-Destructive Shop Suspension</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to suspend <strong className="text-white">{suspensionModalShop.name}</strong>. POS checkouts will be immediately blocked with HTTP 403 <code className="text-rose-400">SHOP_SUSPENDED</code>. However, all inventory items, sales records, customer ledgers, and accounts will be 100% preserved. 1-click reactivation can be performed at any time.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Reason for Suspension
              </label>
              <textarea
                rows={3}
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setSuspensionModalShop(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmSuspension}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
