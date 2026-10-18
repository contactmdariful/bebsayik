import React, { useState } from 'react';
import {
  Store,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Wrench,
  Receipt,
  Settings,
  ChevronDown,
  Menu,
  X,
  Wifi,
  WifiOff,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Truck,
  RotateCcw,
  CalendarDays,
  Landmark,
} from 'lucide-react';
import { OfflineSyncBanner } from '../OfflineSyncBanner.js';
import { MultiShopSwitcherModal, AuthorizedShop } from '../retail/MultiShopSwitcherModal.js';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  shortcut?: string;
}

export interface AppShellProps {
  children: React.ReactNode;
  activeNavId: string;
  onNavigate: (navId: string) => void;
  shopName?: string;
  shopBranch?: string;
  userRole?: string;
  userName?: string;
  shiftBalance?: string;
  apiOnline?: boolean;
  pendingOfflineCount?: number;
  onSyncOffline?: () => void;
  onShopSwitched?: (shop: AuthorizedShop, token: string) => void;
}

export function AppShell({
  children,
  activeNavId,
  onNavigate,
  shopName = 'Kanchan Telecom',
  shopBranch = 'Eastern Plaza #304',
  userRole = 'STORE_OWNER',
  userName = 'Sumon Dash',
  shiftBalance = '৳14,250.00',
  apiOnline = true,
  pendingOfflineCount = 0,
  onSyncOffline,
  onShopSwitched,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const navItems: NavItem[] = [
    { id: 'POS', label: 'Counter POS', icon: <ShoppingCart className="w-4 h-4" />, shortcut: 'F1' },
    { id: 'SHOWCASE', label: 'Component Showcase', icon: <Sparkles className="w-4 h-4 text-amber-400" />, badge: 'P4' },
    { id: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'INVENTORY', label: 'Dual-IMEI Inventory', icon: <Package className="w-4 h-4" /> },
    { id: 'PROCUREMENT', label: 'Procurement & Transfers', icon: <Truck className="w-4 h-4 text-emerald-400" />, badge: 'P6' },
    { id: 'CUSTOMERS', label: 'Customers & Dues', icon: <Users className="w-4 h-4 text-teal-400" />, badge: 'P8' },
    { id: 'RETURNS', label: 'Sales Returns (CRV)', icon: <RotateCcw className="w-4 h-4 text-amber-400" />, badge: 'P8' },
    { id: 'KISTI', label: 'Kisti / EMI Hub', icon: <CalendarDays className="w-4 h-4 text-purple-400" />, badge: 'P9' },
    { id: 'CLOSING', label: 'Closing & Accounts', icon: <Landmark className="w-4 h-4 text-emerald-400" />, badge: 'P10' },
    { id: 'SERVICE', label: 'Technician Lab', icon: <Wrench className="w-4 h-4" /> },
    { id: 'API_DIAGNOSTICS', label: 'API Gateway', icon: <Receipt className="w-4 h-4" /> },
    { id: 'SETTINGS', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Offline Banner if active */}
      <OfflineSyncBanner
        pendingMutations={pendingOfflineCount}
        onSync={onSyncOffline}
      />

      {/* Universal Top Application Bar (56px) */}
      <header className="h-14 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30 shrink-0">
        <div className="flex items-center space-x-3">
          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
            aria-label="Toggle navigation menu"
          >
            {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Dokan Brand & Workspace Switcher Trigger */}
          <div
            onClick={() => setIsSwitcherOpen(true)}
            className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 cursor-pointer transition-all select-none min-h-[44px]"
            title="Click to switch store workspace"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold shadow-sm shadow-teal-900/50">
              <Store className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1 leading-tight">
                <span>{shopName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-[10px] text-slate-400 leading-none">{shopBranch}</div>
            </div>
          </div>
        </div>

        {/* Right Status Badges */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
          {/* Live API Health Status */}
          <div
            className={`px-2.5 py-1 rounded-full border flex items-center space-x-1.5 ${
              apiOnline
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                : 'bg-rose-950/50 border-rose-700/60 text-rose-300'
            }`}
          >
            {apiOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            )}
            <span className="font-medium hidden sm:inline">
              {apiOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Active Shift Counter Float */}
          <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-slate-400">Shift:</span>
            <span className="font-semibold text-emerald-400 tnum">{shiftBalance}</span>
          </div>

          {/* User Profile Avatar */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold text-xs select-none">
              {userName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-slate-200 font-medium text-xs leading-none">{userName}</div>
              <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider leading-tight">
                {userRole}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (Collapsible: 240px -> 64px) */}
        <aside
          className={`hidden md:flex flex-col border-r border-slate-800 bg-slate-950/70 backdrop-blur-sm transition-all duration-200 shrink-0 select-none ${
            sidebarCollapsed ? 'w-16' : 'w-56'
          }`}
        >
          {/* Navigation Links */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = activeNavId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center rounded-xl transition-all min-h-[44px] ${
                    sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                  } ${
                    isActive
                      ? 'bg-teal-600/90 text-white font-semibold shadow-sm shadow-teal-950'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && <span className="text-xs truncate">{item.label}</span>}
                  </div>

                  {!sidebarCollapsed && (
                    <div className="flex items-center space-x-1">
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {item.badge}
                        </span>
                      )}
                      {item.shortcut && (
                        <kbd className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-1 py-0.5 rounded font-mono">
                          {item.shortcut}
                        </kbd>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Collapse Footer Toggle */}
          <div className="p-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-colors min-h-[44px]"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <div className="flex items-center space-x-2 text-xs">
                  <ChevronLeft className="w-4 h-4" />
                  <span>Collapse Menu</span>
                </div>
              )}
            </button>
          </div>
        </aside>

        {/* Workspace Canvas */}
        <main className="flex-1 overflow-y-auto bg-slate-950 pb-16 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (56px) with Safe Area */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-slate-950 border-t border-slate-800 z-30 flex items-center justify-around px-2 pb-safe"
      >
        {[
          { id: 'POS', label: 'POS', icon: <ShoppingCart className="w-5 h-5" /> },
          { id: 'SHOWCASE', label: 'Showcase', icon: <Sparkles className="w-5 h-5 text-amber-400" /> },
          { id: 'INVENTORY', label: 'Stock', icon: <Package className="w-5 h-5" /> },
          { id: 'API_DIAGNOSTICS', label: 'Gateway', icon: <Receipt className="w-5 h-5" /> },
        ].map((item) => {
          const isActive = activeNavId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-colors ${
                isActive ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="text-[10px] leading-tight mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Dokan Switcher Modal */}
      <MultiShopSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        onShopSwitched={(shop, token) => {
          if (onShopSwitched) {
            onShopSwitched(shop, token);
          }
        }}
      />
    </div>
  );
}
