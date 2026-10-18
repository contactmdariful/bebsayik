import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './Button.js';

export interface OfflineSyncBannerProps {
  pendingMutations?: number;
  onSync?: () => Promise<void> | void;
  isSyncing?: boolean;
  className?: string;
}

export function OfflineSyncBanner({
  pendingMutations = 0,
  onSync,
  isSyncing = false,
  className = '',
}: OfflineSyncBannerProps) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Only show banner if we are offline or there are pending mutations
  if (isOnline && pendingMutations === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b transition-all ${
        !isOnline
          ? 'bg-amber-950/80 border-amber-700/60 text-amber-200'
          : 'bg-teal-950/80 border-teal-700/60 text-teal-200'
      } ${className}`}
    >
      <div className="flex items-center space-x-2">
        {!isOnline ? (
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
        ) : (
          <Wifi className="w-4 h-4 text-teal-400 shrink-0" />
        )}

        <div>
          <span className="font-bold">
            {!isOnline ? 'Terminal Offline Mode:' : 'Online:'}
          </span>{' '}
          {!isOnline ? (
            <span>
              Internet connection unavailable. Serialized IMEI checkouts are held. Queued offline items:{' '}
              <strong className="tnum font-bold">{pendingMutations}</strong>.
            </span>
          ) : (
            <span>
              Connection restored.{' '}
              <strong className="tnum font-bold">{pendingMutations}</strong> pending mutation(s) ready to sync.
            </span>
          )}
        </div>
      </div>

      {pendingMutations > 0 && onSync && (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            loading={isSyncing}
            onClick={onSync}
            className="text-xs h-7 min-h-[32px] px-2.5 py-1 bg-amber-900/40 hover:bg-amber-800/60 text-amber-100 border-amber-600/60"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            <span>Sync ({pendingMutations})</span>
          </Button>
        </div>
      )}
    </div>
  );
}
