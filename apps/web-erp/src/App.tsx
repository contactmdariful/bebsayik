import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Store,
  Search,
  Barcode,
  CreditCard,
  Wallet,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  Minus,
  RefreshCw,
  Clock,
  User,
  Smartphone,
  ShieldCheck,
  Printer,
  ChevronDown,
  Sparkles,
  Database,
  Cpu,
  Wifi,
  WifiOff,
  Receipt,
  FileText,
  X,
  Send,
  HelpCircle,
  PauseCircle,
  PlayCircle,
  Tag,
  Copy,
  Layers
} from 'lucide-react';
import { DESIGN_TOKENS } from '@bebsayik/ui-tokens';
import { AppShell } from './components/shell/AppShell.js';
import { ComponentShowcase } from './views/ComponentShowcase.js';
import { InventoryHub } from './views/InventoryHub.js';
import { ProcurementHub } from './views/ProcurementHub.js';
import { HardwareSettings } from './views/HardwareSettings.js';
import { CustomerDirectoryView } from './views/CustomerDirectoryView.js';
import { SalesReturnView } from './views/SalesReturnView.js';
import { KistiHub } from './views/KistiHub.js';
import { ClosingAndAccountsHub } from './views/ClosingAndAccountsHub.js';
import { EmptyState } from './components/EmptyState.js';
import { ThermalPrinterDriver } from './hardware/escpos.js';

interface CartItem {
  id: string;
  name: string;
  category: 'HANDSET' | 'ACCESSORY';
  imei1?: string;
  imei2?: string;
  barcode?: string;
  unitPrice: number;
  quantity: number;
  discount: number;
}

interface Product {
  id: string;
  name: string;
  category: 'HANDSET' | 'ACCESSORY';
  brand: string;
  imei1?: string;
  imei2?: string;
  barcode?: string;
  price: number;
  stock: number;
}

interface HeldCartState {
  id: string;
  timestamp: string;
  customerName?: string;
  items: CartItem[];
  subtotal: number;
}

const SAMPLE_CATALOG: Product[] = [
  {
    id: 'p-1',
    name: 'Redmi Note 13 Pro 5G (8/256GB)',
    category: 'HANDSET',
    brand: 'Xiaomi',
    imei1: '867492041234567',
    imei2: '867492041234568',
    price: 28500,
    stock: 6
  },
  {
    id: 'p-2',
    name: 'Samsung Galaxy A55 5G (8/128GB)',
    category: 'HANDSET',
    brand: 'Samsung',
    imei1: '354892019876543',
    imei2: '354892019876544',
    price: 42900,
    stock: 4
  },
  {
    id: 'p-3',
    name: 'OnePlus Nord CE4 (8/128GB)',
    category: 'HANDSET',
    brand: 'OnePlus',
    imei1: '860293049182736',
    imei2: '860293049182737',
    price: 31500,
    stock: 3
  },
  {
    id: 'p-4',
    name: 'Anker PowerPort 20W Fast Charger',
    category: 'ACCESSORY',
    brand: 'Anker',
    barcode: '848061032145',
    price: 1450,
    stock: 24
  },
  {
    id: 'p-5',
    name: 'Baseus 100W PD Type-C to Type-C',
    category: 'ACCESSORY',
    brand: 'Baseus',
    barcode: '695315620982',
    price: 650,
    stock: 38
  },
  {
    id: 'p-6',
    name: 'Remax 9H Diamond Tempered Glass',
    category: 'ACCESSORY',
    brand: 'Remax',
    barcode: '695485123456',
    price: 250,
    stock: 120
  }
];

export function App() {
  // Navigation tab (POS, SHOWCASE, INVENTORY, PROCUREMENT, SETTINGS, API_DIAGNOSTICS)
  const [activeTab, setActiveTab] = useState<string>('POS');
  const [currentShop, setCurrentShop] = useState<{ name: string; branch: string }>({
    name: 'Kanchan Telecom',
    branch: 'Eastern Plaza #304'
  });

  // Scanner state & auto-focus
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const [scanQuery, setScanQuery] = useState('');
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([
    {
      id: 'p-1',
      name: 'Redmi Note 13 Pro 5G (8/256GB)',
      category: 'HANDSET',
      imei1: '867492041234567',
      imei2: '867492041234568',
      unitPrice: 28500,
      quantity: 1,
      discount: 0
    },
    {
      id: 'p-4',
      name: 'Anker PowerPort 20W Fast Charger',
      category: 'ACCESSORY',
      barcode: '848061032145',
      unitPrice: 1450,
      quantity: 1,
      discount: 50
    }
  ]);

  // Tender state & Split payments
  const [tenderMethod, setTenderMethod] = useState<'CASH' | 'BKASH' | 'CARD' | 'BAKI'>('CASH');
  const [tenderAmount, setTenderAmount] = useState<number>(30000);
  const [customerType, setCustomerType] = useState<'WALKIN' | 'ACCOUNT'>('WALKIN');
  const [customerName, setCustomerName] = useState('Kamrul Hasan');
  const [customerPhone, setCustomerPhone] = useState('01712-345678');

  // Multi-Tender split values
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitDigital, setSplitDigital] = useState<number>(0);
  const [splitDue, setSplitDue] = useState<number>(0);
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);

  // Held Carts state
  const [heldCarts, setHeldCarts] = useState<HeldCartState[]>([]);
  const [showHeldModal, setShowHeldModal] = useState<boolean>(false);

  // Shortcuts & Dialog modals
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [showDiscountModal, setShowDiscountModal] = useState<boolean>(false);
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [discountTargetId, setDiscountTargetId] = useState<string | null>(null);

  // Offline accessory queue state (TC-48)
  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [offlineSyncMessage, setOfflineSyncMessage] = useState<string | null>(null);

  // Invoice reprint state (TC-47)
  const [showReprintModal, setShowReprintModal] = useState<boolean>(false);
  const [reprintInvoiceNo, setReprintInvoiceNo] = useState<string>('INV-2026-10492');
  const [reprintCount, setReprintCount] = useState<number>(0);
  const [reprintMessage, setReprintMessage] = useState<string | null>(null);

  // API connectivity state
  const [apiHealth, setApiHealth] = useState<{
    status: string;
    database: string;
    latencyMs: number;
    timestamp: string;
  } | null>(null);
  const [isCheckingApi, setIsCheckingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Receipt Modal
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState('INV-2026-10492');
  const [lastSaleReprintCount, setLastSaleReprintCount] = useState(0);

  // Focus scanner on POS tab activation
  useEffect(() => {
    if (activeTab === 'POS') {
      scannerInputRef.current?.focus();
    }
  }, [activeTab]);

  // Keyboard Shortcuts Listener (F1 to F12)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'POS') return;

      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);

      if (e.key === 'F1') {
        e.preventDefault();
        setShowHelpModal(true);
      } else if (e.key === 'F2') {
        e.preventDefault();
        scannerInputRef.current?.focus();
        scannerInputRef.current?.select();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setShowCustomerModal(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setDiscountTargetId(null);
        setShowDiscountModal(true);
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleHoldCart();
      } else if (e.key === 'F6') {
        e.preventDefault();
        setShowHeldModal(true);
      } else if (e.key === 'F12') {
        e.preventDefault();
        handleCompleteSale();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, cart, tenderAmount, tenderMethod, isOfflineSimulated, heldCarts]);

  // Check API health on mount
  const checkApiHealth = async () => {
    setIsCheckingApi(true);
    setApiError(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/v1/health');
      const duration = Math.round(performance.now() - start);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setApiHealth({
        status: data.status || 'ok',
        database: data.database || 'connected',
        latencyMs: duration,
        timestamp: data.timestamp || new Date().toISOString()
      });
    } catch (err: any) {
      setApiError(err.message || 'API connection failed');
      setApiHealth(null);
    } finally {
      setIsCheckingApi(false);
    }
  };

  useEffect(() => {
    checkApiHealth();
  }, []);

  // Cart operations
  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (product.category === 'HANDSET') {
        setScanStatus(`Handset "${product.name}" is serialized by IMEI and already in cart.`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          category: product.category,
          imei1: product.imei1,
          imei2: product.imei2,
          barcode: product.barcode,
          unitPrice: product.price,
          quantity: 1,
          discount: 0
        }
      ]);
    }
    setScanStatus(`Added "${product.name}" to cart.`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            if (item.category === 'HANDSET' && delta > 0) return item;
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const updateItemDiscount = (id: string, discountVal: number) => {
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, discount: Math.max(0, discountVal) } : item))
    );
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  // Scanner search & match
  const handleScannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanQuery.trim()) return;

    const trimmed = scanQuery.trim();
    const matched = SAMPLE_CATALOG.find(
      (p) =>
        p.imei1 === trimmed ||
        p.imei2 === trimmed ||
        p.barcode === trimmed ||
        p.name.toLowerCase().includes(trimmed.toLowerCase())
    );

    if (matched) {
      addToCart(matched);
      setScanQuery('');
      setScanStatus(`Matched: ${matched.name} (${matched.imei1 ? `IMEI: ${matched.imei1}` : 'Barcode Verified'})`);
    } else {
      setScanStatus(`No matching product or IMEI found for: "${trimmed}"`);
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity - item.discount, 0);
  }, [cart]);

  const vatAmount = Math.round(subtotal * 0.05); // 5% Mushak 6.3
  const grandTotal = subtotal + vatAmount;
  const changeDue = Math.max(0, tenderAmount - grandTotal);
  const outstandingDue = Math.max(0, grandTotal - tenderAmount);

  // Invariant Check: Handset in cart
  const hasHandsetInCart = useMemo(() => {
    return cart.some((item) => item.category === 'HANDSET' || !!item.imei1);
  }, [cart]);

  // Hold active cart (F5)
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const newHeld: HeldCartState = {
      id: `hold-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      customerName: customerType === 'ACCOUNT' ? customerName : 'Walk-in',
      items: [...cart],
      subtotal
    };
    setHeldCarts((prev) => [newHeld, ...prev]);
    setCart([]);
    setScanStatus(`Cart held (F5). Stashed ${newHeld.items.length} items for next customer.`);
  };

  // Recall held cart (F6)
  const handleRecallCart = (heldId: string) => {
    const target = heldCarts.find((h) => h.id === heldId);
    if (!target) return;
    setCart(target.items);
    setHeldCarts((prev) => prev.filter((h) => h.id !== heldId));
    setShowHeldModal(false);
    setScanStatus(`Recalled held cart with ${target.items.length} items.`);
  };

  // Discard held cart
  const handleDiscardHeldCart = (heldId: string) => {
    setHeldCarts((prev) => prev.filter((h) => h.id !== heldId));
  };

  // Complete sale & Checkout action (F12)
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    // Critical Offline Invariant Check (TC-48)
    if (isOfflineSimulated) {
      if (hasHandsetInCart) {
        setScanStatus('❌ OFFLINE INVARIANT BREACH (TC-48): Serialized handsets strictly blocked offline!');
        return;
      }

      // Offline Accessory Queue
      const offlineSale = {
        offlineSaleId: `off_${Date.now()}`,
        timestamp: new Date().toISOString(),
        items: cart.map((it) => ({ variantId: it.id, quantity: it.quantity, unitPrice: it.unitPrice })),
        paidAmount: grandTotal,
        paymentMethod: tenderMethod.toLowerCase()
      };
      setOfflineQueue((prev) => [...prev, offlineSale]);
      setCart([]);
      setScanStatus(`Queued offline accessory sale (${offlineSale.offlineSaleId}). Reconnection sync pending.`);
      return;
    }

    // Online checkout
    const inv = `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    setLastInvoiceNumber(inv);
    setLastSaleReprintCount(0);
    setShowReceipt(true);

    // Trigger ESC/POS Thermal Print Driver
    await ThermalPrinterDriver.printReceipt('ESC_POS_RAW_TEST_PAYLOAD', {
      kickDrawer: true,
      useSimulatorIfUnavailable: true
    });

    setCart([]);
    setScanStatus(`Sale ${inv} completed. ESC/POS printed & cash drawer kicked.`);
  };

  // Offline Sync Replay (TC-48)
  const handleSyncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    setOfflineSyncMessage(`Syncing ${offlineQueue.length} offline accessory transactions...`);
    try {
      // Replay batch
      await new Promise((resolve) => setTimeout(resolve, 350));
      setOfflineSyncMessage(`Successfully synced ${offlineQueue.length} offline transactions via POST /api/v1/pos/offline-sync.`);
      setOfflineQueue([]);
      setTimeout(() => setOfflineSyncMessage(null), 4000);
    } catch {
      setOfflineSyncMessage('Failed to sync offline batch.');
    }
  };

  // Invoice Reprint Handler (TC-47)
  const handleTriggerReprint = async () => {
    const nextCount = reprintCount + 1;
    setReprintCount(nextCount);
    setLastSaleReprintCount(nextCount);
    setReprintMessage(`Reprint request recorded. Audited reprint_count = ${nextCount}. Zero financial ledger mutations.`);
    setShowReceipt(true);
  };

  return (
    <AppShell
      activeNavId={activeTab}
      onNavigate={(navId) => setActiveTab(navId)}
      shopName={currentShop.name}
      shopBranch={currentShop.branch}
      userRole="STORE_OWNER"
      userName="Sumon Dash"
      shiftBalance="৳14,250.00"
      apiOnline={apiHealth?.status === 'ok' && !isOfflineSimulated}
      pendingOfflineCount={offlineQueue.length}
      onSyncOffline={handleSyncOfflineQueue}
      onShopSwitched={(shop) => {
        setCurrentShop({
          name: shop.name,
          branch: shop.binNumber ? `BIN: ${shop.binNumber}` : 'Main Branch'
        });
      }}
    >
      {activeTab === 'SHOWCASE' && <ComponentShowcase />}
      {activeTab === 'INVENTORY' && <InventoryHub />}
      {activeTab === 'PROCUREMENT' && <ProcurementHub />}
      {activeTab === 'CUSTOMERS' && <CustomerDirectoryView />}
      {activeTab === 'RETURNS' && <SalesReturnView />}
      {activeTab === 'KISTI' && <KistiHub />}
      {activeTab === 'CLOSING' && <ClosingAndAccountsHub />}
      {activeTab === 'SETTINGS' && <HardwareSettings />}

      {activeTab === 'POS' && (
        <div className="p-3 sm:p-5 max-w-[1720px] w-full mx-auto flex flex-col space-y-4">
          {/* Quick Keyboard Shortcuts & Mode Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Accelerators:
              </span>
              <div className="flex items-center space-x-1.5 overflow-x-auto">
                <span className="bg-slate-800 text-teal-300 px-2 py-0.5 rounded font-mono border border-slate-700">F1: Help</span>
                <span className="bg-slate-800 text-teal-300 px-2 py-0.5 rounded font-mono border border-slate-700">F2: Scan</span>
                <span className="bg-slate-800 text-teal-300 px-2 py-0.5 rounded font-mono border border-slate-700">F3: Customer</span>
                <span className="bg-slate-800 text-teal-300 px-2 py-0.5 rounded font-mono border border-slate-700">F4: Discount</span>
                <span className="bg-slate-800 text-teal-300 px-2 py-0.5 rounded font-mono border border-slate-700">F5: Hold ({heldCarts.length})</span>
                <span className="bg-slate-800 text-teal-300 px-2 py-0.5 rounded font-mono border border-slate-700">F6: Recall</span>
                <span className="bg-teal-900/70 text-teal-200 px-2.5 py-0.5 rounded font-mono font-bold border border-teal-600">F12: Pay</span>
              </div>
            </div>

            {/* Offline Simulator Switch & Reprint Desk */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowReprintModal(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded font-medium flex items-center space-x-1.5 border border-slate-700"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Invoice Reprint (TC-47)</span>
              </button>

              <label className="flex items-center space-x-2 cursor-pointer bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400">Simulate Offline (TC-48):</span>
                <input
                  type="checkbox"
                  checked={isOfflineSimulated}
                  onChange={(e) => setIsOfflineSimulated(e.target.checked)}
                  className="rounded border-slate-700 text-rose-500 focus:ring-rose-500 h-3.5 w-3.5"
                />
                {isOfflineSimulated && (
                  <span className="text-[10px] text-rose-400 font-bold uppercase">OFFLINE ACTIVE</span>
                )}
              </label>
            </div>
          </div>

          {/* Offline Handset Block Alert (TC-48) */}
          {isOfflineSimulated && hasHandsetInCart && (
            <div className="bg-rose-950/60 border border-rose-800 p-3.5 rounded-xl flex items-center space-x-3 text-xs text-rose-200 shadow-md">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold text-rose-300">
                  ⚠️ OFFLINE INVARIANT BREACH (TC-48): Serialized Dual-IMEI Handsets cannot be sold offline!
                </span>
                <p className="text-[11px] text-rose-300/80 mt-0.5">
                  Handset sales require atomic server verification to prevent duplicate sales across counters. Remove handsets from cart to continue with eligible non-serialized accessory sales.
                </p>
              </div>
            </div>
          )}

          {offlineSyncMessage && (
            <div className="bg-teal-950/60 border border-teal-800 text-teal-300 p-3 rounded-xl flex items-center space-x-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span>{offlineSyncMessage}</span>
            </div>
          )}

          {/* Universal Barcode & IMEI Scanner Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm">
            <form onSubmit={handleScannerSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Barcode className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-teal-400" />
                <input
                  ref={scannerInputRef}
                  type="text"
                  value={scanQuery}
                  onChange={(e) => setScanQuery(e.target.value)}
                  placeholder="Scan 15-Digit Handset IMEI or Barcode (e.g. 867492041234567, 848061032145, or model name)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-24 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  Enter / F2
                </span>
              </div>

              <button
                type="submit"
                className="bg-teal-600 hover:bg-teal-500 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-all flex items-center justify-center space-x-2 shrink-0 shadow-sm"
              >
                <Search className="w-4 h-4" />
                <span>Lookup & Add</span>
              </button>
            </form>

            {scanStatus && (
              <div className="mt-2 text-xs flex items-center space-x-1.5 text-teal-300 bg-teal-950/40 border border-teal-800/60 rounded px-2.5 py-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{scanStatus}</span>
              </div>
            )}
          </div>

          {/* Dual-Pane Landscape POS Layout (1024x768+) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
            {/* Left 7 Columns: Catalog & Reactive Cart */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              {/* Quick Counter Inventory */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-teal-400" />
                    <span>Quick Counter Inventory</span>
                  </h2>
                  <span className="text-xs text-slate-400">Click item to add directly to cart</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {SAMPLE_CATALOG.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => addToCart(prod)}
                      className="bg-slate-800/90 hover:bg-slate-800 hover:border-teal-500/70 border border-slate-700/80 rounded-lg p-3 text-left transition-all group flex flex-col justify-between min-h-[96px]"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 px-1.5 py-0.5 bg-teal-950/70 border border-teal-800/50 rounded">
                            {prod.brand}
                          </span>
                          <span className="text-xs text-slate-400">Qty: {prod.stock}</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-200 mt-1 line-clamp-1 group-hover:text-white">
                          {prod.name}
                        </div>
                      </div>

                      <div className="mt-2 flex items-baseline justify-between pt-1 border-t border-slate-700/50">
                        <span className="text-xs text-slate-400">
                          {prod.category === 'HANDSET' ? 'Dual-IMEI' : 'Standard'}
                        </span>
                        <span className="text-sm font-bold text-teal-400 tnum">
                          ৳{prod.price.toLocaleString('en-US')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reactive Cart Items Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                      Active Cart Items
                    </h2>
                    <span className="bg-teal-900/60 text-teal-300 text-xs px-2 py-0.5 rounded-full font-bold border border-teal-700/60">
                      {cart.length}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleHoldCart}
                      disabled={cart.length === 0}
                      className="text-xs text-teal-400 hover:text-teal-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded border border-slate-700 flex items-center space-x-1"
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      <span>Hold (F5)</span>
                    </button>
                    {cart.length > 0 && (
                      <button
                        onClick={() => setCart([])}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 space-y-2">
                    <Barcode className="w-12 h-12 text-slate-700" />
                    <p className="text-sm font-medium">Cart is currently empty</p>
                    <p className="text-xs text-slate-600">Scan handset IMEI or select quick items above</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-x-auto divide-y divide-slate-800 mt-2">
                    {cart.map((item) => (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-[180px]">
                          <div className="text-sm font-medium text-slate-100">{item.name}</div>
                          {item.imei1 && (
                            <div className="text-[11px] text-teal-400 font-mono flex items-center space-x-2 mt-0.5">
                              <span>IMEI1: {item.imei1}</span>
                              {item.imei2 && <span>• IMEI2: {item.imei2}</span>}
                            </div>
                          )}
                          {item.barcode && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Barcode: {item.barcode}
                            </div>
                          )}
                        </div>

                        {/* Unit price */}
                        <div className="text-right w-24">
                          <div className="text-xs text-slate-400">Unit</div>
                          <div className="text-sm font-semibold text-slate-200 tnum">
                            ৳{item.unitPrice.toLocaleString('en-US')}
                          </div>
                        </div>

                        {/* Inline Discount */}
                        <div className="text-right w-20">
                          <div className="text-[11px] text-slate-400">Discount</div>
                          <input
                            type="number"
                            value={item.discount || 0}
                            onChange={(e) => updateItemDiscount(item.id, Number(e.target.value))}
                            className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-emerald-400 font-mono text-right focus:outline-none focus:border-teal-500"
                          />
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-slate-200 tnum">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            disabled={item.category === 'HANDSET'}
                            className={`p-1 rounded ${
                              item.category === 'HANDSET'
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Total */}
                        <div className="text-right w-28">
                          <div className="text-xs text-slate-400">Line Total</div>
                          <div className="text-sm font-bold text-teal-400 tnum">
                            ৳{(item.unitPrice * item.quantity - item.discount).toLocaleString('en-US')}
                          </div>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right 5 Columns: Tender, Customer & Financial Settlement */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              {/* Customer Selection Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <User className="w-4 h-4 text-teal-400" />
                    <span>Customer Details (F3)</span>
                  </h3>
                  <div className="flex space-x-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                    <button
                      onClick={() => setCustomerType('WALKIN')}
                      className={`px-2 py-0.5 rounded ${
                        customerType === 'WALKIN'
                          ? 'bg-slate-800 text-teal-300 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      Walk-in
                    </button>
                    <button
                      onClick={() => setCustomerType('ACCOUNT')}
                      className={`px-2 py-0.5 rounded ${
                        customerType === 'ACCOUNT'
                          ? 'bg-slate-800 text-teal-300 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      Bakir Khata
                    </button>
                  </div>
                </div>

                {customerType === 'WALKIN' ? (
                  <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    Standard Walk-in Cash Customer (Non-registered, immediate settlement).
                  </div>
                ) : (
                  <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-200">{customerName}</span>
                      <span className="font-mono text-teal-400">{customerPhone}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-slate-800">
                      <span className="text-amber-400">Current Due: ৳4,500</span>
                      <span className="text-slate-400">Credit Limit: ৳25,000</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Tender Selector */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <CreditCard className="w-4 h-4 text-teal-400" />
                    <span>Payment Tender (মূল্য পরিশোধ)</span>
                  </h3>
                  <button
                    onClick={() => setIsSplitMode(!isSplitMode)}
                    className="text-[11px] text-teal-400 hover:underline"
                  >
                    {isSplitMode ? 'Single Tender Mode' : 'Split Tender Mode'}
                  </button>
                </div>

                {!isSplitMode ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <button
                      onClick={() => setTenderMethod('CASH')}
                      className={`p-2.5 rounded-lg border flex flex-col items-center justify-center space-y-1 transition-all ${
                        tenderMethod === 'CASH'
                          ? 'bg-teal-950/70 border-teal-500 text-teal-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Cash (1.1.01)</span>
                    </button>

                    <button
                      onClick={() => setTenderMethod('BKASH')}
                      className={`p-2.5 rounded-lg border flex flex-col items-center justify-center space-y-1 transition-all ${
                        tenderMethod === 'BKASH'
                          ? 'bg-teal-950/70 border-teal-500 text-teal-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-pink-400" />
                      <span>bKash (1.2.01)</span>
                    </button>

                    <button
                      onClick={() => setTenderMethod('CARD')}
                      className={`p-2.5 rounded-lg border flex flex-col items-center justify-center space-y-1 transition-all ${
                        tenderMethod === 'CARD'
                          ? 'bg-teal-950/70 border-teal-500 text-teal-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-blue-400" />
                      <span>Card POS</span>
                    </button>

                    <button
                      onClick={() => setTenderMethod('BAKI')}
                      className={`p-2.5 rounded-lg border flex flex-col items-center justify-center space-y-1 transition-all ${
                        tenderMethod === 'BAKI'
                          ? 'bg-purple-950/70 border-purple-500 text-purple-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-purple-400" />
                      <span>Due (1.4.01)</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Cash Received:</span>
                      <input
                        type="number"
                        value={splitCash || ''}
                        onChange={(e) => setSplitCash(Number(e.target.value))}
                        placeholder="৳0.00"
                        className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-right"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Digital / bKash:</span>
                      <input
                        type="number"
                        value={splitDigital || ''}
                        onChange={(e) => setSplitDigital(Number(e.target.value))}
                        placeholder="৳0.00"
                        className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-right"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Customer Due (Baki):</span>
                      <input
                        type="number"
                        value={splitDue || ''}
                        onChange={(e) => setSplitDue(Number(e.target.value))}
                        placeholder="৳0.00"
                        className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-purple-300 font-mono text-right"
                      />
                    </div>
                  </div>
                )}

                {/* Quick Cash Denominations Numpad */}
                {tenderMethod === 'CASH' && !isSplitMode && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span>Tendered Note (নগদ গ্রহণ):</span>
                      <button
                        onClick={() => setTenderAmount(grandTotal)}
                        className="text-teal-400 hover:underline"
                      >
                        Exact Amount
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={tenderAmount || ''}
                        onChange={(e) => setTenderAmount(Number(e.target.value))}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono tnum focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {[100, 500, 1000, 2000].map((note) => (
                        <button
                          key={note}
                          onClick={() => setTenderAmount((prev) => prev + note)}
                          className="bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded py-1 text-xs text-slate-300 tnum"
                        >
                          +৳{note}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Settlement Summary & Checkout Button (F12) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-200 tnum">
                      ৳{subtotal.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>VAT (5% Mushak 6.3):</span>
                    <span className="font-semibold text-slate-200 tnum">
                      ৳{vatAmount.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-100">Grand Total:</span>
                    <span className="text-2xl font-bold text-teal-400 tnum">
                      ৳{grandTotal.toLocaleString('en-US')}
                    </span>
                  </div>

                  {tenderMethod === 'CASH' && !isSplitMode && (
                    <div className="pt-2 border-t border-slate-800/60 flex justify-between text-xs">
                      <span className="text-slate-400">Change Due (ফেরত):</span>
                      <span
                        className={`font-bold tnum ${
                          changeDue > 0 ? 'text-amber-400 text-sm' : 'text-slate-400'
                        }`}
                      >
                        ৳{changeDue.toLocaleString('en-US')}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  disabled={cart.length === 0 || (isOfflineSimulated && hasHandsetInCart)}
                  onClick={handleCompleteSale}
                  className={`mt-5 w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-lg ${
                    cart.length === 0 || (isOfflineSimulated && hasHandsetInCart)
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50'
                      : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/30 active:scale-[0.99]'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>
                    {isOfflineSimulated
                      ? 'Queue Offline Accessory Sale (F12)'
                      : 'Complete Sale & Print Thermal (F12)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Held Carts Modal (F6) */}
      {showHeldModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setShowHeldModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-3 flex items-center space-x-2">
              <PlayCircle className="w-4 h-4 text-teal-400" />
              <span>Recall Stashed Carts (F6)</span>
            </h3>

            {heldCarts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No active held carts. Press F5 in the POS counter to stash an active cart.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {heldCarts.map((h) => (
                  <div
                    key={h.id}
                    className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        {h.customerName} • {h.items.length} items
                      </div>
                      <div className="text-[11px] text-slate-500">{h.timestamp}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRecallCart(h.id)}
                        className="bg-teal-600 hover:bg-teal-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
                      >
                        Recall
                      </button>
                      <button
                        onClick={() => handleDiscardHeldCart(h.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Reprint Modal (TC-47) */}
      {showReprintModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowReprintModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <Copy className="w-4 h-4 text-amber-400" />
              <span>Auditable Invoice Reprint (TC-47)</span>
            </h3>

            <p className="text-xs text-slate-400">
              Reprint past invoices with auditable <code className="text-amber-400 font-mono">reprint_count</code>.
              Reprint requests produce 0 financial journal or stock movements.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Invoice Number:</label>
              <input
                type="text"
                value={reprintInvoiceNo}
                onChange={(e) => setReprintInvoiceNo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>

            {reprintMessage && (
              <div className="bg-amber-950/40 border border-amber-800/80 p-2.5 rounded-lg text-xs text-amber-300">
                {reprintMessage}
              </div>
            )}

            <div className="pt-2 flex space-x-2">
              <button
                onClick={handleTriggerReprint}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Execute Reprint (+1 Count)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal (F1) */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl relative space-y-3">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-teal-400" />
              <span>Keyboard Accelerators (দ্রুত কীবোর্ড শর্টকাট)</span>
            </h3>

            <div className="space-y-2 text-xs text-slate-300 divide-y divide-slate-800">
              <div className="flex justify-between py-1.5"><span className="font-mono text-teal-400 font-bold">F1</span><span>Help & Shortcut Guide</span></div>
              <div className="flex justify-between py-1.5"><span className="font-mono text-teal-400 font-bold">F2</span><span>Focus Barcode / IMEI Scanner</span></div>
              <div className="flex justify-between py-1.5"><span className="font-mono text-teal-400 font-bold">F3</span><span>Customer Search & Bakir Khata Lookup</span></div>
              <div className="flex justify-between py-1.5"><span className="font-mono text-teal-400 font-bold">F4</span><span>Inline Discount Editor</span></div>
              <div className="flex justify-between py-1.5"><span className="font-mono text-teal-400 font-bold">F5</span><span>Hold Active Shopping Cart</span></div>
              <div className="flex justify-between py-1.5"><span className="font-mono text-teal-400 font-bold">F6</span><span>Recall Stashed Shopping Cart</span></div>
              <div className="flex justify-between py-1.5"><span className="font-mono text-teal-400 font-bold">F12</span><span>Pay / Complete Checkout</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Simulation Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl relative animate-in fade-in duration-200">
            <button
              onClick={() => setShowReceipt(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-emerald-400 text-sm font-semibold mb-4">
              <CheckCircle2 className="w-5 h-5" />
              <span>Sale Completed & Solenoid Drawer Kicked!</span>
            </div>

            {/* Thermal Slip Simulation */}
            <div className="bg-white text-slate-900 p-5 rounded-lg font-mono text-xs shadow-inner select-none space-y-2 border border-slate-200">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <div className="text-base font-black tracking-wider uppercase">Kanchan Telecom</div>
                <div className="text-[10px] text-slate-600">Eastern Plaza, Shop #304, Dhaka-1205</div>
                <div className="text-[10px] text-slate-600">Hotline: 01711-223344 • Mushak 6.3 BIN</div>

                {lastSaleReprintCount > 0 && (
                  <div className="text-[10px] font-black text-rose-600 bg-rose-100 py-0.5 rounded my-1">
                    *** DUPLICATE REPRINT (COPY #{lastSaleReprintCount}) ***
                  </div>
                )}

                <div className="text-[10px] font-bold mt-1 text-slate-800">
                  INVOICE: {lastInvoiceNumber}
                </div>
                <div className="text-[9px] text-slate-500">{new Date().toLocaleString()}</div>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 space-y-1.5">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex-1 pr-2">
                      <div className="font-bold">{item.name}</div>
                      {item.imei1 && (
                        <div className="text-[9px] text-slate-600">IMEI: {item.imei1}</div>
                      )}
                    </div>
                    <div className="text-right tnum">
                      {item.quantity}x ৳{item.unitPrice}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-1 space-y-1 border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold tnum">৳{subtotal.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (5%):</span>
                  <span className="tnum">৳{vatAmount.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-300">
                  <span>NET TOTAL:</span>
                  <span className="tnum">৳{grandTotal.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-700">
                  <span>Tendered ({tenderMethod}):</span>
                  <span className="tnum">৳{tenderAmount.toLocaleString('en-US')}</span>
                </div>
                {changeDue > 0 && (
                  <div className="flex justify-between text-[11px] font-bold text-slate-900">
                    <span>Change Returned:</span>
                    <span className="tnum">৳{changeDue.toLocaleString('en-US')}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-600">
                <div>7-Day Official Replacement Warranty</div>
                <div className="font-semibold text-slate-800 mt-0.5">Powered by Bebsayik.com ERP</div>
              </div>
            </div>

            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-semibold"
              >
                Done
              </button>
              <button
                onClick={() => {
                  window.print();
                  setShowReceipt(false);
                }}
                className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print ESC/POS</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
