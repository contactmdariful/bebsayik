import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Search,
  Plus,
  Phone,
  Send,
  CreditCard,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Printer,
  X,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  Smartphone,
  AlertTriangle,
  UserCheck,
  Percent,
  Receipt,
  ArrowRight
} from 'lucide-react';
import { Modal } from '../components/Modal.js';
import { Button } from '../components/Button.js';
import { MoneyText } from '../components/MoneyText.js';
import { EmptyState } from '../components/EmptyState.js';
/**
 * 15-Digit IMEI Luhn Checksum Algorithm
 */
export function validateLuhn(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(imei.charAt(i), 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export interface GuarantorState {
  fullName: string;
  phone: string;
  nid: string;
  relation: string;
}

export interface InstallmentScheduleItem {
  installmentNumber: number;
  dueDate: string;
  installmentAmount: string;
  paidAmount: string;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: string;
  paymentReceiptNo?: string;
}

export interface KistiContractViewItem {
  id: string;
  contractNo: string;
  saleInvoiceNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerNid: string;
  productName: string;
  imei1: string;
  totalPayableAmount: string;
  downPaymentAmount: string;
  principalAmount: string;
  remainingDueAmount: string;
  tenureMonths: number;
  monthlyInstallmentAmount: string;
  status: 'active' | 'overdue' | 'defaulted' | 'settled';
  createdAt: string;
  nextDueDate?: string;
  daysOverdue?: number;
  guarantor1: GuarantorState;
  guarantor2: GuarantorState;
  schedule: InstallmentScheduleItem[];
}

// Initial demonstration data for Kisti Hub
const INITIAL_CONTRACTS: KistiContractViewItem[] = [
  {
    id: 'kst-101',
    contractNo: 'KST-202610-00101',
    saleInvoiceNo: 'INV-202610-00891',
    customerId: 'cust-1',
    customerName: 'Mahmudul Hasan',
    customerPhone: '01812345678',
    customerNid: '1990269251829',
    productName: 'Redmi Note 13 Pro 5G (8/256GB)',
    imei1: '860123456789014',
    totalPayableAmount: '28500.00',
    downPaymentAmount: '8500.00',
    principalAmount: '20000.00',
    remainingDueAmount: '15000.00',
    tenureMonths: 4,
    monthlyInstallmentAmount: '5000.00',
    status: 'active',
    createdAt: '2026-09-01',
    nextDueDate: '2026-11-01',
    daysOverdue: 0,
    guarantor1: {
      fullName: 'Rafiqul Islam',
      phone: '01711223344',
      nid: '1985269251820',
      relation: 'Brother'
    },
    guarantor2: {
      fullName: 'Kamrul Hasan',
      phone: '01911223344',
      nid: '1989269251821',
      relation: 'Uncle'
    },
    schedule: [
      {
        installmentNumber: 1,
        dueDate: '2026-10-01',
        installmentAmount: '5000.00',
        paidAmount: '5000.00',
        status: 'paid',
        paidDate: '2026-09-29',
        paymentReceiptNo: 'MR-KST-202609-0012'
      },
      {
        installmentNumber: 2,
        dueDate: '2026-11-01',
        installmentAmount: '5000.00',
        paidAmount: '0.00',
        status: 'pending'
      },
      {
        installmentNumber: 3,
        dueDate: '2026-12-01',
        installmentAmount: '5000.00',
        paidAmount: '0.00',
        status: 'pending'
      },
      {
        installmentNumber: 4,
        dueDate: '2027-01-01',
        installmentAmount: '5000.00',
        paidAmount: '0.00',
        status: 'pending'
      }
    ]
  },
  {
    id: 'kst-102',
    contractNo: 'KST-202610-00102',
    saleInvoiceNo: 'INV-202610-00742',
    customerId: 'cust-2',
    customerName: 'Anisur Rahman',
    customerPhone: '01723456789',
    customerNid: '1987269251822',
    productName: 'Samsung Galaxy A55 5G (8/128GB)',
    imei1: '860123456789014',
    totalPayableAmount: '42000.00',
    downPaymentAmount: '12000.00',
    principalAmount: '30000.00',
    remainingDueAmount: '20000.00',
    tenureMonths: 6,
    monthlyInstallmentAmount: '5000.00',
    status: 'overdue',
    createdAt: '2026-08-10',
    nextDueDate: '2026-10-10',
    daysOverdue: 3,
    guarantor1: {
      fullName: 'Tareq Monowar',
      phone: '01822334455',
      nid: '1980269251823',
      relation: 'Cousin'
    },
    guarantor2: {
      fullName: 'Shohel Rana',
      phone: '01922334455',
      nid: '1984269251824',
      relation: 'Brother-in-law'
    },
    schedule: [
      {
        installmentNumber: 1,
        dueDate: '2026-09-10',
        installmentAmount: '5000.00',
        paidAmount: '5000.00',
        status: 'paid',
        paidDate: '2026-09-10',
        paymentReceiptNo: 'MR-KST-202609-0044'
      },
      {
        installmentNumber: 2,
        dueDate: '2026-10-10',
        installmentAmount: '5000.00',
        paidAmount: '0.00',
        status: 'overdue'
      },
      {
        installmentNumber: 3,
        dueDate: '2026-11-10',
        installmentAmount: '5000.00',
        paidAmount: '0.00',
        status: 'pending'
      },
      {
        installmentNumber: 4,
        dueDate: '2026-12-10',
        installmentAmount: '5000.00',
        paidAmount: '0.00',
        status: 'pending'
      },
      {
        installmentNumber: 5,
        dueDate: '2027-01-10',
        installmentAmount: '5000.00',
        paidAmount: '0.00',
        status: 'pending'
      },
      {
        installmentNumber: 6,
        dueDate: '2027-02-10',
        installmentAmount: '5000.00',
        paidAmount: '0.00',
        status: 'pending'
      }
    ]
  },
  {
    id: 'kst-103',
    contractNo: 'KST-202608-00088',
    saleInvoiceNo: 'INV-202608-00219',
    customerId: 'cust-3',
    customerName: 'Jashim Uddin',
    customerPhone: '01934567890',
    customerNid: '1982269251825',
    productName: 'Vivo V30 5G (12/256GB)',
    imei1: '860123456789014',
    totalPayableAmount: '36000.00',
    downPaymentAmount: '12000.00',
    principalAmount: '24000.00',
    remainingDueAmount: '18000.00',
    tenureMonths: 4,
    monthlyInstallmentAmount: '6000.00',
    status: 'defaulted',
    createdAt: '2026-07-01',
    nextDueDate: '2026-08-31',
    daysOverdue: 43,
    guarantor1: {
      fullName: 'Billal Hossain',
      phone: '01733445566',
      nid: '1979269251826',
      relation: 'Uncle'
    },
    guarantor2: {
      fullName: 'Mizanur Rahman',
      phone: '01833445566',
      nid: '1981269251827',
      relation: 'Father'
    },
    schedule: [
      {
        installmentNumber: 1,
        dueDate: '2026-08-01',
        installmentAmount: '6000.00',
        paidAmount: '6000.00',
        status: 'paid',
        paidDate: '2026-08-01',
        paymentReceiptNo: 'MR-KST-202608-0019'
      },
      {
        installmentNumber: 2,
        dueDate: '2026-08-31',
        installmentAmount: '6000.00',
        paidAmount: '0.00',
        status: 'overdue'
      },
      {
        installmentNumber: 3,
        dueDate: '2026-09-30',
        installmentAmount: '6000.00',
        paidAmount: '0.00',
        status: 'overdue'
      },
      {
        installmentNumber: 4,
        dueDate: '2026-10-30',
        installmentAmount: '6000.00',
        paidAmount: '0.00',
        status: 'pending'
      }
    ]
  },
  {
    id: 'kst-104',
    contractNo: 'KST-202605-00045',
    saleInvoiceNo: 'INV-202605-00108',
    customerId: 'cust-4',
    customerName: 'Shakil Ahmed',
    customerPhone: '01612345678',
    customerNid: '1995269251828',
    productName: 'Realme 12 Pro+ 5G (8/256GB)',
    imei1: '860123456789014',
    totalPayableAmount: '35000.00',
    downPaymentAmount: '11000.00',
    principalAmount: '24000.00',
    remainingDueAmount: '0.00',
    tenureMonths: 4,
    monthlyInstallmentAmount: '6000.00',
    status: 'settled',
    createdAt: '2026-05-15',
    daysOverdue: 0,
    guarantor1: {
      fullName: 'Kamal Hossain',
      phone: '01744556677',
      nid: '1991269251829',
      relation: 'Brother'
    },
    guarantor2: {
      fullName: 'Salam Mia',
      phone: '01844556677',
      nid: '1993269251830',
      relation: 'Friend'
    },
    schedule: [
      {
        installmentNumber: 1,
        dueDate: '2026-06-15',
        installmentAmount: '6000.00',
        paidAmount: '6000.00',
        status: 'paid',
        paidDate: '2026-06-15',
        paymentReceiptNo: 'MR-KST-202606-0033'
      },
      {
        installmentNumber: 2,
        dueDate: '2026-07-15',
        installmentAmount: '6000.00',
        paidAmount: '6000.00',
        status: 'paid',
        paidDate: '2026-07-15',
        paymentReceiptNo: 'MR-KST-202607-0056'
      },
      {
        installmentNumber: 3,
        dueDate: '2026-08-15',
        installmentAmount: '6000.00',
        paidAmount: '6000.00',
        status: 'paid',
        paidDate: '2026-08-15',
        paymentReceiptNo: 'MR-KST-202608-0091'
      },
      {
        installmentNumber: 4,
        dueDate: '2026-09-15',
        installmentAmount: '6000.00',
        paidAmount: '6000.00',
        status: 'paid',
        paidDate: '2026-09-15',
        paymentReceiptNo: 'MR-KST-202609-0115'
      }
    ]
  }
];

export function KistiHub() {
  const [contracts, setContracts] = useState<KistiContractViewItem[]>(INITIAL_CONTRACTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'DEFAULTED' | 'SETTLED'>('ALL');

  // Modals state
  const [selectedContract, setSelectedContract] = useState<KistiContractViewItem | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Collect Modal Form State
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectMilestoneNo, setCollectMilestoneNo] = useState<number>(1);
  const [collectTender, setCollectTender] = useState<'cash' | 'mfs_bkash' | 'mfs_nagad' | 'bank_card'>('cash');
  const [isEarlySettlementMode, setIsEarlySettlementMode] = useState(false);
  const [collectNotes, setCollectNotes] = useState('');
  const [printThermalReceipt, setPrintThermalReceipt] = useState(true);

  // New Contract Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustNid, setNewCustNid] = useState('');
  const [newProductName, setNewProductName] = useState('Redmi Note 13 Pro 5G (8/256GB)');
  const [newImei, setNewImei] = useState('');
  const [newCashPrice, setNewCashPrice] = useState('28500.00');
  const [newDownPayment, setNewDownPayment] = useState('8500.00');
  const [newTenureMonths, setNewTenureMonths] = useState<number>(4);
  const [newG1Name, setNewG1Name] = useState('');
  const [newG1Phone, setNewG1Phone] = useState('');
  const [newG1Nid, setNewG1Nid] = useState('');
  const [newG1Relation, setNewG1Relation] = useState('Brother');
  const [newG2Name, setNewG2Name] = useState('');
  const [newG2Phone, setNewG2Phone] = useState('');
  const [newG2Nid, setNewG2Nid] = useState('');
  const [newG2Relation, setNewG2Relation] = useState('Uncle');
  const [newPaymentMethod, setNewPaymentMethod] = useState<'cash' | 'mfs_bkash' | 'mfs_nagad' | 'bank_card'>('cash');

  // SMS Modal State
  const [smsTarget, setSmsTarget] = useState<'customer' | 'guarantor1' | 'guarantor2' | 'all'>('all');

  // Notification helper
  const triggerNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Live Luhn Validation for IMEI
  const isImeiLuhnValid = useMemo(() => {
    if (!newImei || newImei.length !== 15) return null;
    return validateLuhn(newImei);
  }, [newImei]);

  // Dynamic Amortization Breakdown for New Contract
  const newContractSummary = useMemo(() => {
    const cash = parseFloat(newCashPrice) || 0;
    const down = parseFloat(newDownPayment) || 0;
    const principal = Math.max(0, cash - down);
    const tenure = Math.max(1, newTenureMonths);
    const perMonth = tenure > 0 ? Math.floor((principal / tenure) * 100) / 100 : 0;
    const lastMonth = tenure > 0 ? Math.round((principal - perMonth * (tenure - 1)) * 100) / 100 : 0;

    return {
      cashPrice: cash.toFixed(2),
      downPayment: down.toFixed(2),
      principal: principal.toFixed(2),
      perMonth: perMonth.toFixed(2),
      lastMonth: lastMonth.toFixed(2),
      tenure
    };
  }, [newCashPrice, newDownPayment, newTenureMonths]);

  // Filtered Contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const matchSearch =
        c.contractNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customerPhone.includes(searchQuery) ||
        c.imei1.includes(searchQuery) ||
        c.productName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'ACTIVE') return c.status === 'active';
      if (statusFilter === 'OVERDUE') return c.status === 'overdue';
      if (statusFilter === 'DEFAULTED') return c.status === 'defaulted';
      if (statusFilter === 'SETTLED') return c.status === 'settled';

      return true;
    });
  }, [contracts, searchQuery, statusFilter]);

  // KPIs
  const kpiStats = useMemo(() => {
    const totalFinanced = contracts.reduce((acc, c) => acc + parseFloat(c.principalAmount), 0);
    const activeCount = contracts.filter((c) => c.status === 'active').length;
    const totalDue = contracts.reduce((acc, c) => acc + parseFloat(c.remainingDueAmount), 0);
    const defaultersCount = contracts.filter((c) => c.status === 'defaulted').length;
    const overdueCount = contracts.filter((c) => c.status === 'overdue').length;

    return {
      totalFinanced: totalFinanced.toFixed(2),
      activeCount,
      totalDue: totalDue.toFixed(2),
      defaultersCount,
      overdueCount
    };
  }, [contracts]);

  // Open Collect Modal
  const handleOpenCollect = (contract: KistiContractViewItem) => {
    setSelectedContract(contract);
    const firstPending = contract.schedule.find((s) => s.status !== 'paid');
    setCollectMilestoneNo(firstPending ? firstPending.installmentNumber : 1);
    setCollectAmount(firstPending ? firstPending.installmentAmount : contract.monthlyInstallmentAmount);
    setIsEarlySettlementMode(false);
    setCollectNotes('');
    setShowCollectModal(true);
  };

  // Open Schedule Modal
  const handleOpenSchedule = (contract: KistiContractViewItem) => {
    setSelectedContract(contract);
    setShowScheduleModal(true);
  };

  // Open SMS Modal
  const handleOpenSms = (contract: KistiContractViewItem) => {
    setSelectedContract(contract);
    setSmsTarget('all');
    setShowSmsModal(true);
  };

  // Handle Early Settlement Toggle
  const handleToggleEarlySettlement = (enabled: boolean) => {
    setIsEarlySettlementMode(enabled);
    if (enabled && selectedContract) {
      setCollectAmount(selectedContract.remainingDueAmount);
    } else if (selectedContract) {
      const firstPending = selectedContract.schedule.find((s) => s.status !== 'paid');
      setCollectAmount(firstPending ? firstPending.installmentAmount : selectedContract.monthlyInstallmentAmount);
    }
  };

  // Submit Milestone Collection
  const handleProcessCollection = () => {
    if (!selectedContract) return;

    const amountNum = parseFloat(collectAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      triggerNotification('Please enter a valid payment amount greater than zero', 'error');
      return;
    }

    const remainingDueNum = parseFloat(selectedContract.remainingDueAmount);
    if (amountNum > remainingDueNum) {
      triggerNotification(
        `Collection amount ৳${amountNum.toFixed(2)} exceeds remaining due of ৳${remainingDueNum.toFixed(2)}`,
        'error'
      );
      return;
    }

    const receiptNo = `MR-KST-202610-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date().toISOString().split('T')[0]!;

    // Clone schedule and allocate
    let unallocated = amountNum;
    const newSchedule = selectedContract.schedule.map((item) => ({ ...item }));

    if (isEarlySettlementMode) {
      newSchedule.forEach((item) => {
        if (item.status !== 'paid') {
          item.status = 'paid';
          item.paidAmount = item.installmentAmount;
          item.paidDate = now;
          item.paymentReceiptNo = receiptNo;
        }
      });
      unallocated = 0;
    } else {
      // Find priority milestone or FIFO
      const targetIndex = newSchedule.findIndex((s) => s.installmentNumber === collectMilestoneNo && s.status !== 'paid');
      const order = targetIndex !== -1 ? [targetIndex, ...newSchedule.map((_, i) => i).filter((i) => i !== targetIndex)] : newSchedule.map((_, i) => i);

      for (const idx of order) {
        const item = newSchedule[idx]!;
        if (item.status === 'paid' || unallocated <= 0) continue;

        const scheduled = parseFloat(item.installmentAmount);
        const alreadyPaid = parseFloat(item.paidAmount || '0');
        const dueOnThis = scheduled - alreadyPaid;

        if (unallocated >= dueOnThis) {
          item.paidAmount = item.installmentAmount;
          item.status = 'paid';
          item.paidDate = now;
          item.paymentReceiptNo = receiptNo;
          unallocated -= dueOnThis;
        } else {
          // Partial Payment
          item.paidAmount = (alreadyPaid + unallocated).toFixed(2);
          item.paymentReceiptNo = receiptNo;
          unallocated = 0;
        }
      }
    }

    const newRemainingDue = Math.max(0, remainingDueNum - amountNum).toFixed(2);
    const newStatus = isEarlySettlementMode || parseFloat(newRemainingDue) === 0 ? 'settled' : selectedContract.status;

    const updatedContract: KistiContractViewItem = {
      ...selectedContract,
      remainingDueAmount: newRemainingDue,
      status: newStatus as any,
      schedule: newSchedule
    };

    setContracts((prev) => prev.map((c) => (c.id === selectedContract.id ? updatedContract : c)));
    setShowCollectModal(false);

    triggerNotification(
      `Receipt ${receiptNo} generated! Collected ৳${amountNum.toFixed(2)}. TX-11 Journal debited & posted to 1.4.02. SMS sent to ${selectedContract.customerPhone}.`,
      'success'
    );
  };

  // Submit New Contract Booking
  const handleCreateContract = () => {
    if (!newCustName.trim() || !newCustPhone.trim()) {
      triggerNotification('Customer name and valid mobile number are required', 'error');
      return;
    }
    if (!newImei.trim() || newImei.length !== 15) {
      triggerNotification('A 15-digit Handset IMEI is required', 'error');
      return;
    }
    if (!validateLuhn(newImei.trim())) {
      triggerNotification('Handset IMEI failed Luhn algorithm checksum verification', 'error');
      return;
    }
    if (!newG1Name.trim() || !newG1Phone.trim() || !newG1Nid.trim()) {
      triggerNotification('Guarantor #1 full name, phone and NID are mandatory', 'error');
      return;
    }
    if (!newG2Name.trim() || !newG2Phone.trim() || !newG2Nid.trim()) {
      triggerNotification('Guarantor #2 full name, phone and NID are mandatory', 'error');
      return;
    }

    const cash = parseFloat(newCashPrice) || 0;
    const down = parseFloat(newDownPayment) || 0;
    const principal = Math.max(0, cash - down);
    const tenure = newTenureMonths;
    const perMonth = Math.floor((principal / tenure) * 100) / 100;
    const lastMonth = Math.round((principal - perMonth * (tenure - 1)) * 100) / 100;

    const contractNo = `KST-202610-00${Math.floor(100 + Math.random() * 900)}`;
    const invoiceNo = `INV-202610-00${Math.floor(100 + Math.random() * 900)}`;

    const scheduleItems: InstallmentScheduleItem[] = [];
    const baseDate = new Date();
    for (let i = 1; i <= tenure; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i * 30);
      scheduleItems.push({
        installmentNumber: i,
        dueDate: d.toISOString().split('T')[0]!,
        installmentAmount: (i === tenure ? lastMonth : perMonth).toFixed(2),
        paidAmount: '0.00',
        status: 'pending'
      });
    }

    const newDoc: KistiContractViewItem = {
      id: `kst-${Date.now()}`,
      contractNo,
      saleInvoiceNo: invoiceNo,
      customerId: `cust-${Date.now()}`,
      customerName: newCustName.trim(),
      customerPhone: newCustPhone.trim(),
      customerNid: newCustNid.trim() || '1990269251829',
      productName: newProductName,
      imei1: newImei.trim(),
      totalPayableAmount: cash.toFixed(2),
      downPaymentAmount: down.toFixed(2),
      principalAmount: principal.toFixed(2),
      remainingDueAmount: principal.toFixed(2),
      tenureMonths: tenure,
      monthlyInstallmentAmount: perMonth.toFixed(2),
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0]!,
      nextDueDate: scheduleItems[0]?.dueDate,
      daysOverdue: 0,
      guarantor1: {
        fullName: newG1Name.trim(),
        phone: newG1Phone.trim(),
        nid: newG1Nid.trim(),
        relation: newG1Relation
      },
      guarantor2: {
        fullName: newG2Name.trim(),
        phone: newG2Phone.trim(),
        nid: newG2Nid.trim(),
        relation: newG2Relation
      },
      schedule: scheduleItems
    };

    setContracts([newDoc, ...contracts]);
    setShowCreateModal(false);

    // Reset form
    setNewCustName('');
    setNewCustPhone('');
    setNewCustNid('');
    setNewImei('');
    setNewG1Name('');
    setNewG1Phone('');
    setNewG1Nid('');
    setNewG2Name('');
    setNewG2Phone('');
    setNewG2Nid('');

    triggerNotification(
      `Contract ${contractNo} booked successfully! Down payment ৳${down.toFixed(2)} received. TX-11 Journal balanced. Thermal receipt queued.`,
      'success'
    );
  };

  // Dispatch SMS Reminders
  const handleSendSmsReminder = () => {
    if (!selectedContract) return;

    let targetNames = '';
    if (smsTarget === 'customer') targetNames = selectedContract.customerName;
    else if (smsTarget === 'guarantor1') targetNames = selectedContract.guarantor1.fullName;
    else if (smsTarget === 'guarantor2') targetNames = selectedContract.guarantor2.fullName;
    else targetNames = `${selectedContract.customerName} & Guarantors`;

    setShowSmsModal(false);
    triggerNotification(
      `SMS reminder dispatched to ${targetNames} for Contract ${selectedContract.contractNo} (Due: ৳${selectedContract.remainingDueAmount}).`,
      'success'
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1720px] w-full mx-auto flex flex-col space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-sm font-medium border transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-600 backdrop-blur-md'
              : 'bg-rose-950/90 text-rose-200 border-rose-600 backdrop-blur-md'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-800/50 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-900/60 border border-purple-700/60 rounded-xl text-purple-300 shadow-inner">
              <CalendarDays className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Kisti & EMI Hub</h1>
                <span className="bg-purple-900/80 text-purple-300 border border-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Phase 9 Engine
                </span>
                <span className="bg-emerald-900/60 text-emerald-300 border border-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  TX-11 Journal Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Installment financing, amortization schedules, partial milestone collections, and 30-day defaulter recovery.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerNotification('Installment schedules recalculated. Overdue flags updated.', 'success')}
            className="border-slate-700 bg-slate-900/70 hover:bg-slate-800 text-slate-200 text-xs flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Sync Overdue</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40 text-xs font-semibold flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Kisti Contract (F9)</span>
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Financed Volume</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-purple-300 tabular-nums">
              ৳{parseFloat(kpiStats.totalFinanced).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <DollarSign className="w-4 h-4 text-purple-400/60" />
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Principal loaned across Dokan</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Active Contracts</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {kpiStats.activeCount}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400/60" />
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Healthy running schedules</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Outstanding Due</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-300 tabular-nums">
              ৳{parseFloat(kpiStats.totalDue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <Clock className="w-4 h-4 text-cyan-400/60" />
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Account 1.4.02 Kisti Receivable</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Overdue Milestones</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tabular-nums">
              {kpiStats.overdueCount}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400/60" />
          </div>
          <span className="text-[10px] text-slate-500 mt-1">&lt; 30 days grace period</span>
        </div>

        <div className="bg-slate-900/90 border border-rose-900/60 rounded-xl p-4 flex flex-col justify-between shadow-sm col-span-2 lg:col-span-1 bg-gradient-to-b from-rose-950/20 to-slate-900">
          <span className="text-[11px] font-medium text-rose-300 uppercase tracking-wider flex items-center justify-between">
            <span>Defaulters Registry</span>
            <span className="bg-rose-900/80 text-rose-300 text-[9px] px-1.5 py-0.2 rounded font-bold">&gt;30 Days</span>
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold font-mono text-rose-400 tabular-nums">
              {kpiStats.defaultersCount}
            </span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-[10px] text-rose-300/70 mt-1">Recovery &amp; guarantor alerts</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-purple-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            All Agreements ({contracts.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Active ({kpiStats.activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('OVERDUE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'OVERDUE'
                ? 'bg-amber-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Overdue ({kpiStats.overdueCount})
          </button>
          <button
            onClick={() => setStatusFilter('DEFAULTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'DEFAULTED'
                ? 'bg-rose-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Defaulters &gt;30d ({kpiStats.defaultersCount})
          </button>
          <button
            onClick={() => setStatusFilter('SETTLED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'SETTLED'
                ? 'bg-slate-700 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Settled
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search contract #, customer, phone, or IMEI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {filteredContracts.length === 0 ? (
          <EmptyState
            title="No Kisti Contracts Found"
            description="No installment contracts match your search filter. Create a new contract with dual guarantors to start installment financing."
            actionLabel="Create Kisti Agreement"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Contract &amp; Invoice</th>
                  <th className="py-3.5 px-4">Customer Details</th>
                  <th className="py-3.5 px-4">Handset &amp; IMEI</th>
                  <th className="py-3.5 px-4 text-right">Price / Down</th>
                  <th className="py-3.5 px-4 text-right">Remaining Due</th>
                  <th className="py-3.5 px-4">Tenure / EMI</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredContracts.map((c) => {
                  const isSettled = c.status === 'settled';
                  const isDefaulter = c.status === 'defaulted';
                  const isOverdue = c.status === 'overdue';

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isDefaulter ? 'bg-rose-950/10' : isOverdue ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Contract & Invoice */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-purple-300">{c.contractNo}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">{c.saleInvoiceNo}</div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{c.customerName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5 font-mono">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{c.customerPhone}</span>
                        </div>
                      </td>

                      {/* Handset & IMEI */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="truncate text-slate-200" title={c.productName}>
                          {c.productName}
                        </div>
                        <div className="flex items-center space-x-1.5 mt-0.5 font-mono text-[11px] text-slate-400">
                          <Smartphone className="w-3 h-3 text-purple-400 shrink-0" />
                          <span className="text-purple-300">{c.imei1}</span>
                          <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1 rounded">
                            Luhn OK
                          </span>
                        </div>
                      </td>

                      {/* Price / Down */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono text-slate-200 tabular-nums">৳{parseFloat(c.totalPayableAmount).toLocaleString()}</div>
                        <div className="text-[11px] font-mono text-emerald-400 tabular-nums mt-0.5">
                          -৳{parseFloat(c.downPaymentAmount).toLocaleString()} down
                        </div>
                      </td>

                      {/* Remaining Due */}
                      <td className="py-3.5 px-4 text-right">
                        <div
                          className={`font-mono font-bold text-sm tabular-nums ${
                            isSettled
                              ? 'text-slate-500'
                              : isDefaulter
                              ? 'text-rose-400 font-extrabold'
                              : isOverdue
                              ? 'text-amber-400 font-extrabold'
                              : 'text-cyan-300'
                          }`}
                        >
                          ৳{parseFloat(c.remainingDueAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        {c.nextDueDate && !isSettled && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Due: {c.nextDueDate}
                          </div>
                        )}
                      </td>

                      {/* Tenure / EMI */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200">{c.tenureMonths} Months</div>
                        <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                          ৳{parseFloat(c.monthlyInstallmentAmount).toLocaleString()}/mo
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {c.status === 'active' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                            Active
                          </span>
                        )}
                        {c.status === 'overdue' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-900/60 text-amber-300 border border-amber-700">
                            Overdue ({c.daysOverdue}d)
                          </span>
                        )}
                        {c.status === 'defaulted' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-900/70 text-rose-300 border border-rose-600 animate-pulse">
                            Defaulted ({c.daysOverdue}d)
                          </span>
                        )}
                        {c.status === 'settled' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            Fully Settled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenSchedule(c)}
                            title="View Amortization Schedule & Guarantors"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {!isSettled && (
                            <>
                              <button
                                onClick={() => handleOpenCollect(c)}
                                title="Collect Milestone Payment"
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-[11px] font-semibold transition-colors flex items-center space-x-1"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>Collect</span>
                              </button>

                              <button
                                onClick={() => handleOpenSms(c)}
                                title="Send SMS Reminder"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 rounded-md transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Amortization Schedule & Contract Profile */}
      {showScheduleModal && selectedContract && (
        <Modal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          title={`Contract 360° Profile — ${selectedContract.contractNo}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs text-slate-200">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer &amp; Handset</span>
                <div className="text-sm font-bold text-white">{selectedContract.customerName}</div>
                <div className="text-slate-400 font-mono">{selectedContract.customerPhone}</div>
                <div className="text-slate-400 font-mono">NID: {selectedContract.customerNid}</div>
                <div className="pt-1 border-t border-slate-800 text-purple-300 font-mono">
                  IMEI: {selectedContract.imei1}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Financial Invariants</span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Price:</span>
                  <span className="font-mono text-white">৳{parseFloat(selectedContract.totalPayableAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Down Payment:</span>
                  <span className="font-mono text-emerald-400">৳{parseFloat(selectedContract.downPaymentAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Principal Financed:</span>
                  <span className="font-mono text-purple-300">৳{parseFloat(selectedContract.principalAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
                  <span className="text-slate-300">Remaining Due:</span>
                  <span className="font-mono text-rose-400">৳{parseFloat(selectedContract.remainingDueAmount).toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status &amp; Verification</span>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">Contract Status:</span>
                  <span className="capitalize font-bold text-white">{selectedContract.status}</span>
                </div>
                <div>Tenure: {selectedContract.tenureMonths} Months ({selectedContract.monthlyInstallmentAmount} BDT/mo)</div>
                <div>Booked on: {selectedContract.createdAt}</div>
                <div className="pt-1 border-t border-slate-800 flex items-center space-x-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Dual Guarantor Verified</span>
                </div>
              </div>
            </div>

            {/* Mandatory Dual Guarantors Cards */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Verified Legal Guarantors (Mandatory 2)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg flex items-start justify-between">
                  <div>
                    <div className="font-bold text-slate-100">{selectedContract.guarantor1.fullName}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Phone: {selectedContract.guarantor1.phone}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      NID: {selectedContract.guarantor1.nid}
                    </div>
                  </div>
                  <span className="bg-purple-950 text-purple-300 border border-purple-800 text-[10px] px-2 py-0.5 rounded font-semibold">
                    {selectedContract.guarantor1.relation} (G1)
                  </span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg flex items-start justify-between">
                  <div>
                    <div className="font-bold text-slate-100">{selectedContract.guarantor2.fullName}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Phone: {selectedContract.guarantor2.phone}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      NID: {selectedContract.guarantor2.nid}
                    </div>
                  </div>
                  <span className="bg-purple-950 text-purple-300 border border-purple-800 text-[10px] px-2 py-0.5 rounded font-semibold">
                    {selectedContract.guarantor2.relation} (G2)
                  </span>
                </div>
              </div>
            </div>

            {/* Amortization Milestone Schedule Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Monthly Repayment Schedule &amp; Collections</span>
              </h3>
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Milestone #</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-right">Scheduled (৳)</th>
                      <th className="py-2.5 px-3 text-right">Paid Amount (৳)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Receipt / Paid Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {selectedContract.schedule.map((inst) => (
                      <tr key={inst.installmentNumber} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-bold text-slate-300">Installment #{inst.installmentNumber}</td>
                        <td className="py-2.5 px-3 text-slate-400">{inst.dueDate}</td>
                        <td className="py-2.5 px-3 text-right text-slate-200">
                          ৳{parseFloat(inst.installmentAmount).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                          ৳{parseFloat(inst.paidAmount).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {inst.status === 'paid' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                              PAID
                            </span>
                          )}
                          {inst.status === 'pending' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              PENDING
                            </span>
                          )}
                          {inst.status === 'overdue' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                              OVERDUE
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {inst.paymentReceiptNo ? (
                            <span>
                              {inst.paymentReceiptNo} ({inst.paidDate})
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowScheduleModal(false);
                  handleOpenSms(selectedContract);
                }}
                className="border-slate-700 text-teal-300 text-xs flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send SMS Reminder</span>
              </Button>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScheduleModal(false)}
                  className="border-slate-700 text-slate-300 text-xs"
                >
                  Close
                </Button>

                {selectedContract.status !== 'settled' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setShowScheduleModal(false);
                      handleOpenCollect(selectedContract);
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs flex items-center space-x-1.5"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Collect Installment</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Collect Milestone / Early Settlement */}
      {showCollectModal && selectedContract && (
        <Modal
          isOpen={showCollectModal}
          onClose={() => setShowCollectModal(false)}
          title={`Collect Kisti Milestone — ${selectedContract.contractNo}`}
          maxWidth="xl"
        >
          <div className="space-y-5 text-xs text-slate-200">
            {/* Banner summary */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px]">Customer:</span>
                <div className="font-bold text-white text-sm">{selectedContract.customerName}</div>
                <div className="text-slate-500 font-mono text-[11px]">{selectedContract.customerPhone}</div>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[11px]">Total Remaining Due:</span>
                <div className="font-mono font-bold text-rose-400 text-lg tabular-nums">
                  ৳{parseFloat(selectedContract.remainingDueAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Early Settlement Toggle */}
            <div className="bg-purple-950/40 border border-purple-800/60 p-3 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-purple-200 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Full Early Settlement Payoff</span>
                </span>
                <p className="text-[11px] text-purple-300/70">
                  Customer settles full balance (৳{selectedContract.remainingDueAmount}) in one go. Closes agreement.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEarlySettlementMode}
                  onChange={(e) => handleToggleEarlySettlement(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Milestone Selector (if not early settlement) */}
            {!isEarlySettlementMode && (
              <div>
                <label className="block text-slate-400 mb-1">Target Installment Milestone:</label>
                <select
                  value={collectMilestoneNo}
                  onChange={(e) => {
                    const no = parseInt(e.target.value);
                    setCollectMilestoneNo(no);
                    const found = selectedContract.schedule.find((s) => s.installmentNumber === no);
                    if (found) {
                      setCollectAmount(found.installmentAmount);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                >
                  {selectedContract.schedule
                    .filter((s) => s.status !== 'paid')
                    .map((s) => (
                      <option key={s.installmentNumber} value={s.installmentNumber}>
                        Milestone #{s.installmentNumber} (Due: {s.dueDate} — Scheduled: ৳{s.installmentAmount})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Amount input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 font-medium">Payment Tender Amount (৳):</label>
                <span className="text-[11px] text-slate-500">Supports Partial &amp; Cascading Overflow</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold">৳</span>
                <input
                  type="number"
                  step="0.01"
                  disabled={isEarlySettlementMode}
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:border-purple-500 disabled:bg-slate-900 disabled:text-slate-400"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-slate-400 mb-1">Payment Tender:</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cash', label: 'Cash (1.1.01)' },
                  { id: 'mfs_bkash', label: 'bKash (1.3.01)' },
                  { id: 'mfs_nagad', label: 'Nagad (1.3.01)' },
                  { id: 'bank_card', label: 'Card (1.2.01)' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCollectTender(t.id as any)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      collectTender === t.id
                        ? 'bg-purple-950/80 border-purple-500 text-purple-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-slate-400 mb-1">Collector Notes (Optional):</label>
              <input
                type="text"
                placeholder="e.g. Counter deposit, customer paid via brother"
                value={collectNotes}
                onChange={(e) => setCollectNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* ESC/POS Thermal Print simulation check */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="thermalCheck"
                checked={printThermalReceipt}
                onChange={(e) => setPrintThermalReceipt(e.target.checked)}
                className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="thermalCheck" className="text-slate-400 cursor-pointer flex items-center space-x-1.5">
                <Printer className="w-3.5 h-3.5 text-purple-400" />
                <span>Print 80mm ESC/POS Thermal Money Receipt upon collection</span>
              </label>
            </div>

            {/* Invariant Note */}
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-purple-300">TX-11 Accounting Posting Invariant:</div>
              <div>• Debit: {collectTender === 'cash' ? 'Cash Account 1.1.01' : 'Digital/Bank Account'} (৳{collectAmount || '0.00'})</div>
              <div>• Credit: Kisti Loans Receivable Account 1.4.02 (৳{collectAmount || '0.00'})</div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCollectModal(false)}
                className="border-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleProcessCollection}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Collection (৳{collectAmount || '0.00'})</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: New Kisti Agreement Booking */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="New Kisti Installment Agreement (TX-11)"
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs text-slate-200 max-h-[75vh] overflow-y-auto pr-1">
            {/* Step 1: Customer Details */}
            <div className="space-y-2">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>1. Customer Profile</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Mahmudul Hasan"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Mobile Number (01XXXXXXXXX) *</label>
                  <input
                    type="text"
                    placeholder="01812345678"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">NID Number (10/13/17 digits)</label>
                  <input
                    type="text"
                    placeholder="1990269251829"
                    value={newCustNid}
                    onChange={(e) => setNewCustNid(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Handset & Serialized IMEI with live Luhn */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span>2. Handset &amp; Dual-IMEI Inventory</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Handset Model</label>
                  <input
                    type="text"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400">15-Digit Handset IMEI 1 *</label>
                    {isImeiLuhnValid === true && (
                      <span className="text-[10px] text-emerald-400 flex items-center space-x-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Valid Luhn IMEI</span>
                      </span>
                    )}
                    {isImeiLuhnValid === false && (
                      <span className="text-[10px] text-rose-400 flex items-center space-x-1 font-semibold">
                        <AlertCircle className="w-3 h-3" />
                        <span>Invalid Luhn Checksum</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="860123456789014"
                    value={newImei}
                    maxLength={15}
                    onChange={(e) => setNewImei(e.target.value)}
                    className={`w-full bg-slate-950 border rounded-lg px-3 py-1.5 font-mono text-slate-200 focus:outline-none ${
                      isImeiLuhnValid === true
                        ? 'border-emerald-600 focus:border-emerald-500'
                        : isImeiLuhnValid === false
                        ? 'border-rose-600 focus:border-rose-500'
                        : 'border-slate-800 focus:border-purple-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Pricing & Tenure Calculation */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <Percent className="w-3.5 h-3.5 text-purple-400" />
                <span>3. Financial Terms &amp; Amortization</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Handset MRP / Cash Price (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCashPrice}
                    onChange={(e) => setNewCashPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Down Payment Collected (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newDownPayment}
                    onChange={(e) => setNewDownPayment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-emerald-400 font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Tenure Period (Months)</label>
                  <select
                    value={newTenureMonths}
                    onChange={(e) => setNewTenureMonths(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value={3}>3 Months</option>
                    <option value={4}>4 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={9}>9 Months</option>
                    <option value={12}>12 Months</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Amortization Preview Badge */}
              <div className="bg-slate-950 border border-purple-900/50 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Gross Price</span>
                  <div className="font-mono font-bold text-slate-200 mt-0.5">৳{newContractSummary.cashPrice}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Down Payment</span>
                  <div className="font-mono font-bold text-emerald-400 mt-0.5">৳{newContractSummary.downPayment}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Principal Loan</span>
                  <div className="font-mono font-bold text-purple-300 mt-0.5">৳{newContractSummary.principal}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Monthly EMI</span>
                  <div className="font-mono font-bold text-cyan-300 mt-0.5">
                    ৳{newContractSummary.perMonth}/mo
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Mandatory Dual Guarantors */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>4. Mandatory Legal Guarantors (Exactly 2 Required)</span>
                </span>
                <span className="text-[10px] text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                  Legal Compliance
                </span>
              </div>

              {/* Guarantor 1 */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 text-[11px]">Primary Guarantor (#1)</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-0.5">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rafiqul Islam"
                      value={newG1Name}
                      onChange={(e) => setNewG1Name(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-0.5">Phone *</label>
                    <input
                      type="text"
                      placeholder="01711223344"
                      value={newG1Phone}
                      onChange={(e) => setNewG1Phone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-0.5">NID *</label>
                    <input
                      type="text"
                      placeholder="1985269251820"
                      value={newG1Nid}
                      onChange={(e) => setNewG1Nid(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-0.5">Relation</label>
                    <input
                      type="text"
                      placeholder="Brother / Father"
                      value={newG1Relation}
                      onChange={(e) => setNewG1Relation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Guarantor 2 */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 text-[11px]">Secondary Guarantor (#2)</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-0.5">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Kamrul Hasan"
                      value={newG2Name}
                      onChange={(e) => setNewG2Name(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-0.5">Phone *</label>
                    <input
                      type="text"
                      placeholder="01911223344"
                      value={newG2Phone}
                      onChange={(e) => setNewG2Phone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-0.5">NID *</label>
                    <input
                      type="text"
                      placeholder="1989269251821"
                      value={newG2Nid}
                      onChange={(e) => setNewG2Nid(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-0.5">Relation</label>
                    <input
                      type="text"
                      placeholder="Uncle / Cousin"
                      value={newG2Relation}
                      onChange={(e) => setNewG2Relation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-500">
                Books Sale &amp; posts TX-11 balancing debits and credits automatically
              </span>
              <div className="flex items-center space-x-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="border-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateContract}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-lg shadow-purple-900/40"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Execute Kisti Agreement</span>
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: Send SMS Reminder */}
      {showSmsModal && selectedContract && (
        <Modal
          isOpen={showSmsModal}
          onClose={() => setShowSmsModal(false)}
          title={`Send Installment SMS Reminder — ${selectedContract.contractNo}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-200">
            <div>
              <label className="block text-slate-400 mb-1">Target Recipients:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'all', label: 'Customer + Both Guarantors' },
                  { id: 'customer', label: 'Customer Only' },
                  { id: 'guarantor1', label: `Guarantor 1 (${selectedContract.guarantor1.fullName})` },
                  { id: 'guarantor2', label: `Guarantor 2 (${selectedContract.guarantor2.fullName})` }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSmsTarget(opt.id as any)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      smsTarget === opt.id
                        ? 'bg-teal-950 border-teal-500 text-teal-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Preview */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SMS Message Preview:</span>
              <p className="font-sans text-xs text-teal-300 leading-relaxed bg-slate-900 p-2.5 rounded border border-slate-800">
                Dear {selectedContract.customerName}, your Kisti installment for Contract {selectedContract.contractNo} has an outstanding balance of ৳{selectedContract.remainingDueAmount}. Please pay your due milestone soon at Kanchan Telecom to keep your credit intact. Contact: 01711223344. Thank you!
              </p>
              <div className="text-[10px] text-slate-500">
                Dispatched via SSL Wireless / BulkSMS BD driver with SMS audit log.
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSmsModal(false)}
                className="border-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSendSmsReminder}
                className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch SMS Now</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
