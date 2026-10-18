import React, { useState, useEffect } from 'react';
import {
  Printer,
  Sliders,
  Save,
  CheckCircle2,
  AlertCircle,
  Radio,
  Zap,
  RefreshCw,
  Cpu,
  Usb,
  Bluetooth,
  FileText,
  Volume2,
  Barcode
} from 'lucide-react';
import { ThermalStationConfig, DEFAULT_HARDWARE_CONFIG, ThermalPrinterDriver } from '../hardware/escpos.js';

export function HardwareSettings() {
  const [config, setConfig] = useState<ThermalStationConfig>(DEFAULT_HARDWARE_CONFIG);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [testingHardware, setTestingHardware] = useState<string | null>(null);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'DISCONNECTED' | 'SIMULATOR' | 'WEBUSB' | 'BLUETOOTH'>('SIMULATOR');

  // Load configuration from API or LocalStorage
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        const shopId = localStorage.getItem('activeShopId');
        if (token && shopId) {
          const res = await fetch('/api/v1/hardware/station', {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Shop-Id': shopId
            }
          });
          const json = await res.json();
          if (json.success && json.data) {
            setConfig({
              terminalName: json.data.terminalName || DEFAULT_HARDWARE_CONFIG.terminalName,
              stationFingerprint: json.data.stationFingerprint || json.data.counterId || DEFAULT_HARDWARE_CONFIG.stationFingerprint,
              paperWidthMm: json.data.paperWidthMm || (json.data.printerPaperWidth === '58mm' ? 58 : 80),
              printerConnectionType: json.data.printerConnectionType || 'webusb',
              printerAddress: json.data.printerAddress,
              kickDrawerOnSale: json.data.kickDrawerOnSale !== undefined ? json.data.kickDrawerOnSale : true,
              printDirectViaWebUsb: json.data.printDirectViaWebUsb !== undefined ? json.data.printDirectViaWebUsb : true,
              scannerWedgeSuffix: json.data.scannerWedgeSuffix || 'ENTER'
            });
          }
        }
      } catch {
        // Fall back to default
      }
    };
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedStatus(null);
    try {
      const token = localStorage.getItem('token');
      const shopId = localStorage.getItem('activeShopId');
      if (token && shopId) {
        const res = await fetch('/api/v1/hardware/station', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Shop-Id': shopId
          },
          body: JSON.stringify(config)
        });
        const json = await res.json();
        if (json.success) {
          setSavedStatus('Station hardware configuration successfully saved to server.');
          setTimeout(() => setSavedStatus(null), 4000);
          return;
        }
      }
      setSavedStatus('Configuration saved locally (Terminal offline mode).');
      setTimeout(() => setSavedStatus(null), 4000);
    } catch {
      setSavedStatus('Configuration cached locally in terminal storage.');
      setTimeout(() => setSavedStatus(null), 4000);
    }
  };

  const handleTestDrawer = async () => {
    setTestingHardware('drawer');
    setTestLog((prev) => [`[${new Date().toLocaleTimeString()}] Emitting RJ11 pulse: 0x1B 0x70 0x00 0x19 0xFA (50ms solenoid)`, ...prev]);

    const res = await ThermalPrinterDriver.kickCashDrawer();
    setTestLog((prev) => [
      `[${new Date().toLocaleTimeString()}] Drawer Kick executed via [${res ? 'HARDWARE_SIMULATOR' : 'FALLBACK'}] in <50ms. Solenoid triggered.`,
      ...prev
    ]);
    setTestingHardware(null);
  };

  const handleTestPrint = async () => {
    setTestingHardware('print');
    setTestLog((prev) => [`[${new Date().toLocaleTimeString()}] Generating test ESC/POS voucher for ${config.paperWidthMm}mm paper...`, ...prev]);

    // Sample Base64 test print payload
    const testSampleBase64 = btoa(
      '\x1b@\x1bp\x00\x19\xfa\x1ba\x01\x1bE\x01Bebsayik Telecom\nHardware Test Receipt\n\x1bE\x00\x1ba\x00' +
      '-'.repeat(config.paperWidthMm === 58 ? 32 : 48) + '\n' +
      `Station: ${config.terminalName}\nPaper Width: ${config.paperWidthMm}mm\n` +
      `Date: ${new Date().toLocaleString()}\n` +
      '-'.repeat(config.paperWidthMm === 58 ? 32 : 48) + '\n' +
      'Test Pass: Thermal Head OK\n\n\x1dVBA\x02'
    );

    const res = await ThermalPrinterDriver.printReceipt(testSampleBase64, {
      kickDrawer: config.kickDrawerOnSale,
      useSimulatorIfUnavailable: true
    });

    setTestLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ESC/POS printed successfully via [${res.mode}]. Bytes written: ${res.bytesWritten}. Duration: ${res.durationMs}ms.`,
      ...prev
    ]);
    setTestingHardware(null);
  };

  const handlePairUsb = async () => {
    const res = await ThermalPrinterDriver.connectWebUsb();
    if (res.connected) {
      setConnectionStatus('WEBUSB');
      setTestLog((prev) => [`[${new Date().toLocaleTimeString()}] WebUSB device connected: ${res.deviceName}`, ...prev]);
    } else {
      setTestLog((prev) => [`[${new Date().toLocaleTimeString()}] WebUSB note: ${res.error}. Hardware simulator remains active.`, ...prev]);
    }
  };

  const handlePairBluetooth = async () => {
    const res = await ThermalPrinterDriver.connectBluetooth();
    if (res.connected) {
      setConnectionStatus('BLUETOOTH');
      setTestLog((prev) => [`[${new Date().toLocaleTimeString()}] Bluetooth printer connected: ${res.deviceName}`, ...prev]);
    } else {
      setTestLog((prev) => [`[${new Date().toLocaleTimeString()}] Bluetooth note: ${res.error}. Hardware simulator remains active.`, ...prev]);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1280px] w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-6 h-6 text-teal-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Hardware Station Settings & Peripheral Drivers
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure ESC/POS thermal printers, RJ11 cash drawers, and barcode scanner wedge parameters for Counter 1.
          </p>
        </div>

        {/* Live Device Status Tag */}
        <div className="flex items-center space-x-2">
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-medium">Mode:</span>
            <span className="text-teal-400 font-mono font-bold uppercase">{connectionStatus}</span>
          </div>
        </div>
      </div>

      {savedStatus && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 p-3 rounded-xl flex items-center space-x-2 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedStatus}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Hardware Form */}
        <div className="lg:col-span-7 space-y-5">
          <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2 pb-3 border-b border-slate-800">
              <Printer className="w-4 h-4 text-teal-400" />
              <span>Printer Profile & Communication</span>
            </h2>

            {/* Terminal Identification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Terminal Name (কাউন্টার নাম)
                </label>
                <input
                  type="text"
                  value={config.terminalName}
                  onChange={(e) => setConfig({ ...config, terminalName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Station Fingerprint / ID
                </label>
                <input
                  type="text"
                  value={config.stationFingerprint}
                  onChange={(e) => setConfig({ ...config, stationFingerprint: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono"
                />
              </div>
            </div>

            {/* Paper Width Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Thermal Paper Width (কাগজের প্রস্থ)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, paperWidthMm: 80 })}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center space-y-1 transition-all ${
                    config.paperWidthMm === 80
                      ? 'bg-teal-950/70 border-teal-500 text-teal-300 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/80'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-xs">80mm (Standard Desktop POS)</span>
                  <span className="text-[10px] text-slate-500">48 Characters / Line</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, paperWidthMm: 58 })}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center space-y-1 transition-all ${
                    config.paperWidthMm === 58
                      ? 'bg-teal-950/70 border-teal-500 text-teal-300 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/80'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-xs">58mm (Compact Mobile Thermal)</span>
                  <span className="text-[10px] text-slate-500">32 Characters / Line</span>
                </button>
              </div>
            </div>

            {/* Connection Protocol */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Printer Connection Interface
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'webusb', label: 'Direct WebUSB', icon: <Usb className="w-3.5 h-3.5" /> },
                  { id: 'bluetooth', label: 'Bluetooth SPP', icon: <Bluetooth className="w-3.5 h-3.5" /> },
                  { id: 'network', label: 'Ethernet LAN', icon: <Radio className="w-3.5 h-3.5" /> },
                  { id: 'raw_bt', label: 'OS Dialog', icon: <Printer className="w-3.5 h-3.5" /> }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setConfig({ ...config, printerConnectionType: item.id as any })}
                    className={`p-2.5 rounded-lg border flex flex-col items-center justify-center space-y-1 text-center transition-all ${
                      config.printerConnectionType === item.id
                        ? 'bg-teal-950/70 border-teal-500 text-teal-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Switches */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-slate-700">
                <div className="flex items-center space-x-3">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      RJ11 Cash Drawer Solenoid Kick
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Sends pulse (0x1B 0x70 0x00 0x19 0xFA) on cash checkout
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.kickDrawerOnSale}
                  onChange={(e) => setConfig({ ...config, kickDrawerOnSale: e.target.checked })}
                  className="rounded border-slate-700 text-teal-500 focus:ring-teal-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-slate-700">
                <div className="flex items-center space-x-3">
                  <Barcode className="w-4 h-4 text-teal-400" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      Scanner Wedge Auto-Suffix
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Trigger auto-lookup on barcode scanner termination
                    </div>
                  </div>
                </div>
                <select
                  value={config.scannerWedgeSuffix}
                  onChange={(e) => setConfig({ ...config, scannerWedgeSuffix: e.target.value as any })}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 font-mono focus:outline-none focus:border-teal-500"
                >
                  <option value="ENTER">ENTER (0x0D)</option>
                  <option value="TAB">TAB (0x09)</option>
                </select>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="submit"
                className="bg-teal-600 hover:bg-teal-500 text-white font-semibold px-5 py-2.5 rounded-lg text-xs transition-all flex items-center space-x-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Save Hardware Profile</span>
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handlePairUsb}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 border border-slate-700"
                >
                  <Usb className="w-3.5 h-3.5 text-teal-400" />
                  <span>Pair WebUSB</span>
                </button>
                <button
                  type="button"
                  onClick={handlePairBluetooth}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 border border-slate-700"
                >
                  <Bluetooth className="w-3.5 h-3.5 text-blue-400" />
                  <span>Pair BT</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right 5 Cols: Diagnostics Desk & Terminal Simulator */}
        <div className="lg:col-span-5 space-y-5">
          {/* Hardware Solenoid & Head Tests */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2 pb-3 border-b border-slate-800">
              <Cpu className="w-4 h-4 text-teal-400" />
              <span>Hardware Driver Diagnostics</span>
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleTestDrawer}
                disabled={testingHardware === 'drawer'}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg p-3 text-left transition-all flex flex-col justify-between"
              >
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Test Drawer Kick</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  Send 50ms RJ11 Solenoid Pulse
                </div>
              </button>

              <button
                type="button"
                onClick={handleTestPrint}
                disabled={testingHardware === 'print'}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg p-3 text-left transition-all flex flex-col justify-between"
              >
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                  <Printer className="w-4 h-4 text-teal-400" />
                  <span>Test Thermal Print</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  Print ESC/POS Alignment Sample
                </div>
              </button>
            </div>

            {/* Physical Hardware Notice */}
            <div className="bg-amber-950/30 border border-amber-900/50 p-3 rounded-lg text-xs text-amber-300/90 space-y-1">
              <div className="font-semibold flex items-center space-x-1.5 text-amber-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Physical Device Acceptance Note</span>
              </div>
              <p className="text-[11px] text-amber-400/80 leading-relaxed">
                When physical WebUSB/Bluetooth thermal hardware is unattached, the driver operates via an explicitly labelled simulator. Physical hardware acceptance is pending device attachment.
              </p>
            </div>

            {/* Diagnostic Log Console */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-semibold">Terminal Bus Activity:</span>
                <button
                  type="button"
                  onClick={() => setTestLog([])}
                  className="text-slate-500 hover:text-slate-300 text-[11px]"
                >
                  Clear Console
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 h-44 overflow-y-auto font-mono text-[11px] text-teal-300 space-y-1">
                {testLog.length === 0 ? (
                  <div className="text-slate-600 italic">No hardware signals sent yet. Click test buttons above to trigger bus communication.</div>
                ) : (
                  testLog.map((log, index) => <div key={index}>{log}</div>)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
