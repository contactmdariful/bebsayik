import mongoose, { ClientSession } from 'mongoose';
import {
  Supplier,
  ISupplier,
  PurchaseOrder,
  GoodsReceivedNote,
  PurchaseReturnVoucher,
  ImeiSerial,
  ProductVariant,
  InventoryMovement,
  Account,
  AccountTransaction
} from '../../models/index.js';
import { AccountingService } from '../accounting/accounting.service.js';
import {
  buildTx08SupplierPayment
} from '../accounting/journalMatrices.js';
import { InventoryService } from '../inventory/inventory.service.js';
import {
  decimal128Getter,
  decimal128Setter,
  toDecimal,
  addMoney,
  subtractMoney,
  formatMoney,
  MonetaryInput
} from '../../utils/money.js';

export class ProcurementService {
  /* ================= SUPPLIER CRM & LEDGER ================= */

  /**
   * Create a new supplier
   */
  static async createSupplier(
    shopId: mongoose.Types.ObjectId | string,
    data: {
      name?: string;
      companyName?: string;
      contactPerson?: string;
      phone: string;
      alternatePhone?: string;
      email?: string;
      address?: string;
      openingPayable?: MonetaryInput;
    }
  ): Promise<ISupplier> {
    const companyName = (data.companyName || data.name || '').trim();
    const phone = (data.phone || '').trim();

    if (!companyName) {
      const err: any = new Error('Supplier company name is required');
      err.statusCode = 400;
      err.code = 'INVALID_SUPPLIER_NAME';
      throw err;
    }

    if (!phone) {
      const err: any = new Error('Supplier phone number is required');
      err.statusCode = 400;
      err.code = 'INVALID_SUPPLIER_PHONE';
      throw err;
    }

    const existing = await Supplier.findOne({
      shopId,
      phone,
      isDeleted: false
    });

    if (existing) {
      const err: any = new Error(`Supplier with phone ${phone} already exists`);
      err.statusCode = 409;
      err.code = 'SUPPLIER_DUPLICATE_PHONE';
      throw err;
    }

    const openingPayableDec = toDecimal(data.openingPayable || 0);

    const supplier = new Supplier({
      shopId,
      companyName,
      contactPerson: data.contactPerson?.trim(),
      phone,
      alternatePhone: data.alternatePhone?.trim(),
      email: data.email?.trim().toLowerCase(),
      address: data.address?.trim(),
      openingPayable: decimal128Setter(openingPayableDec),
      currentDueBalance: decimal128Setter(openingPayableDec),
      status: 'active',
      isDeleted: false
    });

    await supplier.save();
    return supplier;
  }

  /**
   * List suppliers with search and pagination
   */
  static async getSuppliers(
    shopId: mongoose.Types.ObjectId | string,
    query: {
      search?: string;
      status?: 'active' | 'inactive';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ suppliers: any[]; total: number; page: number; limit: number; totalDue: string }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { shopId, isDeleted: false };
    if (query.status) {
      filter.status = query.status;
    }

    if (query.search?.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ companyName: regex }, { phone: regex }, { contactPerson: regex }];
    }

    const [suppliers, total, allSuppliers] = await Promise.all([
      Supplier.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Supplier.countDocuments(filter),
      Supplier.find({ shopId, isDeleted: false }, { currentDueBalance: 1 }).lean()
    ]);

    let totalDueSum = toDecimal(0);
    for (const s of allSuppliers) {
      totalDueSum = addMoney(totalDueSum, decimal128Getter(s.currentDueBalance));
    }

    return {
      suppliers: suppliers.map((s) => ({
        id: s._id.toString(),
        name: s.companyName,
        companyName: s.companyName,
        contactPerson: s.contactPerson || '',
        phone: s.phone,
        alternatePhone: s.alternatePhone || '',
        email: s.email || '',
        address: s.address || '',
        status: s.status,
        openingPayable: formatMoney(decimal128Getter(s.openingPayable)),
        currentDueBalance: formatMoney(decimal128Getter(s.currentDueBalance)),
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      })),
      total,
      page,
      limit,
      totalDue: formatMoney(totalDueSum)
    };
  }

  /**
   * Get single supplier by ID
   */
  static async getSupplierById(
    shopId: mongoose.Types.ObjectId | string,
    supplierId: string
  ): Promise<any> {
    const supplier = await Supplier.findOne({ _id: supplierId, shopId, isDeleted: false });
    if (!supplier) {
      const err: any = new Error('Supplier not found or access denied');
      err.statusCode = 404;
      err.code = 'SUPPLIER_NOT_FOUND';
      throw err;
    }

    return {
      id: supplier._id.toString(),
      name: supplier.companyName,
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone,
      alternatePhone: supplier.alternatePhone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      status: supplier.status,
      openingPayable: formatMoney(decimal128Getter(supplier.openingPayable)),
      currentDueBalance: formatMoney(decimal128Getter(supplier.currentDueBalance)),
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt
    };
  }

  /**
   * Update supplier
   */
  static async updateSupplier(
    shopId: mongoose.Types.ObjectId | string,
    supplierId: string,
    data: {
      name?: string;
      companyName?: string;
      contactPerson?: string;
      phone?: string;
      alternatePhone?: string;
      email?: string;
      address?: string;
      status?: 'active' | 'inactive';
    }
  ): Promise<any> {
    const supplier = await Supplier.findOne({ _id: supplierId, shopId, isDeleted: false });
    if (!supplier) {
      const err: any = new Error('Supplier not found or access denied');
      err.statusCode = 404;
      err.code = 'SUPPLIER_NOT_FOUND';
      throw err;
    }

    if (data.companyName || data.name) {
      supplier.companyName = (data.companyName || data.name)!.trim();
    }
    if (data.contactPerson !== undefined) supplier.contactPerson = data.contactPerson?.trim();
    if (data.phone) supplier.phone = data.phone.trim();
    if (data.alternatePhone !== undefined) supplier.alternatePhone = data.alternatePhone?.trim();
    if (data.email !== undefined) supplier.email = data.email?.trim().toLowerCase();
    if (data.address !== undefined) supplier.address = data.address?.trim();
    if (data.status) supplier.status = data.status;

    await supplier.save();
    return this.getSupplierById(shopId, supplierId);
  }

  /**
   * Get 360-degree Supplier Statement & Ledger
   */
  static async getSupplierStatement(
    shopId: mongoose.Types.ObjectId | string,
    supplierId: string
  ): Promise<any> {
    const supplier = await Supplier.findOne({ _id: supplierId, shopId, isDeleted: false });
    if (!supplier) {
      const err: any = new Error('Supplier not found');
      err.statusCode = 404;
      err.code = 'SUPPLIER_NOT_FOUND';
      throw err;
    }

    const [grns, prvs, payments] = await Promise.all([
      GoodsReceivedNote.find({ shopId, supplierId }).sort({ createdAt: 1 }).lean(),
      PurchaseReturnVoucher.find({ shopId, supplierId }).sort({ createdAt: 1 }).lean(),
      AccountTransaction.find({
        shopId,
        txnCode: 'TX-08',
        sourceDocType: { $in: ['PV', 'PAYMENT', 'PURCHASE_PAYMENT'] }
      })
        .sort({ createdAt: 1 })
        .lean()
    ]);

    // Filter payments that belong to this supplier if sourceDocId points to supplier or description contains supplier
    const supplierPayments = payments.filter((p) => {
      if (p.sourceDocId && p.sourceDocId.toString() === supplierId.toString()) return true;
      if (p.description?.includes(supplier.companyName) || p.description?.includes(supplier.phone)) return true;
      return false;
    });

    const timeline: any[] = [];

    // Opening Balance
    const openingBal = toDecimal(decimal128Getter(supplier.openingPayable));
    if (openingBal.greaterThan(0)) {
      timeline.push({
        date: supplier.createdAt,
        type: 'OPENING_BALANCE',
        referenceNo: 'OPENING',
        description: 'Opening Payable Balance',
        debit: '0.00',
        credit: formatMoney(openingBal),
        amount: openingBal
      });
    }

    // Purchases (GRN)
    for (const grn of grns) {
      const invTotal = toDecimal(decimal128Getter(grn.totalInvoiceAmount));
      timeline.push({
        date: grn.createdAt,
        type: 'PURCHASE_GRN',
        referenceNo: grn.grnNo,
        description: `Goods Received Note: ${grn.grnNo}${grn.notes ? ` - ${grn.notes}` : ''}`,
        debit: '0.00',
        credit: formatMoney(invTotal),
        amount: invTotal
      });

      const paid = toDecimal(decimal128Getter(grn.paidAmount));
      if (paid.greaterThan(0)) {
        timeline.push({
          date: grn.createdAt,
          type: 'DIRECT_PAYMENT',
          referenceNo: `${grn.grnNo}-PAY`,
          description: `Direct payment on receipt for ${grn.grnNo}`,
          debit: formatMoney(paid),
          credit: '0.00',
          amount: paid.negated()
        });
      }
    }

    // Returns (PRV)
    for (const prv of prvs) {
      const refund = toDecimal(decimal128Getter(prv.totalRefundAmount));
      timeline.push({
        date: prv.createdAt,
        type: 'PURCHASE_RETURN',
        referenceNo: prv.prvNo,
        description: `Purchase Return Voucher: ${prv.prvNo} - ${prv.reason}`,
        debit: formatMoney(refund),
        credit: '0.00',
        amount: refund.negated()
      });
    }

    // Payouts
    for (const pay of supplierPayments) {
      const payAmt = toDecimal(decimal128Getter(pay.debit));
      timeline.push({
        date: pay.createdAt,
        type: 'SUPPLIER_PAYOUT',
        referenceNo: pay.voucherNo,
        description: pay.description || `Supplier Settlement Voucher: ${pay.voucherNo}`,
        debit: formatMoney(payAmt),
        credit: '0.00',
        amount: payAmt.negated()
      });
    }

    // Sort timeline chronologically
    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = toDecimal(0);
    const ledgerEntries = timeline.map((entry) => {
      if (entry.type === 'OPENING_BALANCE' || entry.type === 'PURCHASE_GRN') {
        runningBalance = addMoney(runningBalance, entry.credit);
      } else {
        runningBalance = subtractMoney(runningBalance, entry.debit);
      }
      return {
        date: entry.date,
        type: entry.type,
        referenceNo: entry.referenceNo,
        description: entry.description,
        debit: entry.debit,
        credit: entry.credit,
        runningBalance: formatMoney(runningBalance)
      };
    });

    const totalPurchases = grns.reduce(
      (sum, g) => addMoney(sum, decimal128Getter(g.totalInvoiceAmount)),
      toDecimal(0)
    );
    const totalReturns = prvs.reduce(
      (sum, p) => addMoney(sum, decimal128Getter(p.totalRefundAmount)),
      toDecimal(0)
    );
    const totalPayments = supplierPayments.reduce(
      (sum, p) => addMoney(sum, decimal128Getter(p.debit)),
      toDecimal(0)
    );

    return {
      supplier: {
        id: supplier._id.toString(),
        name: supplier.companyName,
        phone: supplier.phone,
        contactPerson: supplier.contactPerson || '',
        currentDueBalance: formatMoney(decimal128Getter(supplier.currentDueBalance))
      },
      summary: {
        openingPayable: formatMoney(decimal128Getter(supplier.openingPayable)),
        totalPurchases: formatMoney(totalPurchases),
        totalReturns: formatMoney(totalReturns),
        totalPayments: formatMoney(totalPayments),
        netOutstandingDue: formatMoney(decimal128Getter(supplier.currentDueBalance))
      },
      transactions: ledgerEntries
    };
  }

  /**
   * Record Supplier Payment (TX-08)
   */
  static async recordSupplierPayment(
    shopId: mongoose.Types.ObjectId | string,
    supplierId: string,
    data: {
      accountId?: string;
      amount: MonetaryInput;
      paymentMethod?: string;
      referenceNo?: string;
      notes?: string;
    },
    userId: mongoose.Types.ObjectId | string,
    idempotencyKey?: string
  ): Promise<any> {
    const paymentAmount = toDecimal(data.amount);
    if (!paymentAmount.greaterThan(0)) {
      const err: any = new Error('Payment amount must be greater than zero');
      err.statusCode = 400;
      err.code = 'INVALID_PAYMENT_AMOUNT';
      throw err;
    }

    const supplier = await Supplier.findOne({ _id: supplierId, shopId, isDeleted: false });
    if (!supplier) {
      const err: any = new Error('Supplier not found');
      err.statusCode = 404;
      err.code = 'SUPPLIER_NOT_FOUND';
      throw err;
    }

    const pvNo = idempotencyKey || `PV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(10000 + Math.random() * 90000)}`;

    // Check if voucher already posted (idempotency)
    const existingTxn = await AccountTransaction.findOne({ shopId, voucherNo: pvNo });
    if (existingTxn) {
      return {
        idempotent: true,
        voucherNo: pvNo,
        amount: formatMoney(paymentAmount),
        supplierDueRemaining: formatMoney(decimal128Getter(supplier.currentDueBalance)),
        message: 'Payment already processed with this reference (idempotent replay)'
      };
    }

    // Determine disbursement account code
    let sourceAccountCode = '1.2.01'; // Bank default
    if (data.paymentMethod === 'cash') {
      sourceAccountCode = '1.1.01'; // Cash Drawer
    }
    if (data.accountId) {
      const acc = await Account.findOne({ _id: data.accountId, shopId });
      if (acc) {
        sourceAccountCode = acc.code;
      }
    }

    const executeInTransaction = async (session: ClientSession) => {
      // 1. Decrement supplier due balance
      const currentDue = toDecimal(decimal128Getter(supplier.currentDueBalance));
      const newDue = subtractMoney(currentDue, paymentAmount);
      supplier.currentDueBalance = decimal128Setter(newDue);
      if (session) {
        await supplier.save({ session });
      } else {
        await supplier.save();
      }

      // 2. Post TX-08 General Ledger double-entry journal
      // Debit: 2.1.01 Accounts Payable
      // Credit: Source Account (1.1.01 or 1.2.01)
      const journalEntries = buildTx08SupplierPayment({
        amount: paymentAmount,
        sourceAccountCode
      });

      const journal = await AccountingService.postDoubleEntryJournal({
        shopId: new mongoose.Types.ObjectId(shopId),
        voucherNo: pvNo,
        txnCode: 'TX-08',
        sourceDocType: 'PV',
        sourceDocId: new mongoose.Types.ObjectId(supplierId),
        postedByUserId: new mongoose.Types.ObjectId(userId),
        entries: journalEntries,
        session
      });

      return { journal, newDue };
    };

    let session: ClientSession | null = null;
    let result: any;

    try {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        result = await executeInTransaction(session!);
      });
    } catch (sessionErr: any) {
      if (
        sessionErr?.message?.includes('Transactions are not supported') ||
        sessionErr?.message?.includes('replica set')
      ) {
        result = await executeInTransaction(null as any);
      } else {
        throw sessionErr;
      }
    } finally {
      if (session) await session.endSession();
    }

    return {
      success: true,
      voucherNo: pvNo,
      supplierId: supplier._id.toString(),
      supplierName: supplier.companyName,
      amountPaid: formatMoney(paymentAmount),
      supplierDueRemaining: formatMoney(result.newDue),
      journal: result.journal
    };
  }

  /* ================= PURCHASE ORDERS ================= */

  /**
   * Create Purchase Order
   */
  static async createPurchaseOrder(
    shopId: mongoose.Types.ObjectId | string,
    data: {
      supplierId: string;
      items: Array<{
        variantId: string;
        orderedQuantity: number;
        estimatedCost: MonetaryInput;
      }>;
      expectedDeliveryDate?: Date | string;
      notes?: string;
    },
    _userId?: mongoose.Types.ObjectId | string
  ): Promise<any> {
    const supplier = await Supplier.findOne({ _id: data.supplierId, shopId, isDeleted: false });
    if (!supplier) {
      const err: any = new Error('Supplier not found');
      err.statusCode = 404;
      err.code = 'SUPPLIER_NOT_FOUND';
      throw err;
    }

    if (!data.items || data.items.length === 0) {
      const err: any = new Error('Purchase order requires at least one item');
      err.statusCode = 400;
      err.code = 'EMPTY_PO_ITEMS';
      throw err;
    }

    let totalEstimated = toDecimal(0);
    const poItems = data.items.map((item) => {
      const qty = Math.max(1, Number(item.orderedQuantity) || 1);
      const cost = toDecimal(item.estimatedCost);
      totalEstimated = addMoney(totalEstimated, cost.times(qty));

      return {
        variantId: new mongoose.Types.ObjectId(item.variantId),
        orderedQuantity: qty,
        receivedQuantity: 0,
        estimatedCost: decimal128Setter(cost)
      };
    });

    const poNo = `PO-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(10000 + Math.random() * 90000)}`;

    const po = new PurchaseOrder({
      shopId,
      poNo,
      supplierId: supplier._id,
      totalEstimatedAmount: decimal128Setter(totalEstimated),
      status: 'ordered',
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
      items: poItems,
      notes: data.notes
    });

    await po.save();

    return {
      id: po._id.toString(),
      poNo: po.poNo,
      supplierId: supplier._id.toString(),
      supplierName: supplier.companyName,
      totalEstimatedAmount: formatMoney(totalEstimated),
      status: po.status,
      items: po.items.map((i) => ({
        variantId: i.variantId.toString(),
        orderedQuantity: i.orderedQuantity,
        receivedQuantity: i.receivedQuantity,
        pendingQuantity: i.orderedQuantity - i.receivedQuantity,
        estimatedCost: formatMoney(decimal128Getter(i.estimatedCost))
      })),
      createdAt: po.createdAt
    };
  }

  /**
   * List Purchase Orders
   */
  static async getPurchaseOrders(
    shopId: mongoose.Types.ObjectId | string,
    query: {
      status?: string;
      supplierId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<any> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { shopId };
    if (query.status) filter.status = query.status;
    if (query.supplierId) filter.supplierId = query.supplierId;

    const [pos, total] = await Promise.all([
      PurchaseOrder.find(filter)
        .populate('supplierId', 'companyName phone')
        .populate('items.variantId', 'sku variantAttributes')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PurchaseOrder.countDocuments(filter)
    ]);

    return {
      orders: pos.map((po) => ({
        id: po._id.toString(),
        poNo: po.poNo,
        supplier: po.supplierId,
        totalEstimatedAmount: formatMoney(decimal128Getter(po.totalEstimatedAmount)),
        status: po.status,
        expectedDeliveryDate: po.expectedDeliveryDate,
        itemsCount: po.items.length,
        items: po.items.map((i) => ({
          variantId: i.variantId,
          orderedQuantity: i.orderedQuantity,
          receivedQuantity: i.receivedQuantity,
          pendingQuantity: i.orderedQuantity - i.receivedQuantity,
          estimatedCost: formatMoney(decimal128Getter(i.estimatedCost))
        })),
        createdAt: po.createdAt
      })),
      total,
      page,
      limit
    };
  }

  /* ================= GOODS RECEIVED NOTES (GRN - TX-07) ================= */

  /**
   * Process GRN (TX-07)
   * Handsets lock exact purchase cost tied to unique IMEI (no cost averaging).
   * Validates dual IMEIs with Luhn 15-digit algorithm.
   * Decrements pending PO balance and updates status to PARTIALLY_FULFILLED or COMPLETED (TC-28).
   * Posts Debit 1210 / Credit 2010.
   */
  static async processGrn(
    shopId: mongoose.Types.ObjectId | string,
    data: {
      supplierId: string;
      poId?: string;
      purchaseNo?: string;
      items: Array<{
        variantId: string;
        unitCost: MonetaryInput;
        quantity?: number;
        imeiPairs?: Array<{ imei1: string; imei2?: string }>;
      }>;
      paidAmount?: MonetaryInput;
      notes?: string;
    },
    userId: mongoose.Types.ObjectId | string,
    idempotencyKey?: string
  ): Promise<any> {
    const supplier = await Supplier.findOne({ _id: data.supplierId, shopId, isDeleted: false });
    if (!supplier) {
      const err: any = new Error('Supplier not found');
      err.statusCode = 404;
      err.code = 'SUPPLIER_NOT_FOUND';
      throw err;
    }

    if (!data.items || data.items.length === 0) {
      const err: any = new Error('GRN must contain at least one line item');
      err.statusCode = 400;
      err.code = 'EMPTY_GRN_ITEMS';
      throw err;
    }

    const grnNo = idempotencyKey || `GRN-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(10000 + Math.random() * 90000)}`;

    // Idempotency check: don't double process same GRN
    const existingGrn = await GoodsReceivedNote.findOne({ shopId, grnNo });
    if (existingGrn) {
      return {
        idempotent: true,
        grnNo: existingGrn.grnNo,
        totalInvoiceAmount: formatMoney(decimal128Getter(existingGrn.totalInvoiceAmount)),
        message: 'GRN has already been processed (idempotent response)'
      };
    }

    // 1. Dual-IMEI & Luhn validation
    const seenImeisInBatch = new Set<string>();
    const imeiDocsToInsert: any[] = [];
    let handsetTotal = toDecimal(0);
    let accessoryTotal = toDecimal(0);

    for (const line of data.items) {
      const unitCost = toDecimal(line.unitCost);
      const variant = await ProductVariant.findOne({ _id: line.variantId, shopId }).populate('productId');

      if (!variant) {
        const err: any = new Error(`Variant ${line.variantId} not found for this tenant`);
        err.statusCode = 404;
        err.code = 'VARIANT_NOT_FOUND';
        throw err;
      }

      const isHandset = (variant.productId as any)?.hasImei !== false && (line.imeiPairs && line.imeiPairs.length > 0);

      if (isHandset) {
        const pairs = line.imeiPairs || [];
        if (pairs.length === 0) {
          const err: any = new Error(`Handset variant "${variant.sku}" requires at least one IMEI pair`);
          err.statusCode = 400;
          err.code = 'MISSING_IMEI_PAIR';
          throw err;
        }

        for (const pair of pairs) {
          const imei1 = (pair.imei1 || '').trim();
          const imei2 = pair.imei2 ? pair.imei2.trim() : undefined;

          // Validate 15-digit Luhn
          if (!InventoryService.validateLuhnImei(imei1)) {
            const err: any = new Error(`IMEI1 "${imei1}" is invalid (must be 15 digits passing Luhn checksum)`);
            err.statusCode = 422;
            err.code = 'INVALID_LUHN_IMEI';
            throw err;
          }

          if (imei2) {
            if (!InventoryService.validateLuhnImei(imei2)) {
              const err: any = new Error(`IMEI2 "${imei2}" is invalid (must be 15 digits passing Luhn checksum)`);
              err.statusCode = 422;
              err.code = 'INVALID_LUHN_IMEI';
              throw err;
            }
            if (imei1 === imei2) {
              const err: any = new Error(`IMEI1 and IMEI2 cannot be identical (${imei1})`);
              err.statusCode = 422;
              err.code = 'DUPLICATE_IMEI_PAIR';
              throw err;
            }
          }

          // Check batch duplicates
          if (seenImeisInBatch.has(imei1) || (imei2 && seenImeisInBatch.has(imei2))) {
            const err: any = new Error(`Duplicate IMEI detected in receipt batch: ${imei1}`);
            err.statusCode = 409;
            err.code = 'DUPLICATE_BATCH_IMEI';
            throw err;
          }
          seenImeisInBatch.add(imei1);
          if (imei2) seenImeisInBatch.add(imei2);

          // Check active stock in DB (AVAILABLE, HELD_CART, IN_TRANSIT)
          const activeDuplicate = await ImeiSerial.findOne({
            shopId,
            $or: [{ imei1 }, { imei2: imei1 }, ...(imei2 ? [{ imei1: imei2 }, { imei2 }] : [])],
            status: { $in: ['AVAILABLE', 'available', 'HELD_CART', 'held_cart', 'IN_TRANSIT', 'in_transit'] }
          });

          if (activeDuplicate) {
            const err: any = new Error(`IMEI "${imei1}" already exists in active stock`);
            err.statusCode = 409;
            err.code = 'DUPLICATE_ACTIVE_IMEI';
            throw err;
          }

          // Freeze exact landed cost on handset (no cost averaging!)
          imeiDocsToInsert.push({
            shopId: new mongoose.Types.ObjectId(shopId),
            variantId: variant._id,
            imei1,
            imei2,
            purchaseCost: decimal128Setter(unitCost),
            status: 'AVAILABLE',
            stockLocation: 'main_outlet',
            source: 'purchase',
            purchaseDate: new Date(),
            intakeDate: new Date()
          });

          handsetTotal = addMoney(handsetTotal, unitCost);
        }
      } else {
        // Accessory / Non-serialized item
        const qty = Math.max(1, Number(line.quantity) || 1);
        accessoryTotal = addMoney(accessoryTotal, unitCost.times(qty));
      }
    }

    const totalInvoiceAmount = addMoney(handsetTotal, accessoryTotal);
    const paidAmount = toDecimal(data.paidAmount || 0);
    const dueAmount = subtractMoney(totalInvoiceAmount, paidAmount);

    // 2. Execute atomic transaction
    const executeInTransaction = async (session: ClientSession) => {
      // A. Create IMEI records
      let createdImeis: any[] = [];
      if (imeiDocsToInsert.length > 0) {
        createdImeis = await ImeiSerial.insertMany(imeiDocsToInsert, { session });
      }

      // B. Update Variant Stock & append Inventory Movements
      for (const line of data.items) {
        const qty = line.imeiPairs?.length || line.quantity || 1;
        const variant = await ProductVariant.findOne({ _id: line.variantId, shopId }).session(session);
        if (variant) {
          variant.currentStock = (variant.currentStock || 0) + qty;
          await variant.save({ session });
        }

        const movement = new InventoryMovement({
          shopId: new mongoose.Types.ObjectId(shopId),
          variantId: new mongoose.Types.ObjectId(line.variantId),
          movementType: 'in_purchase',
          quantityDelta: qty,
          referenceDocType: 'GRN',
          performedByUserId: new mongoose.Types.ObjectId(userId),
          notes: `GRN Intake ${grnNo}`
        });
        await movement.save({ session });
      }

      // C. Post TX-07 Double-Entry Journal
      // Debit: 1.5.01 Merchandise Inventory — Handsets (handsetTotal)
      // Debit: 1.5.02 Merchandise Inventory — Accessories (accessoryTotal, if > 0)
      // Credit: 2.1.01 Accounts Payable (totalInvoiceAmount)
      const journalEntries: any[] = [];
      if (handsetTotal.greaterThan(0)) {
        journalEntries.push({
          accountCode: '1.5.01',
          debit: handsetTotal,
          credit: 0,
          description: `Handset Inventory Landed Cost (${grnNo})`
        });
      }
      if (accessoryTotal.greaterThan(0)) {
        journalEntries.push({
          accountCode: '1.5.02',
          debit: accessoryTotal,
          credit: 0,
          description: `Accessory Inventory Landed Cost (${grnNo})`
        });
      }
      journalEntries.push({
        accountCode: '2.1.01',
        debit: 0,
        credit: totalInvoiceAmount,
        description: `Accounts Payable — ${supplier.companyName} (${grnNo})`
      });

      // Immediate partial/full payment on receipt if paidAmount > 0
      if (paidAmount.greaterThan(0)) {
        journalEntries.push(
          {
            accountCode: '2.1.01',
            debit: paidAmount,
            credit: 0,
            description: `Payable Cleared by Instant Payment (${grnNo})`
          },
          {
            accountCode: '1.1.01', // Cash Drawer
            debit: 0,
            credit: paidAmount,
            description: `Payment Disbursed on Intake (${grnNo})`
          }
        );
      }

      const journal = await AccountingService.postDoubleEntryJournal({
        shopId: new mongoose.Types.ObjectId(shopId),
        voucherNo: grnNo,
        txnCode: 'TX-07',
        sourceDocType: 'GRN',
        postedByUserId: new mongoose.Types.ObjectId(userId),
        entries: journalEntries,
        session
      });

      // D. Update Supplier Due Balance
      const currentDue = toDecimal(decimal128Getter(supplier.currentDueBalance));
      supplier.currentDueBalance = decimal128Setter(addMoney(currentDue, dueAmount));
      if (session) {
        await supplier.save({ session });
      } else {
        await supplier.save();
      }

      // E. Update linked PO (TC-28: Partial GRN Receiving)
      let poRecord: any = null;
      if (data.poId) {
        poRecord = await PurchaseOrder.findOne({ _id: data.poId, shopId }).session(session);
        if (poRecord) {
          let totalOrdered = 0;
          let totalReceived = 0;

          for (const poItem of poRecord.items) {
            totalOrdered += poItem.orderedQuantity;

            const receivedLine = data.items.find(
              (i) => i.variantId.toString() === poItem.variantId.toString()
            );
            if (receivedLine) {
              const lineQty = receivedLine.imeiPairs?.length || receivedLine.quantity || 0;
              poItem.receivedQuantity = (poItem.receivedQuantity || 0) + lineQty;
            }
            totalReceived += poItem.receivedQuantity;
          }

          if (totalReceived >= totalOrdered) {
            poRecord.status = 'completed';
          } else {
            poRecord.status = 'partially_received';
          }
          await poRecord.save({ session });
        }
      }

      // F. Create GRN Record
      const grn = new GoodsReceivedNote({
        shopId: new mongoose.Types.ObjectId(shopId),
        grnNo,
        poId: data.poId ? new mongoose.Types.ObjectId(data.poId) : undefined,
        supplierId: supplier._id,
        items: data.items.map((i) => ({
          variantId: new mongoose.Types.ObjectId(i.variantId),
          quantity: i.imeiPairs?.length || i.quantity || 1,
          unitCost: decimal128Setter(i.unitCost),
          imeiPairs: i.imeiPairs
        })),
        totalInvoiceAmount: decimal128Setter(totalInvoiceAmount),
        paidAmount: decimal128Setter(paidAmount),
        dueAmount: decimal128Setter(dueAmount),
        transactionReference: journal.voucherNo,
        receivedByUserId: new mongoose.Types.ObjectId(userId),
        notes: data.notes
      });
      await grn.save({ session });

      return { grn, journal, createdImeis, poRecord };
    };

    let session: ClientSession | null = null;
    let result: any;

    try {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        result = await executeInTransaction(session!);
      });
    } catch (sessionErr: any) {
      if (
        sessionErr?.message?.includes('Transactions are not supported') ||
        sessionErr?.message?.includes('replica set')
      ) {
        result = await executeInTransaction(null as any);
      } else {
        throw sessionErr;
      }
    } finally {
      if (session) await session.endSession();
    }

    return {
      success: true,
      grnNo,
      totalInvoiceAmount: formatMoney(totalInvoiceAmount),
      paidAmount: formatMoney(paidAmount),
      dueAmount: formatMoney(dueAmount),
      supplierDueBalance: formatMoney(decimal128Getter(supplier.currentDueBalance)),
      imeisIngested: result.createdImeis.length,
      poStatus: result.poRecord ? result.poRecord.status : undefined,
      journal: result.journal
    };
  }

  /* ================= PURCHASE RETURN VOUCHERS (PRV - TX-08) ================= */

  /**
   * Process Purchase Return (PRV - TX-08)
   * TC-19: Returning 2 defective phones (Cost ৳30,000) decreases supplier payable by exactly ৳30,000.
   * IMEIs transition to RETURNED_TO_SUPPLIER.
   * Decrements stock and posts Debit 2010 / Credit 1210.
   */
  static async processPurchaseReturn(
    shopId: mongoose.Types.ObjectId | string,
    data: {
      supplierId: string;
      grnId?: string;
      items: Array<{
        variantId: string;
        imei1?: string;
        returnCost: MonetaryInput;
        reason?: string;
        quantity?: number;
      }>;
      notes?: string;
    },
    userId: mongoose.Types.ObjectId | string,
    idempotencyKey?: string
  ): Promise<any> {
    const supplier = await Supplier.findOne({ _id: data.supplierId, shopId, isDeleted: false });
    if (!supplier) {
      const err: any = new Error('Supplier not found');
      err.statusCode = 404;
      err.code = 'SUPPLIER_NOT_FOUND';
      throw err;
    }

    if (!data.items || data.items.length === 0) {
      const err: any = new Error('Purchase return voucher requires at least one item');
      err.statusCode = 400;
      err.code = 'EMPTY_PRV_ITEMS';
      throw err;
    }

    const prvNo = idempotencyKey || `PRV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(10000 + Math.random() * 90000)}`;

    // Idempotency guard
    const existingPrv = await PurchaseReturnVoucher.findOne({ shopId, prvNo });
    if (existingPrv) {
      return {
        idempotent: true,
        prvNo: existingPrv.prvNo,
        totalRefundAmount: formatMoney(decimal128Getter(existingPrv.totalRefundAmount)),
        message: 'PRV already processed (idempotent replay)'
      };
    }

    let handsetRefundTotal = toDecimal(0);
    let accessoryRefundTotal = toDecimal(0);
    const validatedHandsets: any[] = [];

    for (const item of data.items) {
      const cost = toDecimal(item.returnCost);
      if (!cost.greaterThan(0)) {
        const err: any = new Error('Return cost must be greater than zero');
        err.statusCode = 400;
        err.code = 'INVALID_RETURN_COST';
        throw err;
      }

      if (item.imei1) {
        // Serialized handset return
        const handset = await ImeiSerial.findOne({
          shopId,
          imei1: item.imei1.trim()
        });

        if (!handset) {
          const err: any = new Error(`Handset with IMEI "${item.imei1}" not found in this shop`);
          err.statusCode = 404;
          err.code = 'IMEI_NOT_FOUND';
          throw err;
        }

        if (handset.status !== 'AVAILABLE' && handset.status !== 'available' && handset.status !== 'RETURNED_INSPECTION') {
          const err: any = new Error(
            `Handset "${item.imei1}" cannot be returned in current status: ${handset.status}`
          );
          err.statusCode = 422;
          err.code = 'INVALID_IMEI_RETURN_STATUS';
          throw err;
        }

        validatedHandsets.push({ handset, itemCost: cost, reason: item.reason });
        handsetRefundTotal = addMoney(handsetRefundTotal, cost);
      } else {
        // Accessory return
        const qty = Math.max(1, Number(item.quantity) || 1);
        accessoryRefundTotal = addMoney(accessoryRefundTotal, cost.times(qty));
      }
    }

    const totalRefundAmount = addMoney(handsetRefundTotal, accessoryRefundTotal);

    // Execute atomic transaction
    const executeInTransaction = async (session: ClientSession) => {
      // A. Transition IMEIs to RETURNED_TO_SUPPLIER
      for (const vh of validatedHandsets) {
        vh.handset.status = 'RETURNED_TO_SUPPLIER';
        if (session) {
          await vh.handset.save({ session });
        } else {
          await vh.handset.save();
        }

        // Decrement Variant stock
        const variant = await ProductVariant.findOne({ _id: vh.handset.variantId, shopId }).session(session);
        if (variant && variant.currentStock > 0) {
          variant.currentStock -= 1;
          await variant.save({ session });
        }

        // Append Inventory Movement
        const movement = new InventoryMovement({
          shopId: new mongoose.Types.ObjectId(shopId),
          variantId: vh.handset.variantId,
          imeiId: vh.handset._id,
          movementType: 'out_return',
          quantityDelta: -1,
          referenceDocType: 'PRV',
          performedByUserId: new mongoose.Types.ObjectId(userId),
          notes: `PRV ${prvNo}: ${vh.reason || 'Returned to supplier'}`
        });
        await movement.save({ session });
      }

      // B. Decrement Supplier Payable Liability
      const currentDue = toDecimal(decimal128Getter(supplier.currentDueBalance));
      const updatedDue = subtractMoney(currentDue, totalRefundAmount);
      supplier.currentDueBalance = decimal128Setter(updatedDue);
      if (session) {
        await supplier.save({ session });
      } else {
        await supplier.save();
      }

      // C. Post TX-08 Purchase Return Journal
      // Debit: 2.1.01 Accounts Payable (totalRefundAmount)
      // Credit: 1.5.01 Merchandise Inventory — Handsets (handsetRefundTotal)
      // Credit: 1.5.02 Merchandise Inventory — Accessories (accessoryRefundTotal, if any)
      const journalEntries: any[] = [
        {
          accountCode: '2.1.01',
          debit: totalRefundAmount,
          credit: 0,
          description: `Supplier Accounts Payable Debited (${prvNo})`
        }
      ];

      if (handsetRefundTotal.greaterThan(0)) {
        journalEntries.push({
          accountCode: '1.5.01',
          debit: 0,
          credit: handsetRefundTotal,
          description: `Handset Inventory Relieved (${prvNo})`
        });
      }
      if (accessoryRefundTotal.greaterThan(0)) {
        journalEntries.push({
          accountCode: '1.5.02',
          debit: 0,
          credit: accessoryRefundTotal,
          description: `Accessory Inventory Relieved (${prvNo})`
        });
      }

      const journal = await AccountingService.postDoubleEntryJournal({
        shopId: new mongoose.Types.ObjectId(shopId),
        voucherNo: prvNo,
        txnCode: 'TX-08',
        sourceDocType: 'PRV',
        postedByUserId: new mongoose.Types.ObjectId(userId),
        entries: journalEntries,
        session
      });

      // D. Create PurchaseReturnVoucher record
      const prv = new PurchaseReturnVoucher({
        shopId: new mongoose.Types.ObjectId(shopId),
        prvNo,
        supplierId: supplier._id,
        grnId: data.grnId ? new mongoose.Types.ObjectId(data.grnId) : undefined,
        items: data.items.map((i) => ({
          variantId: new mongoose.Types.ObjectId(i.variantId),
          imei1: i.imei1,
          returnCost: decimal128Setter(i.returnCost),
          reason: i.reason,
          quantity: i.quantity || 1
        })),
        totalRefundAmount: decimal128Setter(totalRefundAmount),
        reason: data.notes || 'Supplier return',
        transactionReference: journal.voucherNo,
        notes: data.notes,
        processedByUserId: new mongoose.Types.ObjectId(userId)
      });
      await prv.save({ session });

      return { prv, journal, updatedDue };
    };

    let session: ClientSession | null = null;
    let result: any;

    try {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        result = await executeInTransaction(session!);
      });
    } catch (sessionErr: any) {
      if (
        sessionErr?.message?.includes('Transactions are not supported') ||
        sessionErr?.message?.includes('replica set')
      ) {
        result = await executeInTransaction(null as any);
      } else {
        throw sessionErr;
      }
    } finally {
      if (session) await session.endSession();
    }

    return {
      success: true,
      prvNo,
      supplierId: supplier._id.toString(),
      supplierName: supplier.companyName,
      totalRefundAmount: formatMoney(totalRefundAmount),
      supplierDueRemaining: formatMoney(result.updatedDue),
      returnedCount: validatedHandsets.length,
      journal: result.journal
    };
  }
}
