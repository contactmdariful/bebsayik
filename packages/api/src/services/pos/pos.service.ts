import mongoose, { ClientSession } from 'mongoose';
import argon2 from 'argon2';
import {
  Sale,
  ISale,
  SaleItem,
  HeldCart,
  IHeldCart,
  Product,
  ProductVariant,
  ImeiSerial,
  InventoryMovement,
  Shift,
  Shop,
  Customer,
  User
} from '../../models/index.js';
import { lockService } from '../lock/lock.service.js';
import { overrideTokenService } from '../security/overrideToken.service.js';
import { AccountingService, JournalEntry } from '../accounting/accounting.service.js';
import { HardwareService, ReceiptData, EscPosPrintPayload } from '../hardware/hardware.service.js';
import {
  addMoney,
  subtractMoney,
  multiplyMoney,
  toDecimal,
  formatMoney
} from '../../utils/money.js';

export interface CheckoutItemInput {
  variantId: string;
  imei1?: string;
  quantity: number;
  unitPrice: string | number;
  discountAmount?: string | number;
}

export interface CheckoutPaymentInput {
  accountId?: string;
  paymentMethod: 'cash' | 'mfs_bkash' | 'mfs_nagad' | 'bank_card' | 'customer_due' | 'trade_in' | 'bkash_merchant' | 'nagad_merchant' | 'other_mfs';
  amountReceived: string | number;
  amountApplied: string | number;
  trxReference?: string;
}

export interface CheckoutPayload {
  customerId?: string;
  items: CheckoutItemInput[];
  payments: CheckoutPaymentInput[];
  mushak63No?: string;
  managerPin?: string;
  overrideToken?: string;
  note?: string;
}

export interface CheckoutResult {
  saleId: string;
  invoiceNo: string;
  grandTotal: string;
  paidAmount: string;
  dueAmount: string;
  changeGiven: string;
  reprintCount: number;
  printData: EscPosPrintPayload;
}

export class PosService {
  /**
   * Primary Atomic Checkout Engine (TX-01 to TX-04)
   */
  static async processCheckout(params: {
    shopId: mongoose.Types.ObjectId | string;
    userId: mongoose.Types.ObjectId | string;
    idempotencyKey: string;
    payload: CheckoutPayload;
    paperWidthMm?: 58 | 80;
  }): Promise<CheckoutResult> {
    const { shopId, userId, idempotencyKey, payload, paperWidthMm = 80 } = params;
    const sId = new mongoose.Types.ObjectId(shopId);
    const uId = new mongoose.Types.ObjectId(userId);

    // Subscription & Tenant Status Check (TC-25, TC-38)
    const shop = await Shop.findById(sId);
    if (shop && (shop.status === 'read_only' || shop.status === 'suspended')) {
      const err: any = new Error(
        shop.status === 'read_only'
          ? 'Subscription is in read-only mode. New sales are blocked until renewal.'
          : 'Shop is currently suspended by platform administrator.'
      );
      err.statusCode = 403;
      err.code = shop.status === 'read_only' ? 'SUBSCRIPTION_READ_ONLY' : 'SHOP_SUSPENDED';
      throw err;
    }

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      const err: any = new Error('Mandatory Idempotency-Key header is required for POS checkout');
      err.statusCode = 400;
      err.code = 'IDEMPOTENCY_KEY_REQUIRED';
      throw err;
    }

    // 1. Idempotency Check: Return existing sale if key was already processed
    const existingSale = await Sale.findOne({ shopId: sId, idempotencyKey });
    if (existingSale) {
      return this.formatExistingSaleResult(existingSale, paperWidthMm);
    }

    const acquiredLocks: Array<{ key: string; token: string }> = [];

    // Distributed lock on Idempotency Key to prevent sub-millisecond race conditions
    const idempLockKey = `lock:idemp:${sId}:${idempotencyKey}`;
    const idempLockRes = await lockService.acquireLock(idempLockKey, 15);
    if (!idempLockRes.acquired) {
      const checkSale = await Sale.findOne({ shopId: sId, idempotencyKey });
      if (checkSale) {
        return this.formatExistingSaleResult(checkSale, paperWidthMm);
      }
      const err: any = new Error('A checkout request with this idempotency key is already in progress');
      err.statusCode = 409;
      err.code = 'IDEMPOTENCY_IN_PROGRESS';
      throw err;
    }
    acquiredLocks.push({ key: idempLockKey, token: idempLockRes.token });

    if (!payload.items || payload.items.length === 0) {
      const err: any = new Error('Cart must contain at least one item');
      err.statusCode = 400;
      err.code = 'EMPTY_CART';
      throw err;
    }

    // 2. Shift Verification: Ensure Cashier has an OPEN shift
    const openShift = await Shift.findOne({
      shopId: sId,
      cashierUserId: uId,
      status: { $in: ['open', 'OPEN'] }
    });

    if (!openShift) {
      const err: any = new Error('Checkout rejected: Cashier has no open register shift (SHIFT_NOT_OPEN)');
      err.statusCode = 422;
      err.code = 'SHIFT_NOT_OPEN';
      throw err;
    }



    try {
      // 3. Item & Stock & Pricing Verification
      const validatedItems: Array<{
        variant: any;
        product: any;
        imeiDoc?: any;
        quantity: number;
        unitPrice: string;
        discountAmount: string;
        lineTotal: string;
        landedCost: string;
      }> = [];

      let runningSubtotal = toDecimal(0);
      let runningDiscount = toDecimal(0);
      let totalHandsetRevenue = toDecimal(0);
      let totalAccessoryRevenue = toDecimal(0);
      let totalHandsetCogs = toDecimal(0);
      let totalAccessoryCogs = toDecimal(0);

      for (const itemInput of payload.items) {
        const variant = await ProductVariant.findOne({
          _id: new mongoose.Types.ObjectId(itemInput.variantId),
          shopId: sId,
          isDeleted: false
        });

        if (!variant) {
          const err: any = new Error(`Product variant not found: ${itemInput.variantId}`);
          err.statusCode = 404;
          err.code = 'VARIANT_NOT_FOUND';
          throw err;
        }

        const product = await Product.findOne({
          _id: variant.productId,
          shopId: sId,
          isDeleted: false
        });

        if (!product) {
          const err: any = new Error(`Parent product not found for variant: ${variant._id}`);
          err.statusCode = 404;
          err.code = 'PRODUCT_NOT_FOUND';
          throw err;
        }

        const unitPriceDec = toDecimal(itemInput.unitPrice);
        const discountDec = toDecimal(itemInput.discountAmount || 0);
        const qty = itemInput.quantity || 1;

        // 3a. Minimum Selling Price (MSP) Floor Check
        const mspDec = toDecimal(variant.msp);
        if (unitPriceDec.lessThan(mspDec)) {
          await this.verifyManagerOverride({
            shopId: sId.toString(),
            overrideToken: payload.overrideToken,
            managerPin: payload.managerPin
          });
        }

        let imeiDoc: any = null;
        let lineLandedCost = toDecimal(0);

        // 3b. Serialized Handset Validation
        if (itemInput.imei1 || product.hasImei || product.productType === 'handset') {
          if (!itemInput.imei1) {
            const err: any = new Error(`Handset "${product.name}" requires exact 15-digit scanned IMEI`);
            err.statusCode = 422;
            err.code = 'IMEI_REQUIRED';
            throw err;
          }

          const rawImei = itemInput.imei1.trim();

          // Distributed Lock on Scanned IMEI (15 second TTL)
          const lockKey = `lock:imei:${rawImei}`;
          const lockRes = await lockService.acquireLock(lockKey, 15);
          if (!lockRes.acquired) {
            const err: any = new Error(`IMEI_ALREADY_SOLD: IMEI ${rawImei} is currently being processed by another terminal`);
            err.statusCode = 409;
            err.code = 'IMEI_ALREADY_SOLD';
            throw err;
          }
          acquiredLocks.push({ key: lockKey, token: lockRes.token });

          imeiDoc = await ImeiSerial.findOne({
            shopId: sId,
            $or: [{ imei1: rawImei }, { imei2: rawImei }]
          });

          if (!imeiDoc) {
            const err: any = new Error(`Handset with IMEI ${rawImei} not found in shop inventory`);
            err.statusCode = 404;
            err.code = 'IMEI_NOT_FOUND';
            throw err;
          }

          // Invariant: Unavailable states cannot be sold
          const statusUpper = (imeiDoc.status || '').toUpperCase();
          if (statusUpper !== 'AVAILABLE') {
            const err: any = new Error(
              `Handset IMEI ${rawImei} is unavailable for sale (status: ${imeiDoc.status})`
            );
            err.statusCode = 409;
            err.code = 'IMEI_ALREADY_SOLD';
            throw err;
          }

          // Specific Identification COGS
          const handsetCost = toDecimal(imeiDoc.specificCost || imeiDoc.purchaseCost || variant.purchaseCost);
          lineLandedCost = handsetCost;
          totalHandsetCogs = addMoney(totalHandsetCogs, handsetCost);
          totalHandsetRevenue = addMoney(totalHandsetRevenue, subtractMoney(multiplyMoney(unitPriceDec, qty), discountDec));
        } else {
          // 3c. Accessory Validation (Stock Availability)
          if (variant.currentStock < qty) {
            const err: any = new Error(
              `Insufficient stock for "${variant.variantName || product.name}". Available: ${variant.currentStock}, Requested: ${qty}`
            );
            err.statusCode = 422;
            err.code = 'INSUFFICIENT_STOCK';
            throw err;
          }

          const accCost = multiplyMoney(toDecimal(variant.purchaseCost), qty);
          lineLandedCost = accCost;
          totalAccessoryCogs = addMoney(totalAccessoryCogs, accCost);
          totalAccessoryRevenue = addMoney(totalAccessoryRevenue, subtractMoney(multiplyMoney(unitPriceDec, qty), discountDec));
        }

        const itemSubtotal = multiplyMoney(unitPriceDec, qty);
        const itemLineTotal = subtractMoney(itemSubtotal, discountDec);

        runningSubtotal = addMoney(runningSubtotal, itemSubtotal);
        runningDiscount = addMoney(runningDiscount, discountDec);

        validatedItems.push({
          variant,
          product,
          imeiDoc,
          quantity: qty,
          unitPrice: formatMoney(unitPriceDec),
          discountAmount: formatMoney(discountDec),
          lineTotal: formatMoney(itemLineTotal),
          landedCost: formatMoney(lineLandedCost)
        });
      }

      // 4. Financial Settlement Calculations
      const netSubtotal = subtractMoney(runningSubtotal, runningDiscount);
      const vatAmount = payload.mushak63No ? multiplyMoney(netSubtotal, 0.05) : toDecimal(0);
      const grandTotal = addMoney(netSubtotal, vatAmount);

      let totalCashReceived = toDecimal(0);
      let totalDigitalReceived = toDecimal(0);
      let totalDueClaimed = toDecimal(0);

      const paymentsNormalized = (payload.payments || []).map((p) => {
        const received = toDecimal(p.amountReceived);
        const applied = toDecimal(p.amountApplied);

        if (p.paymentMethod === 'cash') {
          totalCashReceived = addMoney(totalCashReceived, received);
        } else if (p.paymentMethod === 'customer_due') {
          totalDueClaimed = addMoney(totalDueClaimed, applied);
        } else {
          totalDigitalReceived = addMoney(totalDigitalReceived, received);
        }

        return {
          method: p.paymentMethod,
          amount: p.amountApplied,
          received: p.amountReceived,
          accountId: p.accountId ? new mongoose.Types.ObjectId(p.accountId) : undefined,
          referenceTxnId: p.trxReference
        };
      });

      const totalReceivedAllTenders = addMoney(addMoney(totalCashReceived, totalDigitalReceived), totalDueClaimed);

      // Cash overpayment & change handling (TX-04)
      let changeAmount = toDecimal(0);

      if (totalCashReceived.greaterThan(0)) {
        const nonCashTenders = addMoney(totalDigitalReceived, totalDueClaimed);
        const remainingToPay = subtractMoney(grandTotal, nonCashTenders);

        if (totalCashReceived.greaterThan(remainingToPay) && remainingToPay.greaterThanOrEqualTo(0)) {
          changeAmount = subtractMoney(totalCashReceived, remainingToPay);
        }
      }

      const netTenderedApplied = subtractMoney(totalReceivedAllTenders, changeAmount);
      let finalDueAmount = totalDueClaimed;

      // Unpaid balance verification
      if (netTenderedApplied.lessThan(grandTotal)) {
        finalDueAmount = subtractMoney(grandTotal, subtractMoney(addMoney(totalCashReceived, totalDigitalReceived), changeAmount));
      }

      if (finalDueAmount.greaterThan(0)) {
        if (!payload.customerId) {
          const err: any = new Error('Customer profile is mandatory for sales with outstanding due (বাকির খাতা)');
          err.statusCode = 422;
          err.code = 'CUSTOMER_REQUIRED_FOR_DUE';
          throw err;
        }

        const custDoc = await Customer.findOne({
          _id: new mongoose.Types.ObjectId(payload.customerId),
          shopId: sId,
          isDeleted: false
        });

        if (!custDoc) {
          const err: any = new Error('Customer profile not found for due sale');
          err.statusCode = 404;
          err.code = 'CUSTOMER_NOT_FOUND';
          throw err;
        }

        // Credit Limit Enforcement (api-spec.md & prompt)
        const creditLimitDec = toDecimal(custDoc.creditLimit || 0);
        const currentDueDec = toDecimal(custDoc.currentDueBalance || 0);
        const projectedDue = addMoney(currentDueDec, finalDueAmount);

        if (creditLimitDec.greaterThan(0) && projectedDue.greaterThan(creditLimitDec)) {
          let overrideApproved = false;
          try {
            await this.verifyManagerOverride({
              shopId: sId.toString(),
              overrideToken: payload.overrideToken,
              managerPin: payload.managerPin
            });
            overrideApproved = true;
          } catch {
            overrideApproved = false;
          }

          if (!overrideApproved) {
            const err: any = new Error(
              `CREDIT_LIMIT_EXCEEDED: Credit sale exceeds customer's sanctioned balance limit (Limit: ৳${formatMoney(creditLimitDec)}, Projected: ৳${formatMoney(projectedDue)}). Requires authorized Manager PIN override.`
            );
            err.statusCode = 422;
            err.code = 'CREDIT_LIMIT_EXCEEDED';
            throw err;
          }
        }
      }

      // 5. Generate Invoice Number & Atomic Database Transaction
      const shopDoc = await Shop.findById(sId);
      const now = new Date();
      const monthPrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const randomSeq = Math.floor(10000 + Math.random() * 90000);
      const invoiceNo = `INV-${monthPrefix}-${randomSeq}`;

      let createdSale: any = null;

      const executeTransaction = async (session: ClientSession) => {
        // 5a. Create Sale Record
        const saleDoc = new Sale({
          shopId: sId,
          invoiceNo,
          idempotencyKey,
          customerId: payload.customerId ? new mongoose.Types.ObjectId(payload.customerId) : undefined,
          mushak63No: payload.mushak63No,
          shiftId: openShift._id,
          subtotalAmount: runningSubtotal.toString(),
          discountAmount: runningDiscount.toString(),
          vatAmount: vatAmount.toString(),
          grandTotalAmount: grandTotal.toString(),
          paidAmount: subtractMoney(grandTotal, finalDueAmount).toString(),
          dueAmount: formatMoney(finalDueAmount),
          changeAmount: changeAmount.toString(),
          paymentMethods: paymentsNormalized.map((p) => ({
            method: p.method,
            amount: p.amount,
            accountId: p.accountId,
            referenceTxnId: p.referenceTxnId
          })),
          status: 'completed',
          reprintCount: 0,
          soldByUserId: uId
        });

        await saleDoc.save({ session });

        // 5b. Create SaleItems & Update Stock
        for (const item of validatedItems) {
          const saleItem = new SaleItem({
            shopId: sId,
            saleId: saleDoc._id,
            variantId: item.variant._id,
            imeiId: item.imeiDoc ? item.imeiDoc._id : undefined,
            unitPrice: item.unitPrice,
            landedCost: item.landedCost,
            quantity: item.quantity,
            subtotal: multiplyMoney(item.unitPrice, item.quantity).toString(),
            discount: item.discountAmount,
            total: item.lineTotal
          });

          await saleItem.save({ session });

          if (item.imeiDoc) {
            // Transition handset to SOLD
            item.imeiDoc.status = 'SOLD';
            item.imeiDoc.saleId = saleDoc._id;
            await item.imeiDoc.save({ session });

            // Record Handset Movement
            const mov = new InventoryMovement({
              shopId: sId,
              variantId: item.variant._id,
              imeiId: item.imeiDoc._id,
              movementType: 'out_sale',
              quantityDelta: -1,
              referenceDocType: 'INV',
              referenceDocId: saleDoc._id,
              performedByUserId: uId,
              notes: `POS Counter Sale ${invoiceNo}`
            });
            await mov.save({ session });
          } else {
            // Decrement accessory stock
            await ProductVariant.updateOne(
              { _id: item.variant._id },
              { $inc: { currentStock: -item.quantity } },
              { session }
            );

            // Record Accessory Movement
            const mov = new InventoryMovement({
              shopId: sId,
              variantId: item.variant._id,
              movementType: 'out_sale',
              quantityDelta: -item.quantity,
              referenceDocType: 'INV',
              referenceDocId: saleDoc._id,
              performedByUserId: uId,
              notes: `POS Counter Sale ${invoiceNo}`
            });
            await mov.save({ session });
          }
        }

        // 5c. Customer Due Ledger Update
        if (payload.customerId && finalDueAmount.greaterThan(0)) {
          await Customer.updateOne(
            { _id: new mongoose.Types.ObjectId(payload.customerId) },
            { $inc: { currentDueBalance: formatMoney(finalDueAmount) } },
            { session }
          );
        }

        // 5d. Double-Entry General Ledger Posting
        const journalEntries: JournalEntry[] = [];

        // Cash tender debits & change handling (TX-04)
        if (totalCashReceived.greaterThan(0)) {
          journalEntries.push({
            accountCode: '1.1.01',
            debit: totalCashReceived,
            credit: 0,
            description: `Cash received for sale ${invoiceNo}`
          });

          if (changeAmount.greaterThan(0)) {
            journalEntries.push({
              accountCode: '1.1.01',
              debit: 0,
              credit: changeAmount,
              description: `Cash change dispensed for ${invoiceNo}`
            });
          }
        }

        // Digital tenders (bKash / Nagad / Bank / Card)
        if (totalDigitalReceived.greaterThan(0)) {
          journalEntries.push({
            accountCode: '1.2.01',
            debit: totalDigitalReceived,
            credit: 0,
            description: `Digital tender settlement for ${invoiceNo}`
          });
        }

        // Customer due receivable
        if (finalDueAmount.greaterThan(0)) {
          journalEntries.push({
            accountCode: '1.4.01',
            debit: finalDueAmount,
            credit: 0,
            description: `Customer accounts receivable for ${invoiceNo}`
          });
        }

        // Sales Revenue Credits
        if (totalHandsetRevenue.greaterThan(0)) {
          journalEntries.push({
            accountCode: '4.1.01',
            debit: 0,
            credit: totalHandsetRevenue,
            description: `Sales revenue handsets for ${invoiceNo}`
          });
        }

        if (totalAccessoryRevenue.greaterThan(0)) {
          journalEntries.push({
            accountCode: '4.1.02',
            debit: 0,
            credit: totalAccessoryRevenue,
            description: `Sales revenue accessories for ${invoiceNo}`
          });
        }

        // Output VAT Payable if any
        if (vatAmount.greaterThan(0)) {
          journalEntries.push({
            accountCode: '2.5.01',
            debit: 0,
            credit: vatAmount,
            description: `Output VAT collected (Mushak 6.3) for ${invoiceNo}`
          });
        }

        // Handset COGS (Specific Identification)
        if (totalHandsetCogs.greaterThan(0)) {
          journalEntries.push({
            accountCode: '5.1.01',
            debit: totalHandsetCogs,
            credit: 0,
            description: `Specific Identification COGS for ${invoiceNo}`
          });
          journalEntries.push({
            accountCode: '1.5.01',
            debit: 0,
            credit: totalHandsetCogs,
            description: `Merchandise inventory relief handsets for ${invoiceNo}`
          });
        }

        // Accessory COGS
        if (totalAccessoryCogs.greaterThan(0)) {
          journalEntries.push({
            accountCode: '5.1.02',
            debit: totalAccessoryCogs,
            credit: 0,
            description: `Landed Cost COGS accessories for ${invoiceNo}`
          });
          journalEntries.push({
            accountCode: '1.5.02',
            debit: 0,
            credit: totalAccessoryCogs,
            description: `Merchandise inventory relief accessories for ${invoiceNo}`
          });
        }

        await AccountingService.postDoubleEntryJournal({
          shopId: sId,
          voucherNo: `VCH-${invoiceNo}`,
          txnCode: 'TX-02',
          sourceDocType: 'INV',
          sourceDocId: saleDoc._id,
          postedByUserId: uId,
          entries: journalEntries,
          session
        });

        createdSale = saleDoc;
      };

      // Run in MongoDB ACID Transaction
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await executeTransaction(session);
        });
      } finally {
        await session.endSession();
      }

      // 6. Build Thermal ESC/POS Receipt Payload
      let customerNameStr = 'Walk-in Customer';
      let customerPhoneStr: string | undefined = undefined;
      if (payload.customerId) {
        const custDoc = await Customer.findById(payload.customerId);
        if (custDoc) {
          customerNameStr = custDoc.fullName;
          customerPhoneStr = custDoc.phone || undefined;
        }
      }

      const receiptItems = validatedItems.map((v) => ({
        name: v.variant.variantName || v.product.name,
        imei: v.imeiDoc ? v.imeiDoc.imei1 : undefined,
        qty: v.quantity,
        price: v.unitPrice,
        total: v.lineTotal
      }));

      const cashierUser = await User.findById(uId);

      const receiptData: ReceiptData = {
        shopName: shopDoc?.name || 'Bebsayik Telecom',
        branch: shopDoc?.binNumber ? `BIN: ${shopDoc.binNumber}` : 'Main Branch',
        phone: shopDoc?.phone || undefined,
        binNumber: shopDoc?.binNumber || undefined,
        invoiceNo,
        date: new Date().toLocaleString('en-US', { hour12: true }),
        cashier: cashierUser?.fullName || 'Cashier',
        customer: customerNameStr,
        customerPhone: customerPhoneStr,
        items: receiptItems,
        subTotal: formatMoney(runningSubtotal),
        discount: formatMoney(runningDiscount),
        vat: formatMoney(vatAmount),
        grandTotal: formatMoney(grandTotal),
        paid: formatMoney(subtractMoney(grandTotal, finalDueAmount)),
        due: formatMoney(finalDueAmount),
        change: formatMoney(changeAmount),
        reprintCount: 0,
        footer: 'Sold items non-refundable after 7 days. Powered by Bebsayik.com'
      };

      const printData = HardwareService.buildEscPosPayload(receiptData, paperWidthMm, true);

      return {
        saleId: createdSale._id.toString(),
        invoiceNo,
        grandTotal: formatMoney(grandTotal),
        paidAmount: formatMoney(subtractMoney(grandTotal, finalDueAmount)),
        dueAmount: formatMoney(finalDueAmount),
        changeGiven: formatMoney(changeAmount),
        reprintCount: 0,
        printData
      };
    } finally {
      // Safe Redis Lock Release for all acquired IMEIs
      for (const lk of acquiredLocks) {
        await lockService.releaseLock(lk.key, lk.token);
      }
    }
  }

  /**
   * Manager PIN / Override Token Verification for MSP Floor Breach
   */
  private static async verifyManagerOverride(params: {
    shopId: string;
    overrideToken?: string | undefined;
    managerPin?: string | undefined;
  }): Promise<void> {
    const { shopId, overrideToken, managerPin } = params;

    // Check signed override token
    if (overrideToken) {
      const verifyRes = await overrideTokenService.verifyAndConsume({
        token: overrideToken,
        expectedShopId: shopId,
        expectedAction: 'MSP_OVERRIDE'
      });
      if (verifyRes.valid) return;
    }

    // Check manager PIN against Store Managers or Store Owners of the shop
    if (managerPin) {
      const managers = await User.find({
        $or: [{ shopId: new mongoose.Types.ObjectId(shopId) }, { accessibleShopIds: new mongoose.Types.ObjectId(shopId) }],
        role: { $in: ['STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN'] },
        isActive: true
      });

      for (const mgr of managers) {
        if (mgr.managerPinHash) {
          try {
            const matches = await argon2.verify(mgr.managerPinHash, managerPin);
            if (matches) return;
          } catch {
            // Continue checking other managers
          }
        }
      }
    }

    const err: any = new Error(
      'MSP_FLOOR_BREACH: Sale unit price is below Minimum Selling Price (MSP). Requires authorized Manager PIN override.'
    );
    err.statusCode = 403;
    err.code = 'MSP_FLOOR_BREACH';
    throw err;
  }

  /**
   * Helper to format existing sale result for idempotency retries
   */
  private static async formatExistingSaleResult(
    sale: ISale,
    paperWidthMm: 58 | 80
  ): Promise<CheckoutResult> {
    const shop = await Shop.findById(sale.shopId);
    const cashier = await User.findById(sale.soldByUserId);
    const customer = sale.customerId ? await Customer.findById(sale.customerId) : null;
    const saleItems = await SaleItem.find({ saleId: sale._id }).populate('variantId');

    const receiptItems: ReceiptData['items'] = saleItems.map((si: any) => ({
      name: si.variantId?.variantName || 'Item',
      qty: si.quantity,
      price: formatMoney(si.unitPrice),
      total: formatMoney(si.total)
    }));

    const receiptData: ReceiptData = {
      shopName: shop?.name || 'Bebsayik Telecom',
      branch: shop?.binNumber ? `BIN: ${shop.binNumber}` : 'Main Branch',
      phone: shop?.phone || undefined,
      binNumber: shop?.binNumber || undefined,
      invoiceNo: sale.invoiceNo,
      date: new Date(sale.createdAt).toLocaleString('en-US', { hour12: true }),
      cashier: cashier?.fullName || 'Cashier',
      customer: customer?.fullName || 'Walk-in Customer',
      customerPhone: customer?.phone || undefined,
      items: receiptItems,
      subTotal: formatMoney(sale.subtotalAmount),
      discount: formatMoney(sale.discountAmount),
      vat: formatMoney(sale.vatAmount),
      grandTotal: formatMoney(sale.grandTotalAmount),
      paid: formatMoney(sale.paidAmount),
      due: formatMoney(sale.dueAmount),
      change: formatMoney(sale.changeAmount),
      reprintCount: sale.reprintCount || 0,
      footer: 'Sold items non-refundable after 7 days. Powered by Bebsayik.com'
    };

    const printData = HardwareService.buildEscPosPayload(receiptData, paperWidthMm, true);

    return {
      saleId: sale._id.toString(),
      invoiceNo: sale.invoiceNo,
      grandTotal: formatMoney(sale.grandTotalAmount),
      paidAmount: formatMoney(sale.paidAmount),
      dueAmount: formatMoney(sale.dueAmount),
      changeGiven: formatMoney(sale.changeAmount),
      reprintCount: sale.reprintCount || 0,
      printData
    };
  }

  /**
   * Stash active POS shopping cart (F5 accelerator)
   */
  static async holdCart(params: {
    shopId: mongoose.Types.ObjectId | string;
    userId: mongoose.Types.ObjectId | string;
    data: {
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      items: Array<{
        variantId: string;
        imei1?: string;
        quantity: number;
        unitPrice: string | number;
        discountAmount?: string | number;
      }>;
      note?: string;
      cartSlot?: string;
    };
  }): Promise<IHeldCart> {
    const { shopId, userId, data } = params;
    const sId = new mongoose.Types.ObjectId(shopId);
    const uId = new mongoose.Types.ObjectId(userId);

    if (!data.items || data.items.length === 0) {
      const err: any = new Error('Cannot hold an empty cart');
      err.statusCode = 400;
      err.code = 'EMPTY_CART';
      throw err;
    }

    const heldCart = new HeldCart({
      shopId: sId,
      cartSlot: data.cartSlot || 'HOLD',
      customerId: data.customerId ? new mongoose.Types.ObjectId(data.customerId) : undefined,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      note: data.note,
      items: data.items.map((it) => ({
        variantId: new mongoose.Types.ObjectId(it.variantId),
        imei1: it.imei1,
        quantity: it.quantity || 1,
        unitPrice: String(it.unitPrice),
        discountAmount: String(it.discountAmount || '0.00')
      })),
      heldByUserId: uId
    });

    await heldCart.save();
    return heldCart;
  }

  /**
   * Recall list of held carts (F6 accelerator)
   */
  static async getHeldCarts(shopId: mongoose.Types.ObjectId | string): Promise<IHeldCart[]> {
    const sId = new mongoose.Types.ObjectId(shopId);
    return HeldCart.find({ shopId: sId }).sort({ createdAt: -1 });
  }

  /**
   * Discard or release stashed cart
   */
  static async deleteHeldCart(
    shopId: mongoose.Types.ObjectId | string,
    cartId: string
  ): Promise<boolean> {
    const sId = new mongoose.Types.ObjectId(shopId);
    const res = await HeldCart.deleteOne({
      _id: new mongoose.Types.ObjectId(cartId),
      shopId: sId
    });
    return (res.deletedCount || 0) > 0;
  }

  /**
   * Lookup invoice and increment reprint count (TC-47)
   * Strictly 0 financial or inventory mutations!
   */
  static async reprintInvoice(
    shopId: mongoose.Types.ObjectId | string,
    invoiceNo: string,
    paperWidthMm: 58 | 80 = 80
  ): Promise<CheckoutResult> {
    const sId = new mongoose.Types.ObjectId(shopId);

    // Atomically increment reprintCount by 1
    const sale = await Sale.findOneAndUpdate(
      { shopId: sId, invoiceNo: invoiceNo.trim() },
      { $inc: { reprintCount: 1 } },
      { new: true }
    );

    if (!sale) {
      const err: any = new Error(`Invoice "${invoiceNo}" not found`);
      err.statusCode = 404;
      err.code = 'INVOICE_NOT_FOUND';
      throw err;
    }

    return this.formatExistingSaleResult(sale, paperWidthMm);
  }

  /**
   * Replay offline accessory sales batch (TC-48)
   * Strictly blocks serialized handsets!
   */
  static async syncOfflineBatch(
    shopId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
    batchData: {
      syncedBatchId: string;
      transactions: Array<{
        offlineSaleId: string;
        timestamp: string;
        items: Array<{
          variantId: string;
          quantity: number;
          unitPrice: string | number;
          imei1?: string;
        }>;
        paidAmount: string | number;
        paymentMethod: 'cash' | 'mfs_bkash' | 'mfs_nagad' | 'bank_card';
      }>;
    }
  ): Promise<{
    syncedBatchId: string;
    totalSynced: number;
    sales: Array<{ offlineSaleId: string; invoiceNo: string; saleId: string }>;
  }> {
    const { syncedBatchId, transactions } = batchData;
    const syncedSales: Array<{ offlineSaleId: string; invoiceNo: string; saleId: string }> = [];

    const sId = new mongoose.Types.ObjectId(shopId);

    for (const tx of transactions) {
      // Invariant: Dual-IMEI Handsets cannot be sold offline (TC-48)
      for (const item of tx.items) {
        if (item.imei1) {
          const err: any = new Error('OFFLINE_HANDSET_SALE_PROHIBITED: Dual-IMEI Handsets cannot be sold offline (TC-48)');
          err.statusCode = 400;
          err.code = 'OFFLINE_HANDSET_SALE_PROHIBITED';
          throw err;
        }

        const variant = await ProductVariant.findOne({
          _id: new mongoose.Types.ObjectId(item.variantId),
          shopId: sId,
          isDeleted: false
        });

        if (!variant) {
          const err: any = new Error(`Product variant "${item.variantId}" not found in shop`);
          err.statusCode = 404;
          err.code = 'VARIANT_NOT_FOUND';
          throw err;
        }

        const prod = await Product.findOne({
          _id: variant.productId,
          shopId: sId,
          isDeleted: false
        });

        if (prod && (prod.hasImei || prod.productType === 'handset')) {
          const err: any = new Error('OFFLINE_HANDSET_SALE_PROHIBITED: Dual-IMEI Handsets cannot be sold offline (TC-48)');
          err.statusCode = 400;
          err.code = 'OFFLINE_HANDSET_SALE_PROHIBITED';
          throw err;
        }
      }

      const checkoutRes = await this.processCheckout({
        shopId,
        userId,
        idempotencyKey: `offline_${syncedBatchId}_${tx.offlineSaleId}`,
        payload: {
          items: tx.items.map((it) => ({
            variantId: it.variantId,
            quantity: it.quantity,
            unitPrice: it.unitPrice
          })),
          payments: [
            {
              paymentMethod: tx.paymentMethod,
              amountReceived: tx.paidAmount,
              amountApplied: tx.paidAmount
            }
          ]
        }
      });

      syncedSales.push({
        offlineSaleId: tx.offlineSaleId,
        invoiceNo: checkoutRes.invoiceNo,
        saleId: checkoutRes.saleId
      });
    }

    return {
      syncedBatchId,
      totalSynced: syncedSales.length,
      sales: syncedSales
    };
  }
}
