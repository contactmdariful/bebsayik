import mongoose from 'mongoose';
import {
  Shift,
  ShiftDenomination,
  Sale,
  MoneyReceipt,
  CustomerReturnVoucher,
  AccountTransaction,
  Account,
  Shop,
  User
} from '../../models/index.js';
import {
  addMoney,
  subtractMoney,
  toDecimal,
  formatMoney
} from '../../utils/money.js';
import { HardwareService, EscPosPrintPayload } from '../hardware/hardware.service.js';
import { getSmsDriver } from '../sms/index.js';
import Decimal from 'decimal.js';

export interface OpenShiftInput {
  shopId: mongoose.Types.ObjectId | string;
  cashierUserId: mongoose.Types.ObjectId | string;
  openingCash: string | number;
  idempotencyKey?: string | undefined;
}

export interface DenominationInput {
  note1000?: number | undefined;
  note500?: number | undefined;
  note200?: number | undefined;
  note100?: number | undefined;
  note50?: number | undefined;
  note20?: number | undefined;
  note10?: number | undefined;
  coins?: number | undefined;
}

export interface BlindCountInput {
  shopId: mongoose.Types.ObjectId | string;
  cashierUserId: mongoose.Types.ObjectId | string;
  shiftId: string;
  denominations: DenominationInput;
  requestRecount?: boolean | undefined;
}

export interface FinalizeShiftInput {
  shopId: mongoose.Types.ObjectId | string;
  cashierUserId: mongoose.Types.ObjectId | string;
  shiftId: string;
  reason?: string | undefined;
  paperWidthMm?: 58 | 80 | undefined;
}

export interface BlindCountResult {
  shiftId: string;
  physicalCountedCash: string;
  expectedCash: string;
  cashDiscrepancy: string;
  hasMismatch: boolean;
  recountCount: number;
  canRecount: boolean;
  denominations: {
    note1000: number;
    note500: number;
    note200: number;
    note100: number;
    note50: number;
    note20: number;
    note10: number;
    coins: number;
    total: string;
  };
}

export interface FinalizeShiftResult {
  shiftId: string;
  status: 'closed';
  openedAt: string;
  closedAt: string;
  openingCash: string;
  expectedCash: string;
  actualCash: string;
  discrepancy: string;
  recountCount: number;
  cashierName: string;
  smsSent: boolean;
  printData: EscPosPrintPayload;
}

export class ClosingService {
  /**
   * Morning Shift Open: Record starting cash drawer float
   */
  static async openShift(input: OpenShiftInput): Promise<any> {
    const sId = new mongoose.Types.ObjectId(input.shopId);
    const uId = new mongoose.Types.ObjectId(input.cashierUserId);
    const openingDec = toDecimal(input.openingCash);

    if (openingDec.isNegative()) {
      const err: any = new Error('Opening cash float cannot be negative');
      err.statusCode = 400;
      err.code = 'INVALID_OPENING_FLOAT';
      throw err;
    }

    // 1. Verify no existing open shift for this cashier in this shop
    const existing = await Shift.findOne({
      shopId: sId,
      cashierUserId: uId,
      status: 'open'
    });

    if (existing) {
      const err: any = new Error(`SHIFT_ALREADY_OPEN: Cashier already has an active open shift (${existing._id})`);
      err.statusCode = 409;
      err.code = 'SHIFT_ALREADY_OPEN';
      throw err;
    }

    // 2. Create new Shift
    const shift = new Shift({
      shopId: sId,
      cashierUserId: uId,
      openingCash: formatMoney(openingDec) as any,
      status: 'open',
      openedAt: new Date(),
      recountCount: 0
    });

    await shift.save();

    return {
      shiftId: shift._id.toString(),
      shopId: sId.toString(),
      cashierUserId: uId.toString(),
      openingCash: formatMoney(openingDec),
      status: 'open',
      openedAt: shift.openedAt.toISOString(),
      recountCount: 0
    };
  }

  /**
   * Retrieve active open shift for cashier
   */
  static async getCurrentShift(
    shopId: mongoose.Types.ObjectId | string,
    cashierUserId?: mongoose.Types.ObjectId | string | undefined
  ): Promise<any> {
    const sId = new mongoose.Types.ObjectId(shopId);
    const query: any = {
      shopId: sId,
      status: 'open'
    };
    if (cashierUserId) {
      query.cashierUserId = new mongoose.Types.ObjectId(cashierUserId);
    }

    const shift = await Shift.findOne(query).sort({ openedAt: -1 });

    if (!shift) {
      return null;
    }

    const denomination = await ShiftDenomination.findOne({
      shopId: sId,
      shiftId: shift._id
    });

    return {
      shiftId: shift._id.toString(),
      status: shift.status,
      openingCash: formatMoney(shift.openingCash),
      openedAt: shift.openedAt.toISOString(),
      recountCount: shift.recountCount,
      hasSubmittedBlindCount: !!shift.closingCashActual,
      closingCashActual: shift.closingCashActual ? formatMoney(shift.closingCashActual) : undefined,
      closingCashExpected: shift.closingCashExpected ? formatMoney(shift.closingCashExpected) : undefined,
      cashDiscrepancy: shift.cashDiscrepancy ? formatMoney(shift.cashDiscrepancy) : undefined,
      denominations: denomination
        ? {
            note1000: denomination.note1000,
            note500: denomination.note500,
            note200: denomination.note200,
            note100: denomination.note100,
            note50: denomination.note50,
            note20: denomination.note20,
            note10: denomination.note10,
            coins: denomination.coins,
            totalComputedCash: denomination.totalComputedCash
          }
        : undefined
    };
  }

  /**
   * Day-End Blind Cash Count Submission (Z-Report Pre-Close)
   * Enforces: Exactly ONE recount grace attempt before register lock
   */
  static async submitBlindCount(input: BlindCountInput): Promise<BlindCountResult> {
    const sId = new mongoose.Types.ObjectId(input.shopId);
    const uId = new mongoose.Types.ObjectId(input.cashierUserId);
    const shId = new mongoose.Types.ObjectId(input.shiftId);

    const shift = await Shift.findOne({
      _id: shId,
      shopId: sId,
      cashierUserId: uId,
      status: 'open'
    });

    if (!shift) {
      const err: any = new Error(`SHIFT_NOT_FOUND: Active open shift "${input.shiftId}" not found`);
      err.statusCode = 404;
      err.code = 'SHIFT_NOT_FOUND';
      throw err;
    }

    // Single Recount Grace Protocol (Decision 4 in UI_UX_BLUEPRINT.md)
    if (input.requestRecount) {
      if (shift.recountCount >= 1) {
        const err: any = new Error(
          'RECOUNT_LIMIT_EXCEEDED: Only exactly one recount grace attempt is permitted. Terminal register is locked.'
        );
        err.statusCode = 422;
        err.code = 'RECOUNT_LIMIT_EXCEEDED';
        throw err;
      }
      shift.recountCount += 1;
    }

    // 1. Calculate Physical Cash from Notes & Coins
    const d = input.denominations || {};
    const n1000 = Math.max(0, d.note1000 || 0);
    const n500 = Math.max(0, d.note500 || 0);
    const n200 = Math.max(0, d.note200 || 0);
    const n100 = Math.max(0, d.note100 || 0);
    const n50 = Math.max(0, d.note50 || 0);
    const n20 = Math.max(0, d.note20 || 0);
    const n10 = Math.max(0, d.note10 || 0);
    const coins = Math.max(0, d.coins || 0);

    const totalPhysicalDec = new Decimal(n1000)
      .times(1000)
      .plus(new Decimal(n500).times(500))
      .plus(new Decimal(n200).times(200))
      .plus(new Decimal(n100).times(100))
      .plus(new Decimal(n50).times(50))
      .plus(new Decimal(n20).times(20))
      .plus(new Decimal(n10).times(10))
      .plus(toDecimal(coins));

    const totalPhysicalStr = formatMoney(totalPhysicalDec);

    // 2. Upsert ShiftDenomination Record
    await ShiftDenomination.findOneAndUpdate(
      { shopId: sId, shiftId: shId },
      {
        $set: {
          note1000: n1000,
          note500: n500,
          note200: n200,
          note100: n100,
          note50: n50,
          note20: n20,
          note10: n10,
          coins,
          totalComputedCash: totalPhysicalStr
        }
      },
      { upsert: true, new: true }
    );

    // 3. Compute System Expected Drawer Balance
    const openingCashDec = toDecimal(shift.openingCash);

    // A. Cash Sales for this shift
    const sales = await Sale.find({
      shopId: sId,
      shiftId: shId,
      status: { $ne: 'cancelled' }
    });

    let cashSalesTotalDec = new Decimal(0);
    for (const s of sales) {
      if (s.paymentMethods && Array.isArray(s.paymentMethods)) {
        for (const pm of s.paymentMethods) {
          if (pm.method === 'cash') {
            cashSalesTotalDec = addMoney(cashSalesTotalDec, pm.amount);
          }
        }
      }
    }

    // B. Cash Money Receipts (Bakir Khata Due Collections & Kisti Collections)
    const receipts = await MoneyReceipt.find({
      shopId: sId,
      collectedByUserId: uId,
      paymentMethod: 'cash',
      createdAt: { $gte: shift.openedAt }
    });

    let cashReceiptsTotalDec = new Decimal(0);
    for (const r of receipts) {
      cashReceiptsTotalDec = addMoney(cashReceiptsTotalDec, r.amount);
    }

    // C. Cash Refunds (Sales Returns CRV)
    const returns = await CustomerReturnVoucher.find({
      shopId: sId,
      refundMethod: 'cash',
      createdAt: { $gte: shift.openedAt }
    });

    let cashRefundsTotalDec = new Decimal(0);
    for (const ret of returns) {
      cashRefundsTotalDec = addMoney(cashRefundsTotalDec, ret.refundAmount || 0);
    }

    // D. Cash OPEX Petty Expenses & Transfers Out
    const cashAccount = await Account.findOne({ shopId: sId, code: '1.1.01' });
    let cashExpensesDec = new Decimal(0);
    if (cashAccount) {
      const expenses = await AccountTransaction.find({
        shopId: sId,
        accountId: cashAccount._id,
        credit: { $gt: 0 },
        sourceDocType: { $in: ['ExpenseVoucher', 'InterAccountTransfer'] },
        createdAt: { $gte: shift.openedAt }
      });

      for (const exp of expenses) {
        cashExpensesDec = addMoney(cashExpensesDec, exp.credit);
      }
    }

    // Expected Cash = Opening + CashSales + CashReceipts - CashRefunds - CashExpenses
    const expectedCashDec = openingCashDec
      .plus(cashSalesTotalDec)
      .plus(cashReceiptsTotalDec)
      .minus(cashRefundsTotalDec)
      .minus(cashExpensesDec);

    const discrepancyDec = subtractMoney(totalPhysicalDec, expectedCashDec);
    const hasMismatch = !discrepancyDec.equals(0);

    // Save on shift document
    shift.closingCashExpected = formatMoney(expectedCashDec) as any;
    shift.closingCashActual = totalPhysicalStr as any;
    shift.cashDiscrepancy = formatMoney(discrepancyDec) as any;
    await shift.save();

    return {
      shiftId: shift._id.toString(),
      physicalCountedCash: totalPhysicalStr,
      expectedCash: formatMoney(expectedCashDec),
      cashDiscrepancy: formatMoney(discrepancyDec),
      hasMismatch,
      recountCount: shift.recountCount,
      canRecount: shift.recountCount < 1,
      denominations: {
        note1000: n1000,
        note500: n500,
        note200: n200,
        note100: n100,
        note50: n50,
        note20: n20,
        note10: n10,
        coins,
        total: totalPhysicalStr
      }
    };
  }

  /**
   * Finalize Shift Closing:
   * Locks terminal, generates Z-Report thermal receipt, dispatches SMS digest to owner
   */
  static async finalizeShift(input: FinalizeShiftInput): Promise<FinalizeShiftResult> {
    const sId = new mongoose.Types.ObjectId(input.shopId);
    const uId = new mongoose.Types.ObjectId(input.cashierUserId);
    const shId = new mongoose.Types.ObjectId(input.shiftId);
    const { reason, paperWidthMm = 80 } = input;

    const shift = await Shift.findOne({
      _id: shId,
      shopId: sId,
      cashierUserId: uId,
      status: 'open'
    });

    if (!shift) {
      const err: any = new Error(`SHIFT_NOT_FOUND: Active open shift "${input.shiftId}" not found`);
      err.statusCode = 404;
      err.code = 'SHIFT_NOT_FOUND';
      throw err;
    }

    if (!shift.closingCashActual || !shift.closingCashExpected) {
      const err: any = new Error(
        'BLIND_COUNT_REQUIRED: Cashier must submit physical currency note count before finalizing shift closing'
      );
      err.statusCode = 422;
      err.code = 'BLIND_COUNT_REQUIRED';
      throw err;
    }

    const discrepancyDec = toDecimal(shift.cashDiscrepancy || 0);
    if (!discrepancyDec.equals(0) && (!reason || reason.trim().length === 0)) {
      const err: any = new Error(
        `DISCREPANCY_REASON_REQUIRED: Cash mismatch of ৳${formatMoney(discrepancyDec)} requires an explanatory reason before closing`
      );
      err.statusCode = 422;
      err.code = 'DISCREPANCY_REASON_REQUIRED';
      throw err;
    }

    const now = new Date();
    shift.status = 'closed';
    shift.closedAt = now;
    await shift.save();

    const [shopDoc, userDoc, denomDoc] = await Promise.all([
      Shop.findById(sId),
      User.findById(uId),
      ShiftDenomination.findOne({ shopId: sId, shiftId: shId })
    ]);

    const shopName = shopDoc?.name || 'Kanchan Telecom';
    const cashierName = userDoc?.fullName || 'Cashier';
    const openingStr = formatMoney(shift.openingCash);
    const expectedStr = formatMoney(shift.closingCashExpected);
    const actualStr = formatMoney(shift.closingCashActual);
    const discrepancyStr = formatMoney(discrepancyDec);

    // 1. Dispatch SMS Digest to Store Owner
    let smsSent = false;
    if (shopDoc?.phone) {
      const smsMsg = `Z-REPORT [${shopName}]: Shift closed by ${cashierName}. Opening: ৳${openingStr}, Expected: ৳${expectedStr}, Actual: ৳${actualStr}, Variance: ৳${discrepancyStr}${
        reason ? ` (Reason: ${reason})` : ''
      }. Register locked.`;
      try {
        await getSmsDriver().sendSms(shopDoc.phone, smsMsg);
        smsSent = true;
      } catch (err) {
        console.error('[ShiftClosing] Failed to send owner SMS:', err);
      }
    }

    // 2. Generate ESC/POS Thermal Z-Report Print Payload
    const printData = HardwareService.buildEscPosPayload(
      {
        shopName,
        branch: shopDoc?.binNumber ? `BIN: ${shopDoc.binNumber}` : 'Day-End Closing',
        phone: shopDoc?.phone || undefined,
        invoiceNo: `Z-REP-${shift._id.toString().slice(-8).toUpperCase()}`,
        date: now.toLocaleString('en-US', { hour12: true }),
        cashier: cashierName,
        customer: 'STORE OWNER AUDIT',
        items: [
          { name: 'Opening Cash Float', qty: 1, price: openingStr, total: openingStr },
          { name: 'Expected Cash Drawer', qty: 1, price: expectedStr, total: expectedStr },
          { name: 'Physical Counted Cash', qty: 1, price: actualStr, total: actualStr },
          {
            name: `Variance (${discrepancyDec.isNegative() ? 'SHORTAGE' : discrepancyDec.isPositive() ? 'EXCESS' : 'BALANCED'})`,
            qty: 1,
            price: discrepancyStr,
            total: discrepancyStr
          }
        ],
        subTotal: actualStr,
        discount: '0.00',
        grandTotal: actualStr,
        paid: actualStr,
        due: '0.00',
        change: '0.00',
        footer: `Z-Report Summary | Recounts: ${shift.recountCount} | Notes: 1k(${denomDoc?.note1000 || 0}) 500(${denomDoc?.note500 || 0}) 100(${denomDoc?.note100 || 0}) | ${
          reason ? `Reason: ${reason}` : 'Balanced Closing'
        }`
      },
      paperWidthMm,
      true // Kick drawer on Z-Report
    );

    return {
      shiftId: shift._id.toString(),
      status: 'closed',
      openedAt: shift.openedAt.toISOString(),
      closedAt: now.toISOString(),
      openingCash: openingStr,
      expectedCash: expectedStr,
      actualCash: actualStr,
      discrepancy: discrepancyStr,
      recountCount: shift.recountCount,
      cashierName,
      smsSent,
      printData
    };
  }
}
