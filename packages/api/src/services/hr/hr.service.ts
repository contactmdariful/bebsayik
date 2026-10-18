import mongoose from 'mongoose';
import {
  User,
  IUser,
  ServiceJob,
  Sale,
  PayrollLedger,
  IPayrollLedger,
  EmployeeTarget,
  Account,
  Shop
} from '../../models/index.js';
import { AccountingService } from '../accounting/accounting.service.js';
import { buildTx18PayrollDisbursement } from '../accounting/journalMatrices.js';
import {
  toDecimal,
  isMoneyGreaterThan
} from '../../utils/money.js';
import { getSmsDriver } from '../sms/index.js';

export interface DisbursePayrollInput {
  shopId: mongoose.Types.ObjectId | string;
  employeeUserId: mongoose.Types.ObjectId | string;
  monthYear: string; // YYYY-MM
  disburseMethod?: 'bank_transfer' | 'cash' | undefined;
  sourceAccountCode?: string | undefined;
  baseSalary?: string | number | undefined;
  deductions?: string | number | undefined;
  postedByUserId: mongoose.Types.ObjectId | string;
}

export class HrService {
  /**
   * Lists all staff users registered for a shop.
   */
  static async listStaff(shopId: mongoose.Types.ObjectId | string): Promise<IUser[]> {
    const sId = new mongoose.Types.ObjectId(shopId);
    return User.find({
      $or: [{ shopId: sId }, { accessibleShopIds: sId }]
    })
      .select('-passwordHash -managerPinHash')
      .sort({ createdAt: -1 });
  }

  /**
   * Aggregates payroll figures for a given month:
   * - Technician 50% labor splits from completed/delivered ServiceJobs
   * - Sales staff commissions from sales / targets
   * - Disbursed vs pending status
   */
  static async getPayrollSummary(
    shopId: mongoose.Types.ObjectId | string,
    monthYear: string // e.g. "2026-10"
  ) {
    const sId = new mongoose.Types.ObjectId(shopId);
    const [year, month] = monthYear.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      const err: any = new Error('Invalid monthYear format. Must be YYYY-MM.');
      err.status = 400;
      err.code = 'INVALID_MONTH_YEAR';
      throw err;
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    const staffMembers = await this.listStaff(sId);

    // 1. Aggregate technician repair labor shares
    const techJobs = await ServiceJob.aggregate([
      {
        $match: {
          shopId: sId,
          status: { $in: ['completed', 'delivered'] },
          createdAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: '$technicianUserId',
          totalLaborBilled: { $sum: '$laborCharge' },
          totalTechnicianShare: { $sum: '$technicianShare' },
          jobCount: { $sum: 1 }
        }
      }
    ]);

    const techShareMap = new Map<string, { share: string; jobs: number }>();
    for (const item of techJobs) {
      if (item._id) {
        techShareMap.set(item._id.toString(), {
          share: toDecimal(item.totalTechnicianShare || 0).toFixed(2),
          jobs: item.jobCount || 0
        });
      }
    }

    // 2. Aggregate sales revenue & bonuses
    const employeeTargets = await EmployeeTarget.find({
      shopId: sId,
      monthYear
    });
    const targetMap = new Map<string, any>();
    for (const tgt of employeeTargets) {
      targetMap.set(tgt.employeeUserId.toString(), tgt);
    }

    // Also check total sales by user in month
    const salesAgg = await Sale.aggregate([
      {
        $match: {
          shopId: sId,
          status: 'completed',
          createdAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: '$soldByUserId',
          totalRevenue: { $sum: '$grandTotalAmount' },
          saleCount: { $sum: 1 }
        }
      }
    ]);
    const salesMap = new Map<string, { revenue: string; count: number }>();
    for (const item of salesAgg) {
      if (item._id) {
        salesMap.set(item._id.toString(), {
          revenue: toDecimal(item.totalRevenue || 0).toFixed(2),
          count: item.saleCount || 0
        });
      }
    }

    // 3. Check existing payroll ledgers for this month
    const existingLedgers = await PayrollLedger.find({
      shopId: sId,
      monthYear
    });
    const ledgerMap = new Map<string, IPayrollLedger>();
    for (const ldg of existingLedgers) {
      ledgerMap.set(ldg.employeeUserId.toString(), ldg);
    }

    const items = staffMembers.map((member) => {
      const uId = member._id.toString();
      const existing = ledgerMap.get(uId);

      const techInfo = techShareMap.get(uId) || { share: '0.00', jobs: 0 };
      const salesInfo = salesMap.get(uId) || { revenue: '0.00', count: 0 };
      const target = targetMap.get(uId);

      let baseSalary = '12000.00';
      if (member.role === 'TECHNICIAN') baseSalary = '15000.00';
      if (member.role === 'SALESPERSON') baseSalary = '10000.00';
      if (member.role === 'CASHIER') baseSalary = '12000.00';
      if (member.role === 'STORE_MANAGER') baseSalary = '25000.00';

      const repairCommission = techInfo.share;
      const salesBonus = target ? toDecimal(target.commissionBonusAmount).toFixed(2) : '0.00';
      const deductions = existing ? toDecimal(existing.deductions).toFixed(2) : '0.00';

      const netPayable = existing
        ? toDecimal(existing.netPayable).toFixed(2)
        : toDecimal(baseSalary)
            .plus(toDecimal(repairCommission))
            .plus(toDecimal(salesBonus))
            .minus(toDecimal(deductions))
            .toFixed(2);

      return {
        employeeUserId: uId,
        fullName: member.fullName,
        phone: member.phone,
        role: member.role,
        monthYear,
        baseSalary: existing ? toDecimal(existing.baseSalary).toFixed(2) : baseSalary,
        repairCommission,
        repairJobsCompleted: techInfo.jobs,
        salesBonus,
        salesAchievedRevenue: salesInfo.revenue,
        salesCount: salesInfo.count,
        deductions,
        netPayable,
        paymentStatus: existing ? existing.paymentStatus : 'pending',
        disbursedDate: existing?.disbursedDate,
        payrollNo: existing?.payrollNo
      };
    });

    return {
      monthYear,
      staffCount: items.length,
      totalNetPayable: items
        .reduce((sum, item) => sum.plus(toDecimal(item.netPayable)), toDecimal(0))
        .toFixed(2),
      items
    };
  }

  /**
   * Disburses salary and commission payout (TX-18):
   * - Records PayrollLedger entry
   * - Posts balanced double-entry journal (Salaries OPEX + Splits Dr, Bank/Cash Cr)
   * - Sends confirmation SMS to staff member
   */
  static async disbursePayroll(input: DisbursePayrollInput) {
    const shopId = new mongoose.Types.ObjectId(input.shopId);
    const employeeUserId = new mongoose.Types.ObjectId(input.employeeUserId);
    const postedByUserId = new mongoose.Types.ObjectId(input.postedByUserId);
    const disburseMethod = input.disburseMethod || 'bank_transfer';
    const sourceAccountCode = input.sourceAccountCode || (disburseMethod === 'bank_transfer' ? '1.2.01' : '1.1.01');

    const employee = await User.findById(employeeUserId);
    if (!employee) {
      const err: any = new Error('Employee user not found');
      err.status = 404;
      err.code = 'EMPLOYEE_NOT_FOUND';
      throw err;
    }

    const shop = await Shop.findById(shopId);

    // Compute figures
    const summary = await this.getPayrollSummary(shopId, input.monthYear);
    const empSummary = summary.items.find((item) => item.employeeUserId === employeeUserId.toString());
    if (!empSummary) {
      const err: any = new Error('Employee summary could not be computed');
      err.status = 400;
      err.code = 'PAYROLL_CALCULATION_ERROR';
      throw err;
    }

    if (empSummary.paymentStatus === 'disbursed') {
      const err: any = new Error(`Payroll for ${employee.fullName} (${input.monthYear}) has already been disbursed`);
      err.status = 422;
      err.code = 'PAYROLL_ALREADY_DISBURSED';
      throw err;
    }

    const baseSalary = input.baseSalary !== undefined ? toDecimal(input.baseSalary) : toDecimal(empSummary.baseSalary);
    const repairCommission = toDecimal(empSummary.repairCommission);
    const salesBonus = toDecimal(empSummary.salesBonus);
    const deductions = input.deductions !== undefined ? toDecimal(input.deductions) : toDecimal(empSummary.deductions);

    const netPayable = baseSalary
      .plus(repairCommission)
      .plus(salesBonus)
      .minus(deductions);

    if (netPayable.lessThanOrEqualTo(0)) {
      const err: any = new Error('Net payable must be strictly greater than 0');
      err.status = 400;
      err.code = 'INVALID_PAYABLE_AMOUNT';
      throw err;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await AccountingService.seedDefaultChartOfAccounts(shopId, session);

      // Verify source account balance if asset
      const sourceAccount = await Account.findOne({ shopId, code: sourceAccountCode }).session(session);
      if (!sourceAccount) {
        const err: any = new Error(`Disbursement account [${sourceAccountCode}] not found`);
        err.status = 404;
        err.code = 'ACCOUNT_NOT_FOUND';
        throw err;
      }

      if (sourceAccount.accountType === 'asset') {
        const currentBal = toDecimal(sourceAccount.currentBalance);
        if (isMoneyGreaterThan(netPayable, currentBal)) {
          const err: any = new Error(
            `Insufficient funds in payout account ${sourceAccount.name} (${sourceAccount.code}). Available: ${currentBal.toFixed(2)}, Required: ${netPayable.toFixed(2)}`
          );
          err.status = 400;
          err.code = 'INSUFFICIENT_FUNDS';
          throw err;
        }
      }

      const payrollNo = `PAY-${input.monthYear.replace('-', '')}-${Date.now().toString().slice(-4)}`;

      // Save/update PayrollLedger
      await PayrollLedger.findOneAndUpdate(
        { shopId, employeeUserId, monthYear: input.monthYear },
        {
          shopId,
          payrollNo,
          employeeUserId,
          monthYear: input.monthYear,
          baseSalary: baseSalary.toFixed(2),
          repairCommission: repairCommission.toFixed(2),
          salesBonus: salesBonus.toFixed(2),
          deductions: deductions.toFixed(2),
          netPayable: netPayable.toFixed(2),
          paymentStatus: 'disbursed',
          disbursedDate: new Date(),
          paymentMethod: disburseMethod
        },
        { upsert: true, new: true, session }
      );

      // Post double-entry journal TX-18
      const entries = buildTx18PayrollDisbursement({
        baseSalary: baseSalary.minus(deductions).toFixed(2),
        technicianSplits: repairCommission.toFixed(2),
        salesBonuses: salesBonus.toFixed(2),
        totalDisbursed: netPayable.toFixed(2),
        sourceAccountCode
      });

      const journalResult = await AccountingService.postDoubleEntryJournal({
        shopId,
        voucherNo: payrollNo,
        txnCode: 'TX_PAYROLL_DISBURSEMENT',
        sourceDocType: 'PAYROLL_VOUCHER',
        postedByUserId,
        entries,
        session
      });

      await session.commitTransaction();

      // Dispatch SMS alert asynchronously
      try {
        const smsDriver = getSmsDriver();
        const shopName = shop?.name || 'Bebsayik Dokan';
        const msg = `Dear ${employee.fullName}, your salary of BDT ${netPayable.toFixed(2)} for ${input.monthYear} has been disbursed via ${disburseMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cash'}. Dokan: ${shopName}.`;
        await smsDriver.sendSms(employee.phone, msg);
      } catch (smsErr) {
        console.warn('[HrService] SMS dispatch failed:', smsErr);
      }

      return {
        payrollNo,
        employeeName: employee.fullName,
        phone: employee.phone,
        monthYear: input.monthYear,
        netPayable: netPayable.toFixed(2),
        paymentMethod: disburseMethod,
        sourceAccountCode,
        journalResult
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
