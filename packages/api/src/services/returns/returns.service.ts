import mongoose from 'mongoose';
import argon2 from 'argon2';
import {
  Sale,
  SaleItem,
  CustomerReturnVoucher,
  ICustomerReturnVoucher,
  Product,
  ProductVariant,
  ImeiSerial,
  InventoryMovement,
  Customer,
  Shop,
  User
} from '../../models/index.js';
import { lockService } from '../lock/lock.service.js';
import { overrideTokenService } from '../security/overrideToken.service.js';
import { AccountingService, JournalEntry } from '../accounting/accounting.service.js';
import { HardwareService, EscPosPrintPayload } from '../hardware/hardware.service.js';
import {
  addMoney,
  subtractMoney,
  multiplyMoney,
  toDecimal,
  formatMoney
} from '../../utils/money.js';

export interface SalesReturnItemInput {
  variantId: string;
  imei1?: string;
  quantity: number;
  refundPrice?: string | number;
  condition?: 'restockable' | 'defective' | 'quarantine';
}

export interface ProcessSalesReturnParams {
  shopId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  idempotencyKey: string;
  invoiceNo: string;
  items: SalesReturnItemInput[];
  refundMethod?: 'cash' | 'store_credit' | 'bank_card' | 'mfs_bkash' | 'mfs_nagad';
  refundAccountId?: string;
  reason?: string;
  managerPin?: string;
  overrideToken?: string;
  paperWidthMm?: 58 | 80;
}

export interface SalesReturnResult {
  crvId: string;
  crvNo: string;
  invoiceNo: string;
  totalReturnAmount: string;
  dueReductionAmount: string;
  cashRefundAmount: string;
  refundMethod: string;
  saleStatus: string;
  printData: EscPosPrintPayload;
}

export class ReturnsService {
  /**
   * Process Customer Sales Return Voucher (CRV - TX-05)
   * Enforces 7-day policy, restock condition inspection quarantine,
   * due reduction netting (TC-21), and atomic general ledger entries.
   */
  static async processSalesReturn(params: ProcessSalesReturnParams): Promise<SalesReturnResult> {
    const {
      shopId,
      userId,
      idempotencyKey,
      invoiceNo,
      items,
      refundMethod = 'cash',
      refundAccountId,
      reason,
      managerPin,
      overrideToken,
      paperWidthMm = 80
    } = params;

    const sId = new mongoose.Types.ObjectId(shopId);
    const uId = new mongoose.Types.ObjectId(userId);

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      const err: any = new Error('Mandatory Idempotency-Key header is required for sales return');
      err.statusCode = 400;
      err.code = 'IDEMPOTENCY_KEY_REQUIRED';
      throw err;
    }

    if (!items || items.length === 0) {
      const err: any = new Error('Return payload must contain at least one item');
      err.statusCode = 400;
      err.code = 'EMPTY_RETURN_ITEMS';
      throw err;
    }

    // 1. Idempotency Check: Return existing voucher if already processed
    const existingCrv = await CustomerReturnVoucher.findOne({ shopId: sId, idempotencyKey });
    if (existingCrv) {
      return this.formatExistingCrvResult(existingCrv, paperWidthMm);
    }

    const acquiredLocks: Array<{ key: string; token: string }> = [];

    // Idempotency lock
    const idempLockKey = `lock:idemp:return:${sId}:${idempotencyKey}`;
    const idempLockRes = await lockService.acquireLock(idempLockKey, 15);
    if (!idempLockRes.acquired) {
      const checkCrv = await CustomerReturnVoucher.findOne({ shopId: sId, idempotencyKey });
      if (checkCrv) {
        return this.formatExistingCrvResult(checkCrv, paperWidthMm);
      }
      const err: any = new Error('A return request with this idempotency key is already in progress');
      err.statusCode = 409;
      err.code = 'IDEMPOTENCY_IN_PROGRESS';
      throw err;
    }
    acquiredLocks.push({ key: idempLockKey, token: idempLockRes.token });

    try {
      // 2. Fetch and Validate Original Sale
      const sale = await Sale.findOne({ shopId: sId, invoiceNo: invoiceNo.trim() });
      if (!sale) {
        const err: any = new Error(`Original sale invoice "${invoiceNo}" not found`);
        err.statusCode = 404;
        err.code = 'INVOICE_NOT_FOUND';
        throw err;
      }

      if (sale.status === 'voided' || sale.status === 'refunded') {
        const err: any = new Error(`Invoice "${invoiceNo}" cannot be returned (current status: ${sale.status})`);
        err.statusCode = 422;
        err.code = 'INVOICE_ALREADY_REFUNDED';
        throw err;
      }

      // 3. 7-Day Return Policy Window Validation
      const shopDoc = await Shop.findById(sId);
      const policyDays = 7; // Dokan default: 7 days
      const saleCreatedAt = new Date(sale.createdAt).getTime();
      const ageDays = (Date.now() - saleCreatedAt) / (1000 * 60 * 60 * 24);

      if (ageDays > policyDays) {
        // Return window expired: Requires Manager PIN override
        let overrideValid = false;
        if (overrideToken) {
          const verifyRes = await overrideTokenService.verifyAndConsume({
            token: overrideToken,
            expectedShopId: sId.toString(),
            expectedAction: 'RETURN_POLICY_OVERRIDE'
          });
          if (verifyRes.valid) overrideValid = true;
        }

        if (!overrideValid && managerPin) {
          const managers = await User.find({
            $or: [{ shopId: sId }, { accessibleShopIds: sId }],
            role: { $in: ['STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN'] },
            isActive: true
          });
          for (const mgr of managers) {
            if (mgr.managerPinHash) {
              try {
                if (await argon2.verify(mgr.managerPinHash, managerPin)) {
                  overrideValid = true;
                  break;
                }
              } catch {
                // Ignore hash error
              }
            }
          }
        }

        if (!overrideValid) {
          const err: any = new Error(
            `RETURN_POLICY_EXPIRED: 7-day return policy expired for invoice "${invoiceNo}" (Age: ${Math.floor(ageDays)} days). Requires authorized Manager PIN override.`
          );
          err.statusCode = 422;
          err.code = 'RETURN_POLICY_EXPIRED';
          throw err;
        }
      }

      // 4. Fetch Sale Items and Historical Returns to Check Returnable Quantities
      const originalSaleItems = await SaleItem.find({ saleId: sale._id, shopId: sId });
      const previousReturns = await CustomerReturnVoucher.find({ saleId: sale._id, shopId: sId });

      const previouslyReturnedQtyByVariant = new Map<string, number>();
      for (const prevCrv of previousReturns) {
        for (const it of prevCrv.returnedItems) {
          const k = it.variantId.toString();
          previouslyReturnedQtyByVariant.set(k, (previouslyReturnedQtyByVariant.get(k) || 0) + it.quantity);
        }
      }

      const validatedReturnItems: Array<{
        variant: any;
        product: any;
        imeiDoc?: any;
        imei1?: string | undefined;
        quantity: number;
        unitPrice: string;
        refundPrice: string;
        condition: 'restockable' | 'defective' | 'quarantine';
        landedCost: string;
      }> = [];

      let runningReturnTotal = toDecimal(0);
      let runningHandsetReturnTotal = toDecimal(0);
      let runningAccessoryReturnTotal = toDecimal(0);
      let runningRestockedHandsetCogs = toDecimal(0);
      let runningRestockedAccessoryCogs = toDecimal(0);

      for (const itemInput of items) {
        const variantIdStr = itemInput.variantId;
        const matchingSaleItem = originalSaleItems.find(
          (si) => si.variantId.toString() === variantIdStr
        );

        if (!matchingSaleItem) {
          const err: any = new Error(`Item variant "${variantIdStr}" was not part of original sale ${invoiceNo}`);
          err.statusCode = 422;
          err.code = 'ITEM_NOT_IN_SALE';
          throw err;
        }

        const qty = itemInput.quantity || 1;
        const alreadyReturned = previouslyReturnedQtyByVariant.get(variantIdStr) || 0;
        const returnableQty = matchingSaleItem.quantity - alreadyReturned;

        if (qty > returnableQty) {
          const err: any = new Error(
            `RETURN_QUANTITY_EXCEEDED: Return quantity ${qty} exceeds available returnable quantity ${returnableQty} for variant ${variantIdStr}`
          );
          err.statusCode = 422;
          err.code = 'RETURN_QUANTITY_EXCEEDED';
          throw err;
        }

        const variant = await ProductVariant.findOne({
          _id: new mongoose.Types.ObjectId(variantIdStr),
          shopId: sId,
          isDeleted: false
        });

        if (!variant) {
          const err: any = new Error(`Product variant not found: ${variantIdStr}`);
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
          const err: any = new Error(`Product not found for variant: ${variantIdStr}`);
          err.statusCode = 404;
          err.code = 'PRODUCT_NOT_FOUND';
          throw err;
        }

        const refundPriceDec = itemInput.refundPrice
          ? toDecimal(itemInput.refundPrice)
          : toDecimal(matchingSaleItem.unitPrice);
        const condition = itemInput.condition || 'restockable';
        const lineRefundTotal = multiplyMoney(refundPriceDec, qty);

        runningReturnTotal = addMoney(runningReturnTotal, lineRefundTotal);

        let imeiDoc: any = null;
        let lineLandedCost = toDecimal(0);

        if (itemInput.imei1 || product.hasImei || product.productType === 'handset') {
          if (!itemInput.imei1) {
            const err: any = new Error(`Handset "${product.name}" requires exact scanned IMEI for return`);
            err.statusCode = 422;
            err.code = 'IMEI_REQUIRED';
            throw err;
          }

          const rawImei = itemInput.imei1.trim();
          imeiDoc = await ImeiSerial.findOne({
            shopId: sId,
            $or: [{ imei1: rawImei }, { imei2: rawImei }]
          });

          if (!imeiDoc) {
            const err: any = new Error(`IMEI ${rawImei} not found in shop records`);
            err.statusCode = 404;
            err.code = 'IMEI_NOT_FOUND';
            throw err;
          }

          lineLandedCost = toDecimal(imeiDoc.specificCost || imeiDoc.purchaseCost || variant.purchaseCost);
          runningHandsetReturnTotal = addMoney(runningHandsetReturnTotal, lineRefundTotal);

          // Restock COGS reversal only if restockable
          if (condition === 'restockable') {
            runningRestockedHandsetCogs = addMoney(runningRestockedHandsetCogs, lineLandedCost);
          }
        } else {
          lineLandedCost = multiplyMoney(toDecimal(variant.purchaseCost), qty);
          runningAccessoryReturnTotal = addMoney(runningAccessoryReturnTotal, lineRefundTotal);

          if (condition === 'restockable') {
            runningRestockedAccessoryCogs = addMoney(runningRestockedAccessoryCogs, lineLandedCost);
          }
        }

        validatedReturnItems.push({
          variant,
          product,
          imeiDoc,
          imei1: itemInput.imei1?.trim(),
          quantity: qty,
          unitPrice: formatMoney(matchingSaleItem.unitPrice),
          refundPrice: formatMoney(refundPriceDec),
          condition,
          landedCost: formatMoney(lineLandedCost)
        });
      }

      // 5. TC-21 Due Reduction Netting
      // Customer returning a phone with outstanding due balance reduces their due first before receiving cash refunds!
      const saleDueDec = toDecimal(sale.dueAmount || 0);
      let customerDueDec = toDecimal(0);
      let customerDoc: any = null;

      if (sale.customerId) {
        customerDoc = await Customer.findOne({ _id: sale.customerId, shopId: sId, isDeleted: false });
        if (customerDoc) {
          customerDueDec = toDecimal(customerDoc.currentDueBalance || 0);
        }
      }

      // Max deductible due is the invoice's outstanding due (TC-21)
      let maxDueDeductible = toDecimal(0);
      if (saleDueDec.greaterThan(0)) {
        maxDueDeductible = customerDueDec.greaterThan(0) && customerDueDec.lessThan(saleDueDec)
          ? customerDueDec
          : saleDueDec;
      }
      let dueReductionAmount = toDecimal(0);

      if (maxDueDeductible.greaterThan(0)) {
        if (runningReturnTotal.greaterThanOrEqualTo(maxDueDeductible)) {
          dueReductionAmount = maxDueDeductible;
        } else {
          dueReductionAmount = runningReturnTotal;
        }
      }

      const cashRefundAmount = subtractMoney(runningReturnTotal, dueReductionAmount);

      // 6. Generate CRV Number
      const now = new Date();
      const monthPrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const randomSeq = Math.floor(10000 + Math.random() * 90000);
      const crvNo = `CRV-${monthPrefix}-${randomSeq}`;

      let createdCrv: any = null;
      let updatedSaleStatus: string = sale.status;

      // 7. Atomic Database Transaction
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // 7a. Create CustomerReturnVoucher document
          const crvDoc = new CustomerReturnVoucher({
            shopId: sId,
            crvNo,
            invoiceNo,
            idempotencyKey,
            saleId: sale._id,
            customerId: sale.customerId,
            totalReturnAmount: formatMoney(runningReturnTotal),
            dueReductionAmount: formatMoney(dueReductionAmount),
            refundAmount: formatMoney(cashRefundAmount),
            refundMethod,
            refundAccountId: refundAccountId ? new mongoose.Types.ObjectId(refundAccountId) : undefined,
            restockStock: validatedReturnItems.some((v) => v.condition === 'restockable'),
            reason,
            returnedItems: validatedReturnItems.map((it) => ({
              variantId: it.variant._id,
              imeiId: it.imeiDoc ? it.imeiDoc._id : undefined,
              imei1: it.imei1,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              refundPrice: it.refundPrice,
              condition: it.condition,
              landedCost: it.landedCost
            })),
            authorizedByUserId: uId
          });

          await crvDoc.save({ session });

          // 7b. Stock & Inventory Updates (Inspection Quarantine vs Restock)
          for (const item of validatedReturnItems) {
            if (item.imeiDoc) {
              if (item.condition === 'restockable') {
                // Re-enter active inventory
                item.imeiDoc.status = 'AVAILABLE';
                item.imeiDoc.saleId = undefined;
              } else {
                // TC-20: Inspection Quarantine — defective or needs inspection
                item.imeiDoc.status = 'RETURNED_INSPECTION';
                item.imeiDoc.saleId = undefined;
              }
              await item.imeiDoc.save({ session });

              // Record Inventory Movement
              const mov = new InventoryMovement({
                shopId: sId,
                variantId: item.variant._id,
                imeiId: item.imeiDoc._id,
                movementType: 'in_return',
                quantityDelta: 1,
                referenceDocType: 'CRV',
                referenceDocId: crvDoc._id,
                performedByUserId: uId,
                notes: `Customer Return ${crvNo} (${item.condition})`
              });
              await mov.save({ session });
            } else {
              // Accessory stock
              if (item.condition === 'restockable') {
                await ProductVariant.updateOne(
                  { _id: item.variant._id },
                  { $inc: { currentStock: item.quantity } },
                  { session }
                );
              }

              const mov = new InventoryMovement({
                shopId: sId,
                variantId: item.variant._id,
                movementType: 'in_return',
                quantityDelta: item.quantity,
                referenceDocType: 'CRV',
                referenceDocId: crvDoc._id,
                performedByUserId: uId,
                notes: `Customer Return ${crvNo} (${item.condition})`
              });
              await mov.save({ session });
            }
          }

          // 7c. Due Balance Reductions
          if (dueReductionAmount.greaterThan(0)) {
            // Decrement sale due balance
            const newSaleDue = subtractMoney(saleDueDec, dueReductionAmount);
            sale.dueAmount = formatMoney(newSaleDue) as any;

            // Decrement customer's Bakir Khata ledger balance
            if (sale.customerId) {
              await Customer.updateOne(
                { _id: sale.customerId, shopId: sId },
                { $inc: { currentDueBalance: -Number(formatMoney(dueReductionAmount)) } },
                { session }
              );
            }
          }

          // 7d. Determine Sale Status
          const totalOriginalQty = originalSaleItems.reduce((sum, si) => sum + si.quantity, 0);
          const totalReturnedNow = validatedReturnItems.reduce((sum, vi) => sum + vi.quantity, 0);
          const totalReturnedAll = Array.from(previouslyReturnedQtyByVariant.values()).reduce((a, b) => a + b, 0) + totalReturnedNow;

          if (totalReturnedAll >= totalOriginalQty) {
            sale.status = 'refunded';
          } else {
            sale.status = 'partially_refunded';
          }
          updatedSaleStatus = sale.status;
          await sale.save({ session });

          // 7e. Double-Entry General Ledger Posting (TX-05)
          const journalEntries: JournalEntry[] = [];

          // Revenue Reversal (Debits)
          if (runningHandsetReturnTotal.greaterThan(0)) {
            journalEntries.push({
              accountCode: '4.1.01',
              debit: runningHandsetReturnTotal,
              credit: 0,
              description: `Sales return handsets for ${crvNo} (${invoiceNo})`
            });
          }

          if (runningAccessoryReturnTotal.greaterThan(0)) {
            journalEntries.push({
              accountCode: '4.1.02',
              debit: runningAccessoryReturnTotal,
              credit: 0,
              description: `Sales return accessories for ${crvNo} (${invoiceNo})`
            });
          }

          // Settlement Credits (Accounts Receivable Due Netting & Cash Disbursed)
          if (dueReductionAmount.greaterThan(0)) {
            journalEntries.push({
              accountCode: '1.4.01',
              debit: 0,
              credit: dueReductionAmount,
              description: `Accounts receivable due relief (TC-21) for ${crvNo}`
            });
          }

          if (cashRefundAmount.greaterThan(0)) {
            const refundAccountCode = refundMethod === 'cash' ? '1.1.01' : '1.2.01';
            journalEntries.push({
              accountCode: refundAccountCode,
              debit: 0,
              credit: cashRefundAmount,
              description: `Refund payout (${refundMethod}) for ${crvNo}`
            });
          }

          // COGS / Inventory Reversal (Restocked Items)
          if (runningRestockedHandsetCogs.greaterThan(0)) {
            journalEntries.push({
              accountCode: '1.5.01',
              debit: runningRestockedHandsetCogs,
              credit: 0,
              description: `Merchandise inventory reinstatement handsets for ${crvNo}`
            });
            journalEntries.push({
              accountCode: '5.1.01',
              debit: 0,
              credit: runningRestockedHandsetCogs,
              description: `COGS reversal handsets for ${crvNo}`
            });
          }

          if (runningRestockedAccessoryCogs.greaterThan(0)) {
            journalEntries.push({
              accountCode: '1.5.02',
              debit: runningRestockedAccessoryCogs,
              credit: 0,
              description: `Merchandise inventory reinstatement accessories for ${crvNo}`
            });
            journalEntries.push({
              accountCode: '5.1.02',
              debit: 0,
              credit: runningRestockedAccessoryCogs,
              description: `COGS reversal accessories for ${crvNo}`
            });
          }

          if (journalEntries.length >= 2) {
            await AccountingService.postDoubleEntryJournal({
              shopId: sId,
              voucherNo: `VCH-${crvNo}`,
              txnCode: 'TX-05',
              sourceDocType: 'CRV',
              sourceDocId: crvDoc._id,
              postedByUserId: uId,
              entries: journalEntries,
              session
            });
          }

          createdCrv = crvDoc;
        });
      } finally {
        await session.endSession();
      }

      // 8. ESC/POS Return Voucher Thermal Print Payload
      const printItems = validatedReturnItems.map((vi) => ({
        name: vi.variant.variantName || vi.product.name,
        imei: vi.imei1,
        qty: vi.quantity,
        price: vi.refundPrice,
        total: formatMoney(multiplyMoney(toDecimal(vi.refundPrice), vi.quantity))
      }));

      const cashier = await User.findById(uId);
      const printData = HardwareService.buildEscPosPayload(
        {
          shopName: shopDoc?.name || 'Bebsayik Dokan',
          branch: shopDoc?.binNumber ? `BIN: ${shopDoc.binNumber}` : 'Main Branch',
          phone: shopDoc?.phone || undefined,
          invoiceNo: crvNo,
          date: new Date().toLocaleString('en-US', { hour12: true }),
          cashier: cashier?.fullName || 'Cashier',
          customer: customerDoc?.fullName || 'Walk-in Customer',
          items: printItems,
          subTotal: formatMoney(runningReturnTotal),
          discount: '0.00',
          vat: '0.00',
          grandTotal: formatMoney(runningReturnTotal),
          paid: formatMoney(cashRefundAmount),
          due: formatMoney(dueReductionAmount),
          change: '0.00',
          footer: `Original Invoice: ${invoiceNo} | Return Voucher (CRV)`
        },
        paperWidthMm,
        false
      );

      return {
        crvId: createdCrv._id.toString(),
        crvNo,
        invoiceNo,
        totalReturnAmount: formatMoney(runningReturnTotal),
        dueReductionAmount: formatMoney(dueReductionAmount),
        cashRefundAmount: formatMoney(cashRefundAmount),
        refundMethod,
        saleStatus: updatedSaleStatus,
        printData
      };
    } finally {
      for (const lk of acquiredLocks) {
        await lockService.releaseLock(lk.key, lk.token);
      }
    }
  }

  /**
   * Helper to format existing CRV result for idempotent retries
   */
  private static async formatExistingCrvResult(
    crv: ICustomerReturnVoucher,
    paperWidthMm: 58 | 80
  ): Promise<SalesReturnResult> {
    const shop = await Shop.findById(crv.shopId);
    const cashier = await User.findById(crv.authorizedByUserId);
    const customer = crv.customerId ? await Customer.findById(crv.customerId) : null;
    const sale = await Sale.findById(crv.saleId);

    const printItems = (crv.returnedItems || []).map((it) => ({
      name: 'Returned Item',
      imei: it.imei1,
      qty: it.quantity,
      price: formatMoney(it.refundPrice),
      total: formatMoney(multiplyMoney(toDecimal(it.refundPrice), it.quantity))
    }));

    const printData = HardwareService.buildEscPosPayload(
      {
        shopName: shop?.name || 'Bebsayik Dokan',
        branch: shop?.binNumber ? `BIN: ${shop.binNumber}` : 'Main Branch',
        phone: shop?.phone || undefined,
        invoiceNo: crv.crvNo,
        date: new Date(crv.createdAt).toLocaleString('en-US', { hour12: true }),
        cashier: cashier?.fullName || 'Cashier',
        customer: customer?.fullName || 'Walk-in Customer',
        items: printItems,
        subTotal: formatMoney(crv.totalReturnAmount),
        discount: '0.00',
        vat: '0.00',
        grandTotal: formatMoney(crv.totalReturnAmount),
        paid: formatMoney(crv.refundAmount),
        due: formatMoney(crv.dueReductionAmount),
        change: '0.00',
        footer: `Original Invoice: ${crv.invoiceNo} | Return Voucher (CRV)`
      },
      paperWidthMm,
      false
    );

    return {
      crvId: crv._id.toString(),
      crvNo: crv.crvNo,
      invoiceNo: crv.invoiceNo,
      totalReturnAmount: formatMoney(crv.totalReturnAmount),
      dueReductionAmount: formatMoney(crv.dueReductionAmount),
      cashRefundAmount: formatMoney(crv.refundAmount),
      refundMethod: crv.refundMethod,
      saleStatus: sale?.status || 'refunded',
      printData
    };
  }

  /**
   * List customer return vouchers for a shop
   */
  static async listSalesReturns(params: {
    shopId: mongoose.Types.ObjectId | string;
    page?: number | undefined;
    limit?: number | undefined;
    invoiceNo?: string | undefined;
  }): Promise<{ returns: any[]; total: number; page: number; limit: number }> {
    const { shopId, page = 1, limit = 20, invoiceNo } = params;
    const sId = new mongoose.Types.ObjectId(shopId);

    const filter: any = { shopId: sId };
    if (invoiceNo) {
      filter.invoiceNo = new RegExp(invoiceNo.trim(), 'i');
    }

    const total = await CustomerReturnVoucher.countDocuments(filter);
    const returns = await CustomerReturnVoucher.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customerId', 'fullName phone')
      .populate('authorizedByUserId', 'fullName');

    return { returns, total, page, limit };
  }

  /**
   * Get return voucher by ID
   */
  static async getSalesReturnById(
    shopId: mongoose.Types.ObjectId | string,
    crvId: string
  ): Promise<any> {
    const sId = new mongoose.Types.ObjectId(shopId);
    const returnDoc = await CustomerReturnVoucher.findOne({
      _id: new mongoose.Types.ObjectId(crvId),
      shopId: sId
    })
      .populate('customerId', 'fullName phone address')
      .populate('authorizedByUserId', 'fullName')
      .populate('returnedItems.variantId', 'variantName sku')
      .populate('saleId');

    if (!returnDoc) {
      const err: any = new Error(`Sales return voucher "${crvId}" not found`);
      err.statusCode = 404;
      err.code = 'CRV_NOT_FOUND';
      throw err;
    }

    return returnDoc;
  }
}
