import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { ProcurementService } from '../services/procurement/procurement.service.js';
import { TransferService } from '../services/procurement/transfer.service.js';
import { AccountingService } from '../services/accounting/accounting.service.js';
import { getSmsDriver, MockSmsDriver } from '../services/sms/index.js';
import {
  Supplier,
  PurchaseOrder,
  GoodsReceivedNote,
  PurchaseReturnVoucher,
  StockTransferNote,
  ImeiSerial,
  ProductVariant,
  InventoryMovement,
  Account,
  AccountTransaction,
  User,
  Shop
} from '../models/index.js';
import { decimal128Getter, decimal128Setter, formatMoney } from '../utils/money.js';
import { validateLuhn } from '@bebsayik/shared-types';

function makeValidImei(prefix14: string): string {
  for (let d = 0; d <= 9; d++) {
    const candidate = prefix14 + d;
    if (validateLuhn(candidate)) return candidate;
  }
  return prefix14 + '0';
}

describe('Phase 6: Procurement, Supplier Ledgers, GRN, PRV & Stock Transfers', () => {
  const shopAId = new mongoose.Types.ObjectId();
  const shopBId = new mongoose.Types.ObjectId();
  const godownShopId = new mongoose.Types.ObjectId();
  const outletShopId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const ownerId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.restoreAllMocks();

    const fakeSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
      withTransaction: vi.fn().mockImplementation(async (cb: any) => cb())
    } as any;
    vi.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession);

    // Default null for uniqueness/idempotency checks so Mongoose does not buffer
    vi.spyOn(GoodsReceivedNote, 'findOne').mockResolvedValue(null);
    vi.spyOn(PurchaseReturnVoucher, 'findOne').mockResolvedValue(null);
    vi.spyOn(AccountTransaction, 'findOne').mockResolvedValue(null);

    // Default mock for postDoubleEntryJournal
    vi.spyOn(AccountingService, 'postDoubleEntryJournal').mockImplementation(async (args) => ({
      voucherNo: args.voucherNo,
      txnCode: args.txnCode,
      totalDebits: '1000.00',
      totalCredits: '1000.00',
      transactionCount: args.entries.length
    }));

    const smsDriver = getSmsDriver() as MockSmsDriver;
    if (smsDriver && typeof smsDriver.clear === 'function') {
      smsDriver.clear();
    }
  });

  // =========================================================================
  // 1. SUPPLIER CRM, PAYABLES LEDGER & TENANT ISOLATION
  // =========================================================================
  describe('Supplier CRM & Payables Ledger', () => {
    it('creates supplier with tenant isolation and opening payable balance', async () => {
      vi.spyOn(Supplier, 'findOne').mockResolvedValue(null);

      vi.spyOn(Supplier.prototype, 'save').mockImplementation(async function (this: any) {
        return this;
      });

      const supplier = await ProcurementService.createSupplier(shopAId, {
        companyName: 'Smart Technologies BD Ltd',
        phone: '01799887766',
        contactPerson: 'Kamal Hossain',
        openingPayable: '50000.00'
      });

      expect(supplier.companyName).toBe('Smart Technologies BD Ltd');
      expect(supplier.shopId).toBe(shopAId);
      expect(formatMoney(decimal128Getter(supplier.currentDueBalance))).toBe('50000.00');
    });

    it('enforces strict tenant isolation for supplier lookups', async () => {
      const supplierId = new mongoose.Types.ObjectId().toString();

      // Mock finding supplier in Shop A
      vi.spyOn(Supplier, 'findOne').mockImplementation((filter: any) => {
        if (filter.shopId?.toString() === shopAId.toString() && filter._id?.toString() === supplierId) {
          return Promise.resolve({
            _id: new mongoose.Types.ObjectId(supplierId),
            shopId: shopAId,
            companyName: 'Shop A Supplier',
            phone: '01711223344',
            openingPayable: decimal128Setter(0),
            currentDueBalance: decimal128Setter(10000),
            status: 'active',
            isDeleted: false
          }) as any;
        }
        return Promise.resolve(null) as any;
      });

      // Shop A can read its supplier
      const supplierA = await ProcurementService.getSupplierById(shopAId, supplierId);
      expect(supplierA.name).toBe('Shop A Supplier');

      // Shop B cannot read Shop A's supplier (cross-tenant access denied)
      await expect(ProcurementService.getSupplierById(shopBId, supplierId)).rejects.toThrow(
        'Supplier not found or access denied'
      );
    });

    it('reconciles 360-degree supplier statement with GRN, PRV, and Payments', async () => {
      const supplierId = new mongoose.Types.ObjectId();
      const mockSupplier = {
        _id: supplierId,
        shopId: shopAId,
        companyName: 'Walton Digi-Tech',
        phone: '01700112233',
        openingPayable: decimal128Setter(20000),
        currentDueBalance: decimal128Setter(65000),
        createdAt: new Date('2026-10-01'),
        isDeleted: false
      };

      vi.spyOn(Supplier, 'findOne').mockResolvedValue(mockSupplier as any);

      // GRN 1: +80,000 purchase, 10,000 paid immediately
      const mockGrn = [
        {
          grnNo: 'GRN-202610-0001',
          supplierId,
          totalInvoiceAmount: decimal128Setter(80000),
          paidAmount: decimal128Setter(10000),
          dueAmount: decimal128Setter(70000),
          createdAt: new Date('2026-10-03')
        }
      ];
      vi.spyOn(GoodsReceivedNote, 'find').mockReturnValue({
        sort: () => ({ lean: vi.fn().mockResolvedValue(mockGrn) })
      } as any);

      // PRV 1: -15,000 defective return
      const mockPrv = [
        {
          prvNo: 'PRV-202610-0001',
          supplierId,
          totalRefundAmount: decimal128Setter(15000),
          reason: 'Dead on Arrival',
          createdAt: new Date('2026-10-05')
        }
      ];
      vi.spyOn(PurchaseReturnVoucher, 'find').mockReturnValue({
        sort: () => ({ lean: vi.fn().mockResolvedValue(mockPrv) })
      } as any);

      // Payout 1: -10,000 bank transfer
      const mockPayments = [
        {
          voucherNo: 'PV-202610-0001',
          sourceDocId: supplierId,
          debit: decimal128Setter(10000),
          description: 'Supplier Settlement Voucher',
          createdAt: new Date('2026-10-08')
        }
      ];
      vi.spyOn(AccountTransaction, 'find').mockReturnValue({
        sort: () => ({ lean: vi.fn().mockResolvedValue(mockPayments) })
      } as any);

      const statement = await ProcurementService.getSupplierStatement(shopAId, supplierId.toString());

      // Net calculation: 20,000 (opening) + 80,000 (GRN) - 10,000 (direct pay) - 15,000 (PRV) - 10,000 (PV) = 65,000
      expect(statement.summary.openingPayable).toBe('20000.00');
      expect(statement.summary.totalPurchases).toBe('80000.00');
      expect(statement.summary.totalReturns).toBe('15000.00');
      expect(statement.summary.totalPayments).toBe('10000.00');
      expect(statement.summary.netOutstandingDue).toBe('65000.00');
      expect(statement.transactions.length).toBe(5);
    });

    it('processes supplier payment idempotently and prevents double-posting (TX-08)', async () => {
      const supplierId = new mongoose.Types.ObjectId();
      const mockSupplier = {
        _id: supplierId,
        shopId: shopAId,
        companyName: 'Excel Telecom',
        phone: '01899112233',
        currentDueBalance: decimal128Setter(50000),
        isDeleted: false,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Supplier, 'findOne').mockResolvedValue(mockSupplier as any);

      // First run: voucher does not exist yet
      vi.spyOn(AccountTransaction, 'findOne').mockResolvedValueOnce(null);

      // Mock Account lookup & save
      vi.spyOn(Account, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        code: '1.2.01',
        name: 'Bank Account',
        currentBalance: decimal128Setter(200000),
        normalBalance: 'debit',
        save: vi.fn().mockResolvedValue(true)
      } as any);

      vi.spyOn(AccountTransaction.prototype, 'save').mockResolvedValue(true as any);

      const paymentResult1 = await ProcurementService.recordSupplierPayment(
        shopAId,
        supplierId.toString(),
        {
          amount: '20000.00',
          paymentMethod: 'bank_transfer',
          referenceNo: 'EFTN-TEST-1001'
        },
        userId,
        'PV-IDEM-001'
      );

      expect(paymentResult1.success).toBe(true);
      expect(paymentResult1.amountPaid).toBe('20000.00');
      expect(paymentResult1.supplierDueRemaining).toBe('30000.00');

      // Second run: retrying with the same idempotency key returns idempotent replay without double-decrement
      vi.spyOn(AccountTransaction, 'findOne').mockResolvedValueOnce({
        voucherNo: 'PV-IDEM-001'
      } as any);

      const paymentResult2 = await ProcurementService.recordSupplierPayment(
        shopAId,
        supplierId.toString(),
        {
          amount: '20000.00',
          paymentMethod: 'bank_transfer',
          referenceNo: 'EFTN-TEST-1001'
        },
        userId,
        'PV-IDEM-001'
      );

      expect(paymentResult2.idempotent).toBe(true);
      expect(paymentResult2.message).toContain('idempotent replay');
      expect(mockSupplier.save).toHaveBeenCalledTimes(1); // Saved only once!
    });
  });

  // =========================================================================
  // 2. PURCHASE ORDERS & GOODS RECEIVED NOTES (GRN - TX-07)
  // =========================================================================
  describe('Purchase Orders & GRN Receiving (TX-07)', () => {
    it('validates dual-IMEI with Luhn algorithm and rejects invalid IMEIs', async () => {
      const supplierId = new mongoose.Types.ObjectId();
      vi.spyOn(Supplier, 'findOne').mockResolvedValue({ _id: supplierId, shopId: shopAId, isDeleted: false } as any);

      const variantId = new mongoose.Types.ObjectId();
      vi.spyOn(ProductVariant, 'findOne').mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: variantId,
          sku: 'PHONE-X',
          productId: { hasImei: true }
        })
      } as any);

      // Test with invalid 14-digit IMEI
      await expect(
        ProcurementService.processGrn(
          shopAId,
          {
            supplierId: supplierId.toString(),
            items: [
              {
                variantId: variantId.toString(),
                unitCost: '25000.00',
                imeiPairs: [{ imei1: '12345678901234' }] // 14 digits -> invalid
              }
            ]
          },
          userId
        )
      ).rejects.toThrow('invalid (must be 15 digits passing Luhn checksum)');
    });

    it('rejects duplicate IMEIs detected in active stock', async () => {
      const supplierId = new mongoose.Types.ObjectId();
      vi.spyOn(Supplier, 'findOne').mockResolvedValue({ _id: supplierId, shopId: shopAId, isDeleted: false } as any);

      const variantId = new mongoose.Types.ObjectId();
      vi.spyOn(ProductVariant, 'findOne').mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: variantId,
          sku: 'PHONE-X',
          productId: { hasImei: true }
        })
      } as any);

      const validImei = makeValidImei('86749204123451');

      // Existing active handset with same IMEI
      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        imei1: validImei,
        status: 'AVAILABLE'
      } as any);

      await expect(
        ProcurementService.processGrn(
          shopAId,
          {
            supplierId: supplierId.toString(),
            items: [
              {
                variantId: variantId.toString(),
                unitCost: '25000.00',
                imeiPairs: [{ imei1: validImei }]
              }
            ]
          },
          userId
        )
      ).rejects.toThrow('already exists in active stock');
    });

    it('freezes exact landed cost per handset and updates PO pending balances (TC-28)', async () => {
      const supplierId = new mongoose.Types.ObjectId();
      const mockSupplier = {
        _id: supplierId,
        shopId: shopAId,
        companyName: 'Xiaomi Official',
        currentDueBalance: decimal128Setter(0),
        isDeleted: false,
        save: vi.fn().mockResolvedValue(true)
      };
      vi.spyOn(Supplier, 'findOne').mockResolvedValue(mockSupplier as any);

      const variantId = new mongoose.Types.ObjectId();
      const mockVariant = {
        _id: variantId,
        sku: 'REDMI-13-PRO',
        currentStock: 0,
        productId: { hasImei: true },
        save: vi.fn().mockResolvedValue(true)
      };
      vi.spyOn(ProductVariant, 'findOne').mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockVariant),
        session: () => Promise.resolve(mockVariant)
      } as any);

      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue(null);

      // TC-28: PO issued for 50 units
      const poId = new mongoose.Types.ObjectId();
      const mockPo = {
        _id: poId,
        shopId: shopAId,
        poNo: 'PO-202610-0088',
        status: 'ordered',
        items: [
          {
            variantId,
            orderedQuantity: 50,
            receivedQuantity: 0,
            estimatedCost: decimal128Setter(24200)
          }
        ],
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(PurchaseOrder, 'findOne').mockReturnValue({
        session: () => Promise.resolve(mockPo)
      } as any);

      vi.spyOn(ImeiSerial, 'insertMany').mockResolvedValue([{}, {}] as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);
      vi.spyOn(GoodsReceivedNote.prototype, 'save').mockResolvedValue(true as any);

      const imei1 = makeValidImei('86749204123451');
      const imei2 = makeValidImei('86749204123452');

      // Receive partial shipment: 2 units delivered today
      const grnResult = await ProcurementService.processGrn(
        shopAId,
        {
          supplierId: supplierId.toString(),
          poId: poId.toString(),
          items: [
            {
              variantId: variantId.toString(),
              unitCost: '24200.00',
              quantity: 2,
              imeiPairs: [
                { imei1 },
                { imei1: imei2 }
              ]
            }
          ],
          paidAmount: '0.00'
        },
        userId
      );

      expect(grnResult.success).toBe(true);
      expect(grnResult.totalInvoiceAmount).toBe('48400.00'); // 2 handsets evaluated
      // TC-28: PO marked partially received
      expect(mockPo.status).toBe('partially_received');
      expect(mockPo.items[0]!.receivedQuantity).toBe(2);
    });
  });

  // =========================================================================
  // 3. PURCHASE RETURN VOUCHER (PRV - TX-08 / TC-19)
  // =========================================================================
  describe('Purchase Return Voucher (PRV - TX-08)', () => {
    it('TC-19: returning 2 defective phones (৳30,000) decreases supplier payable by exactly ৳30,000', async () => {
      const supplierId = new mongoose.Types.ObjectId();
      const mockSupplier = {
        _id: supplierId,
        shopId: shopAId,
        companyName: 'Transsion Holding',
        currentDueBalance: decimal128Setter(100000), // Starting Due: ৳100,000
        isDeleted: false,
        save: vi.fn().mockResolvedValue(true)
      };
      vi.spyOn(Supplier, 'findOne').mockResolvedValue(mockSupplier as any);

      const variantId = new mongoose.Types.ObjectId();
      const mockVariant = {
        _id: variantId,
        currentStock: 10,
        save: vi.fn().mockResolvedValue(true)
      };
      vi.spyOn(ProductVariant, 'findOne').mockReturnValue({
        session: () => Promise.resolve(mockVariant)
      } as any);

      // Two available handsets to return
      const phone1 = {
        _id: new mongoose.Types.ObjectId(),
        shopId: shopAId,
        variantId,
        imei1: '860123456789088',
        purchaseCost: decimal128Setter(15000),
        status: 'AVAILABLE',
        save: vi.fn().mockResolvedValue(true)
      };
      const phone2 = {
        _id: new mongoose.Types.ObjectId(),
        shopId: shopAId,
        variantId,
        imei1: '860123456789089',
        purchaseCost: decimal128Setter(15000),
        status: 'AVAILABLE',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(ImeiSerial, 'findOne').mockImplementation((filter: any) => {
        if (filter.imei1 === '860123456789088') return Promise.resolve(phone1 as any);
        if (filter.imei1 === '860123456789089') return Promise.resolve(phone2 as any);
        return Promise.resolve(null as any);
      });

      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);
      vi.spyOn(PurchaseReturnVoucher.prototype, 'save').mockResolvedValue(true as any);

      // TC-19 Execution: Return 2 phones with return cost ৳15,000 each = ৳30,000 total
      const prvResult = await ProcurementService.processPurchaseReturn(
        shopAId,
        {
          supplierId: supplierId.toString(),
          items: [
            { variantId: variantId.toString(), imei1: '860123456789088', returnCost: '15000.00', reason: 'DOA Camera' },
            { variantId: variantId.toString(), imei1: '860123456789089', returnCost: '15000.00', reason: 'DOA Display' }
          ],
          notes: 'TC-19 Defective Phone Netting'
        },
        userId
      );

      expect(prvResult.success).toBe(true);
      expect(prvResult.totalRefundAmount).toBe('30000.00'); // Exactly ৳30,000
      expect(prvResult.supplierDueRemaining).toBe('70000.00'); // ৳100,000 - ৳30,000 = ৳70,000
      expect(phone1.status).toBe('RETURNED_TO_SUPPLIER');
      expect(phone2.status).toBe('RETURNED_TO_SUPPLIER');
    });

    it('blocks returning phones already SOLD or belonging to another tenant', async () => {
      const supplierId = new mongoose.Types.ObjectId();
      vi.spyOn(Supplier, 'findOne').mockResolvedValue({ _id: supplierId, shopId: shopAId, isDeleted: false } as any);

      // Phone is in SOLD status
      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        shopId: shopAId,
        imei1: '860123456789099',
        status: 'SOLD'
      } as any);

      await expect(
        ProcurementService.processPurchaseReturn(
          shopAId,
          {
            supplierId: supplierId.toString(),
            items: [
              { variantId: new mongoose.Types.ObjectId().toString(), imei1: '860123456789099', returnCost: '20000.00' }
            ]
          },
          userId
        )
      ).rejects.toThrow('cannot be returned in current status: SOLD');
    });
  });

  // =========================================================================
  // 4. GODOWN-TO-OUTLET STOCK TRANSFERS (STN - TX-19 & TC-36)
  // =========================================================================
  describe('Stock Transfers & TC-36 Transit Discrepancies', () => {
    it('dispatches handsets into IN_TRANSIT with 0.00% P&L impact', async () => {
      vi.spyOn(Shop, 'findById').mockResolvedValue({
        _id: outletShopId,
        name: 'Showroom Counter Outlet'
      } as any);

      const handset1 = {
        _id: new mongoose.Types.ObjectId(),
        shopId: godownShopId,
        variantId: new mongoose.Types.ObjectId(),
        imei1: '860123456789001',
        status: 'AVAILABLE',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue(handset1 as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);
      vi.spyOn(StockTransferNote.prototype, 'save').mockResolvedValue(true as any);

      const dispatchResult = await TransferService.dispatchTransfer(
        godownShopId,
        {
          destinationShopId: outletShopId.toString(),
          imeiList: ['860123456789001'],
          notes: 'Transfer to Showroom'
        },
        userId
      );

      expect(dispatchResult.success).toBe(true);
      expect(dispatchResult.dispatchedCount).toBe(1);
      expect(handset1.status).toBe('IN_TRANSIT');
    });

    it('TC-36: dispatches 20 units, receives 19, marks 1 missing as DISPUTED_IN_TRANSIT and notifies owner via SMS', async () => {
      const stnId = new mongoose.Types.ObjectId();
      const mockItems: any[] = [];
      const mockHandsets: any[] = [];

      // Generate 20 test handsets
      for (let i = 1; i <= 20; i++) {
        const hId = new mongoose.Types.ObjectId();
        const imei = `8601234567890${i < 10 ? '0' + i : i}`;
        const handset = {
          _id: hId,
          shopId: godownShopId,
          variantId: new mongoose.Types.ObjectId(),
          imei1: imei,
          status: 'IN_TRANSIT',
          stockLocation: 'godown',
          save: vi.fn().mockResolvedValue(true)
        };
        mockHandsets.push(handset);
        mockItems.push({
          variantId: handset.variantId,
          imeiId: hId,
          imei1: imei,
          quantity: 1
        });
      }

      const mockStn = {
        _id: stnId,
        stnNo: 'STN-202610-0401',
        fromShopId: godownShopId,
        toShopId: outletShopId,
        status: 'in_transit',
        items: mockItems,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(StockTransferNote, 'findOne').mockResolvedValue(mockStn as any);
      vi.spyOn(ImeiSerial, 'findById').mockImplementation((id: any) => {
        const found = mockHandsets.find((h) => h._id.toString() === id.toString());
        return Promise.resolve(found as any);
      });

      // Shop owner user for SMS notification
      vi.spyOn(User, 'findOne').mockResolvedValue({
        _id: ownerId,
        phone: '01712345678',
        role: 'STORE_OWNER',
        isActive: true
      } as any);

      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);

      // TC-36: Destination verifies only 19 physical units (the 20th IMEI 860123456789020 is missing!)
      const received19Imeis = mockItems.slice(0, 19).map((i) => i.imei1);

      const receiveResult = await TransferService.receiveTransfer(
        outletShopId,
        stnId.toString(),
        {
          receivedImeis: received19Imeis
        },
        userId
      );

      // TC-36 Assertions
      expect(receiveResult.success).toBe(true);
      expect(receiveResult.status).toBe('discrepancy');
      expect(receiveResult.dispatchedTotal).toBe(20);
      expect(receiveResult.receivedCount).toBe(19);
      expect(receiveResult.discrepancyCount).toBe(1);
      expect(receiveResult.ownerSmsAlertSent).toBe(true);

      // The 19 matched units become AVAILABLE at the showroom outlet
      for (let i = 0; i < 19; i++) {
        expect(mockHandsets[i]!.status).toBe('AVAILABLE');
        expect(mockHandsets[i]!.shopId.toString()).toBe(outletShopId.toString());
      }

      // The missing 20th unit is flagged DISPUTED_IN_TRANSIT
      const missingHandset = mockHandsets[19]!;
      expect(missingHandset.status).toBe('DISPUTED_IN_TRANSIT');
      expect(missingHandset.shopId.toString()).toBe(godownShopId.toString()); // Not moved to destination outlet!

      // SMS Driver verification
      const smsDriver = getSmsDriver() as MockSmsDriver;
      const lastSms = smsDriver.getLastMessage('01712345678');
      expect(lastSms).toBeDefined();
      expect(lastSms?.message).toContain('ALERT: STN STN-202610-0401 received with DISCREPANCY');
      expect(lastSms?.message).toContain('Missing: 1');
    });
  });
});
