import mongoose from 'mongoose';
import { Account, AccountTransaction, IAccount, IAccountTransaction } from '../../models/index.js';
import { AccountingService } from '../accounting/accounting.service.js';
import { buildTxInterAccountTransfer, buildTxExpenseVoucher } from '../accounting/journalMatrices.js';
import { toDecimal, isMoneyGreaterThan } from '../../utils/money.js';

export interface InterAccountTransferInput {
  shopId: mongoose.Types.ObjectId | string;
  fromAccountCode: string;
  toAccountCode: string;
  amount: string | number;
  notes?: string | undefined;
  postedByUserId: mongoose.Types.ObjectId | string;
}

export interface ExpenseVoucherInput {
  shopId: mongoose.Types.ObjectId | string;
  categoryCode: string;
  paidFromAccountCode?: string | undefined;
  amount: string | number;
  payeeName: string;
  notes?: string | undefined;
  postedByUserId: mongoose.Types.ObjectId | string;
}

export class AccountsService {
  /**
   * Retrieves all accounts for a tenant shop.
   * Auto-seeds standard Chart of Accounts if empty.
   */
  static async listAccounts(shopId: mongoose.Types.ObjectId | string): Promise<IAccount[]> {
    const sId = new mongoose.Types.ObjectId(shopId);
    let accounts = await Account.find({ shopId: sId }).sort({ code: 1 });

    if (accounts.length === 0) {
      await AccountingService.seedDefaultChartOfAccounts(sId);
      accounts = await Account.find({ shopId: sId }).sort({ code: 1 });
    }

    return accounts;
  }

  /**
   * Retrieves paginated journal transaction ledger history.
   */
  static async getLedgerTransactions(
    shopId: mongoose.Types.ObjectId | string,
    filter: {
      accountId?: string | undefined;
      accountCode?: string | undefined;
      limit?: number | undefined;
      skip?: number | undefined;
    } = {}
  ): Promise<{ transactions: IAccountTransaction[]; total: number }> {
    const sId = new mongoose.Types.ObjectId(shopId);
    const query: any = { shopId: sId };

    if (filter.accountId) {
      query.accountId = new mongoose.Types.ObjectId(filter.accountId);
    } else if (filter.accountCode) {
      const acct = await Account.findOne({ shopId: sId, code: filter.accountCode });
      if (acct) {
        query.accountId = acct._id;
      }
    }

    const limit = filter.limit && filter.limit > 0 ? Math.min(filter.limit, 100) : 50;
    const skip = filter.skip && filter.skip >= 0 ? filter.skip : 0;

    const [transactions, total] = await Promise.all([
      AccountTransaction.find(query)
        .populate('accountId', 'code name accountType normalBalance')
        .populate('postedByUserId', 'fullName phone role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AccountTransaction.countDocuments(query)
    ]);

    return { transactions, total };
  }

  /**
   * Performs an atomic inter-account transfer (e.g. Cash in Drawer to Bank Deposit).
   */
  static async transferFunds(input: InterAccountTransferInput) {
    const shopId = new mongoose.Types.ObjectId(input.shopId);
    const postedByUserId = new mongoose.Types.ObjectId(input.postedByUserId);
    const amountDec = toDecimal(input.amount);

    if (amountDec.lessThanOrEqualTo(0)) {
      const err: any = new Error('Transfer amount must be strictly greater than 0');
      err.status = 400;
      err.code = 'INVALID_TRANSFER_AMOUNT';
      throw err;
    }

    if (input.fromAccountCode === input.toAccountCode) {
      const err: any = new Error('Source and destination accounts must be distinct');
      err.status = 400;
      err.code = 'IDENTICAL_ACCOUNTS';
      throw err;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Ensure default accounts exist
      await AccountingService.seedDefaultChartOfAccounts(shopId, session);

      const fromAccount = await Account.findOne({ shopId, code: input.fromAccountCode }).session(session);
      if (!fromAccount) {
        const err: any = new Error(`Source account [${input.fromAccountCode}] does not exist`);
        err.status = 404;
        err.code = 'ACCOUNT_NOT_FOUND';
        throw err;
      }

      const toAccount = await Account.findOne({ shopId, code: input.toAccountCode }).session(session);
      if (!toAccount) {
        const err: any = new Error(`Destination account [${input.toAccountCode}] does not exist`);
        err.status = 404;
        err.code = 'ACCOUNT_NOT_FOUND';
        throw err;
      }

      // Check sufficient balance if source account is an asset
      if (fromAccount.accountType === 'asset') {
        const currentBal = toDecimal(fromAccount.currentBalance);
        if (isMoneyGreaterThan(amountDec, currentBal)) {
          const err: any = new Error(
            `Insufficient funds in source account ${fromAccount.name} (${fromAccount.code}). Available: ${currentBal.toFixed(2)}, Requested: ${amountDec.toFixed(2)}`
          );
          err.status = 400;
          err.code = 'INSUFFICIENT_FUNDS';
          throw err;
        }
      }

      const voucherNo = `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const entries = buildTxInterAccountTransfer({
        fromAccountCode: input.fromAccountCode,
        toAccountCode: input.toAccountCode,
        amount: input.amount,
        description: input.notes || `Inter-account transfer from ${input.fromAccountCode} to ${input.toAccountCode}`
      });

      const journalResult = await AccountingService.postDoubleEntryJournal({
        shopId,
        voucherNo,
        txnCode: 'TX_TRANSFER',
        sourceDocType: 'INTER_ACCOUNT_TRANSFER',
        postedByUserId,
        entries,
        session
      });

      await session.commitTransaction();

      return {
        voucherNo,
        fromAccountCode: input.fromAccountCode,
        toAccountCode: input.toAccountCode,
        amount: amountDec.toFixed(2),
        journalResult
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Records an OPEX petty expense voucher (e.g. Tea, Rent, Electricity).
   */
  static async recordExpense(input: ExpenseVoucherInput) {
    const shopId = new mongoose.Types.ObjectId(input.shopId);
    const postedByUserId = new mongoose.Types.ObjectId(input.postedByUserId);
    const amountDec = toDecimal(input.amount);
    const paidFromAccountCode = input.paidFromAccountCode || '1.1.01';

    if (amountDec.lessThanOrEqualTo(0)) {
      const err: any = new Error('Expense amount must be strictly greater than 0');
      err.status = 400;
      err.code = 'INVALID_EXPENSE_AMOUNT';
      throw err;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await AccountingService.seedDefaultChartOfAccounts(shopId, session);

      const sourceAccount = await Account.findOne({ shopId, code: paidFromAccountCode }).session(session);
      if (!sourceAccount) {
        const err: any = new Error(`Payment source account [${paidFromAccountCode}] not found`);
        err.status = 404;
        err.code = 'ACCOUNT_NOT_FOUND';
        throw err;
      }

      if (sourceAccount.accountType === 'asset') {
        const currentBal = toDecimal(sourceAccount.currentBalance);
        if (isMoneyGreaterThan(amountDec, currentBal)) {
          const err: any = new Error(
            `Insufficient funds in payment account ${sourceAccount.name} (${sourceAccount.code}). Available: ${currentBal.toFixed(2)}, Requested: ${amountDec.toFixed(2)}`
          );
          err.status = 400;
          err.code = 'INSUFFICIENT_FUNDS';
          throw err;
        }
      }

      const voucherNo = `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const description = `Petty Expense: ${input.payeeName}${input.notes ? ' - ' + input.notes : ''}`;

      const entries = buildTxExpenseVoucher({
        categoryCode: input.categoryCode,
        paidFromAccountCode,
        amount: input.amount,
        description
      });

      const journalResult = await AccountingService.postDoubleEntryJournal({
        shopId,
        voucherNo,
        txnCode: 'TX_EXPENSE_PETTY',
        sourceDocType: 'EXPENSE_VOUCHER',
        postedByUserId,
        entries,
        session
      });

      await session.commitTransaction();

      return {
        voucherNo,
        categoryCode: input.categoryCode,
        paidFromAccountCode,
        payeeName: input.payeeName,
        amount: amountDec.toFixed(2),
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
