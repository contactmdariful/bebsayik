import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Users,
  FileText,
  RotateCcw,
  ArrowRightLeft,
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Building2,
  Phone,
  DollarSign,
  Barcode,
  Send,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
  Check
} from 'lucide-react';
import { Modal } from '../components/Modal.js';
import { Button } from '../components/Button.js';
import { MoneyText } from '../components/MoneyText.js';
import { EmptyState } from '../components/EmptyState.js';

export interface SupplierItem {
  id: string;
  name: string;
  companyName: string;
  contactPerson?: string;
  phone: string;
  address?: string;
  currentDueBalance: string;
  openingPayable: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  poNo: string;
  supplier: { _id?: string; companyName?: string; phone?: string };
  totalEstimatedAmount: string;
  status: 'ordered' | 'partially_received' | 'completed' | 'cancelled';
  expectedDeliveryDate?: string;
  items: Array<{
    variantId: any;
    orderedQuantity: number;
    receivedQuantity: number;
    pendingQuantity: number;
    estimatedCost: string;
  }>;
  createdAt: string;
}

export interface StockTransferItem {
  id: string;
  stnNo: string;
  fromShop: { _id?: string; name?: string };
  toShop: { _id?: string; name?: string };
  itemsCount: number;
  items: Array<{ imei1?: string; quantity: number }>;
  status: 'in_transit' | 'completed' | 'discrepancy';
  discrepancies?: Array<{ imei1: string; reason?: string }>;
  smsNotificationSent?: boolean;
  notes?: string;
  createdAt: string;
  receivedAt?: string;
}

export function ProcurementHub() {
  const [activeTab, setActiveTab] = useState<'SUPPLIERS' | 'ORDERS_GRN' | 'RETURNS_PRV' | 'TRANSFERS_STN' | 'DISCREPANCIES'>('SUPPLIERS');

  // Supplier CRM State
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');
  const [newSupplierOpeningPayable, setNewSupplierOpeningPayable] = useState('0.00');
  const [supplierSubmitLoading, setSupplierSubmitLoading] = useState(false);

  // Statement & Payment State
  const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState<SupplierItem | null>(null);
  const [statementData, setStatementData] = useState<any>(null);
  const [isStatementLoading, setIsStatementLoading] = useState(false);

  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<SupplierItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash'>('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSubmitLoading, setPaymentSubmitLoading] = useState(false);

  // PO & GRN State
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderItem[]>([]);
  const [isNewPoOpen, setIsNewPoOpen] = useState(false);
  const [selectedSupplierIdForPo, setSelectedSupplierIdForPo] = useState('');
  const [poVariantSku, setPoVariantSku] = useState('XIAOMI-NOTE13-8-256');
  const [poOrderedQty, setPoOrderedQty] = useState('50');
  const [poEstimatedCost, setPoEstimatedCost] = useState('24200.00');

  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [grnSupplierId, setGrnSupplierId] = useState('');
  const [grnPoId, setGrnPoId] = useState('');
  const [grnUnitCost, setGrnUnitCost] = useState('24200.00');
  const [grnPaidAmount, setGrnPaidAmount] = useState('0.00');
  const [grnImeiInput, setGrnImeiInput] = useState('');
  const [grnImeiList, setGrnImeiList] = useState<Array<{ imei1: string; imei2?: string }>>([]);
  const [grnSubmitting, setGrnSubmitting] = useState(false);

  // PRV Return State
  const [isPrvModalOpen, setIsPrvModalOpen] = useState(false);
  const [prvSupplierId, setPrvSupplierId] = useState('');
  const [prvImei1, setPrvImei1] = useState('');
  const [prvImei2, setPrvImei2] = useState('');
  const [prvReturnCost, setPrvReturnCost] = useState('15000.00');
  const [prvReason, setPrvReason] = useState('Dead on arrival - camera malfunction');
  const [prvSubmitting, setPrvSubmitting] = useState(false);

  // STN Transfer State
  const [transfers, setTransfers] = useState<StockTransferItem[]>([]);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchDestShopId, setDispatchDestShopId] = useState('6709a12b3c4d5e6f7a8b9c99');
  const [dispatchImeiInput, setDispatchImeiInput] = useState('');
  const [dispatchImeiList, setDispatchImeiList] = useState<string[]>([]);
  const [dispatchNotes, setDispatchNotes] = useState('Dispatch to Eastern Plaza Outlet');
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);

  // Receive STN Modal
  const [selectedStnToReceive, setSelectedStnToReceive] = useState<StockTransferItem | null>(null);
  const [receiveScanInput, setReceiveScanInput] = useState('');
  const [scannedImeisForReceive, setScannedImeisForReceive] = useState<string[]>([]);
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);

  // Toast / Status Message
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showBanner = (type: 'success' | 'error', message: string) => {
    setStatusBanner({ type, message });
    setTimeout(() => setStatusBanner(null), 6000);
  };

  // 1. Fetch Suppliers
  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const res = await fetch(`/api/v1/procurement/suppliers?search=${encodeURIComponent(supplierSearch)}`);
      if (res.ok) {
        const json = await res.json();
        setSuppliers(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  // 2. Fetch POs
  const fetchPurchaseOrders = async () => {
    try {
      const res = await fetch('/api/v1/procurement/orders');
      if (res.ok) {
        const json = await res.json();
        setPurchaseOrders(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load POs:', err);
    }
  };

  // 3. Fetch Transfers
  const fetchTransfers = async () => {
    try {
      const res = await fetch('/api/v1/inventory/transfers');
      if (res.ok) {
        const json = await res.json();
        setTransfers(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load transfers:', err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchPurchaseOrders();
    fetchTransfers();
  }, []);

  // Open 360 Statement
  const handleOpenStatement = async (supplier: SupplierItem) => {
    setSelectedSupplierForStatement(supplier);
    setIsStatementLoading(true);
    try {
      const res = await fetch(`/api/v1/procurement/suppliers/${supplier.id}/statement`);
      if (res.ok) {
        const json = await res.json();
        setStatementData(json.data);
      } else {
        showBanner('error', 'Failed to retrieve supplier statement');
      }
    } catch (err) {
      showBanner('error', 'Network error fetching statement');
    } finally {
      setIsStatementLoading(false);
    }
  };

  // Create Supplier Submit
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupplierSubmitLoading(true);
    try {
      const res = await fetch('/api/v1/procurement/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSupplierName,
          contactPerson: newSupplierContact,
          phone: newSupplierPhone,
          address: newSupplierAddress,
          openingPayable: newSupplierOpeningPayable
        })
      });

      const json = await res.json();
      if (res.ok) {
        showBanner('success', `Supplier "${newSupplierName}" created successfully!`);
        setIsAddSupplierOpen(false);
        setNewSupplierName('');
        setNewSupplierContact('');
        setNewSupplierPhone('');
        setNewSupplierAddress('');
        setNewSupplierOpeningPayable('0.00');
        fetchSuppliers();
      } else {
        showBanner('error', json.error?.message || 'Failed to create supplier');
      }
    } catch (err) {
      showBanner('error', 'Network error creating supplier');
    } finally {
      setSupplierSubmitLoading(false);
    }
  };

  // Record Payment Submit
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPayment) return;
    setPaymentSubmitLoading(true);
    try {
      const res = await fetch(`/api/v1/procurement/suppliers/${selectedSupplierForPayment.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paymentAmount,
          paymentMethod,
          referenceNo: paymentReference || `EFTN-${Date.now()}`,
          notes: paymentNotes
        })
      });

      const json = await res.json();
      if (res.ok) {
        showBanner('success', `Payment of ৳${paymentAmount} settled to ${selectedSupplierForPayment.companyName}! Voucher: ${json.data.voucherNo}`);
        setSelectedSupplierForPayment(null);
        setPaymentAmount('');
        setPaymentReference('');
        setPaymentNotes('');
        fetchSuppliers();
      } else {
        showBanner('error', json.error?.message || 'Failed to record supplier payment');
      }
    } catch (err) {
      showBanner('error', 'Network error recording payment');
    } finally {
      setPaymentSubmitLoading(false);
    }
  };

  // Add IMEI to GRN List
  const handleAddGrnImei = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = grnImeiInput.trim();
    if (!clean) return;

    if (clean.length !== 15) {
      showBanner('error', `IMEI "${clean}" must be exactly 15 digits`);
      return;
    }

    if (grnImeiList.some((p) => p.imei1 === clean)) {
      showBanner('error', `IMEI "${clean}" is already added to current GRN queue`);
      return;
    }

    setGrnImeiList([...grnImeiList, { imei1: clean }]);
    setGrnImeiInput('');
  };

  // Submit GRN Intake (TX-07)
  const handleSubmitGrn = async () => {
    if (!grnSupplierId) {
      showBanner('error', 'Please select a supplier');
      return;
    }
    if (grnImeiList.length === 0) {
      showBanner('error', 'Please scan at least one IMEI for handset intake');
      return;
    }

    setGrnSubmitting(true);
    try {
      const res = await fetch('/api/v1/procurement/grn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: grnSupplierId,
          poId: grnPoId || undefined,
          items: [
            {
              variantId: '6709a12b3c4d5e6f7a8b9c02',
              unitCost: grnUnitCost,
              imeiPairs: grnImeiList
            }
          ],
          paidAmount: grnPaidAmount,
          notes: 'Standard GRN Batch Intake'
        })
      });

      const json = await res.json();
      if (res.ok) {
        showBanner('success', `GRN ${json.data.grnNo} processed! Landed cost frozen @ ৳${grnUnitCost}/unit. Total: ৳${json.data.totalInvoiceAmount}`);
        setIsGrnModalOpen(false);
        setGrnImeiList([]);
        fetchSuppliers();
        fetchPurchaseOrders();
      } else {
        showBanner('error', json.error?.message || 'Failed to ingest GRN');
      }
    } catch (err) {
      showBanner('error', 'Network error submitting GRN');
    } finally {
      setGrnSubmitting(false);
    }
  };

  // Submit PRV Return (TX-08 / TC-19)
  const handleSubmitPrv = async () => {
    if (!prvSupplierId) {
      showBanner('error', 'Please select a supplier');
      return;
    }
    if (!prvImei1.trim()) {
      showBanner('error', 'Please enter at least one handset IMEI');
      return;
    }

    setPrvSubmitting(true);
    try {
      const itemsToReturn = [{ variantId: '6709a12b3c4d5e6f7a8b9c02', imei1: prvImei1.trim(), returnCost: prvReturnCost, reason: prvReason }];
      if (prvImei2.trim()) {
        itemsToReturn.push({ variantId: '6709a12b3c4d5e6f7a8b9c02', imei1: prvImei2.trim(), returnCost: prvReturnCost, reason: prvReason });
      }

      const res = await fetch('/api/v1/procurement/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: prvSupplierId,
          items: itemsToReturn,
          notes: prvReason
        })
      });

      const json = await res.json();
      if (res.ok) {
        showBanner('success', `PRV ${json.data.prvNo} processed! Supplier payable netted by exactly ৳${json.data.totalRefundAmount}. Stock relieved.`);
        setIsPrvModalOpen(false);
        setPrvImei1('');
        setPrvImei2('');
        fetchSuppliers();
      } else {
        showBanner('error', json.error?.message || 'Failed to process purchase return');
      }
    } catch (err) {
      showBanner('error', 'Network error submitting PRV');
    } finally {
      setPrvSubmitting(false);
    }
  };

  // Add IMEI to Dispatch List
  const handleAddDispatchImei = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = dispatchImeiInput.trim();
    if (!clean) return;
    if (dispatchImeiList.includes(clean)) {
      showBanner('error', `IMEI "${clean}" already added to transfer dispatch queue`);
      return;
    }
    setDispatchImeiList([...dispatchImeiList, clean]);
    setDispatchImeiInput('');
  };

  // Submit Dispatch STN (TX-19)
  const handleSubmitDispatch = async () => {
    if (dispatchImeiList.length === 0) {
      showBanner('error', 'Please scan at least one IMEI to dispatch');
      return;
    }

    setDispatchSubmitting(true);
    try {
      const res = await fetch('/api/v1/inventory/transfers/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationShopId: dispatchDestShopId,
          imeiList: dispatchImeiList,
          notes: dispatchNotes
        })
      });

      const json = await res.json();
      if (res.ok) {
        showBanner('success', `STN ${json.data.stnNo} dispatched! ${json.data.dispatchedCount} handsets marked IN_TRANSIT (0% P&L impact).`);
        setIsDispatchModalOpen(false);
        setDispatchImeiList([]);
        fetchTransfers();
      } else {
        showBanner('error', json.error?.message || 'Failed to dispatch STN');
      }
    } catch (err) {
      showBanner('error', 'Network error dispatching transfer');
    } finally {
      setDispatchSubmitting(false);
    }
  };

  // Scan IMEI for Destination Receiving
  const handleAddReceiveImei = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = receiveScanInput.trim();
    if (!clean) return;
    if (scannedImeisForReceive.includes(clean)) {
      showBanner('error', `IMEI "${clean}" already verified in receiving queue`);
      return;
    }
    setScannedImeisForReceive([...scannedImeisForReceive, clean]);
    setReceiveScanInput('');
  };

  // Submit Receive STN (TC-36 Discrepancy workflow)
  const handleSubmitReceive = async () => {
    if (!selectedStnToReceive) return;

    setReceiveSubmitting(true);
    try {
      const res = await fetch(`/api/v1/inventory/transfers/${selectedStnToReceive.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivedImeis: scannedImeisForReceive
        })
      });

      const json = await res.json();
      if (res.ok) {
        if (json.data.discrepancyCount > 0) {
          showBanner('error', `STN ${json.data.stnNo} received with DISCREPANCY! ${json.data.receivedCount} accepted, ${json.data.discrepancyCount} flagged DISPUTED_IN_TRANSIT. SMS alert sent to Shop Owner!`);
        } else {
          showBanner('success', `STN ${json.data.stnNo} received completely! All ${json.data.receivedCount} handsets now AVAILABLE at destination outlet.`);
        }
        setSelectedStnToReceive(null);
        setScannedImeisForReceive([]);
        fetchTransfers();
      } else {
        showBanner('error', json.error?.message || 'Failed to receive STN');
      }
    } catch (err) {
      showBanner('error', 'Network error processing receipt');
    } finally {
      setReceiveSubmitting(false);
    }
  };

  const totalOutstandingDue = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (parseFloat(s.currentDueBalance) || 0), 0);
  }, [suppliers]);

  const discrepancyTransfers = useMemo(() => {
    return transfers.filter((t) => t.status === 'discrepancy');
  }, [transfers]);

  return (
    <div className="p-3 sm:p-5 max-w-[1720px] w-full mx-auto flex flex-col font-sans">
      {/* Banner Message */}
      {statusBanner && (
        <div
          className={`mb-4 p-4 rounded-xl border flex items-center justify-between shadow-lg transition-all ${
            statusBanner.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-200'
              : 'bg-rose-950/80 border-rose-700/80 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-3">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{statusBanner.message}</span>
          </div>
          <button
            onClick={() => setStatusBanner(null)}
            className="text-xs uppercase font-bold tracking-wider px-2 py-1 rounded bg-black/30 hover:bg-black/50"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header & KPI Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Truck className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Procurement & Stock Transfers Hub
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Phase 6 Active
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Supplier CRM, Exact-Cost Dual-IMEI GRN (TX-07), PRV Netting (TX-08) & Transit STN (TX-19)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            variant="outline"
            onClick={() => setIsAddSupplierOpen(true)}
            className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200"
          >
            <Plus className="w-4 h-4 mr-1.5 text-teal-400" />
            New Supplier
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsGrnModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-950/40"
          >
            <Barcode className="w-4 h-4 mr-1.5" />
            Receive GRN (TX-07)
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsPrvModalOpen(true)}
            className="border-rose-900/60 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300"
          >
            <RotateCcw className="w-4 h-4 mr-1.5 text-rose-400" />
            Return PRV (TX-08)
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsDispatchModalOpen(true)}
            className="border-sky-900/60 bg-sky-950/30 hover:bg-sky-900/40 text-sky-300"
          >
            <ArrowRightLeft className="w-4 h-4 mr-1.5 text-sky-400" />
            Dispatch STN (TX-19)
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Outstanding Payables</span>
            <DollarSign className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-400">
            ৳{totalOutstandingDue.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Aggregated Mohajon Due Liabilities (2.1.01)</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Active Suppliers</span>
            <Building2 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-100">
            {suppliers.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Authorized Handset & Accessory Vendors</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Pending PO Deliveries</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-400">
            {purchaseOrders.filter((p) => p.status === 'partially_received' || p.status === 'ordered').length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Tracked for partial & follow-up GRN (TC-28)</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Transit Disputes</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-500">
            {discrepancyTransfers.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Missing STN handsets flagged DISPUTED (TC-36)</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-800 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'SUPPLIERS'
              ? 'border-teal-500 text-teal-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Suppliers & Payables Ledger</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 ml-1.5">
            {suppliers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ORDERS_GRN')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'ORDERS_GRN'
              ? 'border-teal-500 text-teal-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>Purchase Orders & GRN Intake (TX-07)</span>
        </button>

        <button
          onClick={() => setActiveTab('RETURNS_PRV')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'RETURNS_PRV'
              ? 'border-teal-500 text-teal-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Purchase Returns PRV (TX-08)</span>
        </button>

        <button
          onClick={() => setActiveTab('TRANSFERS_STN')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'TRANSFERS_STN'
              ? 'border-teal-500 text-teal-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Godown ↔ Outlet Transfers (STN)</span>
        </button>

        <button
          onClick={() => setActiveTab('DISCREPANCIES')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'DISCREPANCIES'
              ? 'border-rose-500 text-rose-400 bg-rose-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Transit Discrepancies Desk (TC-36)</span>
          {discrepancyTransfers.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold ml-1.5">
              {discrepancyTransfers.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: SUPPLIERS & PAYABLES LEDGER */}
      {activeTab === 'SUPPLIERS' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchSuppliers()}
                placeholder="Search supplier by company name, phone, or contact..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <Button variant="secondary" onClick={fetchSuppliers} className="bg-slate-800 hover:bg-slate-700 text-slate-200">
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
          </div>

          {/* Supplier Directory Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Supplier Company</th>
                    <th className="py-3.5 px-4">Phone / Contact</th>
                    <th className="py-3.5 px-4">Address</th>
                    <th className="py-3.5 px-4 text-right">Current Payable Due</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingSuppliers ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Loading suppliers...
                      </td>
                    </tr>
                  ) : suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12">
                        <EmptyState
                          title="No Suppliers Found"
                          description="Add your first handset or accessory supplier to start recording procurement and payables."
                        />
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-white">
                          <div className="flex items-center space-x-2">
                            <Building2 className="w-4 h-4 text-teal-400 shrink-0" />
                            <span>{s.companyName}</span>
                          </div>
                          {s.contactPerson && (
                            <span className="text-xs text-slate-400 block pl-6">Attn: {s.contactPerson}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <div className="flex items-center space-x-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>{s.phone}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 max-w-[200px] truncate">
                          {s.address || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold">
                          <span className={parseFloat(s.currentDueBalance) > 0 ? 'text-rose-400' : 'text-slate-300'}>
                            ৳{parseFloat(s.currentDueBalance).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              s.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenStatement(s)}
                            className="border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-xs text-slate-200"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1 text-teal-400" />
                            360° Statement
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedSupplierForPayment(s);
                              setPaymentAmount(s.currentDueBalance);
                            }}
                            className="bg-teal-600 hover:bg-teal-500 text-xs text-white"
                          >
                            <DollarSign className="w-3.5 h-3.5 mr-1" />
                            Pay Out
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE ORDERS & GRN INTAKE (TX-07) */}
      {activeTab === 'ORDERS_GRN' && (
        <div className="space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Purchase Orders & Partial GRN Tracking (TC-28)</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Each mobile handset preserves its exact landed purchase cost without averaging (TX-07 double-entry).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsNewPoOpen(true)}
                className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                <Plus className="w-4 h-4 mr-1.5 text-teal-400" />
                Issue New PO
              </Button>
              <Button
                variant="primary"
                onClick={() => setIsGrnModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Barcode className="w-4 h-4 mr-1.5" />
                Scan-to-Receive GRN
              </Button>
            </div>
          </div>

          {/* PO Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">PO Reference</th>
                    <th className="py-3.5 px-4">Supplier</th>
                    <th className="py-3.5 px-4 text-center">Ordered vs Received</th>
                    <th className="py-3.5 px-4 text-center">Pending Balance</th>
                    <th className="py-3.5 px-4 text-right">Estimated Value</th>
                    <th className="py-3.5 px-4 text-center">Fulfillment Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12">
                        <EmptyState
                          title="No Purchase Orders"
                          description="Create a purchase order or directly ingest a Goods Received Note."
                        />
                      </td>
                    </tr>
                  ) : (
                    purchaseOrders.map((po) => {
                      const totalOrdered = po.items.reduce((s, i) => s + i.orderedQuantity, 0);
                      const totalReceived = po.items.reduce((s, i) => s + (i.receivedQuantity || 0), 0);
                      const pending = totalOrdered - totalReceived;

                      return (
                        <tr key={po.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-teal-400">
                            {po.poNo}
                          </td>
                          <td className="py-3.5 px-4 text-slate-200">
                            {po.supplier?.companyName || 'Supplier'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono">
                            <span className="text-emerald-400 font-bold">{totalReceived}</span>
                            <span className="text-slate-500"> / </span>
                            <span className="text-slate-200">{totalOrdered} units</span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono">
                            {pending > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                                {pending} units pending
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                Fully Received
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-100">
                            ৳{parseFloat(po.totalEstimatedAmount).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                po.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : po.status === 'partially_received'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              }`}
                            >
                              {po.status === 'partially_received' ? 'Partially Fulfilled' : po.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {pending > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setGrnPoId(po.id);
                                  setGrnSupplierId(po.supplier?._id || '');
                                  setIsGrnModalOpen(true);
                                }}
                                className="border-teal-700 bg-teal-950/40 text-teal-300 text-xs hover:bg-teal-900/50"
                              >
                                Receive Follow-up GRN
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PURCHASE RETURN VOUCHERS (PRV - TX-08) */}
      {activeTab === 'RETURNS_PRV' && (
        <div className="space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Purchase Return Vouchers (PRV / TX-08)</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Return defective, damaged, or DOA handsets to vendor. Supplier payable liability nets by exact return cost (TC-19).
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsPrvModalOpen(true)}
              className="border-rose-900/60 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300"
            >
              <RotateCcw className="w-4 h-4 mr-1.5 text-rose-400" />
              Create Return Voucher
            </Button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 text-center">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-base font-medium text-white">TC-19 Purchase Return Netting Compliance</h3>
              <p className="text-xs text-slate-400">
                When returning defective handsets (e.g. 2 phones @ ৳30,000), Accounts Payable (2.1.01) is debited and Handset Inventory (1.5.01) is credited atomically. Zero negative inventory permitted.
              </p>
              <Button
                variant="primary"
                onClick={() => setIsPrvModalOpen(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white mt-2"
              >
                Launch PRV Return Wizard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GODOWN TO OUTLET STOCK TRANSFERS (STN - TX-19) */}
      {activeTab === 'TRANSFERS_STN' && (
        <div className="space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Stock Transfer Notes (STN - TX-19)</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Transfers between warehouse godown and showroom counter have <strong>strict 0.00% P&L impact</strong>.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setIsDispatchModalOpen(true)}
              className="bg-sky-600 hover:bg-sky-500 text-white"
            >
              <ArrowRightLeft className="w-4 h-4 mr-1.5" />
              Dispatch New STN
            </Button>
          </div>

          {/* Transfers Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">STN Reference</th>
                    <th className="py-3.5 px-4">From Godown</th>
                    <th className="py-3.5 px-4">To Destination</th>
                    <th className="py-3.5 px-4 text-center">Quantity</th>
                    <th className="py-3.5 px-4 text-center">Transfer Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12">
                        <EmptyState
                          title="No Stock Transfers"
                          description="Dispatch handsets between godowns and showroom outlets."
                        />
                      </td>
                    </tr>
                  ) : (
                    transfers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-sky-400">
                          {t.stnNo}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {t.fromShop?.name || 'Central Godown'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {t.toShop?.name || 'Showroom Outlet'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                          {t.itemsCount || t.items.length} units
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                              t.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : t.status === 'discrepancy'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            }`}
                          >
                            {t.status === 'in_transit' ? 'In Transit' : t.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {t.status === 'in_transit' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedStnToReceive(t);
                                setScannedImeisForReceive([]);
                              }}
                              className="border-emerald-700 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs"
                            >
                              Scan-to-Receive
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TRANSIT DISCREPANCIES DESK (TC-36) */}
      {activeTab === 'DISCREPANCIES' && (
        <div className="space-y-4">
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
              <div>
                <h2 className="text-base font-semibold text-rose-200">TC-36 Transit Discrepancies & Dispute Center</h2>
                <p className="text-xs text-rose-300/80">
                  When 20 units are dispatched and only 19 arrive, missing units are flagged DISPUTED_IN_TRANSIT with instant Owner SMS alerts.
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-rose-900/60 text-rose-300 font-bold border border-rose-700">
              {discrepancyTransfers.length} Active Disputes
            </span>
          </div>

          {discrepancyTransfers.length === 0 ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-base font-medium text-white">Zero Transit Discrepancies</h3>
              <p className="text-xs text-slate-400 mt-1">All dispatched godown shipments have matched physical showroom receipts 100%.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {discrepancyTransfers.map((stn) => (
                <div key={stn.id} className="bg-slate-900/90 border border-rose-900/60 rounded-xl p-4 shadow-md">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-sky-400">{stn.stnNo}</span>
                        <span className="text-xs px-2 py-0.5 rounded font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          DISPUTED IN TRANSIT
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Route: {stn.fromShop?.name || 'Central Godown'} ──► {stn.toShop?.name || 'Eastern Plaza Outlet'}
                      </p>
                    </div>
                    {stn.smsNotificationSent && (
                      <span className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-full">
                        <Check className="w-3.5 h-3.5" />
                        <span>Owner SMS Alert Dispatched</span>
                      </span>
                    )}
                  </div>

                  {/* Discrepancy Items */}
                  <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800">
                    <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                      Missing Handsets Flagged Under Investigation
                    </div>
                    <div className="space-y-2">
                      {stn.discrepancies?.map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-slate-900 p-2 rounded border border-slate-800">
                          <div className="flex items-center space-x-2">
                            <Smartphone className="w-4 h-4 text-rose-400" />
                            <span className="font-mono font-bold text-slate-200">IMEI: {d.imei1}</span>
                          </div>
                          <span className="text-rose-400 italic">{d.reason || 'Missing in physical verification'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Add Supplier Modal */}
      <Modal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        title="Add New Supplier"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Company / Business Name *</label>
            <input
              type="text"
              required
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
              placeholder="e.g. Smart Technologies BD Ltd"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={newSupplierPhone}
                onChange={(e) => setNewSupplierPhone(e.target.value)}
                placeholder="01799887766"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Contact Person</label>
              <input
                type="text"
                value={newSupplierContact}
                onChange={(e) => setNewSupplierContact(e.target.value)}
                placeholder="Kamal Hossain"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Office / Warehouse Address</label>
            <input
              type="text"
              value={newSupplierAddress}
              onChange={(e) => setNewSupplierAddress(e.target.value)}
              placeholder="BCS Computer City, IDB Bhaban, Agargaon, Dhaka"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Opening Payable Balance (৳)</label>
            <input
              type="number"
              step="0.01"
              value={newSupplierOpeningPayable}
              onChange={(e) => setNewSupplierOpeningPayable(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsAddSupplierOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={supplierSubmitLoading} className="bg-teal-600 hover:bg-teal-500 text-white">
              {supplierSubmitLoading ? 'Saving...' : 'Create Supplier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Record Supplier Payment Modal */}
      <Modal
        isOpen={!!selectedSupplierForPayment}
        onClose={() => setSelectedSupplierForPayment(null)}
        title={`Record Payout — ${selectedSupplierForPayment?.companyName}`}
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Current Outstanding Due:</span>
              <span className="font-mono font-bold text-rose-400">
                ৳{selectedSupplierForPayment ? parseFloat(selectedSupplierForPayment.currentDueBalance).toLocaleString('en-BD', { minimumFractionDigits: 2 }) : '0.00'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Payment Amount (৳) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Disbursement Channel</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
              >
                <option value="bank_transfer">Bank Transfer (1.2.01)</option>
                <option value="cash">Cash Drawer (1.1.01)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Reference No / Cheque</label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="EFTN-8912401"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Settlement of October handset procurement"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="p-3 bg-teal-950/20 border border-teal-800/40 rounded-lg text-xs text-teal-300">
            <strong>Accounting Invariant (TX-08):</strong> Debit: <code>2.1.01 Accounts Payable</code> ──► Credit: <code>{paymentMethod === 'cash' ? '1.1.01 Cash' : '1.2.01 Bank'}</code>.
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setSelectedSupplierForPayment(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={paymentSubmitLoading} className="bg-teal-600 hover:bg-teal-500 text-white">
              {paymentSubmitLoading ? 'Posting Journal...' : 'Confirm Payout'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. 360-Degree Statement Modal */}
      <Modal
        isOpen={!!selectedSupplierForStatement}
        onClose={() => setSelectedSupplierForStatement(null)}
        title={`360° Supplier Statement — ${selectedSupplierForStatement?.companyName}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {isStatementLoading ? (
            <div className="py-12 text-center text-slate-400">Loading ledger statement...</div>
          ) : !statementData ? (
            <div className="py-8 text-center text-slate-500">No statement data found.</div>
          ) : (
            <>
              {/* Summary Bar */}
              <div className="grid grid-cols-4 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Total Purchases:</span>
                  <span className="font-mono font-bold text-slate-200">৳{statementData.summary.totalPurchases}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Payouts:</span>
                  <span className="font-mono font-bold text-teal-400">৳{statementData.summary.totalPayments}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Returns (PRV):</span>
                  <span className="font-mono font-bold text-amber-400">৳{statementData.summary.totalReturns}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Outstanding Due:</span>
                  <span className="font-mono font-bold text-rose-400">৳{statementData.summary.netOutstandingDue}</span>
                </div>
              </div>

              {/* Transactions Timeline */}
              <div className="max-h-[400px] overflow-y-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Type & Ref</th>
                      <th className="p-2.5 text-right">Debit (Paid/Return)</th>
                      <th className="p-2.5 text-right">Credit (Purchased)</th>
                      <th className="p-2.5 text-right">Running Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {statementData.transactions.map((tx: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-2.5 text-slate-400 whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="p-2.5">
                          <span className="font-mono text-teal-400 font-semibold">{tx.referenceNo}</span>
                          <span className="block text-[11px] text-slate-400 truncate max-w-[200px]">{tx.description}</span>
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-400">
                          {parseFloat(tx.debit) > 0 ? `৳${tx.debit}` : '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono text-rose-400">
                          {parseFloat(tx.credit) > 0 ? `৳${tx.credit}` : '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-200">
                          ৳{tx.runningBalance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <Button variant="outline" onClick={() => setSelectedSupplierForStatement(null)}>
              Close Statement
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4. GRN Intake Modal (TX-07) */}
      <Modal
        isOpen={isGrnModalOpen}
        onClose={() => setIsGrnModalOpen(false)}
        title="Goods Received Note (GRN / TX-07 Intake)"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Supplier *</label>
              <select
                value={grnSupplierId}
                onChange={(e) => setGrnSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName} ({s.phone})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Purchase Order (Optional)</label>
              <select
                value={grnPoId}
                onChange={(e) => setGrnPoId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">Standalone Intake (No PO)</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.poNo} — {po.status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Frozen Landed Cost per Unit (৳) *</label>
              <input
                type="number"
                step="0.01"
                value={grnUnitCost}
                onChange={(e) => setGrnUnitCost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-teal-500"
              />
              <span className="text-[11px] text-teal-400 block mt-1">Exact landed cost locked per IMEI without averaging.</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Immediate Cash Paid on Intake (৳)</label>
              <input
                type="number"
                step="0.01"
                value={grnPaidAmount}
                onChange={(e) => setGrnPaidAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Barcode / IMEI Scanner Input */}
          <div className="border border-slate-800 bg-slate-950 p-3 rounded-xl space-y-2">
            <label className="block text-xs font-semibold uppercase text-teal-400 tracking-wider">
              Scan Handset IMEIs (15 Digits / Luhn Algorithm Validated)
            </label>
            <form onSubmit={handleAddGrnImei} className="flex gap-2">
              <input
                type="text"
                value={grnImeiInput}
                onChange={(e) => setGrnImeiInput(e.target.value)}
                placeholder="Scan or type 15-digit IMEI (e.g. 860123456789012)..."
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-teal-500"
              />
              <Button variant="secondary" type="submit" className="bg-teal-600 hover:bg-teal-500 text-white shrink-0">
                <Plus className="w-4 h-4 mr-1" />
                Add IMEI
              </Button>
            </form>

            {/* Ingested Queue */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>Scanned Queue: {grnImeiList.length} Units</span>
                <span>Total Invoice: ৳{(grnImeiList.length * (parseFloat(grnUnitCost) || 0)).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="max-h-[140px] overflow-y-auto space-y-1">
                {grnImeiList.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-900 p-2 rounded text-xs font-mono border border-slate-800">
                    <span className="text-slate-200">#{index + 1} — {item.imei1 || (item as any).imei1}</span>
                    <button
                      type="button"
                      onClick={() => setGrnImeiList(grnImeiList.filter((_, i) => i !== index))}
                      className="text-rose-400 hover:text-rose-300 font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <Button variant="outline" onClick={() => setIsGrnModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={grnSubmitting || grnImeiList.length === 0}
              onClick={handleSubmitGrn}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              {grnSubmitting ? 'Ingesting...' : `Post GRN (${grnImeiList.length} Units)`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 5. PRV Return Modal (TX-08 / TC-19) */}
      <Modal
        isOpen={isPrvModalOpen}
        onClose={() => setIsPrvModalOpen(false)}
        title="Purchase Return Voucher (PRV / TX-08)"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Supplier *</label>
            <select
              value={prvSupplierId}
              onChange={(e) => setPrvSupplierId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
            >
              <option value="">Select Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.companyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Handset 1 IMEI *</label>
            <input
              type="text"
              value={prvImei1}
              onChange={(e) => setPrvImei1(e.target.value)}
              placeholder="e.g. 860123456789011"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Handset 2 IMEI (TC-19: 2 Units)</label>
            <input
              type="text"
              value={prvImei2}
              onChange={(e) => setPrvImei2(e.target.value)}
              placeholder="e.g. 860123456789012"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Unit Return Cost (৳) *</label>
              <input
                type="number"
                step="0.01"
                value={prvReturnCost}
                onChange={(e) => setPrvReturnCost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Total Netting</label>
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-rose-400 font-mono font-bold">
                ৳{(parseFloat(prvReturnCost || '0') * (prvImei2 ? 2 : 1)).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Defect Reason</label>
            <input
              type="text"
              value={prvReason}
              onChange={(e) => setPrvReason(e.target.value)}
              placeholder="Dead on arrival - camera sensor malfunction"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="p-3 bg-rose-950/20 border border-rose-800/40 rounded-lg text-xs text-rose-300">
            <strong>TC-19 Accounting Effect:</strong> Debits <code>2.1.01 Accounts Payable</code> and credits <code>1.5.01 Handset Inventory</code>. IMEIs transition to <code>RETURNED_TO_SUPPLIER</code>.
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <Button variant="outline" onClick={() => setIsPrvModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={prvSubmitting}
              onClick={handleSubmitPrv}
              className="bg-rose-600 hover:bg-rose-500 text-white"
            >
              {prvSubmitting ? 'Posting PRV...' : 'Confirm Return (PRV)'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 6. Dispatch STN Modal (TX-19) */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title="Dispatch Stock Transfer Note (STN - TX-19)"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Destination Showroom Outlet *</label>
            <input
              type="text"
              value={dispatchDestShopId}
              onChange={(e) => setDispatchDestShopId(e.target.value)}
              placeholder="Destination Shop ObjectId"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="border border-slate-800 bg-slate-950 p-3 rounded-xl space-y-2">
            <label className="block text-xs font-semibold uppercase text-sky-400 tracking-wider">
              Scan Handset IMEIs to Dispatch
            </label>
            <form onSubmit={handleAddDispatchImei} className="flex gap-2">
              <input
                type="text"
                value={dispatchImeiInput}
                onChange={(e) => setDispatchImeiInput(e.target.value)}
                placeholder="Scan IMEI (e.g. 860123456789012)..."
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <Button variant="secondary" type="submit" className="bg-sky-600 hover:bg-sky-500 text-white shrink-0">
                Add
              </Button>
            </form>

            <div className="text-xs text-slate-400 mt-2">
              Queue: {dispatchImeiList.length} Handsets
            </div>
            <div className="max-h-[120px] overflow-y-auto space-y-1">
              {dispatchImeiList.map((imei, idx) => (
                <div key={idx} className="flex justify-between bg-slate-900 p-1.5 rounded text-xs font-mono border border-slate-800">
                  <span className="text-slate-300">#{idx + 1} — {imei}</span>
                  <button
                    type="button"
                    onClick={() => setDispatchImeiList(dispatchImeiList.filter((_, i) => i !== idx))}
                    className="text-rose-400 font-bold"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-sky-950/20 border border-sky-800/40 rounded-lg text-xs text-sky-300">
            Dispatched handsets atomically transition to <code>IN_TRANSIT</code> and are blocked from POS checkout. <strong>0.00% P&L impact.</strong>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <Button variant="outline" onClick={() => setIsDispatchModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={dispatchSubmitting || dispatchImeiList.length === 0}
              onClick={handleSubmitDispatch}
              className="bg-sky-600 hover:bg-sky-500 text-white"
            >
              {dispatchSubmitting ? 'Dispatching...' : `Dispatch STN (${dispatchImeiList.length} Units)`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 7. Destination Scan-to-Receive Modal (TC-36) */}
      <Modal
        isOpen={!!selectedStnToReceive}
        onClose={() => setSelectedStnToReceive(null)}
        title={`Scan-to-Receive ${selectedStnToReceive?.stnNo}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs flex justify-between">
            <span className="text-slate-400">Expected Dispatched Units:</span>
            <span className="font-mono font-bold text-sky-400">{selectedStnToReceive?.itemsCount || selectedStnToReceive?.items.length} Units</span>
          </div>

          <div className="border border-slate-800 bg-slate-950 p-3 rounded-xl space-y-2">
            <label className="block text-xs font-semibold uppercase text-emerald-400 tracking-wider">
              Scan Verified Physical Units (TC-36)
            </label>
            <form onSubmit={handleAddReceiveImei} className="flex gap-2">
              <input
                type="text"
                value={receiveScanInput}
                onChange={(e) => setReceiveScanInput(e.target.value)}
                placeholder="Scan received IMEI..."
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <Button variant="secondary" type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0">
                Verify
              </Button>
            </form>

            <div className="text-xs text-slate-400 mt-2">
              Verified at Destination: {scannedImeisForReceive.length} Units
            </div>
          </div>

          <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg text-xs text-amber-300">
            <strong>Discrepancy Rule:</strong> Any unverified units will be automatically flagged <code>DISPUTED_IN_TRANSIT</code> and trigger an SMS alert to the Shop Owner.
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <Button variant="outline" onClick={() => setSelectedStnToReceive(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={receiveSubmitting}
              onClick={handleSubmitReceive}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {receiveSubmitting ? 'Verifying...' : `Complete Receipt (${scannedImeisForReceive.length} Verified)`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
