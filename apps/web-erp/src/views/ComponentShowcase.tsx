import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Lock,
  Layers,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Barcode,
  Search,
} from 'lucide-react';
import { Button } from '../components/Button.js';
import { IconButton } from '../components/IconButton.js';
import { DataTable, Column } from '../components/DataTable.js';
import { VirtualizedList } from '../components/VirtualizedList.js';
import { Modal } from '../components/Modal.js';
import { Drawer } from '../components/Drawer.js';
import { EmptyState } from '../components/EmptyState.js';
import { ErrorBoundary } from '../components/ErrorBoundary.js';
import { OfflineSyncBanner } from '../components/OfflineSyncBanner.js';
import { MoneyText } from '../components/MoneyText.js';
import { OnScreenNumpad } from '../components/retail/OnScreenNumpad.js';
import { PatternLockCanvas } from '../components/retail/PatternLockCanvas.js';
import { ManagerPinOverrideModal } from '../components/retail/ManagerPinOverrideModal.js';
import { MultiShopSwitcherModal } from '../components/retail/MultiShopSwitcherModal.js';

interface DemoInventoryItem {
  id: string;
  name: string;
  category: string;
  imei: string;
  stock: number;
  cost: number;
  sellingPrice: number;
}

const DEMO_ITEMS: DemoInventoryItem[] = [
  { id: '1', name: 'Redmi Note 13 Pro 5G', category: 'Handset', imei: '860123456789012', stock: 14, cost: 23500, sellingPrice: 27500 },
  { id: '2', name: 'Samsung Galaxy A55 5G', category: 'Handset', imei: '860987654321098', stock: 8, cost: 41000, sellingPrice: 46999 },
  { id: '3', name: 'iPhone 15 Pro Max 256GB', category: 'Handset', imei: '350123456789012', stock: 3, cost: 142000, sellingPrice: 155000 },
  { id: '4', name: 'Anker 20W Fast Charger', category: 'Accessory', imei: '—', stock: 45, cost: 850, sellingPrice: 1350 },
  { id: '5', name: 'Realme Buds Air 5 Pro', category: 'Accessory', imei: '—', stock: 19, cost: 4200, sellingPrice: 5800 },
  { id: '6', name: 'Baseus 20000mAh Powerbank', category: 'Accessory', imei: '—', stock: 22, cost: 1800, sellingPrice: 2450 },
  { id: '7', name: 'Xiaomi Band 8 Active', category: 'Gadget', imei: '—', stock: 11, cost: 1950, sellingPrice: 2600 },
];

export function ComponentShowcase() {
  // Modal & Drawer State
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPosition, setDrawerPosition] = useState<'right' | 'bottom'>('right');

  // Numpad State
  const [numpadValue, setNumpadValue] = useState('14250.00');
  const [numpadSubmitted, setNumpadSubmitted] = useState<string | null>(null);

  // Pattern Lock State
  const [patternNodes, setPatternNodes] = useState<number[]>([0, 1, 2, 5, 8]);

  // Manager PIN Modal State
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinSuccessResult, setPinSuccessResult] = useState<any>(null);

  // Dokan Switcher State
  const [switcherModalOpen, setSwitcherModalOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);

  // Table Skeleton Toggle
  const [isTableLoading, setIsTableLoading] = useState(false);

  // Crash simulator for ErrorBoundary
  const [shouldCrash, setShouldCrash] = useState(false);

  // Offline banner toggle
  const [demoPendingCount, setDemoPendingCount] = useState(3);

  const columns: Column<DemoInventoryItem>[] = [
    { key: 'name', header: 'Product Name', sortable: true },
    { key: 'category', header: 'Category', sortable: true },
    {
      key: 'imei',
      header: '15-Digit IMEI',
      render: (row) => <span className="font-mono text-xs text-slate-400 tnum">{row.imei}</span>,
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className={`px-2 py-0.5 rounded text-xs font-bold tnum ${row.stock < 5 ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-300'}`}>
          {row.stock}
        </span>
      ),
    },
    {
      key: 'sellingPrice',
      header: 'Price (৳)',
      align: 'right',
      sortable: true,
      render: (row) => <MoneyText amount={row.sellingPrice} colored />,
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Showcase Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-950/60 border border-teal-700/60 text-teal-300 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Phase 4 Design System & UI Component Showcase</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
          Bebsayik.com Component Catalog
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          High-performance, accessible, mobile-first design system components complying with{' '}
          <code className="text-teal-400">UI_UX_BLUEPRINT.md</code> and <code className="text-teal-400">appflow.md</code>.
        </p>
      </div>

      {/* 1. OfflineSyncBanner Component */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <span>1. Offline Status & Sync Banner</span>
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDemoPendingCount((c) => (c > 0 ? 0 : 4))}
          >
            {demoPendingCount > 0 ? 'Clear Pending Queue' : 'Simulate 4 Queued Items'}
          </Button>
        </div>
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
          <OfflineSyncBanner
            pendingMutations={demoPendingCount}
            onSync={() => {
              alert('Syncing queued non-serialized offline transactions with server...');
              setDemoPendingCount(0);
            }}
          />
          <div className="p-4 text-xs text-slate-400">
            Persistent indicator communicating online/offline status and pending mutation count without risking double-selling serialized handsets.
          </div>
        </div>
      </section>

      {/* 2. Button & IconButton Component */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-slate-200">2. Interactive Buttons & Minimum 44px Touch Targets</h2>
        <div className="p-5 border border-slate-800 rounded-xl bg-slate-900/60 space-y-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">
              Variants (Touch-friendly 44x44px minimum)
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary Action</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">
              States & Keyboard Shortcuts
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" loading>Loading State</Button>
              <Button variant="secondary" disabled>Disabled State</Button>
              <Button variant="primary" shortcutBadge="F1">Counter POS</Button>
              <Button variant="secondary" shortcutBadge="ESC">Close Dialog</Button>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">
              Accessible Icon Buttons (with aria-label)
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <IconButton icon={<Plus className="w-5 h-5" />} aria-label="Add Item" variant="primary" />
              <IconButton icon={<Trash2 className="w-5 h-5" />} aria-label="Delete Cart" variant="destructive" />
              <IconButton icon={<Settings className="w-5 h-5" />} aria-label="Open Settings" variant="outline" />
              <IconButton icon={<Lock className="w-5 h-5" />} aria-label="Lock Register" variant="secondary" />
              <IconButton icon={<Plus className="w-5 h-5" />} aria-label="Loading Button" loading variant="primary" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. DataTable Component */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-200">3. High-Density DataTable (with Tabular Numbers)</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTableLoading(!isTableLoading)}
          >
            {isTableLoading ? 'Show Data Rows' : 'Test Skeleton Shimmer'}
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={DEMO_ITEMS}
          keyExtractor={(item) => item.id}
          loading={isTableLoading}
          pageSize={5}
          initialSortKey="sellingPrice"
          initialSortDir="desc"
        />
      </section>

      {/* 4. Specialized Retail Dokan Widgets: Numpad & Pattern Lock */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-slate-200">4. Specialized Mobile-Retail Dokan Components</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* A. On-Screen Numpad */}
          <div className="border border-slate-800 rounded-2xl bg-slate-900/60 p-5 flex flex-col items-center">
            <h3 className="text-sm font-bold text-slate-200 mb-1 self-start">On-Screen Numpad</h3>
            <p className="text-xs text-slate-400 mb-4 self-start">
              Touch calculation widget for cash tenders and physical note counting.
            </p>

            <div className="w-full max-w-sm mb-3 p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Tender Amount:</span>
              <span className="text-xl font-bold text-teal-400 tnum">
                {numpadValue ? `৳${numpadValue}` : '৳0'}
              </span>
            </div>

            <OnScreenNumpad
              value={numpadValue}
              onChange={setNumpadValue}
              onConfirm={(val) => setNumpadSubmitted(val)}
            />

            {numpadSubmitted && (
              <div className="mt-3 text-xs text-emerald-400 font-medium flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Submitted Tender Value: ৳{numpadSubmitted}
              </div>
            )}
          </div>

          {/* B. 3x3 Pattern Lock */}
          <div className="border border-slate-800 rounded-2xl bg-slate-900/60 p-5 flex flex-col items-center">
            <h3 className="text-sm font-bold text-slate-200 mb-1 self-start">3×3 Pattern Lock Canvas</h3>
            <p className="text-xs text-slate-400 mb-4 self-start">
              Touch-friendly gesture drawing for repair lab customer Android phone locks.
            </p>

            <PatternLockCanvas
              value={patternNodes}
              onChange={(nodes) => setPatternNodes(nodes)}
              size={260}
            />

            <div className="w-full mt-3 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">
              <span>Recorded Pattern Coordinate Sequence: </span>
              <strong className="text-teal-400 font-mono">
                {patternNodes.length > 0 ? patternNodes.join(' → ') : 'None'}
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Modals, Drawers & Security Overlays */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-slate-200">5. Modals, Drawers & Security Gateways</h2>
        <div className="p-5 border border-slate-800 rounded-xl bg-slate-900/60 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Open Accessible Modal
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              setDrawerPosition('right');
              setDrawerOpen(true);
            }}
          >
            Open Side Drawer
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setDrawerPosition('bottom');
              setDrawerOpen(true);
            }}
          >
            Open Bottom Sheet
          </Button>

          <Button
            variant="primary"
            onClick={() => setPinModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Lock className="w-4 h-4 mr-1.5" />
            <span>Test Manager PIN Modal</span>
          </Button>

          <Button
            variant="secondary"
            onClick={() => setSwitcherModalOpen(true)}
          >
            <Layers className="w-4 h-4 mr-1.5" />
            <span>Test Multi-Shop Switcher</span>
          </Button>
        </div>

        {pinSuccessResult && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
            <span>
              Manager PIN Verified! Token: <code className="font-mono text-emerald-200">{pinSuccessResult.overrideToken?.slice(0, 20)}...</code>
            </span>
            <span className="font-bold">Authorized By: {pinSuccessResult.authorizedBy} (60s)</span>
          </div>
        )}
      </section>

      {/* 6. VirtualizedList for High-Volume IMEI Lookups */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-200">6. VirtualizedList (500 Handset IMEIs Batch)</h2>
        <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/60">
          <p className="text-xs text-slate-400 mb-3">
            Smooth 60fps virtualization for huge catalogs and godown inventory batches without DOM lag:
          </p>
          <VirtualizedList
            items={Array.from({ length: 500 }).map((_, i) => ({
              id: `imei-batch-${i}`,
              imei: `8601240098${String(i).padStart(5, '0')}`,
              model: `Galaxy S24 Ultra Batch #${i + 1}`,
              outlet: i % 2 === 0 ? 'Eastern Plaza #304' : 'Multiplan Center #201',
            }))}
            itemHeight={44}
            height={220}
            renderItem={(item) => (
              <div className="px-4 py-2 border-b border-slate-800/60 flex items-center justify-between text-xs hover:bg-slate-900">
                <span className="font-medium text-slate-200">{item.model}</span>
                <span className="font-mono text-teal-400 tnum">{item.imei}</span>
                <span className="text-slate-500">{item.outlet}</span>
              </div>
            )}
          />
        </div>
      </section>

      {/* 7. Error Boundary & Empty State */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-slate-200">7. Error Boundary & Empty State Fallbacks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EmptyState
            title="No Used Phones Checked In"
            description="Used phones checked into buyback inventory will appear here after police undertaking generation."
            actionLabel="Intake Used Phone"
            onAction={() => alert('Opening buyback intake wizard')}
          />

          <div className="p-6 border border-slate-800 rounded-xl bg-slate-900/60 flex flex-col items-center justify-center text-center">
            <h3 className="text-sm font-bold text-slate-200 mb-1">ErrorBoundary Crash Recovery Test</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-xs">
              Simulates a UI runtime exception to verify safe catch and error reporting without data leakage.
            </p>
            <ErrorBoundary>
              {shouldCrash ? (
                (() => {
                  throw new Error('Simulated Phase 4 UI component test exception');
                })()
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShouldCrash(true)}
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  <span>Trigger Crash Simulator</span>
                </Button>
              )}
            </ErrorBoundary>
          </div>
        </div>
      </section>

      {/* Standard Modal Dialog Instance */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Example Modal Dialog"
        description="Accessible modal dialog with focus trapping and ESC dismissal"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>
              Confirm Action
            </Button>
          </>
        }
      >
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          This dialog traps keyboard focus within its interactive elements, locks the document scroll,
          and closes automatically when pressing the <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs">Escape</kbd> key or clicking the backdrop overlay.
        </p>
      </Modal>

      {/* Drawer Instance */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        position={drawerPosition}
        title={drawerPosition === 'bottom' ? 'Bottom Sheet Drawer' : 'Side Slide-Over Drawer'}
        description="Responsive overlay for mobile touch checkout & split tenders"
        footer={
          <Button variant="primary" size="sm" onClick={() => setDrawerOpen(false)} className="w-full">
            Done
          </Button>
        }
      >
        <div className="space-y-3 text-xs text-slate-300">
          <p>
            This drawer slides in smoothly from the {drawerPosition === 'bottom' ? 'bottom of the mobile viewport' : 'right edge of the screen'}.
          </p>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="font-semibold text-slate-200 block mb-1">Quick Note:</span>
            On mobile touch devices (390px - 844px), all checkout drawers slide from the bottom with safe-area padding for one-thumb activation.
          </div>
        </div>
      </Drawer>

      {/* Manager PIN Modal Instance */}
      <ManagerPinOverrideModal
        isOpen={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        action="MSP_FLOOR_OVERRIDE"
        reason="Unit selling price is below minimum selling price floor (MSP)"
        onSuccess={(res) => setPinSuccessResult(res)}
      />

      {/* Multi-Shop Switcher Modal Instance */}
      <MultiShopSwitcherModal
        isOpen={switcherModalOpen}
        onClose={() => setSwitcherModalOpen(false)}
        onShopSwitched={(shop, token) => {
          setSelectedShop(shop.name);
          alert(`Switched active workspace to: ${shop.name} (${shop.role})`);
        }}
      />
    </div>
  );
}
