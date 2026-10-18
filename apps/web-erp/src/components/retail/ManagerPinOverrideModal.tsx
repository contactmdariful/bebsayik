import React, { useState } from 'react';
import { Lock, ShieldAlert, CheckCircle2, Delete } from 'lucide-react';
import { Modal } from '../Modal.js';
import { Button } from '../Button.js';

export interface ManagerPinOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: string;
  shopId?: string;
  context?: any;
  reason?: string;
  onSuccess: (result: {
    overrideToken: string;
    expiresInSeconds: number;
    authorizedBy: string;
  }) => void;
}

export function ManagerPinOverrideModal({
  isOpen,
  onClose,
  action,
  shopId,
  context,
  reason = 'Manager authorization is required for this operation',
  onSuccess,
}: ManagerPinOverrideModalProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDigit = (digit: string) => {
    if (loading || pin.length >= 4) return;
    setError(null);
    setPin((prev) => prev + digit);
  };

  const handleBackspace = () => {
    if (loading || pin.length === 0) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (loading) return;
    setPin('');
    setError(null);
  };

  const handleSubmit = async (pinToSubmit = pin) => {
    if (pinToSubmit.length !== 4) {
      setError('Please enter complete 4-digit Manager PIN');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (shopId) {
        headers['X-Shop-Id'] = shopId;
      }

      const res = await fetch('/api/v1/users/manager-pin/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pin: pinToSubmit,
          action,
          context,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Invalid Manager Override PIN');
      }

      onSuccess({
        overrideToken: data.data.overrideToken,
        expiresInSeconds: data.data.expiresInSeconds || 60,
        authorizedBy: data.data.authorizedBy || 'Manager',
      });
      setPin('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authorization failed');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setPin('');
        setError(null);
        onClose();
      }}
      maxWidth="sm"
      closeOnBackdropClick={!loading}
      id="manager-pin-modal"
    >
      <div className="flex flex-col items-center text-center">
        {/* Shield Icon */}
        <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-700/60 text-amber-400 flex items-center justify-center mb-3 shadow-lg">
          <Lock className="w-7 h-7" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-100">Manager PIN Override</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">{reason}</p>

        {/* 4 Masked PIN Slots */}
        <div className="flex items-center justify-center space-x-3 my-5">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-11 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${
                  isFilled
                    ? 'border-teal-500 bg-teal-950/40 text-teal-300'
                    : 'border-slate-800 bg-slate-950 text-slate-600'
                }`}
              >
                {isFilled ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-teal-400 shadow-sm shadow-teal-500" />
                ) : (
                  <span className="text-slate-700 text-lg">•</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full mb-4 p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-center space-x-1.5 animate-in shake duration-150">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* On-screen 4x3 keypad */}
        <div className="w-full max-w-[260px] grid grid-cols-3 gap-2 mb-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={loading}
              onClick={() => handleDigit(digit)}
              className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-slate-900 border border-slate-800 text-slate-100 text-lg font-bold transition-all select-none focus:outline-none focus:ring-1 focus:ring-teal-500 min-h-[44px]"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            disabled={loading || pin.length === 0}
            onClick={handleClear}
            className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-800 transition-all select-none min-h-[44px]"
          >
            Clear
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleDigit('0')}
            className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-slate-900 border border-slate-800 text-slate-100 text-lg font-bold transition-all select-none min-h-[44px]"
          >
            0
          </button>

          <button
            type="button"
            disabled={loading || pin.length === 0}
            onClick={handleBackspace}
            aria-label="Backspace"
            className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center justify-center transition-all select-none min-h-[44px]"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Submit & Cancel Actions */}
        <div className="w-full flex items-center space-x-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => {
              setPin('');
              setError(null);
              onClose();
            }}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={loading}
            disabled={pin.length !== 4}
            onClick={() => handleSubmit()}
            className="flex-1"
          >
            Authorize (60s)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
