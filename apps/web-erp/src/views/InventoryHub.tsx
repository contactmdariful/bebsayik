import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Package,
  Search,
  Plus,
  Trash2,
  FileSpreadsheet,
  Download,
  Upload,
  AlertTriangle,
  History,
  ShieldCheck,
  Tag,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Smartphone,
  Layers,
  Camera,
  BookOpen,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Printer,
  ChevronRight,
  SlidersHorizontal,
  ExternalLink,
  Info
} from 'lucide-react';
import { Modal } from '../components/Modal.js';
import { Button } from '../components/Button.js';
import { MoneyText } from '../components/MoneyText.js';
import { ManagerPinOverrideModal } from '../components/retail/ManagerPinOverrideModal.js';

// Types
export interface HandsetRow {
  _id: string;
  imei1: string;
  imei2?: string;
  status: 'AVAILABLE' | 'HELD_CART' | 'SOLD' | 'RETURNED_INSPECTION' | 'RETURNED_TO_SUPPLIER' | 'SCRAPPED' | 'IN_TRANSIT';
  specificCost: number | string;
  purchaseCost?: number | string;
  purchaseDate: string;
  daysInStock?: number;
  stockLocation?: string;
  product?: {
    _id: string;
    name: string;
    brand?: { name: string };
    category?: { name: string };
  };
  variant?: {
    _id: string;
    variantName?: string;
    sku?: string;
    retailPrice?: number | string;
  };
}

export interface ProductRow {
  _id: string;
  name: string;
  slug: string;
  category: { _id: string; name: string };
  brand: { _id: string; name: string };
  hasImei: boolean;
  warrantyMonths: number;
  variants: {
    _id: string;
    variantName?: string;
    sku: string;
    barcode?: string;
    purchasePrice: number | string;
    retailPrice: number | string;
    alertQuantity: number;
    currentStock?: number;
  }[];
}

export interface CategoryRow {
  _id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface BrandRow {
  _id: string;
  name: string;
  slug: string;
  originCountry?: string;
}

export interface ScrapRow {
  _id: string;
  imei1: string;
  modelName: string;
  specificCost: number | string;
  damageCategory: string;
  reason: string;
  photoUrl?: string;
  journalVoucherNo?: string;
  transactionReference: string;
  scrappedAt: string;
  scrappedByName?: string;
}

export function InventoryHub() {
  const [subTab, setSubTab] = useState<'HANDSETS' | 'CATALOG' | 'IMPORT' | 'ACCESSORIES' | 'SCRAP_HUB'>('HANDSETS');
  
  // Shared state
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // ----------------------------------------------------
  // SUB-TAB 1: DUAL-IMEI SERIALIZED HANDSETS
  // ----------------------------------------------------
  const [handsets, setHandsets] = useState<HandsetRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [agingFilter, setAgingFilter] = useState<'ALL' | '60' | '90'>('ALL');
  const [isRegisterHandsetOpen, setIsRegisterHandsetOpen] = useState(false);

  // Form: Register Handset
  const [regProductId, setRegProductId] = useState('');
  const [regVariantId, setRegVariantId] = useState('');
  const [regImei1, setRegImei1] = useState('');
  const [regImei2, setRegImei2] = useState('');
  const [regSpecificCost, setRegSpecificCost] = useState('18000');
  const [regPurchaseDate, setRegPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [regLocation, setRegLocation] = useState('MAIN_STORE');
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Timeline Modal
  const [timelineImei, setTimelineImei] = useState<string | null>(null);
  const [timelineLogs, setTimelineLogs] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Fast Scanner Lookup
  const [scanInput, setScanInput] = useState('');
  const [scannedItem, setScannedItem] = useState<any | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResultError, setScanResultError] = useState<string | null>(null);

  // ----------------------------------------------------
  // SUB-TAB 2: PRODUCT CATALOG & TAXONOMY
  // ----------------------------------------------------
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddTaxonomyOpen, setIsAddTaxonomyOpen] = useState(false);
  const [taxonomyType, setTaxonomyType] = useState<'CATEGORY' | 'BRAND'>('CATEGORY');
  const [taxonomyName, setTaxonomyName] = useState('');
  const [taxonomyExtra, setTaxonomyExtra] = useState('');

  // Form: Add Product
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodHasImei, setProdHasImei] = useState(true);
  const [prodWarranty, setProdWarranty] = useState('12');
  const [prodVariantName, setProdVariantName] = useState('Standard (8/128GB)');
  const [prodSku, setProdSku] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodCost, setProdCost] = useState('20000');
  const [prodRetail, setProdRetail] = useState('23500');
  const [prodAlertQty, setProdAlertQty] = useState('2');

  // ----------------------------------------------------
  // SUB-TAB 3: BULK EXCEL/CSV IMPORT
  // ----------------------------------------------------
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    totalProcessed: number;
    imported: number;
    failed: number;
    skipped: number;
    errors: { row: number; error: string; data?: any }[];
  } | null>(null);

  // ----------------------------------------------------
  // SUB-TAB 4: ACCESSORIES & NON-SERIALIZED LEDGER
  // ----------------------------------------------------
  const [accessoryStockList, setAccessoryStockList] = useState<any[]>([]);
  const [accessoryMovements, setAccessoryMovements] = useState<any[]>([]);
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [adjVariantId, setAdjVariantId] = useState('');
  const [adjType, setAdjType] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [adjQuantity, setAdjQuantity] = useState('10');
  const [adjReason, setAdjReason] = useState('Stock count discrepancy audit');
  const [adjManagerPin, setAdjManagerPin] = useState('');

  // ----------------------------------------------------
  // SUB-TAB 5: DAMAGED STOCK SCRAP HUB
  // ----------------------------------------------------
  const [scrapScanQuery, setScrapScanQuery] = useState('');
  const [scrapTargetHandset, setScrapTargetHandset] = useState<HandsetRow | null>(null);
  const [scrapTargetLoading, setScrapTargetLoading] = useState(false);
  const [scrapDamageCategory, setScrapDamageCategory] = useState('SHATTERED_SCREEN');
  const [scrapReasonNotes, setScrapReasonNotes] = useState('Display cracked & liquid leakage during handling');
  const [scrapPhotoUrl, setScrapPhotoUrl] = useState('');
  const [scrapUploadingPhoto, setScrapUploadingPhoto] = useState(false);
  const [scrapHistory, setScrapHistory] = useState<ScrapRow[]>([]);
  const [isScrapPinModalOpen, setIsScrapPinModalOpen] = useState(false);
  const [scrapSubmitting, setScrapSubmitting] = useState(false);
  const [lastScrapCertificate, setLastScrapCertificate] = useState<any | null>(null);

  // Auto-clear banners
  useEffect(() => {
    if (successBanner) {
      const t = setTimeout(() => setSuccessBanner(null), 5000);
      return () => clearTimeout(t);
    }
  }, [successBanner]);

  // Load initial data
  useEffect(() => {
    fetchHandsets();
    fetchCatalog();
    fetchTaxonomies();
    fetchAccessoryStock();
    fetchScrapHistory();
  }, []);

  // Fetch Handsets
  const fetchHandsets = async (aging = agingFilter) => {
    try {
      setLoading(true);
      let url = '/api/v1/inventory/imei';
      if (aging !== 'ALL') {
        url = `/api/v1/inventory/imei/aging?minDays=${aging}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setHandsets(data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch handsets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Catalog
  const fetchCatalog = async () => {
    try {
      const res = await fetch('/api/v1/catalog/products?limit=100');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.products || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch catalog:', err);
    }
  };

  // Fetch Categories & Brands
  const fetchTaxonomies = async () => {
    try {
      const catRes = await fetch('/api/v1/catalog/categories');
      const brandRes = await fetch('/api/v1/catalog/brands');
      const catData = await catRes.json();
      const brandData = await brandRes.json();
      if (catData.success) setCategories(catData.data || []);
      if (brandData.success) setBrands(brandData.data || []);
    } catch (err) {
      console.error('Failed to fetch taxonomies:', err);
    }
  };

  // Fetch Accessories
  const fetchAccessoryStock = async () => {
    try {
      const res = await fetch('/api/v1/inventory/stock-levels');
      const data = await res.json();
      if (data.success) {
        setAccessoryStockList(data.data || []);
      }
      const movRes = await fetch('/api/v1/inventory/movements?limit=25');
      const movData = await movRes.json();
      if (movData.success) {
        setAccessoryMovements(movData.data.movements || []);
      }
    } catch (err) {
      console.error('Failed to fetch accessory stock:', err);
    }
  };

  // Fetch Scrap History
  const fetchScrapHistory = async () => {
    try {
      const res = await fetch('/api/v1/inventory/damage');
      const data = await res.json();
      if (data.success) {
        setScrapHistory(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch scrap history:', err);
    }
  };

  // ----------------------------------------------------
  // Scanner Logic
  // ----------------------------------------------------
  const handleUniversalScan = async (codeToScan: string) => {
    if (!codeToScan.trim()) return;
    setScanLoading(true);
    setScanResultError(null);
    setScannedItem(null);
    try {
      const res = await fetch(`/api/v1/inventory/imei/scan/${encodeURIComponent(codeToScan.trim())}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setScannedItem(data.data);
      } else {
        setScanResultError(data.error?.message || 'Barcode or IMEI not found in authorized stock.');
      }
    } catch (err: any) {
      setScanResultError(err.message || 'Scanner lookup failed.');
    } finally {
      setScanLoading(false);
    }
  };

  // ----------------------------------------------------
  // Handset Registration
  // ----------------------------------------------------
  const handleRegisterHandset = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSubmitting(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/v1/inventory/imei', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: regProductId,
          variantId: regVariantId,
          imei1: regImei1.trim(),
          imei2: regImei2.trim() || undefined,
          purchaseCost: Number(regSpecificCost),
          purchaseDate: regPurchaseDate,
          stockLocation: regLocation
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessBanner(`Handset IMEI ${regImei1} registered successfully with exact cost ৳${Number(regSpecificCost).toLocaleString()}!`);
        setIsRegisterHandsetOpen(false);
        setRegImei1('');
        setRegImei2('');
        fetchHandsets();
      } else {
        setErrorBanner(data.error?.message || 'Failed to register handset');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Network error while registering handset');
    } finally {
      setRegSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Handset Status Update (Lifecycle Machine)
  // ----------------------------------------------------
  const handleStatusChange = async (handsetId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/v1/inventory/imei/${handsetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          notes: `Lifecycle updated via Inventory Hub by store staff`
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessBanner(`Status transition to ${nextStatus} recorded with audit log.`);
        fetchHandsets();
      } else {
        setErrorBanner(data.error?.message || 'Invalid state transition');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Status update failed');
    }
  };

  // ----------------------------------------------------
  // Handset Audit Timeline
  // ----------------------------------------------------
  const handleOpenTimeline = async (imei: string) => {
    setTimelineImei(imei);
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/v1/inventory/imei/${imei}/timeline`);
      const data = await res.json();
      if (data.success) {
        setTimelineLogs(data.data.timeline || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimelineLoading(false);
    }
  };

  // ----------------------------------------------------
  // Add Product & Taxonomy
  // ----------------------------------------------------
  const handleCreateTaxonomy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = taxonomyType === 'CATEGORY' ? '/api/v1/catalog/categories' : '/api/v1/catalog/brands';
      const body = taxonomyType === 'CATEGORY' 
        ? { name: taxonomyName, description: taxonomyExtra }
        : { name: taxonomyName, originCountry: taxonomyExtra };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessBanner(`${taxonomyType} "${taxonomyName}" created.`);
        setIsAddTaxonomyOpen(false);
        setTaxonomyName('');
        setTaxonomyExtra('');
        fetchTaxonomies();
      } else {
        setErrorBanner(data.error?.message || 'Failed to create taxonomy');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Network error');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/catalog/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prodName,
          categoryId: prodCategory,
          brandId: prodBrand,
          hasImei: prodHasImei,
          warrantyMonths: Number(prodWarranty),
          variants: [
            {
              variantName: prodVariantName,
              sku: prodSku || `SKU-${Date.now().toString().slice(-6)}`,
              barcode: prodBarcode || undefined,
              purchasePrice: Number(prodCost),
              retailPrice: Number(prodRetail),
              alertQuantity: Number(prodAlertQty)
            }
          ]
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessBanner(`Product "${prodName}" created with variant!`);
        setIsAddProductOpen(false);
        setProdName('');
        fetchCatalog();
      } else {
        setErrorBanner(data.error?.message || 'Failed to create product');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Network error');
    }
  };

  // ----------------------------------------------------
  // Bulk Import
  // ----------------------------------------------------
  const handleDownloadTemplate = () => {
    window.location.href = '/api/v1/catalog/import-template';
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      // parse preview rows
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1, 11).map((line, idx) => {
          const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          const rowObj: any = { _rowNum: idx + 2 };
          headers.forEach((h, hIdx) => {
            rowObj[h] = cells[hIdx] || '';
          });
          return rowObj;
        });
        setCsvPreviewRows(rows);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!csvContent) {
      setErrorBanner('Please select a valid CSV file first.');
      return;
    }
    setImportLoading(true);
    setImportSummary(null);
    try {
      const res = await fetch('/api/v1/catalog/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          filename: csvFile?.name || 'import.csv'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setImportSummary(data.data);
        setSuccessBanner(`Bulk import finished! ${data.data.imported} products imported successfully.`);
        fetchCatalog();
      } else {
        setErrorBanner(data.error?.message || 'Import failed');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Import error');
    } finally {
      setImportLoading(false);
    }
  };

  // ----------------------------------------------------
  // Accessory Adjustment
  // ----------------------------------------------------
  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: adjVariantId,
          type: adjType,
          quantity: Number(adjQuantity),
          reason: adjReason,
          managerPin: adjManagerPin || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessBanner(`Stock adjusted (${adjType} ${adjQuantity}). New stock: ${data.data.newQuantity}`);
        setIsAdjustStockOpen(false);
        setAdjManagerPin('');
        fetchAccessoryStock();
      } else {
        setErrorBanner(data.error?.message || 'Stock adjustment rejected');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Stock adjustment failed');
    }
  };

  // ----------------------------------------------------
  // Scrap Hub Workflow
  // ----------------------------------------------------
  const handleScrapHandsetSearch = async () => {
    if (!scrapScanQuery.trim()) return;
    setScrapTargetLoading(true);
    setErrorBanner(null);
    setScrapTargetHandset(null);
    try {
      const res = await fetch(`/api/v1/inventory/imei/scan/${encodeURIComponent(scrapScanQuery.trim())}`);
      const data = await res.json();
      if (res.ok && data.success && data.data.type === 'SERIALIZED_HANDSET') {
        const item = data.data.item;
        setScrapTargetHandset({
          _id: item._id,
          imei1: item.imei1,
          imei2: item.imei2,
          status: item.status,
          specificCost: item.specificCost || item.purchaseCost,
          purchaseDate: item.purchaseDate,
          product: item.product,
          variant: item.variant
        });
      } else {
        setErrorBanner('No active serialized handset found matching that IMEI.');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Lookup error');
    } finally {
      setScrapTargetLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScrapUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        const res = await fetch('/api/v1/inventory/evidence/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: base64Data,
            filename: file.name
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setScrapPhotoUrl(data.data.url);
          setSuccessBanner('Evidence photo uploaded successfully.');
        } else {
          setErrorBanner(data.error?.message || 'Failed to upload photo');
        }
        setScrapUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorBanner(err.message || 'Photo upload failed');
      setScrapUploadingPhoto(false);
    }
  };

  const handleExecuteScrap = async (overrideToken?: string, managerPin?: string) => {
    if (!scrapTargetHandset) return;
    setScrapSubmitting(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/v1/inventory/damage/scrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handsetId: scrapTargetHandset._id,
          damageCategory: scrapDamageCategory,
          reason: scrapReasonNotes,
          photoUrl: scrapPhotoUrl || 'https://assets.bebsayik.com/damage-evidence/default-evidence.jpg',
          managerOverrideToken: overrideToken,
          managerPin: managerPin || '1234'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLastScrapCertificate(data.data);
        setSuccessBanner(`Damaged stock write-off executed! TX-17 Journal Voucher ${data.data.journalVoucherNo} posted atomically.`);
        setScrapTargetHandset(null);
        setScrapPhotoUrl('');
        setScrapScanQuery('');
        fetchScrapHistory();
        fetchHandsets();
      } else {
        setErrorBanner(data.error?.message || 'Scrap write-off failed');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to complete scrap write-off');
    } finally {
      setScrapSubmitting(false);
      setIsScrapPinModalOpen(false);
    }
  };

  // Filtered handsets
  const filteredHandsets = useMemo(() => {
    return handsets.filter(h => {
      const matchesSearch = !searchQuery || 
        h.imei1.includes(searchQuery) || 
        (h.imei2 && h.imei2.includes(searchQuery)) ||
        (h.product?.name && h.product.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (h.variant?.variantName && h.variant.variantName.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'ALL' || h.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [handsets, searchQuery, statusFilter]);

  return (
    <div className="p-3 sm:p-5 max-w-[1720px] w-full mx-auto flex flex-col space-y-4">
      
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>Dual-IMEI Inventory & Catalog Hub</span>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 font-mono px-2 py-0.5 rounded border border-teal-500/30">
                Phase 5 Engine
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Taxonomy, Exact-Cost Handset Lifecycle, Append-Only Ledgers & TX-17 Scrap Write-Offs
            </p>
          </div>
        </div>

        {/* Universal Scan Trigger */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUniversalScan(scanInput)}
              placeholder="Fast Scan IMEI / Barcode..."
              className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-teal-500 focus:outline-none w-56 sm:w-64"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleUniversalScan(scanInput)}
            loading={scanLoading}
          >
            Lookup
          </Button>
        </div>
      </div>

      {/* Global Banners */}
      {errorBanner && (
        <div className="bg-rose-950/40 border border-rose-800/80 text-rose-200 px-4 py-3 rounded-xl text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-rose-400 hover:text-rose-100 text-sm">✕</button>
        </div>
      )}
      {successBanner && (
        <div className="bg-teal-950/40 border border-teal-800/80 text-teal-200 px-4 py-3 rounded-xl text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-teal-400 hover:text-teal-100 text-sm">✕</button>
        </div>
      )}

      {/* Quick Scanned Item Card Modal / Drawer */}
      {scannedItem && (
        <div className="bg-slate-900 border border-teal-500/50 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-teal-500/10 rounded-lg text-teal-400 mt-0.5">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                Lookup Resolved: {scannedItem.type}
              </div>
              <div className="text-sm font-bold text-slate-100">
                {scannedItem.item?.product?.name || scannedItem.item?.name} — {scannedItem.item?.variant?.variantName || ''}
              </div>
              <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1 mt-1 font-mono">
                {scannedItem.item?.imei1 && <span>IMEI1: {scannedItem.item.imei1}</span>}
                {scannedItem.item?.imei2 && <span>IMEI2: {scannedItem.item.imei2}</span>}
                {scannedItem.item?.barcode && <span>Barcode: {scannedItem.item.barcode}</span>}
                <span>Cost: ৳{Number(scannedItem.item?.specificCost || scannedItem.item?.purchaseCost || 0).toLocaleString()}</span>
                <span className="text-teal-300 font-semibold">Status: {scannedItem.item?.status || 'ACTIVE'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            {scannedItem.item?.imei1 && (
              <Button size="sm" variant="secondary" onClick={() => handleOpenTimeline(scannedItem.item.imei1)}>
                View History
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setScannedItem(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Primary Sub-Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setSubTab('HANDSETS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            subTab === 'HANDSETS'
              ? 'bg-teal-600 text-white shadow-sm shadow-teal-900/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Dual-IMEI Handsets ({handsets.length})</span>
        </button>

        <button
          onClick={() => setSubTab('CATALOG')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            subTab === 'CATALOG'
              ? 'bg-teal-600 text-white shadow-sm shadow-teal-900/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Products & Taxonomy</span>
        </button>

        <button
          onClick={() => setSubTab('IMPORT')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            subTab === 'IMPORT'
              ? 'bg-teal-600 text-white shadow-sm shadow-teal-900/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Excel/CSV Import</span>
        </button>

        <button
          onClick={() => setSubTab('ACCESSORIES')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            subTab === 'ACCESSORIES'
              ? 'bg-teal-600 text-white shadow-sm shadow-teal-900/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Accessories Ledger</span>
        </button>

        <button
          onClick={() => setSubTab('SCRAP_HUB')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            subTab === 'SCRAP_HUB'
              ? 'bg-rose-600 text-white shadow-sm shadow-rose-900/50'
              : 'text-rose-400 hover:text-rose-200 hover:bg-rose-950/20'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Damaged Scrap Hub ({scrapHistory.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SUB-TAB 1: DUAL-IMEI SERIALIZED HANDSET INVENTORY              */}
      {/* ============================================================== */}
      {subTab === 'HANDSETS' && (
        <div className="flex flex-col space-y-4">
          {/* Controls Bar: Filters, Aging Selector & Register Handset Button */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Bar */}
              <div className="relative w-48 sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by IMEI or Model..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-teal-500 focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-teal-500 focus:outline-none"
              >
                <option value="ALL">All States</option>
                <option value="AVAILABLE">AVAILABLE (In Stock)</option>
                <option value="HELD_CART">HELD_CART</option>
                <option value="SOLD">SOLD</option>
                <option value="RETURNED_INSPECTION">RETURNED_INSPECTION</option>
                <option value="RETURNED_TO_SUPPLIER">RETURNED_TO_SUPPLIER</option>
                <option value="SCRAPPED">SCRAPPED</option>
                <option value="IN_TRANSIT">IN_TRANSIT</option>
              </select>

              {/* Aging Filter */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <span className="text-[11px] text-slate-400 px-1.5 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> Aging:
                </span>
                <button
                  onClick={() => { setAgingFilter('ALL'); fetchHandsets('ALL'); }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    agingFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => { setAgingFilter('60'); fetchHandsets('60'); }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    agingFilter === '60' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-400 hover:text-amber-300'
                  }`}
                >
                  &gt;60 Days
                </button>
                <button
                  onClick={() => { setAgingFilter('90'); fetchHandsets('90'); }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    agingFilter === '90' ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30' : 'text-slate-400 hover:text-rose-300'
                  }`}
                >
                  &gt;90 Days
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsRegisterHandsetOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Register Handset IMEI
              </Button>
            </div>
          </div>

          {/* Handset Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Model & Brand</th>
                    <th className="py-3 px-4">Primary IMEI 1 (Luhn 15)</th>
                    <th className="py-3 px-4">Secondary IMEI 2</th>
                    <th className="py-3 px-4">Exact Landed Cost</th>
                    <th className="py-3 px-4">Purchase Date & Aging</th>
                    <th className="py-3 px-4">Lifecycle State</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {filteredHandsets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">
                        {loading ? 'Loading handset records...' : 'No handsets found matching current filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredHandsets.map((item) => {
                      const cost = Number(item.specificCost || item.purchaseCost || 0);
                      const days = item.daysInStock || Math.floor((Date.now() - new Date(item.purchaseDate).getTime()) / (1000 * 60 * 60 * 24));
                      
                      let statusBadgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                      if (item.status === 'AVAILABLE') statusBadgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                      else if (item.status === 'HELD_CART') statusBadgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                      else if (item.status === 'SOLD') statusBadgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                      else if (item.status === 'SCRAPPED') statusBadgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                      return (
                        <tr key={item._id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-100">
                              {item.product?.name || 'Handset Product'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {item.product?.brand?.name || 'Brand'} · {item.variant?.variantName || ''}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-teal-300 tracking-wide">
                            {item.imei1}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {item.imei2 || '—'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-100">
                            ৳{cost.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div>{new Date(item.purchaseDate).toLocaleDateString()}</div>
                            {days > 60 && (
                              <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5 border ${
                                days > 90 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}>
                                {days} days old
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${statusBadgeColor}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenTimeline(item.imei1)}
                                title="View Movement Audit Timeline"
                              >
                                <History className="w-3.5 h-3.5" />
                              </Button>
                              
                              {/* Quick State Toggle for Inspection / Supplier Return */}
                              {item.status === 'AVAILABLE' && (
                                <button
                                  onClick={() => handleStatusChange(item._id, 'RETURNED_INSPECTION')}
                                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded"
                                >
                                  To Inspection
                                </button>
                              )}
                              {item.status === 'RETURNED_INSPECTION' && (
                                <button
                                  onClick={() => handleStatusChange(item._id, 'AVAILABLE')}
                                  className="text-[10px] bg-teal-800/40 hover:bg-teal-700/50 text-teal-200 px-2 py-1 rounded border border-teal-700"
                                >
                                  Re-stock
                                </button>
                              )}
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
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: PRODUCT CATALOG & TAXONOMY                          */}
      {/* ============================================================== */}
      {subTab === 'CATALOG' && (
        <div className="flex flex-col space-y-4">
          {/* Top Bar with Add Taxonomy & Add Product */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-slate-300">Catalog Storehouse:</span>
              <span className="text-xs bg-slate-800 text-teal-400 px-2 py-0.5 rounded font-mono">
                {products.length} Products
              </span>
              <span className="text-xs bg-slate-800 text-teal-400 px-2 py-0.5 rounded font-mono">
                {categories.length} Categories
              </span>
              <span className="text-xs bg-slate-800 text-teal-400 px-2 py-0.5 rounded font-mono">
                {brands.length} Brands
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setTaxonomyType('CATEGORY');
                  setIsAddTaxonomyOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Category / Brand
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddProductOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New Product
              </Button>
            </div>
          </div>

          {/* Products List Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category & Brand</th>
                    <th className="py-3 px-4">Tracking Mode</th>
                    <th className="py-3 px-4">Variants & SKUs</th>
                    <th className="py-3 px-4">Retail Price (MRP)</th>
                    <th className="py-3 px-4">Warranty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-500">
                        No catalog items found. Create one or import via CSV.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-850/50">
                        <td className="py-3 px-4 font-semibold text-slate-100">
                          {p.name}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {p.category?.name} · {p.brand?.name}
                        </td>
                        <td className="py-3 px-4">
                          {p.hasImei ? (
                            <span className="text-[10px] bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded border border-teal-500/30">
                              Serialized IMEI
                            </span>
                          ) : (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded border border-indigo-500/30">
                              Non-Serialized (Barcode)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {p.variants?.map(v => (
                            <div key={v._id}>
                              {v.variantName || 'Std'}: <span className="text-teal-400">{v.sku}</span>
                            </div>
                          ))}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-100">
                          ৳{Number(p.variants?.[0]?.retailPrice || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {p.warrantyMonths} Months
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

      {/* ============================================================== */}
      {/* SUB-TAB 3: EXCEL / CSV BULK IMPORT WIZARD                      */}
      {/* ============================================================== */}
      {subTab === 'IMPORT' && (
        <div className="flex flex-col space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                <span>Bulk CSV / Excel Product Importer</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Target: Ingest 500 catalog rows with auto-category resolution, barcode deduplication, and atomic tenant isolation.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <Download className="w-4 h-4 mr-1.5" />
                Download CSV Template
              </Button>
            </div>
          </div>

          {/* Upload Zone */}
          <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-xl p-8 text-center transition-colors">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileChange}
              id="csvFileInput"
              className="hidden"
            />
            <label htmlFor="csvFileInput" className="cursor-pointer flex flex-col items-center">
              <Upload className="w-10 h-10 text-teal-400 mb-2" />
              <div className="text-sm font-bold text-slate-200">
                {csvFile ? `Selected: ${csvFile.name}` : 'Click to select or drop CSV product file'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Supports RFC-4180 standard CSV format. Up to 10MB file size.
              </div>
            </label>
          </div>

          {/* Preview Table */}
          {csvPreviewRows.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-300">
                  Data Preview (First 10 Rows):
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteImport}
                  loading={importLoading}
                >
                  Confirm & Import Entire File
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Brand</th>
                      <th className="py-2 px-3">Barcode</th>
                      <th className="py-2 px-3">Cost Price</th>
                      <th className="py-2 px-3">Retail Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {csvPreviewRows.map((r, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-mono text-slate-500">#{r._rowNum}</td>
                        <td className="py-2 px-3 font-semibold text-slate-100">{r.name}</td>
                        <td className="py-2 px-3">{r.category}</td>
                        <td className="py-2 px-3">{r.brand}</td>
                        <td className="py-2 px-3 font-mono text-teal-400">{r.barcode || 'Auto'}</td>
                        <td className="py-2 px-3 font-mono">৳{r.purchasePrice}</td>
                        <td className="py-2 px-3 font-mono font-bold">৳{r.retailPrice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Results Summary */}
          {importSummary && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col space-y-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Import Run Results
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Total Processed</div>
                  <div className="text-lg font-bold text-slate-100">{importSummary.totalProcessed}</div>
                </div>
                <div className="bg-emerald-950/30 p-3 rounded-lg border border-emerald-800/50">
                  <div className="text-[11px] text-emerald-400">Successfully Imported</div>
                  <div className="text-lg font-bold text-emerald-300">{importSummary.imported}</div>
                </div>
                <div className="bg-amber-950/30 p-3 rounded-lg border border-amber-800/50">
                  <div className="text-[11px] text-amber-400">Skipped (Duplicate)</div>
                  <div className="text-lg font-bold text-amber-300">{importSummary.skipped}</div>
                </div>
                <div className="bg-rose-950/30 p-3 rounded-lg border border-rose-800/50">
                  <div className="text-[11px] text-rose-400">Failed Rows</div>
                  <div className="text-lg font-bold text-rose-300">{importSummary.failed}</div>
                </div>
              </div>

              {importSummary.errors.length > 0 && (
                <div className="bg-rose-950/20 border border-rose-800/40 rounded-lg p-3 text-xs text-rose-300">
                  <div className="font-bold mb-1">Row-Level Diagnostics:</div>
                  <ul className="list-disc list-inside space-y-1 font-mono text-[11px]">
                    {importSummary.errors.slice(0, 5).map((e, idx) => (
                      <li key={idx}>Row {e.row}: {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 4: ACCESSORIES & NON-SERIALIZED LEDGER                 */}
      {/* ============================================================== */}
      {subTab === 'ACCESSORIES' && (
        <div className="flex flex-col space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-200">
                Non-Serialized Stock Balances & Append-Only Movements
              </div>
              <div className="text-[11px] text-slate-400">
                Chargers, cables, cases, and tempered glass. Updates recorded with atomic concurrency protection.
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAdjustStockOpen(true)}
            >
              <SlidersHorizontal className="w-4 h-4 mr-1.5" />
              Manual Stock Adjustment
            </Button>
          </div>

          {/* Accessory Balances Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-3 border-b border-slate-800 text-xs font-bold text-slate-300">
                Active Accessory Stock Levels
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Item / Barcode</th>
                      <th className="py-2.5 px-3">Brand & Model</th>
                      <th className="py-2.5 px-3">Stock Count</th>
                      <th className="py-2.5 px-3">Alert Qty</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {accessoryStockList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No accessory stock records found.
                        </td>
                      </tr>
                    ) : (
                      accessoryStockList.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-850/50">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-100">{item.productName}</div>
                            <div className="text-[10px] font-mono text-teal-400">{item.barcode || item.sku}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{item.brandName || 'Accessory'}</td>
                          <td className="py-2.5 px-3">
                            <span className={`font-mono font-bold text-sm ${item.isLowStock ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {item.currentStock}
                            </span>
                            {item.isLowStock && (
                              <span className="ml-1.5 text-[9px] bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.5 rounded border border-rose-500/30">
                                Low Stock
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{item.alertQuantity}</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                setAdjVariantId(item._id);
                                setIsAdjustStockOpen(true);
                              }}
                              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded"
                            >
                              Adjust
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Movement Log */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="p-3 border-b border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Recent Movement Log</span>
                <span className="text-[10px] text-slate-500 font-mono">Append-Only</span>
              </div>
              <div className="p-3 divide-y divide-slate-800 overflow-y-auto max-h-[460px]">
                {accessoryMovements.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500">
                    No recent inventory movements recorded.
                  </div>
                ) : (
                  accessoryMovements.map((m, idx) => (
                    <div key={idx} className="py-2.5 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            m.quantityDelta > 0 ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                          }`}>
                            {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                          </span>
                          <span>{m.movementType?.toUpperCase()}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {m.notes || m.referenceDocNo || 'Manual operation'}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono text-right">
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 5: DAMAGED STOCK SCRAP HUB                             */}
      {/* ============================================================== */}
      {subTab === 'SCRAP_HUB' && (
        <div className="flex flex-col space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Damaged Handset Scrap Hub — Section 7 Accounting Engine</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Atomically marks the handset as SCRAPPED, removes it from available inventory, and posts TX-17 double-entry write-off:
              <span className="text-slate-200 font-mono ml-1.5">Debit 5020-Damaged-Stock-Loss / Credit 1210-Handset-Inventory</span> for exact landed cost.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 cols: Scrapping Execution Form */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
                Step 1: Scan or Select Damaged Handset
              </h3>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={scrapScanQuery}
                  onChange={(e) => setScrapScanQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScrapHandsetSearch()}
                  placeholder="Scan 15-Digit IMEI to scrap (e.g. 867492041234567)..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:border-rose-500 focus:outline-none"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleScrapHandsetSearch}
                  loading={scrapTargetLoading}
                >
                  Locate Unit
                </Button>
              </div>

              {/* Handset Identity & Exact Cost Details */}
              {scrapTargetHandset && (
                <div className="bg-slate-950 border border-rose-900/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">
                        {scrapTargetHandset.product?.name || 'Selected Handset'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        IMEI1: {scrapTargetHandset.imei1} {scrapTargetHandset.imei2 ? `| IMEI2: ${scrapTargetHandset.imei2}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Exact Landed Cost</div>
                      <div className="text-base font-bold font-mono text-rose-400">
                        ৳{Number(scrapTargetHandset.specificCost).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Accounting preview */}
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs">
                    <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-teal-400" /> Double-Entry General Ledger Impact (TX-17):
                    </div>
                    <div className="font-mono text-[11px] space-y-1 text-slate-400">
                      <div className="flex justify-between">
                        <span>Debit [5020-Damaged-Stock-Loss]:</span>
                        <span className="text-rose-400 font-bold">৳{Number(scrapTargetHandset.specificCost).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Credit [1210-Handset-Inventory]:</span>
                        <span className="text-emerald-400 font-bold">৳{Number(scrapTargetHandset.specificCost).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reason & Category */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[11px] font-semibold text-slate-300 block">Damage Classification:</label>
                    <select
                      value={scrapDamageCategory}
                      onChange={(e) => setScrapDamageCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-rose-500"
                    >
                      <option value="SHATTERED_SCREEN">Shattered Screen / LCD Bleed</option>
                      <option value="WATER_DAMAGE">Liquid / Water Corrosion</option>
                      <option value="BOARD_DEAD">Motherboard Short-Circuit / Dead</option>
                      <option value="DEFECTIVE_RETURN">Defective Return Unsalvageable</option>
                      <option value="OTHER">Other Terminal Damage</option>
                    </select>

                    <label className="text-[11px] font-semibold text-slate-300 block pt-1">Inspection & Damage Notes:</label>
                    <textarea
                      value={scrapReasonNotes}
                      onChange={(e) => setScrapReasonNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-rose-500"
                      placeholder="Explain physical damage and failure mode..."
                    />

                    {/* Evidence Photo Upload */}
                    <div className="pt-2">
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Mandatory Photo Evidence:
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          id="scrapPhotoInput"
                          className="hidden"
                        />
                        <label
                          htmlFor="scrapPhotoInput"
                          className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 border border-slate-700"
                        >
                          <Camera className="w-4 h-4 text-teal-400" />
                          <span>{scrapUploadingPhoto ? 'Uploading...' : 'Upload Damage Photo'}</span>
                        </label>
                        {scrapPhotoUrl && (
                          <span className="text-[11px] text-teal-400 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Evidence Attached
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-end">
                    <Button
                      variant="destructive"
                      size="md"
                      onClick={() => setIsScrapPinModalOpen(true)}
                      loading={scrapSubmitting}
                    >
                      <AlertTriangle className="w-4 h-4 mr-1.5" />
                      Authorize & Write Off Damaged Stock
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 cols: Scrapped Units History */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2 mb-3">
                Scrapped Audit Registry ({scrapHistory.length})
              </h3>
              <div className="divide-y divide-slate-800 overflow-y-auto max-h-[500px]">
                {scrapHistory.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500">
                    No scrap write-off records yet.
                  </div>
                ) : (
                  scrapHistory.map((s) => (
                    <div key={s._id} className="py-3 text-xs space-y-1">
                      <div className="flex justify-between items-start">
                        <div className="font-semibold text-slate-100">{s.modelName}</div>
                        <div className="font-mono font-bold text-rose-400">
                          ৳{Number(s.specificCost).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        IMEI: {s.imei1} · Category: {s.damageCategory}
                      </div>
                      <div className="text-[10px] text-slate-500 flex justify-between pt-0.5">
                        <span>Voucher: {s.journalVoucherNo || s.transactionReference}</span>
                        <span>{new Date(s.scrappedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REGISTER SERIALIZED HANDSET                             */}
      {/* ============================================================== */}
      <Modal
        isOpen={isRegisterHandsetOpen}
        onClose={() => setIsRegisterHandsetOpen(false)}
        title="Register Serialized Handset"
        maxWidth="md"
      >
        <form onSubmit={handleRegisterHandset} className="space-y-3.5 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Select Product Model:</label>
            <select
              value={regProductId}
              onChange={(e) => {
                setRegProductId(e.target.value);
                const prod = products.find(p => p._id === e.target.value);
                if (prod && prod.variants?.length > 0) {
                  setRegVariantId(prod.variants[0]._id);
                }
              }}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-teal-500"
            >
              <option value="">-- Choose Handset Model --</option>
              {products.filter(p => p.hasImei).map(p => (
                <option key={p._id} value={p._id}>{p.name} ({p.brand?.name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Primary IMEI 1 (Mandatory 15-Digit Luhn):</label>
            <input
              type="text"
              value={regImei1}
              onChange={(e) => setRegImei1(e.target.value)}
              placeholder="e.g. 867492041234567"
              required
              maxLength={15}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:border-teal-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Secondary IMEI 2 (Optional Dual-SIM):</label>
            <input
              type="text"
              value={regImei2}
              onChange={(e) => setRegImei2(e.target.value)}
              placeholder="e.g. 867492041234568"
              maxLength={15}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Exact Landed Cost (৳):</label>
              <input
                type="number"
                value={regSpecificCost}
                onChange={(e) => setRegSpecificCost(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Purchase Date:</label>
              <input
                type="date"
                value={regPurchaseDate}
                onChange={(e) => setRegPurchaseDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end space-x-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsRegisterHandsetOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={regSubmitting}>
              Register Handset
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: ADD PRODUCT & VARIANTS                                  */}
      {/* ============================================================== */}
      <Modal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        title="Add New Catalog Product"
        maxWidth="md"
      >
        <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Product Name:</label>
            <input
              type="text"
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              placeholder="e.g. Redmi Note 13 Pro 5G"
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Category:</label>
              <select
                value={prodCategory}
                onChange={(e) => setProdCategory(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-teal-500"
              >
                <option value="">-- Choose Category --</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Brand:</label>
              <select
                value={prodBrand}
                onChange={(e) => setProdBrand(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-teal-500"
              >
                <option value="">-- Choose Brand --</option>
                {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="hasImeiCheck"
              checked={prodHasImei}
              onChange={(e) => setProdHasImei(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-0"
            />
            <label htmlFor="hasImeiCheck" className="text-slate-300 font-semibold cursor-pointer">
              Serialized Handset (Requires Dual-IMEI tracking)
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Default Cost Price (৳):</label>
              <input
                type="number"
                value={prodCost}
                onChange={(e) => setProdCost(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Retail Selling Price (MRP ৳):</label>
              <input
                type="number"
                value={prodRetail}
                onChange={(e) => setProdRetail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end space-x-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsAddProductOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: ADD TAXONOMY (CATEGORY OR BRAND)                        */}
      {/* ============================================================== */}
      <Modal
        isOpen={isAddTaxonomyOpen}
        onClose={() => setIsAddTaxonomyOpen(false)}
        title={`Add New ${taxonomyType === 'CATEGORY' ? 'Category' : 'Brand'}`}
        maxWidth="sm"
      >
        <form onSubmit={handleCreateTaxonomy} className="space-y-3 text-xs">
          <div className="flex space-x-2 mb-2">
            <button
              type="button"
              onClick={() => setTaxonomyType('CATEGORY')}
              className={`flex-1 py-1.5 rounded text-xs font-semibold ${
                taxonomyType === 'CATEGORY' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Category
            </button>
            <button
              type="button"
              onClick={() => setTaxonomyType('BRAND')}
              className={`flex-1 py-1.5 rounded text-xs font-semibold ${
                taxonomyType === 'BRAND' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Brand
            </button>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Name:</label>
            <input
              type="text"
              value={taxonomyName}
              onChange={(e) => setTaxonomyName(e.target.value)}
              placeholder={taxonomyType === 'CATEGORY' ? 'e.g. Smart Watch' : 'e.g. Anker'}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              {taxonomyType === 'CATEGORY' ? 'Description:' : 'Origin Country:'}
            </label>
            <input
              type="text"
              value={taxonomyExtra}
              onChange={(e) => setTaxonomyExtra(e.target.value)}
              placeholder={taxonomyType === 'CATEGORY' ? 'Optional description' : 'e.g. USA, China, Bangladesh'}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsAddTaxonomyOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: MANUAL ACCESSORY STOCK ADJUSTMENT                       */}
      {/* ============================================================== */}
      <Modal
        isOpen={isAdjustStockOpen}
        onClose={() => setIsAdjustStockOpen(false)}
        title="Manual Stock Count Adjustment"
        maxWidth="md"
      >
        <form onSubmit={handleExecuteAdjustment} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Select Accessory Item:</label>
            <select
              value={adjVariantId}
              onChange={(e) => setAdjVariantId(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-teal-500"
            >
              <option value="">-- Choose Accessory --</option>
              {accessoryStockList.map(a => (
                <option key={a._id} value={a._id}>{a.productName} (Current: {a.currentStock})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Adjustment Type:</label>
              <select
                value={adjType}
                onChange={(e) => setAdjType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
              >
                <option value="ADD">Add Stock (+)</option>
                <option value="DEDUCT">Deduct Stock (-)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Quantity Delta:</label>
              <input
                type="number"
                value={adjQuantity}
                onChange={(e) => setAdjQuantity(e.target.value)}
                min="1"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Audited Reason:</label>
            <input
              type="text"
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              required
              placeholder="e.g. Physical inventory count correction"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Manager Authorization PIN:</label>
            <input
              type="password"
              value={adjManagerPin}
              onChange={(e) => setAdjManagerPin(e.target.value)}
              placeholder="Enter 4-digit PIN (default 1234)"
              maxLength={4}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsAdjustStockOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Apply Adjustment
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: IMEI AUDIT TIMELINE                                     */}
      {/* ============================================================== */}
      <Modal
        isOpen={!!timelineImei}
        onClose={() => setTimelineImei(null)}
        title={`Handset Audit Trail — ${timelineImei}`}
        maxWidth="md"
      >
        <div className="space-y-3 text-xs max-h-[450px] overflow-y-auto">
          {timelineLoading ? (
            <div className="py-8 text-center text-slate-500">Loading audit events...</div>
          ) : timelineLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-500">No movement history for this IMEI.</div>
          ) : (
            timelineLogs.map((log, i) => (
              <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-200">
                  <span className="text-teal-400 uppercase font-mono">{log.action || log.movementType}</span>
                  <span className="text-[10px] text-slate-500">{new Date(log.timestamp || log.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-slate-400 text-[11px]">{log.notes || log.description || 'Movement recorded'}</div>
                {log.previousStatus && log.newStatus && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Transition: {log.previousStatus} → <span className="text-slate-300 font-bold">{log.newStatus}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: MANAGER PIN OVERRIDE FOR SCRAP HUB                      */}
      {/* ============================================================== */}
      <ManagerPinOverrideModal
        isOpen={isScrapPinModalOpen}
        onClose={() => setIsScrapPinModalOpen(false)}
        action="INVENTORY_SCRAP"
        reason="Authorization required to write off damaged stock and post accounting loss"
        onSuccess={({ overrideToken }) => {
          handleExecuteScrap(overrideToken);
        }}
      />
    </div>
  );
}
