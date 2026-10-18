import mongoose from 'mongoose';
import {
  Customer,
  ICustomer,
  Sale,
  MoneyReceipt,
  IMoneyReceipt,
  CustomerReturnVoucher,
  KistiContract,
  ServiceJob,
  Shop,
  User,
  SmsLog
} from '../../models/index.js';
import { lockService } from '../lock/lock.service.js';
import { AccountingService } from '../accounting/accounting.service.js';
import { HardwareService, EscPosPrintPayload } from '../hardware/hardware.service.js';
import { getSmsDriver } from '../sms/index.js';
import {
  addMoney,
  subtractMoney,
  toDecimal,
  formatMoney
} from '../../utils/money.js';

export interface CreateCustomerInput {
  fullName: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  nidNumber?: string;
  creditLimit?: string | number;
}

export interface CollectDueInput {
  shopId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  customerId: string;
  idempotencyKey: string;
  amount: string | number;
  paymentMethod: 'cash' | 'mfs_bkash' | 'mfs_nagad' | 'bank_card';
  accountId?: string;
  notes?: string;
  paperWidthMm?: 58 | 80;
}

export interface CollectDueResult {
  receiptId: string;
  receiptNo: string;
  customerId: string;
  customerName: string;
  amountCollected: string;
  previousDue: string;
  remainingDue: string;
  paymentMethod: string;
  allocatedInvoices: Array<{
    saleId: string;
    invoiceNo: string;
    amountAllocated: string;
  }>;
  printData: EscPosPrintPayload;
}

export class CustomerService {
  /**
   * List customers with search, dues filter, and pagination
   */
  static async listCustomers(params: {
    shopId: mongoose.Types.ObjectId | string;
    search?: string | undefined;
    hasDue?: boolean | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  }): Promise<{ customers: any[]; total: number; totalDues: string; page: number; limit: number }> {
    const { shopId, search, hasDue, page = 1, limit = 20 } = params;
    const sId = new mongoose.Types.ObjectId(shopId);

    const filter: any = { shopId: sId, isDeleted: false };

    if (search) {
      const q = search.trim();
      filter.$or = [
        { fullName: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
        { nidNumber: new RegExp(q, 'i') }
      ];
    }

    if (hasDue) {
      filter.currentDueBalance = { $gt: 0 };
    }

    const total = await Customer.countDocuments(filter);
    const customers = await Customer.find(filter)
      .sort({ currentDueBalance: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Aggregate total outstanding dues across shop customers
    const duesAgg = await Customer.aggregate([
      { $match: { shopId: sId, isDeleted: false, currentDueBalance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$currentDueBalance' } } }
    ]);
    const totalDuesVal = duesAgg.length > 0 ? duesAgg[0].total : 0;

    return {
      customers,
      total,
      totalDues: formatMoney(totalDuesVal),
      page,
      limit
    };
  }

  /**
   * Quick-add customer record during checkout or directory
   */
  static async createCustomer(
    shopId: mongoose.Types.ObjectId | string,
    data: CreateCustomerInput
  ): Promise<ICustomer> {
    const sId = new mongoose.Types.ObjectId(shopId);
    const cleanPhone = data.phone.trim();

    const existing = await Customer.findOne({
      shopId: sId,
      phone: cleanPhone,
      isDeleted: false
    });

    if (existing) {
      const err: any = new Error(`Customer with phone number "${cleanPhone}" already exists in this shop`);
      err.statusCode = 409;
      err.code = 'CUSTOMER_ALREADY_EXISTS';
      throw err;
    }

    const customer = new Customer({
      shopId: sId,
      fullName: data.fullName.trim(),
      phone: cleanPhone,
      alternatePhone: data.alternatePhone?.trim(),
      address: data.address?.trim(),
      nidNumber: data.nidNumber?.trim(),
      creditLimit: data.creditLimit ? formatMoney(data.creditLimit) : '0.00',
      currentDueBalance: '0.00',
      rewardPoints: 0
    });

    await customer.save();
    return customer;
  }

  /**
   * Get customer details and balance metrics
   */
  static async getCustomerById(
    shopId: mongoose.Types.ObjectId | string,
    customerId: string
  ): Promise<any> {
    const sId = new mongoose.Types.ObjectId(shopId);
    const customer = await Customer.findOne({
      _id: new mongoose.Types.ObjectId(customerId),
      shopId: sId,
      isDeleted: false
    });

    if (!customer) {
      const err: any = new Error(`Customer "${customerId}" not found`);
      err.statusCode = 404;
      err.code = 'CUSTOMER_NOT_FOUND';
      throw err;
    }

    const creditLimitDec = toDecimal(customer.creditLimit || 0);
    const currentDueDec = toDecimal(customer.currentDueBalance || 0);
    const availableCredit = creditLimitDec.greaterThan(currentDueDec)
      ? subtractMoney(creditLimitDec, currentDueDec)
      : toDecimal(0);

    return {
      ...customer.toObject(),
      availableCredit: formatMoney(availableCredit)
    };
  }

  /**
   * Update customer profile or credit limit
   */
  static async updateCustomer(
    shopId: mongoose.Types.ObjectId | string,
    customerId: string,
    data: Partial<CreateCustomerInput>
  ): Promise<ICustomer> {
    const sId = new mongoose.Types.ObjectId(shopId);
    const cId = new mongoose.Types.ObjectId(customerId);

    const update: any = {};
    if (data.fullName) update.fullName = data.fullName.trim();
    if (data.phone) update.phone = data.phone.trim();
    if (data.alternatePhone !== undefined) update.alternatePhone = data.alternatePhone?.trim();
    if (data.address !== undefined) update.address = data.address?.trim();
    if (data.nidNumber !== undefined) update.nidNumber = data.nidNumber?.trim();
    if (data.creditLimit !== undefined) update.creditLimit = formatMoney(data.creditLimit);

    const updated = await Customer.findOneAndUpdate(
      { _id: cId, shopId: sId, isDeleted: false },
      { $set: update },
      { new: true }
    );

    if (!updated) {
      const err: any = new Error(`Customer "${customerId}" not found`);
      err.statusCode = 404;
      err.code = 'CUSTOMER_NOT_FOUND';
      throw err;
    }

    return updated;
  }

  /**
   * Retrieve Customer 360° Statement (Wireframe Screen 04)
   * 4 Tabs: (1) Invoices, (2) Bakir Khata Ledger, (3) Kisti Contracts, (4) Servicing History
   */
  static async getCustomerStatement(
    shopId: mongoose.Types.ObjectId | string,
    customerId: string
  ): Promise<any> {
    const sId = new mongoose.Types.ObjectId(shopId);
    const cId = new mongoose.Types.ObjectId(customerId);

    const customer = await Customer.findOne({ _id: cId, shopId: sId, isDeleted: false });
    if (!customer) {
      const err: any = new Error(`Customer "${customerId}" not found`);
      err.statusCode = 404;
      err.code = 'CUSTOMER_NOT_FOUND';
      throw err;
    }

    // Tab 1: Invoices
    const invoices = await Sale.find({ shopId: sId, customerId: cId })
      .sort({ createdAt: -1 })
      .select('invoiceNo grandTotalAmount paidAmount dueAmount status createdAt paymentMethods');

    // Tab 2: Bakir Khata Due Ledger (Money Receipts & Sales with Due)
    const moneyReceipts = await MoneyReceipt.find({ shopId: sId, customerId: cId })
      .sort({ createdAt: -1 })
      .populate('collectedByUserId', 'fullName');

    const dueSales = invoices.filter((inv) => Number(inv.dueAmount || 0) > 0);
    const customerReturns = await CustomerReturnVoucher.find({ shopId: sId, customerId: cId })
      .sort({ createdAt: -1 });

    // Combine due transactions chronologically
    const dueLedgerEntries: Array<{
      date: Date;
      type: 'SALE_DUE' | 'DUE_COLLECTION' | 'RETURN_NETTING';
      referenceNo: string;
      debit: string;
      credit: string;
      note?: string;
    }> = [];

    for (const inv of dueSales) {
      dueLedgerEntries.push({
        date: inv.createdAt,
        type: 'SALE_DUE',
        referenceNo: inv.invoiceNo,
        debit: formatMoney(inv.dueAmount),
        credit: '0.00',
        note: `POS Counter Sale Credit`
      });
    }

    for (const mr of moneyReceipts) {
      dueLedgerEntries.push({
        date: mr.createdAt,
        type: 'DUE_COLLECTION',
        referenceNo: mr.receiptNo,
        debit: '0.00',
        credit: formatMoney(mr.amount),
        note: mr.notes || `Due collection (${mr.paymentMethod})`
      });
    }

    for (const crv of customerReturns) {
      if (Number(crv.dueReductionAmount || 0) > 0) {
        dueLedgerEntries.push({
          date: crv.createdAt,
          type: 'RETURN_NETTING',
          referenceNo: crv.crvNo,
          debit: '0.00',
          credit: formatMoney(crv.dueReductionAmount),
          note: `Sales Return Due Netting (TC-21) on ${crv.invoiceNo}`
        });
      }
    }

    dueLedgerEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Tab 3: Kisti Contracts
    const kistiContracts = await KistiContract.find({ shopId: sId, customerId: cId })
      .sort({ createdAt: -1 })
      .populate('variantId', 'variantName');

    // Tab 4: Servicing History
    const servicingHistory = await ServiceJob.find({ shopId: sId, customerId: cId })
      .sort({ createdAt: -1 });

    // Summary aggregates
    const totalPurchased = invoices.reduce((sum, inv) => sum + Number(inv.grandTotalAmount || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
    const creditLimitDec = toDecimal(customer.creditLimit || 0);
    const currentDueDec = toDecimal(customer.currentDueBalance || 0);
    const availableCredit = creditLimitDec.greaterThan(currentDueDec)
      ? subtractMoney(creditLimitDec, currentDueDec)
      : toDecimal(0);

    return {
      customer: {
        _id: customer._id,
        fullName: customer.fullName,
        phone: customer.phone,
        alternatePhone: customer.alternatePhone,
        address: customer.address,
        nidNumber: customer.nidNumber,
        creditLimit: formatMoney(creditLimitDec),
        currentDueBalance: formatMoney(currentDueDec),
        availableCredit: formatMoney(availableCredit),
        rewardPoints: customer.rewardPoints
      },
      summary: {
        totalInvoicesCount: invoices.length,
        totalPurchasedAmount: formatMoney(totalPurchased),
        totalPaidAmount: formatMoney(totalPaid),
        currentDueBalance: formatMoney(currentDueDec),
        creditLimit: formatMoney(creditLimitDec),
        availableCredit: formatMoney(availableCredit)
      },
      tabs: {
        invoices,
        dueLedger: dueLedgerEntries,
        kistiContracts,
        servicingHistory
      }
    };
  }

  /**
   * Bakir Khata Due Collection Engine (TX-06)
   * Allocates payment across customer's unpaid invoices via FIFO,
   * decrements due balances atomically, posts double-entry journal,
   * dispatches automated SMS notification, and generates ESC/POS receipt.
   */
  static async collectDue(params: CollectDueInput): Promise<CollectDueResult> {
    const {
      shopId,
      userId,
      customerId,
      idempotencyKey,
      amount,
      paymentMethod,
      accountId,
      notes,
      paperWidthMm = 80
    } = params;

    const sId = new mongoose.Types.ObjectId(shopId);
    const uId = new mongoose.Types.ObjectId(userId);
    const cId = new mongoose.Types.ObjectId(customerId);

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      const err: any = new Error('Mandatory Idempotency-Key header is required for due collection');
      err.statusCode = 400;
      err.code = 'IDEMPOTENCY_KEY_REQUIRED';
      throw err;
    }

    // 1. Idempotency Check: Return existing receipt if already processed
    const existingReceipt = await MoneyReceipt.findOne({ shopId: sId, idempotencyKey });
    if (existingReceipt) {
      return this.formatExistingReceiptResult(existingReceipt, paperWidthMm);
    }

    const acquiredLocks: Array<{ key: string; token: string }> = [];

    // Idempotency lock
    const idempLockKey = `lock:idemp:due:${sId}:${idempotencyKey}`;
    const idempLockRes = await lockService.acquireLock(idempLockKey, 15);
    if (!idempLockRes.acquired) {
      const checkReceipt = await MoneyReceipt.findOne({ shopId: sId, idempotencyKey });
      if (checkReceipt) {
        return this.formatExistingReceiptResult(checkReceipt, paperWidthMm);
      }
      const err: any = new Error('A due collection with this idempotency key is already in progress');
      err.statusCode = 409;
      err.code = 'IDEMPOTENCY_IN_PROGRESS';
      throw err;
    }
    acquiredLocks.push({ key: idempLockKey, token: idempLockRes.token });

    try {
      // 2. Customer Due Validation
      const customer = await Customer.findOne({ _id: cId, shopId: sId, isDeleted: false });
      if (!customer) {
        const err: any = new Error(`Customer "${customerId}" not found`);
        err.statusCode = 404;
        err.code = 'CUSTOMER_NOT_FOUND';
        throw err;
      }

      const currentDueDec = toDecimal(customer.currentDueBalance || 0);
      const collectAmountDec = toDecimal(amount);

      if (!collectAmountDec.greaterThan(0)) {
        const err: any = new Error('Collection amount must be strictly greater than zero');
        err.statusCode = 400;
        err.code = 'INVALID_COLLECTION_AMOUNT';
        throw err;
      }

      if (!currentDueDec.greaterThan(0)) {
        const err: any = new Error(`Customer "${customer.fullName}" has zero outstanding due balance (বাকির খাতা শূন্য)`);
        err.statusCode = 422;
        err.code = 'NO_OUTSTANDING_DUE';
        throw err;
      }

      if (collectAmountDec.greaterThan(currentDueDec)) {
        const err: any = new Error(
          `AMOUNT_EXCEEDS_DUE: Collection amount ৳${formatMoney(collectAmountDec)} exceeds customer's total outstanding due of ৳${formatMoney(currentDueDec)}`
        );
        err.statusCode = 422;
        err.code = 'AMOUNT_EXCEEDS_DUE';
        throw err;
      }

      // 3. FIFO Due Allocation Across Unpaid Invoices
      // Fetch unpaid sales sorted by createdAt ASC (oldest debt paid first)
      const unpaidSales = await Sale.find({
        shopId: sId,
        customerId: cId,
        dueAmount: { $gt: 0 }
      }).sort({ createdAt: 1 });

      let remainingToAllocate = collectAmountDec;
      const allocatedInvoices: Array<{
        sale: any;
        amountAllocated: string;
      }> = [];

      for (const sale of unpaidSales) {
        if (!remainingToAllocate.greaterThan(0)) break;

        const saleDueDec = toDecimal(sale.dueAmount || 0);
        let allocAmount = toDecimal(0);

        if (remainingToAllocate.greaterThanOrEqualTo(saleDueDec)) {
          allocAmount = saleDueDec;
        } else {
          allocAmount = remainingToAllocate;
        }

        sale.dueAmount = formatMoney(subtractMoney(saleDueDec, allocAmount)) as any;
        sale.paidAmount = formatMoney(addMoney(toDecimal(sale.paidAmount || 0), allocAmount)) as any;

        remainingToAllocate = subtractMoney(remainingToAllocate, allocAmount);

        allocatedInvoices.push({
          sale,
          amountAllocated: formatMoney(allocAmount)
        });
      }

      const remainingDueDec = subtractMoney(currentDueDec, collectAmountDec);

      // 4. Generate Receipt Number: MR-YYYYMM-XXXXX
      const shopDoc = await Shop.findById(sId);
      const now = new Date();
      const monthPrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const randomSeq = Math.floor(10000 + Math.random() * 90000);
      const receiptNo = `MR-${monthPrefix}-${randomSeq}`;

      let createdReceipt: any = null;

      // 5. Atomic Database Transaction (TX-06)
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // 5a. Save all updated sales in session
          for (const item of allocatedInvoices) {
            await item.sale.save({ session });
          }

          // 5b. Decrement Customer Due Balance
          customer.currentDueBalance = formatMoney(remainingDueDec) as any;
          await customer.save({ session });

          // 5c. Create MoneyReceipt Record
          const receiptDoc = new MoneyReceipt({
            shopId: sId,
            receiptNo,
            idempotencyKey,
            customerId: cId,
            receiptType: 'due_collection',
            amount: formatMoney(collectAmountDec),
            paymentMethod,
            accountId: accountId ? new mongoose.Types.ObjectId(accountId) : undefined,
            allocatedInvoices: allocatedInvoices.map((it) => ({
              saleId: it.sale._id,
              invoiceNo: it.sale.invoiceNo,
              amountAllocated: it.amountAllocated
            })),
            previousDue: formatMoney(currentDueDec),
            remainingDue: formatMoney(remainingDueDec),
            notes,
            collectedByUserId: uId
          });

          await receiptDoc.save({ session });

          // 5d. Double-Entry General Ledger Posting (TX-06)
          // Debit: 1.1.01 Cash Drawer (or 1.2.01 Digital MFS/Bank)
          // Credit: 1.4.01 Accounts Receivable (Customer Due)
          const debitAccountCode = paymentMethod === 'cash' ? '1.1.01' : '1.2.01';

          await AccountingService.postDoubleEntryJournal({
            shopId: sId,
            voucherNo: `VCH-${receiptNo}`,
            txnCode: 'TX-06',
            sourceDocType: 'MR',
            sourceDocId: receiptDoc._id,
            postedByUserId: uId,
            entries: [
              {
                accountCode: debitAccountCode,
                debit: collectAmountDec,
                credit: 0,
                description: `Bakir Khata collection (${paymentMethod}) from ${customer.fullName} for ${receiptNo}`
              },
              {
                accountCode: '1.4.01',
                debit: 0,
                credit: collectAmountDec,
                description: `Accounts receivable due credit for ${customer.fullName} (${receiptNo})`
              }
            ],
            session
          });

          createdReceipt = receiptDoc;
        });
      } finally {
        await session.endSession();
      }

      // 6. Automated SMS Due Payment Confirmation
      const shopName = shopDoc?.name || 'Bebsayik Dokan';
      const smsMessage = `Dear ${customer.fullName}, received ৳${formatMoney(collectAmountDec)} for Bakir Khata at ${shopName}. Remaining due: ৳${formatMoney(remainingDueDec)}. Money Receipt: ${receiptNo}. Thank you!`;

      try {
        const smsResult = await getSmsDriver().sendSms(customer.phone, smsMessage);

        // Log to SmsLog
        const smsLog = new SmsLog({
          shopId: sId,
          recipientPhone: customer.phone,
          purpose: 'PAYMENT_REMINDER',
          messageBody: smsMessage,
          status: smsResult.success ? 'DELIVERED' : 'FAILED',
          providerMessageId: smsResult.messageId
        });
        await smsLog.save();
      } catch (smsErr) {
        console.warn(`[Due SMS Alert] Failed to send SMS to ${customer.phone}:`, smsErr);
      }

      // 7. Thermal ESC/POS Money Receipt Print Payload
      const cashier = await User.findById(uId);
      const printData = HardwareService.buildEscPosPayload(
        {
          shopName,
          branch: shopDoc?.binNumber ? `BIN: ${shopDoc.binNumber}` : 'Main Branch',
          phone: shopDoc?.phone || undefined,
          binNumber: shopDoc?.binNumber || undefined,
          invoiceNo: receiptNo,
          date: new Date().toLocaleString('en-US', { hour12: true }),
          cashier: cashier?.fullName || 'Cashier',
          customer: customer.fullName,
          customerPhone: customer.phone,
          items: allocatedInvoices.map((ai) => ({
            name: `Invoice Payment: ${ai.sale.invoiceNo}`,
            qty: 1,
            price: ai.amountAllocated,
            total: ai.amountAllocated
          })),
          subTotal: formatMoney(collectAmountDec),
          discount: '0.00',
          vat: '0.00',
          grandTotal: formatMoney(collectAmountDec),
          paid: formatMoney(collectAmountDec),
          due: formatMoney(remainingDueDec),
          change: '0.00',
          footer: `Previous Due: ৳${formatMoney(currentDueDec)} | Remaining: ৳${formatMoney(remainingDueDec)}`
        },
        paperWidthMm,
        false
      );

      return {
        receiptId: createdReceipt._id.toString(),
        receiptNo,
        customerId: customer._id.toString(),
        customerName: customer.fullName,
        amountCollected: formatMoney(collectAmountDec),
        previousDue: formatMoney(currentDueDec),
        remainingDue: formatMoney(remainingDueDec),
        paymentMethod,
        allocatedInvoices: allocatedInvoices.map((ai) => ({
          saleId: ai.sale._id.toString(),
          invoiceNo: ai.sale.invoiceNo,
          amountAllocated: ai.amountAllocated
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
   * Helper to format existing MoneyReceipt for idempotent retries
   */
  private static async formatExistingReceiptResult(
    receipt: IMoneyReceipt,
    paperWidthMm: 58 | 80
  ): Promise<CollectDueResult> {
    const shop = await Shop.findById(receipt.shopId);
    const customer = await Customer.findById(receipt.customerId);
    const cashier = await User.findById(receipt.collectedByUserId);

    const printData = HardwareService.buildEscPosPayload(
      {
        shopName: shop?.name || 'Bebsayik Dokan',
        branch: shop?.binNumber ? `BIN: ${shop.binNumber}` : 'Main Branch',
        phone: shop?.phone || undefined,
        invoiceNo: receipt.receiptNo,
        date: new Date(receipt.createdAt).toLocaleString('en-US', { hour12: true }),
        cashier: cashier?.fullName || 'Cashier',
        customer: customer?.fullName || 'Customer',
        customerPhone: customer?.phone || undefined,
        items: (receipt.allocatedInvoices || []).map((ai) => ({
          name: `Invoice Payment: ${ai.invoiceNo}`,
          qty: 1,
          price: formatMoney(ai.amountAllocated),
          total: formatMoney(ai.amountAllocated)
        })),
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
      customerId: receipt.customerId.toString(),
      customerName: customer?.fullName || 'Customer',
      amountCollected: formatMoney(receipt.amount),
      previousDue: formatMoney(receipt.previousDue),
      remainingDue: formatMoney(receipt.remainingDue),
      paymentMethod: receipt.paymentMethod,
      allocatedInvoices: (receipt.allocatedInvoices || []).map((ai) => ({
        saleId: ai.saleId.toString(),
        invoiceNo: ai.invoiceNo,
        amountAllocated: formatMoney(ai.amountAllocated)
      })),
      printData
    };
  }

  /**
   * Automated SMS Due Reminder Dispatch
   */
  static async sendDueSmsReminder(
    shopId: mongoose.Types.ObjectId | string,
    customerId: string
  ): Promise<{ success: boolean; messageId: string; recipientPhone: string; currentDue: string }> {
    const sId = new mongoose.Types.ObjectId(shopId);
    const cId = new mongoose.Types.ObjectId(customerId);

    const customer = await Customer.findOne({ _id: cId, shopId: sId, isDeleted: false });
    if (!customer) {
      const err: any = new Error(`Customer "${customerId}" not found`);
      err.statusCode = 404;
      err.code = 'CUSTOMER_NOT_FOUND';
      throw err;
    }

    const currentDueDec = toDecimal(customer.currentDueBalance || 0);
    if (!currentDueDec.greaterThan(0)) {
      const err: any = new Error(`NO_OUTSTANDING_DUE: Customer "${customer.fullName}" has no outstanding due balance`);
      err.statusCode = 422;
      err.code = 'NO_OUTSTANDING_DUE';
      throw err;
    }

    const shop = await Shop.findById(sId);
    const dokanName = shop?.name || 'Bebsayik Dokan';
    const dokanPhone = shop?.phone ? ` Contact: ${shop.phone}.` : '';

    const message = `Dear ${customer.fullName}, your outstanding balance at ${dokanName} is ৳${formatMoney(currentDueDec)}. Please settle your Bakir Khata due soon.${dokanPhone} Thank you!`;

    const smsRes = await getSmsDriver().sendSms(customer.phone, message);

    const smsLog = new SmsLog({
      shopId: sId,
      recipientPhone: customer.phone,
      purpose: 'PAYMENT_REMINDER',
      messageBody: message,
      status: smsRes.success ? 'DELIVERED' : 'FAILED',
      providerMessageId: smsRes.messageId || 'msg_reminder'
    });
    await smsLog.save();

    return {
      success: smsRes.success,
      messageId: smsRes.messageId || 'msg_reminder',
      recipientPhone: customer.phone,
      currentDue: formatMoney(currentDueDec)
    };
  }
}
