import mongoose from 'mongoose';
import {
  KistiContract,
  IKistiContract,
  KistiInstallment,
  Customer,
  ProductVariant,
  Product,
  ImeiSerial,
  Sale,
  SaleItem,
  InventoryMovement,
  MoneyReceipt,
  IMoneyReceipt,
  Shift,
  Shop,
  User,
  SmsLog
} from '../../models/index.js';
import { lockService } from '../lock/lock.service.js';
import { AccountingService } from '../accounting/accounting.service.js';
import { buildTx11KistiSale, buildTx11KistiCollection } from '../accounting/journalMatrices.js';
import { HardwareService, EscPosPrintPayload } from '../hardware/hardware.service.js';
import { getSmsDriver } from '../sms/index.js';
import {
  addMoney,
  subtractMoney,
  toDecimal,
  formatMoney
} from '../../utils/money.js';
import { validateLuhn } from '@bebsayik/shared-types';
import Decimal from 'decimal.js';

export interface GuarantorInput {
  name?: string | undefined;
  fullName?: string | undefined;
  phone: string;
  nid: string;
  relation: string;
}

export interface CreateKistiContractInput {
  shopId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  idempotencyKey: string;
  customerId: string;
  variantId: string;
  imei1: string;
  cashPrice: string | number;
  downPayment: string | number;
  downPaymentAccountId?: string | undefined;
  paymentMethod?: 'cash' | 'mfs_bkash' | 'mfs_nagad' | 'bank_card' | undefined;
  tenureMonths: number;
  interestRate?: string | number | undefined;
  interestFeeAmount?: string | number | undefined;
  guarantors: GuarantorInput[];
  notes?: string | undefined;
  paperWidthMm?: 58 | 80 | undefined;
}

export interface CollectKistiMilestoneInput {
  shopId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  contractId: string;
  idempotencyKey: string;
  amount: string | number;
  milestoneNo?: number | undefined;
  paymentMethod?: 'cash' | 'mfs_bkash' | 'mfs_nagad' | 'bank_card' | undefined;
  accountId?: string | undefined;
  notes?: string | undefined;
  isEarlySettlement?: boolean | undefined;
  paperWidthMm?: 58 | 80 | undefined;
}

export interface KistiContractBookingResult {
  contractId: string;
  contractNo: string;
  saleId: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  productName: string;
  imei1: string;
  totalPayableAmount: string;
  downPaymentAmount: string;
  principalAmount: string;
  remainingDueAmount: string;
  tenureMonths: number;
  monthlyInstallmentAmount: string;
  downPaymentReceipt?: {
    receiptId: string;
    receiptNo: string;
    amount: string;
  } | undefined;
  schedule: Array<{
    installmentNumber: number;
    dueDate: string;
    amount: string;
    status: string;
  }>;
  printData: EscPosPrintPayload;
}

export interface KistiCollectionResult {
  receiptId: string;
  receiptNo: string;
  contractId: string;
  contractNo: string;
  customerId: string;
  customerName: string;
  amountCollected: string;
  previousDue: string;
  remainingDue: string;
  paymentMethod: string;
  contractStatus: 'active' | 'defaulted' | 'settled';
  isEarlySettlement: boolean;
  updatedMilestones: Array<{
    installmentNumber: number;
    paidAmount: string;
    status: string;
  }>;
  printData: EscPosPrintPayload;
}

export class KistiService {
  /**
   * Book Installment Contract (TX-11)
   */
  static async bookContract(payload: CreateKistiContractInput): Promise<KistiContractBookingResult> {
    const {
      shopId,
      userId,
      idempotencyKey,
      customerId,
      variantId,
      imei1,
      cashPrice,
      downPayment,
      downPaymentAccountId,
      paymentMethod = 'cash',
      tenureMonths,
      interestRate,
      interestFeeAmount,
      guarantors,
      notes,
      paperWidthMm = 80
    } = payload;

    const sId = new mongoose.Types.ObjectId(shopId);
    const uId = new mongoose.Types.ObjectId(userId);
    const cId = new mongoose.Types.ObjectId(customerId);
    const vId = new mongoose.Types.ObjectId(variantId);

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      const err: any = new Error('Mandatory Idempotency-Key header is required for Kisti contract booking');
      err.statusCode = 400;
      err.code = 'IDEMPOTENCY_KEY_REQUIRED';
      throw err;
    }

    // 1. Idempotency Check: return existing contract if already created
    const existingContract = await KistiContract.findOne({ shopId: sId, idempotencyKey });
    if (existingContract) {
      return this.formatExistingContractResult(existingContract, paperWidthMm);
    }

    const acquiredLocks: Array<{ key: string; token: string }> = [];

    // Idempotency lock
    const idempLockKey = `lock:idemp:kisti:${sId}:${idempotencyKey}`;
    const idempLockRes = await lockService.acquireLock(idempLockKey, 15);
    if (!idempLockRes.acquired) {
      const checkContract = await KistiContract.findOne({ shopId: sId, idempotencyKey });
      if (checkContract) {
        return this.formatExistingContractResult(checkContract, paperWidthMm);
      }
      const err: any = new Error('A Kisti booking request with this idempotency key is already in progress');
      err.statusCode = 409;
      err.code = 'IDEMPOTENCY_IN_PROGRESS';
      throw err;
    }
    acquiredLocks.push({ key: idempLockKey, token: idempLockRes.token });

    try {
      // 2. Validate Input Format: IMEI & Luhn
      const cleanImei = (imei1 || '').trim();
      if (!validateLuhn(cleanImei)) {
        const err: any = new Error(`INVALID_IMEI_LUHN: IMEI "${cleanImei}" failed Luhn checksum validation`);
        err.statusCode = 422;
        err.code = 'INVALID_IMEI_LUHN';
        throw err;
      }

      // 3. Validate Guarantors (Mandatory 2 Guarantors)
      if (!guarantors || guarantors.length < 2) {
        const err: any = new Error('GUARANTORS_REQUIRED: Kisti agreement requires at least 2 guarantors with valid NID and mobile numbers');
        err.statusCode = 422;
        err.code = 'GUARANTORS_REQUIRED';
        throw err;
      }

      // 4. Validate Customer
      const customer = await Customer.findOne({ _id: cId, shopId: sId, isDeleted: false });
      if (!customer) {
        const err: any = new Error(`Customer "${customerId}" not found`);
        err.statusCode = 404;
        err.code = 'CUSTOMER_NOT_FOUND';
        throw err;
      }

      // 5. Validate Variant & Parent Product
      const variant = await ProductVariant.findOne({ _id: vId, shopId: sId, isDeleted: false });
      if (!variant) {
        const err: any = new Error(`Product variant "${variantId}" not found`);
        err.statusCode = 404;
        err.code = 'VARIANT_NOT_FOUND';
        throw err;
      }

      const product = await Product.findOne({ _id: variant.productId, shopId: sId, isDeleted: false });
      if (!product) {
        const err: any = new Error(`Product not found for variant "${variantId}"`);
        err.statusCode = 404;
        err.code = 'PRODUCT_NOT_FOUND';
        throw err;
      }

      // 6. Validate IMEI in Shop Inventory
      const imeiDoc = await ImeiSerial.findOne({
        shopId: sId,
        variantId: vId,
        $or: [{ imei1: cleanImei }, { imei2: cleanImei }]
      });

      if (!imeiDoc) {
        const err: any = new Error(`Handset IMEI "${cleanImei}" not found in shop inventory`);
        err.statusCode = 404;
        err.code = 'IMEI_NOT_FOUND';
        throw err;
      }

      if (imeiDoc.status !== 'available') {
        const err: any = new Error(`IMEI_ALREADY_SOLD: Handset IMEI "${cleanImei}" is not available (current status: ${imeiDoc.status})`);
        err.statusCode = 409;
        err.code = 'IMEI_ALREADY_SOLD';
        throw err;
      }

      // Concurrency lock on IMEI
      const imeiLockKey = `lock:imei:${imeiDoc._id}`;
      const imeiLockRes = await lockService.acquireLock(imeiLockKey, 15);
      if (!imeiLockRes.acquired) {
        const err: any = new Error(`Handset IMEI "${cleanImei}" is currently locked by another checkout`);
        err.statusCode = 409;
        err.code = 'IMEI_LOCKED';
        throw err;
      }
      acquiredLocks.push({ key: imeiLockKey, token: imeiLockRes.token });

      const g1 = guarantors[0]!;
      const g2 = guarantors[1]!;

      const g1Name = (g1.fullName || g1.name || '').trim();
      const g2Name = (g2.fullName || g2.name || '').trim();

      if (!g1Name || !g1.phone || !g1.nid || !g2Name || !g2.phone || !g2.nid) {
        const err: any = new Error('Both Guarantor 1 and Guarantor 2 must have complete name, phone, and NID numbers');
        err.statusCode = 422;
        err.code = 'INVALID_GUARANTOR_DATA';
        throw err;
      }

      // 6. Validate Financial Amounts
      const cashPriceDec = toDecimal(cashPrice);
      const downPaymentDec = toDecimal(downPayment);

      if (!cashPriceDec.greaterThan(0)) {
        const err: any = new Error('Cash price must be greater than zero');
        err.statusCode = 400;
        err.code = 'INVALID_PRICE';
        throw err;
      }

      if (downPaymentDec.isNegative()) {
        const err: any = new Error('Down payment cannot be negative');
        err.statusCode = 400;
        err.code = 'INVALID_DOWN_PAYMENT';
        throw err;
      }

      if (tenureMonths < 1 || tenureMonths > 36) {
        const err: any = new Error('Installment tenure must be between 1 and 36 months');
        err.statusCode = 400;
        err.code = 'INVALID_TENURE';
        throw err;
      }

      // Calculate Interest Fee / Markup
      let interestFeeDec = toDecimal(0);
      if (interestFeeAmount !== undefined && interestFeeAmount !== null) {
        interestFeeDec = toDecimal(interestFeeAmount);
      } else if (interestRate !== undefined && interestRate !== null) {
        const rateDec = toDecimal(interestRate).dividedBy(100);
        const financedBase = subtractMoney(cashPriceDec, downPaymentDec);
        interestFeeDec = financedBase.greaterThan(0) ? financedBase.times(rateDec) : toDecimal(0);
      }

      const totalPayableDec = addMoney(cashPriceDec, interestFeeDec);
      if (downPaymentDec.greaterThanOrEqualTo(totalPayableDec)) {
        const err: any = new Error('Down payment cannot equal or exceed total payable amount in an installment contract');
        err.statusCode = 422;
        err.code = 'DOWN_PAYMENT_EXCEEDS_TOTAL';
        throw err;
      }

      const principalDueDec = subtractMoney(totalPayableDec, downPaymentDec);

      // Verify or find open shift for cashier/shop
      let activeShift = await Shift.findOne({
        shopId: sId,
        cashierUserId: uId,
        status: { $in: ['open', 'OPEN'] }
      });

      if (!activeShift) {
        activeShift = await Shift.findOne({
          shopId: sId,
          status: { $in: ['open', 'OPEN'] }
        });
      }

      const shiftId = activeShift ? activeShift._id : new mongoose.Types.ObjectId();

      // 7. Calculate Repayment Schedule (Equal Monthly Milestones with Exact Paisa Allocation)
      const perMonthBase = principalDueDec.dividedBy(tenureMonths).toDecimalPlaces(2, Decimal.ROUND_DOWN);
      const scheduleItems: Array<{ installmentNumber: number; dueDate: Date; amount: Decimal }> = [];

      let runningAllocated = toDecimal(0);
      const now = new Date();

      for (let i = 1; i <= tenureMonths; i++) {
        const dueDate = new Date(now);
        dueDate.setMonth(dueDate.getMonth() + i);

        let milestoneAmount: Decimal;
        if (i === tenureMonths) {
          milestoneAmount = subtractMoney(principalDueDec, runningAllocated);
        } else {
          milestoneAmount = perMonthBase;
          runningAllocated = addMoney(runningAllocated, milestoneAmount);
        }

        scheduleItems.push({
          installmentNumber: i,
          dueDate,
          amount: milestoneAmount
        });
      }

      // Generate Numbers: KST-YYYYMM-XXXXX, INV-YYYYMM-XXXXX, DP-YYYYMM-XXXXX
      const monthPrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const randomSeq = Math.floor(10000 + Math.random() * 90000);
      const contractNo = `KST-${monthPrefix}-${randomSeq}`;
      const invoiceNo = `INV-${monthPrefix}-${randomSeq}`;
      const downPaymentReceiptNo = `DP-${monthPrefix}-${randomSeq}`;

      let createdContract: any = null;
      let createdSale: any = null;
      let createdDownPaymentReceipt: any = null;
      const createdInstallments: any[] = [];

      // 8. Atomic Database Transaction (Mongoose session)
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // 8a. Relieve Handset IMEI
          imeiDoc.status = 'sold';

          // 8b. Create Sale Invoice Document
          const saleDoc = new Sale({
            shopId: sId,
            invoiceNo,
            idempotencyKey: `sale_${idempotencyKey}`,
            customerId: cId,
            shiftId,
            subtotalAmount: formatMoney(cashPriceDec),
            discountAmount: '0.00',
            vatAmount: '0.00',
            grandTotalAmount: formatMoney(totalPayableDec),
            paidAmount: formatMoney(downPaymentDec),
            dueAmount: formatMoney(principalDueDec),
            changeAmount: '0.00',
            paymentMethods: [
              ...(downPaymentDec.greaterThan(0)
                ? [
                    {
                      method: paymentMethod as any,
                      amount: formatMoney(downPaymentDec) as any,
                      accountId: downPaymentAccountId ? new mongoose.Types.ObjectId(downPaymentAccountId) : undefined
                    }
                  ]
                : []),
              {
                method: 'kisti' as any,
                amount: formatMoney(principalDueDec) as any
              }
            ],
            status: 'completed',
            soldByUserId: uId
          });
          await saleDoc.save({ session });
          createdSale = saleDoc;
          imeiDoc.saleId = saleDoc._id as any;
          await imeiDoc.save({ session });

          // 8c. Create SaleItem Document
          const saleItem = new SaleItem({
            shopId: sId,
            saleId: saleDoc._id,
            variantId: vId,
            productName: product.name,
            variantTitle: variant.sku || variant.barcode,
            barcode: variant.barcode,
            imei1: cleanImei,
            imei2: imeiDoc.imei2,
            quantity: 1,
            unitPrice: formatMoney(cashPriceDec),
            specificPurchaseCost: formatMoney(imeiDoc.purchaseCost || 0),
            discountAmount: '0.00',
            netLineTotal: formatMoney(cashPriceDec)
          });
          await saleItem.save({ session });

          // 8d. Record Immutable Inventory Movement
          const invMovement = new InventoryMovement({
            shopId: sId,
            variantId: vId,
            imeiSerialId: imeiDoc._id,
            movementType: 'sale_out',
            quantityDelta: -1,
            unitCost: formatMoney(imeiDoc.purchaseCost || 0),
            referenceType: 'sale',
            referenceId: saleDoc._id,
            performedBy: uId,
            note: `Kisti Contract ${contractNo} booking`
          });
          await invMovement.save({ session });

          // 8e. Create KistiContract Record
          const contractDoc = new KistiContract({
            shopId: sId,
            contractNo,
            idempotencyKey,
            customerId: cId,
            saleId: saleDoc._id,
            imei1: cleanImei,
            productName: `${product.name} (${variant.sku || cleanImei})`,
            principalAmount: formatMoney(principalDueDec),
            interestFeeAmount: formatMoney(interestFeeDec),
            downPaymentAmount: formatMoney(downPaymentDec),
            totalPayableAmount: formatMoney(totalPayableDec),
            remainingDueAmount: formatMoney(principalDueDec),
            installmentPeriodMonths: tenureMonths,
            guarantor1: {
              fullName: g1Name,
              phone: g1.phone.trim(),
              nid: g1.nid.trim(),
              relation: g1.relation.trim()
            },
            guarantor2: {
              fullName: g2Name,
              phone: g2.phone.trim(),
              nid: g2.nid.trim(),
              relation: g2.relation.trim()
            },
            status: 'active',
            notes: notes?.trim(),
            createdByUserId: uId
          });
          await contractDoc.save({ session });
          createdContract = contractDoc;

          // 8f. Create KistiInstallment Milestone Records
          for (const item of scheduleItems) {
            const installmentDoc = new KistiInstallment({
              shopId: sId,
              contractId: contractDoc._id,
              installmentNumber: item.installmentNumber,
              dueDate: item.dueDate,
              installmentAmount: formatMoney(item.amount),
              paidAmount: '0.00',
              status: 'pending'
            });
            await installmentDoc.save({ session });
            createdInstallments.push(installmentDoc);
          }

          // 8g. If Down Payment > 0, Record MoneyReceipt
          if (downPaymentDec.greaterThan(0)) {
            const dpReceipt = new MoneyReceipt({
              shopId: sId,
              receiptNo: downPaymentReceiptNo,
              idempotencyKey: `dp_${idempotencyKey}`,
              customerId: cId,
              receiptType: 'kisti_installment',
              kistiContractId: contractDoc._id,
              amount: formatMoney(downPaymentDec),
              paymentMethod,
              accountId: downPaymentAccountId ? new mongoose.Types.ObjectId(downPaymentAccountId) : undefined,
              allocatedInvoices: [
                {
                  saleId: saleDoc._id,
                  invoiceNo,
                  amountAllocated: formatMoney(downPaymentDec) as any
                }
              ],
              previousDue: formatMoney(totalPayableDec),
              remainingDue: formatMoney(principalDueDec),
              notes: `Down payment for Kisti Contract ${contractNo}`,
              collectedByUserId: uId
            });
            await dpReceipt.save({ session });
            createdDownPaymentReceipt = dpReceipt;
          }

          // 8h. Post Double-Entry General Ledger (TX-11)
          let downPaymentAccountCode = '1.1.01';
          if (paymentMethod === 'bank_card') downPaymentAccountCode = '1.2.01';
          else if (paymentMethod.startsWith('mfs')) downPaymentAccountCode = '1.3.01';

          const journalEntries = buildTx11KistiSale({
            downPayment: formatMoney(downPaymentDec),
            principalAmount: formatMoney(principalDueDec),
            grossPrice: formatMoney(totalPayableDec),
            landedCost: formatMoney(imeiDoc.purchaseCost || 0),
            downPaymentAccountCode
          });

          await AccountingService.postDoubleEntryJournal({
            shopId: sId,
            voucherNo: `JV-${contractNo}`,
            txnCode: 'TX-11',
            sourceDocType: 'KistiContract',
            sourceDocId: createdContract._id,
            postedByUserId: uId,
            entries: journalEntries,
            session
          });
        });
      } finally {
        await session.endSession();
      }

      // 9. Build ESC/POS Thermal Print Payload
      const shopDoc = await Shop.findById(sId);
      const printData = HardwareService.buildEscPosPayload(
        {
          shopName: shopDoc?.name || 'Kanchan Telecom',
          branch: shopDoc?.binNumber ? `BIN: ${shopDoc.binNumber}` : 'Eastern Plaza',
          phone: shopDoc?.phone || undefined,
          invoiceNo: contractNo,
          date: new Date().toLocaleString('en-US', { hour12: true }),
          cashier: (await User.findById(uId))?.fullName || 'Cashier',
          customer: customer.fullName,
          customerPhone: customer.phone,
          items: [
            {
              name: `${product.name} [KISTI LOAN]`,
              imei: cleanImei,
              qty: 1,
              price: formatMoney(totalPayableDec),
              total: formatMoney(totalPayableDec)
            }
          ],
          subTotal: formatMoney(cashPriceDec),
          discount: '0.00',
          vat: '0.00',
          grandTotal: formatMoney(totalPayableDec),
          paid: formatMoney(downPaymentDec),
          due: formatMoney(principalDueDec),
          change: '0.00',
          footer: `Down Payment: ৳${formatMoney(downPaymentDec)} | Financed: ৳${formatMoney(principalDueDec)} (${tenureMonths} Months) | Guarantors: ${g1Name}, ${g2Name}`
        },
        paperWidthMm,
        downPaymentDec.greaterThan(0) && paymentMethod === 'cash'
      );

      return {
        contractId: createdContract._id.toString(),
        contractNo,
        saleId: createdSale._id.toString(),
        invoiceNo,
        customerId: customer._id.toString(),
        customerName: customer.fullName,
        productName: `${product.name} (${cleanImei})`,
        imei1: cleanImei,
        totalPayableAmount: formatMoney(totalPayableDec),
        downPaymentAmount: formatMoney(downPaymentDec),
        principalAmount: formatMoney(principalDueDec),
        remainingDueAmount: formatMoney(principalDueDec),
        tenureMonths,
        monthlyInstallmentAmount: formatMoney(perMonthBase),
        downPaymentReceipt: createdDownPaymentReceipt
          ? {
              receiptId: createdDownPaymentReceipt._id.toString(),
              receiptNo: createdDownPaymentReceipt.receiptNo,
              amount: formatMoney(downPaymentDec)
            }
          : undefined,
        schedule: createdInstallments.map((inst) => ({
          installmentNumber: inst.installmentNumber,
          dueDate: inst.dueDate.toISOString().split('T')[0]!,
          amount: formatMoney(inst.installmentAmount),
          status: inst.status
        })),
        printData
      };
    } finally {
      for (const lk of acquiredLocks) {
        await lockService.releaseLock(lk.key, lk.token);
      }
    }
  }

  /**
   * Collect Kisti Installment Milestone (TX-11)
   * Supports: Full Payment, Partial Payment, and Early Settlement
   */
  static async collectMilestone(payload: CollectKistiMilestoneInput): Promise<KistiCollectionResult> {
    const {
      shopId,
      userId,
      contractId,
      idempotencyKey,
      amount,
      milestoneNo,
      paymentMethod = 'cash',
      accountId,
      notes,
      isEarlySettlement = false,
      paperWidthMm = 80
    } = payload;

    const sId = new mongoose.Types.ObjectId(shopId);
    const uId = new mongoose.Types.ObjectId(userId);
    const kId = new mongoose.Types.ObjectId(contractId);

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      const err: any = new Error('Mandatory Idempotency-Key header is required for milestone collection');
      err.statusCode = 400;
      err.code = 'IDEMPOTENCY_KEY_REQUIRED';
      throw err;
    }

    // 1. Idempotency Check: return existing receipt if already collected
    const existingReceipt = await MoneyReceipt.findOne({ shopId: sId, idempotencyKey });
    if (existingReceipt) {
      return this.formatExistingCollectionResult(existingReceipt, paperWidthMm);
    }

    const acquiredLocks: Array<{ key: string; token: string }> = [];

    // Idempotency lock
    const idempLockKey = `lock:idemp:kisti:collect:${sId}:${idempotencyKey}`;
    const idempLockRes = await lockService.acquireLock(idempLockKey, 15);
    if (!idempLockRes.acquired) {
      const checkReceipt = await MoneyReceipt.findOne({ shopId: sId, idempotencyKey });
      if (checkReceipt) {
        return this.formatExistingCollectionResult(checkReceipt, paperWidthMm);
      }
      const err: any = new Error('A milestone collection with this idempotency key is already in progress');
      err.statusCode = 409;
      err.code = 'IDEMPOTENCY_IN_PROGRESS';
      throw err;
    }
    acquiredLocks.push({ key: idempLockKey, token: idempLockRes.token });

    try {
      // 2. Validate Contract
      const contract = await KistiContract.findOne({ _id: kId, shopId: sId });
      if (!contract) {
        const err: any = new Error(`CONTRACT_NOT_FOUND: Kisti contract "${contractId}" not found`);
        err.statusCode = 404;
        err.code = 'CONTRACT_NOT_FOUND';
        throw err;
      }

      if (contract.status === 'settled') {
        const err: any = new Error(`CONTRACT_ALREADY_SETTLED: Kisti contract "${contract.contractNo}" is already fully settled`);
        err.statusCode = 422;
        err.code = 'CONTRACT_ALREADY_SETTLED';
        throw err;
      }

      const remainingDueDec = toDecimal(contract.remainingDueAmount || 0);
      const collectAmountDec = toDecimal(amount);

      if (!collectAmountDec.greaterThan(0)) {
        const err: any = new Error('Collection amount must be strictly greater than zero');
        err.statusCode = 400;
        err.code = 'INVALID_COLLECTION_AMOUNT';
        throw err;
      }

      if (!remainingDueDec.greaterThan(0)) {
        const err: any = new Error(`Contract "${contract.contractNo}" has zero remaining due balance`);
        err.statusCode = 422;
        err.code = 'NO_OUTSTANDING_DUE';
        throw err;
      }

      if (collectAmountDec.greaterThan(remainingDueDec)) {
        const err: any = new Error(
          `AMOUNT_EXCEEDS_DUE: Collection amount ৳${formatMoney(collectAmountDec)} exceeds contract remaining due of ৳${formatMoney(remainingDueDec)}`
        );
        err.statusCode = 422;
        err.code = 'AMOUNT_EXCEEDS_DUE';
        throw err;
      }

      const customer = await Customer.findOne({ _id: contract.customerId, shopId: sId });
      if (!customer) {
        const err: any = new Error(`Customer "${contract.customerId}" not found`);
        err.statusCode = 404;
        err.code = 'CUSTOMER_NOT_FOUND';
        throw err;
      }

      // 3. Milestone Allocation (Partial, Exact, or Cascading Overflow)
      const unpaidInstallments = await KistiInstallment.find({
        shopId: sId,
        contractId: kId,
        status: { $ne: 'paid' }
      }).sort({ installmentNumber: 1 });

      if (unpaidInstallments.length === 0) {
        const err: any = new Error(`Contract "${contract.contractNo}" has no unpaid installments`);
        err.statusCode = 422;
        err.code = 'NO_UNPAID_INSTALLMENTS';
        throw err;
      }

      // If specific milestoneNo provided, sort it to the front of allocation queue
      let queue = [...unpaidInstallments];
      if (milestoneNo) {
        const specificIdx = queue.findIndex((inst) => inst.installmentNumber === milestoneNo);
        if (specificIdx === -1) {
          const err: any = new Error(`Installment milestone #${milestoneNo} is already paid or not found`);
          err.statusCode = 422;
          err.code = 'INSTALLMENT_ALREADY_PAID';
          throw err;
        }
        const [target] = queue.splice(specificIdx, 1);
        if (target) {
          queue = [target, ...queue];
        }
      }

      let remainingToAllocate = collectAmountDec;
      const updatedMilestones: any[] = [];
      const now = new Date();

      const monthPrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const randomSeq = Math.floor(10000 + Math.random() * 90000);
      const receiptNo = `MR-KST-${monthPrefix}-${randomSeq}`;

      // Allocate across installments
      for (const inst of queue) {
        if (!remainingToAllocate.greaterThan(0)) break;

        const scheduledAmount = toDecimal(inst.installmentAmount);
        const alreadyPaid = toDecimal(inst.paidAmount || 0);
        const remainingForThis = subtractMoney(scheduledAmount, alreadyPaid);

        let alloc: Decimal;
        if (remainingToAllocate.greaterThanOrEqualTo(remainingForThis)) {
          alloc = remainingForThis;
          inst.paidAmount = formatMoney(scheduledAmount) as any;
          inst.status = 'paid';
          inst.paidDate = now;
          inst.paymentReceiptNo = receiptNo;
        } else {
          // Partial Payment
          alloc = remainingToAllocate;
          const newPaid = addMoney(alreadyPaid, alloc);
          inst.paidAmount = formatMoney(newPaid) as any;
          // Remains overdue if past due, else pending
          if (now > inst.dueDate) {
            inst.status = 'overdue';
          } else {
            inst.status = 'pending';
          }
          inst.paymentReceiptNo = receiptNo;
        }

        if (notes) {
          inst.notes = notes;
        }

        remainingToAllocate = subtractMoney(remainingToAllocate, alloc);
        updatedMilestones.push(inst);
      }

      const newRemainingDueDec = subtractMoney(remainingDueDec, collectAmountDec);
      const isSettled = newRemainingDueDec.equals(0) || isEarlySettlement;

      // 4. Atomic Database Transaction (TX-11 Collection)
      let createdReceipt: any = null;
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // 4a. Save all updated installments
          for (const inst of updatedMilestones) {
            await inst.save({ session });
          }

          // If early settlement or remaining due is 0, mark any remaining pending milestones as paid
          if (isSettled) {
            await KistiInstallment.updateMany(
              { shopId: sId, contractId: kId, status: { $ne: 'paid' } },
              { $set: { status: 'paid', paidDate: now, paymentReceiptNo: receiptNo } },
              { session }
            );
          }

          // 4b. Update KistiContract Remaining Due & Status
          contract.remainingDueAmount = formatMoney(newRemainingDueDec) as any;
          if (isSettled) {
            contract.status = 'settled';
          } else {
            // Check if contract has any remaining overdue milestones > 30 days
            const hasOverdueMilestones = await KistiInstallment.exists({
              shopId: sId,
              contractId: kId,
              status: 'overdue'
            }).session(session);

            if (!hasOverdueMilestones && contract.status === 'defaulted') {
              contract.status = 'active';
            }
          }
          await contract.save({ session });

          // 4c. Create MoneyReceipt Record
          const receiptDoc = new MoneyReceipt({
            shopId: sId,
            receiptNo,
            idempotencyKey,
            customerId: contract.customerId,
            receiptType: 'kisti_installment',
            kistiContractId: contract._id,
            milestoneNo: milestoneNo || updatedMilestones[0]?.installmentNumber,
            isEarlySettlement: isSettled,
            amount: formatMoney(collectAmountDec),
            paymentMethod,
            accountId: accountId ? new mongoose.Types.ObjectId(accountId) : undefined,
            allocatedInvoices: [
              {
                saleId: contract.saleId,
                invoiceNo: contract.contractNo,
                amountAllocated: formatMoney(collectAmountDec) as any
              }
            ],
            previousDue: formatMoney(remainingDueDec),
            remainingDue: formatMoney(newRemainingDueDec),
            notes: notes || `Milestone payment for Kisti Contract ${contract.contractNo}`,
            collectedByUserId: uId
          });
          await receiptDoc.save({ session });
          createdReceipt = receiptDoc;

          // 4d. Post Double-Entry Journal (TX-11 Milestone Collection)
          let targetAccountCode = '1.1.01';
          if (paymentMethod === 'bank_card') targetAccountCode = '1.2.01';
          else if (paymentMethod.startsWith('mfs')) targetAccountCode = '1.3.01';

          const journalEntries = buildTx11KistiCollection({
            installmentAmount: formatMoney(collectAmountDec),
            targetAccountCode
          });

          await AccountingService.postDoubleEntryJournal({
            shopId: sId,
            voucherNo: `JV-${receiptNo}`,
            txnCode: 'TX-11',
            sourceDocType: 'MoneyReceipt',
            sourceDocId: receiptDoc._id,
            postedByUserId: uId,
            entries: journalEntries,
            session
          });
        });
      } finally {
        await session.endSession();
      }

      // 5. Automated SMS Confirmation Dispatch
      const shopDoc = await Shop.findById(sId);
      const dokanName = shopDoc?.name || 'Kanchan Telecom';
      const mText = isSettled
        ? `Dear ${customer.fullName}, received full payoff ৳${formatMoney(collectAmountDec)} for Kisti Contract ${contract.contractNo} at ${dokanName}. Contract is now FULLY SETTLED. Receipt: ${receiptNo}. Thank you!`
        : `Dear ${customer.fullName}, received ৳${formatMoney(collectAmountDec)} for Kisti Installment #${milestoneNo || updatedMilestones[0]?.installmentNumber} at ${dokanName}. Remaining balance: ৳${formatMoney(newRemainingDueDec)}. Receipt: ${receiptNo}. Thank you!`;

      await getSmsDriver().sendSms(customer.phone, mText);

      const smsLog = new SmsLog({
        shopId: sId,
        recipientPhone: customer.phone,
        purpose: 'PAYMENT_REMINDER',
        messageBody: mText,
        status: 'DELIVERED',
        providerMessageId: `sms_kisti_${Date.now()}`
      });
      await smsLog.save();

      // 6. Build Thermal Print Payload
      const printData = HardwareService.buildEscPosPayload(
        {
          shopName: dokanName,
          branch: shopDoc?.binNumber ? `BIN: ${shopDoc.binNumber}` : 'Eastern Plaza',
          phone: shopDoc?.phone || undefined,
          invoiceNo: receiptNo,
          date: new Date().toLocaleString('en-US', { hour12: true }),
          cashier: (await User.findById(uId))?.fullName || 'Cashier',
          customer: customer.fullName,
          customerPhone: customer.phone,
          items: [
            {
              name: isSettled
                ? `Kisti Settlement: ${contract.contractNo}`
                : `Kisti Milestone #${milestoneNo || updatedMilestones[0]?.installmentNumber}: ${contract.contractNo}`,
              qty: 1,
              price: formatMoney(collectAmountDec),
              total: formatMoney(collectAmountDec)
            }
          ],
          subTotal: formatMoney(collectAmountDec),
          discount: '0.00',
          vat: '0.00',
          grandTotal: formatMoney(collectAmountDec),
          paid: formatMoney(collectAmountDec),
          due: formatMoney(newRemainingDueDec),
          change: '0.00',
          footer: `Previous Due: ৳${formatMoney(remainingDueDec)} | Remaining: ৳${formatMoney(newRemainingDueDec)}${isSettled ? ' | STATUS: FULLY SETTLED' : ''}`
        },
        paperWidthMm,
        paymentMethod === 'cash'
      );

      return {
        receiptId: createdReceipt._id.toString(),
        receiptNo,
        contractId: contract._id.toString(),
        contractNo: contract.contractNo,
        customerId: customer._id.toString(),
        customerName: customer.fullName,
        amountCollected: formatMoney(collectAmountDec),
        previousDue: formatMoney(remainingDueDec),
        remainingDue: formatMoney(newRemainingDueDec),
        paymentMethod,
        contractStatus: contract.status,
        isEarlySettlement: isSettled,
        updatedMilestones: updatedMilestones.map((inst) => ({
          installmentNumber: inst.installmentNumber,
          paidAmount: formatMoney(inst.paidAmount),
          status: inst.status
        })),
        printData
      };
    } finally {
      for (const lk of acquiredLocks) {
        await lockService.releaseLock(lk.key, lk.token);
      }
    }
  }

  /**
   * One-Click Early Settlement Helper
   */
  static async earlySettleContract(params: {
    shopId: mongoose.Types.ObjectId | string;
    userId: mongoose.Types.ObjectId | string;
    contractId: string;
    idempotencyKey: string;
    paymentMethod?: 'cash' | 'mfs_bkash' | 'mfs_nagad' | 'bank_card';
    accountId?: string;
    notes?: string;
    paperWidthMm?: 58 | 80;
  }): Promise<KistiCollectionResult> {
    const sId = new mongoose.Types.ObjectId(params.shopId);
    const kId = new mongoose.Types.ObjectId(params.contractId);

    const contract = await KistiContract.findOne({ _id: kId, shopId: sId });
    if (!contract) {
      const err: any = new Error(`CONTRACT_NOT_FOUND: Kisti contract "${params.contractId}" not found`);
      err.statusCode = 404;
      err.code = 'CONTRACT_NOT_FOUND';
      throw err;
    }

    const remainingDue = formatMoney(contract.remainingDueAmount);

    return this.collectMilestone({
      ...params,
      amount: remainingDue,
      isEarlySettlement: true,
      notes: params.notes || `Full Early Settlement for Contract ${contract.contractNo}`
    });
  }

  /**
   * Get Contract 360° Profile & Amortization Schedule
   */
  static async getContractById(
    shopId: mongoose.Types.ObjectId | string,
    contractId: string
  ): Promise<any> {
    const sId = new mongoose.Types.ObjectId(shopId);
    const kId = new mongoose.Types.ObjectId(contractId);

    const contract = await KistiContract.findOne({ _id: kId, shopId: sId });
    if (!contract) {
      const err: any = new Error(`CONTRACT_NOT_FOUND: Kisti contract "${contractId}" not found`);
      err.statusCode = 404;
      err.code = 'CONTRACT_NOT_FOUND';
      throw err;
    }

    // Refresh overdue statuses dynamically for unpaid milestones
    await this.updateOverdueStatus(sId, kId);

    const [customer, sale, installments, receipts] = await Promise.all([
      Customer.findById(contract.customerId),
      Sale.findById(contract.saleId),
      KistiInstallment.find({ shopId: sId, contractId: kId }).sort({ installmentNumber: 1 }),
      MoneyReceipt.find({ shopId: sId, kistiContractId: kId }).sort({ createdAt: -1 })
    ]);

    const totalPaidDec = subtractMoney(
      toDecimal(contract.totalPayableAmount),
      toDecimal(contract.remainingDueAmount)
    );

    const now = new Date();
    const overdueInstallments = installments.filter(
      (inst) => inst.status !== 'paid' && new Date(inst.dueDate) < now
    );

    return {
      ...contract.toObject(),
      customer: customer ? customer.toObject() : null,
      sale: sale ? sale.toObject() : null,
      totalPaidAmount: formatMoney(totalPaidDec),
      overdueMilestonesCount: overdueInstallments.length,
      overdueAmount: formatMoney(
        overdueInstallments.reduce(
          (acc, inst) => addMoney(acc, subtractMoney(toDecimal(inst.installmentAmount), toDecimal(inst.paidAmount || 0))),
          toDecimal(0)
        )
      ),
      installments: installments.map((inst) => inst.toObject()),
      receipts: receipts.map((rec) => rec.toObject())
    };
  }

  /**
   * List Kisti Contracts with Search, Status Filters & Financial Metrics
   */
  static async listContracts(params: {
    shopId: mongoose.Types.ObjectId | string;
    search?: string;
    status?: 'all' | 'active' | 'overdue' | 'defaulted' | 'settled';
    customerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    contracts: any[];
    total: number;
    page: number;
    limit: number;
    metrics: {
      totalFinanced: string;
      totalRemainingDue: string;
      activeCount: number;
      overdueCount: number;
      defaultedCount: number;
      settledCount: number;
    };
  }> {
    const { shopId, search, status = 'all', customerId, page = 1, limit = 20 } = params;
    const sId = new mongoose.Types.ObjectId(shopId);

    // Dynamic sweep of overdue milestones
    await this.updateOverdueStatus(sId);

    const filter: any = { shopId: sId };

    if (customerId) {
      filter.customerId = new mongoose.Types.ObjectId(customerId);
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const matchedCustomers = await Customer.find({
        shopId: sId,
        $or: [{ fullName: new RegExp(q, 'i') }, { phone: new RegExp(q, 'i') }]
      }).select('_id');

      filter.$or = [
        { contractNo: new RegExp(q, 'i') },
        { imei1: new RegExp(q, 'i') },
        { productName: new RegExp(q, 'i') },
        { customerId: { $in: matchedCustomers.map((c) => c._id) } },
        { 'guarantor1.fullName': new RegExp(q, 'i') },
        { 'guarantor1.phone': new RegExp(q, 'i') }
      ];
    }

    const total = await KistiContract.countDocuments(filter);
    const contracts = await KistiContract.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customerId', 'fullName phone nidNumber');

    // Financial Metrics Summary across tenant shop
    const [allContracts, overdueContractsCount] = await Promise.all([
      KistiContract.find({ shopId: sId }),
      KistiInstallment.distinct('contractId', { shopId: sId, status: 'overdue' })
    ]);

    let totalFinanced = toDecimal(0);
    let totalRemainingDue = toDecimal(0);
    let activeCount = 0;
    let defaultedCount = 0;
    let settledCount = 0;

    for (const c of allContracts) {
      totalFinanced = addMoney(totalFinanced, toDecimal(c.principalAmount || 0));
      totalRemainingDue = addMoney(totalRemainingDue, toDecimal(c.remainingDueAmount || 0));

      if (c.status === 'active') activeCount++;
      else if (c.status === 'defaulted') defaultedCount++;
      else if (c.status === 'settled') settledCount++;
    }

    return {
      contracts: contracts.map((c) => c.toObject()),
      total,
      page,
      limit,
      metrics: {
        totalFinanced: formatMoney(totalFinanced),
        totalRemainingDue: formatMoney(totalRemainingDue),
        activeCount,
        overdueCount: overdueContractsCount.length,
        defaultedCount,
        settledCount
      }
    };
  }

  /**
   * Defaulter Registry (> 30 Days Overdue)
   */
  static async listDefaulters(params: {
    shopId: mongoose.Types.ObjectId | string;
    page?: number;
    limit?: number;
  }): Promise<{
    defaulters: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { shopId, page = 1, limit = 20 } = params;
    const sId = new mongoose.Types.ObjectId(shopId);

    // Refresh overdue statuses
    await this.updateOverdueStatus(sId);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Find all installments overdue by > 30 days
    const severeOverdueInstallments = await KistiInstallment.find({
      shopId: sId,
      status: { $in: ['overdue', 'pending'] },
      dueDate: { $lt: thirtyDaysAgo }
    }).sort({ dueDate: 1 });

    const contractIds = Array.from(new Set(severeOverdueInstallments.map((i) => i.contractId.toString())));

    const total = contractIds.length;
    const pagedContractIds = contractIds.slice((page - 1) * limit, page * limit);

    const contracts = await KistiContract.find({
      _id: { $in: pagedContractIds.map((id) => new mongoose.Types.ObjectId(id)) }
    }).populate('customerId', 'fullName phone address');

    const defaulters = contracts.map((c) => {
      const contractInstallments = severeOverdueInstallments.filter(
        (i) => i.contractId.toString() === c._id.toString()
      );
      const oldestDueDate = contractInstallments[0]?.dueDate || now;
      const daysOverdue = Math.floor((now.getTime() - new Date(oldestDueDate).getTime()) / (1000 * 60 * 60 * 24));

      const overdueAmount = contractInstallments.reduce(
        (acc, inst) => addMoney(acc, subtractMoney(toDecimal(inst.installmentAmount), toDecimal(inst.paidAmount || 0))),
        toDecimal(0)
      );

      return {
        contractId: c._id.toString(),
        contractNo: c.contractNo,
        customerName: (c.customerId as any)?.fullName || 'Customer',
        customerPhone: (c.customerId as any)?.phone || '',
        customerAddress: (c.customerId as any)?.address || '',
        guarantor1: c.guarantor1,
        guarantor2: c.guarantor2,
        productName: c.productName || 'Handset',
        imei1: c.imei1 || '',
        totalRemainingDue: formatMoney(c.remainingDueAmount),
        overdueAmount: formatMoney(overdueAmount),
        daysOverdue,
        overdueMilestonesCount: contractInstallments.length,
        status: c.status
      };
    });

    return {
      defaulters,
      total,
      page,
      limit
    };
  }

  /**
   * Send Automated SMS Reminder to Customer & Guarantors
   */
  static async sendSmsReminder(params: {
    shopId: mongoose.Types.ObjectId | string;
    contractId: string;
    targetRecipient?: 'customer' | 'guarantors' | 'both';
  }): Promise<{ success: boolean; messagesDispatched: number; recipients: string[] }> {
    const { shopId, contractId, targetRecipient = 'both' } = params;
    const sId = new mongoose.Types.ObjectId(shopId);
    const kId = new mongoose.Types.ObjectId(contractId);

    const contract = await KistiContract.findOne({ _id: kId, shopId: sId }).populate('customerId');
    if (!contract) {
      const err: any = new Error(`CONTRACT_NOT_FOUND: Kisti contract "${contractId}" not found`);
      err.statusCode = 404;
      err.code = 'CONTRACT_NOT_FOUND';
      throw err;
    }

    const customer = contract.customerId as any;
    const shop = await Shop.findById(sId);
    const dokanName = shop?.name || 'Kanchan Telecom';
    const remainingDue = formatMoney(contract.remainingDueAmount);

    const recipients: string[] = [];
    if ((targetRecipient === 'customer' || targetRecipient === 'both') && customer?.phone) {
      recipients.push(customer.phone);
    }
    if (targetRecipient === 'guarantors' || targetRecipient === 'both') {
      if (contract.guarantor1?.phone) recipients.push(contract.guarantor1.phone);
      if (contract.guarantor2?.phone) recipients.push(contract.guarantor2.phone);
    }

    const uniquePhones = Array.from(new Set(recipients));
    let dispatched = 0;

    for (const phone of uniquePhones) {
      const msg = `Dear Sir/Madam, reminder regarding Kisti Contract ${contract.contractNo} at ${dokanName}. Outstanding balance: ৳${remainingDue}. Please settle the upcoming/overdue milestone promptly. Hotline: ${shop?.phone || '01700000000'}. Thank you!`;
      const res = await getSmsDriver().sendSms(phone, msg);
      if (res.success) {
        dispatched++;
        const log = new SmsLog({
          shopId: sId,
          recipientPhone: phone,
          purpose: 'PAYMENT_REMINDER',
          messageBody: msg,
          status: 'DELIVERED',
          providerMessageId: res.messageId || `msg_kisti_${Date.now()}`
        });
        await log.save();
      }
    }

    return {
      success: dispatched > 0,
      messagesDispatched: dispatched,
      recipients: uniquePhones
    };
  }

  /**
   * Sweeper / Periodic Evaluator for Overdue Statuses
   */
  static async updateOverdueStatus(shopId: mongoose.Types.ObjectId, contractId?: mongoose.Types.ObjectId): Promise<void> {
    const now = new Date();
    const filter: any = {
      shopId,
      status: 'pending',
      dueDate: { $lt: now }
    };

    if (contractId) {
      filter.contractId = contractId;
    }

    // Mark pending past dueDate as overdue
    await KistiInstallment.updateMany(filter, { $set: { status: 'overdue' } });

    // Mark contracts with installments overdue > 30 days as defaulted
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const defaultedContractIds = await KistiInstallment.distinct('contractId', {
      shopId,
      status: 'overdue',
      dueDate: { $lt: thirtyDaysAgo }
    });

    if (defaultedContractIds.length > 0) {
      await KistiContract.updateMany(
        { _id: { $in: defaultedContractIds }, status: 'active' },
        { $set: { status: 'defaulted' } }
      );
    }
  }

  /**
   * Helper to format existing KistiContract for idempotent retries
   */
  private static async formatExistingContractResult(
    contract: IKistiContract,
    paperWidthMm: 58 | 80
  ): Promise<KistiContractBookingResult> {
    const [customer, sale, installments, shop] = await Promise.all([
      Customer.findById(contract.customerId),
      Sale.findById(contract.saleId),
      KistiInstallment.find({ contractId: contract._id }).sort({ installmentNumber: 1 }),
      Shop.findById(contract.shopId)
    ]);

    const printData = HardwareService.buildEscPosPayload(
      {
        shopName: shop?.name || 'Kanchan Telecom',
        branch: shop?.binNumber ? `BIN: ${shop.binNumber}` : 'Eastern Plaza',
        phone: shop?.phone || undefined,
        invoiceNo: contract.contractNo,
        date: new Date(contract.createdAt).toLocaleString('en-US', { hour12: true }),
        cashier: 'Cashier',
        customer: customer?.fullName || 'Customer',
        customerPhone: customer?.phone || undefined,
        items: [
          {
            name: `${contract.productName || 'Handset'} [KISTI LOAN]`,
            imei: contract.imei1,
            qty: 1,
            price: formatMoney(contract.totalPayableAmount),
            total: formatMoney(contract.totalPayableAmount)
          }
        ],
        subTotal: formatMoney(contract.totalPayableAmount),
        discount: '0.00',
        vat: '0.00',
        grandTotal: formatMoney(contract.totalPayableAmount),
        paid: formatMoney(contract.downPaymentAmount),
        due: formatMoney(contract.remainingDueAmount),
        change: '0.00',
        footer: `Down Payment: ৳${formatMoney(contract.downPaymentAmount)} | Financed: ৳${formatMoney(contract.principalAmount)}`
      },
      paperWidthMm,
      false
    );

    return {
      contractId: contract._id.toString(),
      contractNo: contract.contractNo,
      saleId: contract.saleId.toString(),
      invoiceNo: sale?.invoiceNo || contract.contractNo,
      customerId: contract.customerId.toString(),
      customerName: customer?.fullName || 'Customer',
      productName: contract.productName || 'Handset',
      imei1: contract.imei1 || '',
      totalPayableAmount: formatMoney(contract.totalPayableAmount),
      downPaymentAmount: formatMoney(contract.downPaymentAmount),
      principalAmount: formatMoney(contract.principalAmount),
      remainingDueAmount: formatMoney(contract.remainingDueAmount),
      tenureMonths: contract.installmentPeriodMonths,
      monthlyInstallmentAmount: formatMoney(
        toDecimal(contract.principalAmount).dividedBy(contract.installmentPeriodMonths)
      ),
      schedule: installments.map((inst) => ({
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate.toISOString().split('T')[0]!,
        amount: formatMoney(inst.installmentAmount),
        status: inst.status
      })),
      printData
    };
  }

  /**
   * Helper to format existing MoneyReceipt for idempotent retries
   */
  private static async formatExistingCollectionResult(
    receipt: IMoneyReceipt,
    paperWidthMm: 58 | 80
  ): Promise<KistiCollectionResult> {
    const [shop, customer, cashier, contract] = await Promise.all([
      Shop.findById(receipt.shopId),
      Customer.findById(receipt.customerId),
      User.findById(receipt.collectedByUserId),
      receipt.kistiContractId ? KistiContract.findById(receipt.kistiContractId) : null
    ]);

    const printData = HardwareService.buildEscPosPayload(
      {
        shopName: shop?.name || 'Kanchan Telecom',
        branch: shop?.binNumber ? `BIN: ${shop.binNumber}` : 'Eastern Plaza',
        phone: shop?.phone || undefined,
        invoiceNo: receipt.receiptNo,
        date: new Date(receipt.createdAt).toLocaleString('en-US', { hour12: true }),
        cashier: cashier?.fullName || 'Cashier',
        customer: customer?.fullName || 'Customer',
        customerPhone: customer?.phone || undefined,
        items: [
          {
            name: `Kisti Milestone Collection: ${receipt.receiptNo}`,
            qty: 1,
            price: formatMoney(receipt.amount),
            total: formatMoney(receipt.amount)
          }
        ],
        subTotal: formatMoney(receipt.amount),
        discount: '0.00',
        vat: '0.00',
        grandTotal: formatMoney(receipt.amount),
        paid: formatMoney(receipt.amount),
        due: formatMoney(receipt.remainingDue),
        change: '0.00',
        footer: `Previous Due: ৳${formatMoney(receipt.previousDue)} | Remaining: ৳${formatMoney(receipt.remainingDue)}`
      },
      paperWidthMm,
      false
    );

    return {
      receiptId: receipt._id.toString(),
      receiptNo: receipt.receiptNo,
      contractId: contract?._id.toString() || '',
      contractNo: contract?.contractNo || '',
      customerId: receipt.customerId.toString(),
      customerName: customer?.fullName || 'Customer',
      amountCollected: formatMoney(receipt.amount),
      previousDue: formatMoney(receipt.previousDue),
      remainingDue: formatMoney(receipt.remainingDue),
      paymentMethod: receipt.paymentMethod,
      contractStatus: contract?.status || 'active',
      isEarlySettlement: receipt.isEarlySettlement || false,
      updatedMilestones: [],
      printData
    };
  }
}
