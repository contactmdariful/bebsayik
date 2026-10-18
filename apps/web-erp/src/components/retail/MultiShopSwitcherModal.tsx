import React, { useState, useEffect, useMemo } from 'react';
import { Store, Check, RefreshCw, AlertCircle, Search, Building2 } from 'lucide-react';
import { Modal } from '../Modal.js';
import { Button } from '../Button.js';

export interface AuthorizedShop {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  binNumber?: string;
  status: string;
  role: string;
  isCurrent: boolean;
}

export interface MultiShopSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShopId?: string;
  onShopSwitched: (newShop: AuthorizedShop, scopedToken: string) => void;
}

export function MultiShopSwitcherModal({
  isOpen,
  onClose,
  currentShopId,
  onShopSwitched,
}: MultiShopSwitcherModalProps) {
  const [shops, setShops] = useState<AuthorizedShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [switchingShopId, setSwitchingShopId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch authorized shops on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchMyShops = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/v1/shops/my-shops');
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to fetch authorized shops');
        }

        setShops(data.data || []);
      } catch (err: any) {
        setError(err.message || 'Network error fetching shops');
      } finally {
        setLoading(false);
      }
    };

    fetchMyShops();
  }, [isOpen]);

  const filteredShops = useMemo(() => {
    if (!searchQuery.trim()) return shops;
    const q = searchQuery.toLowerCase();
    return shops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.binNumber && s.binNumber.includes(q))
    );
  }, [shops, searchQuery]);

  const handleSelectShop = async (targetShop: AuthorizedShop) => {
    if (targetShop.id === currentShopId || switchingShopId) return;

    setSwitchingShopId(targetShop.id);
    setError(null);

    try {
      const res = await fetch('/api/v1/shops/switch-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetShopId: targetShop.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Unauthorized to switch to this shop');
      }

      onShopSwitched(targetShop, data.data.scopedToken);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Workspace switch rejected');
    } finally {
      setSwitchingShopId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Switch Dokan Workspace"
      description="Select an authorized shop branch or store location"
      maxWidth="md"
      closeOnBackdropClick={!switchingShopId}
      id="shop-switcher-modal"
    >
      <div className="flex flex-col space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branches by shop name or BIN..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Shop list */}
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
              <span className="text-xs">Loading authorized shops...</span>
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No matching authorized branches found.
            </div>
          ) : (
            filteredShops.map((shop) => {
              const isCurrent = shop.id === currentShopId || shop.isCurrent;
              const isSwitching = switchingShopId === shop.id;

              return (
                <div
                  key={shop.id}
                  onClick={() => handleSelectShop(shop)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none ${
                    isCurrent
                      ? 'bg-teal-950/40 border-teal-600/70 text-teal-200'
                      : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold border ${
                        isCurrent
                          ? 'bg-teal-900/60 border-teal-500 text-teal-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <Store className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-slate-100">{shop.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2">
                        <span>Role: <strong className="text-slate-300">{shop.role}</strong></span>
                        {shop.binNumber && <span>• BIN: {shop.binNumber}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isSwitching ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                    ) : isCurrent ? (
                      <Check className="w-4 h-4 text-teal-400" />
                    ) : (
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                        Switch
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
