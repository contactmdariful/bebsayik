import mongoose, { ClientSession } from 'mongoose';
import { Account, AccountTransaction } from '../../models/index.js';
import {
  addMoney,
  formatMoney,
  isMoneyEqual,
  MonetaryInput,
  toDecimal,
  decimal128Setter
} from '../../utils/money.js';

export interface JournalEntry {
  accountCode: string;
  accountName?: string;
  accountType?: 'asset' | 'liability' | 'equity' | 'revenue' | 'cogs' | 'expense';
  normalBalance?: 'debit' | 'credit';
  debit: MonetaryInput;
  credit: MonetaryInput;
  description: string;
}

export interface PostJournalParams {
  shopId: mongoose.Types.ObjectId;
  voucherNo: string;
  txnCode: string;
  sourceDocType: string;
  sourceDocId?: mongoose.Types.ObjectId;
  postedByUserId: mongoose.Types.ObjectId;
  entries: JournalEntry[];
  session: ClientSession;
}

export interface JournalResult {
  voucherNo: string;
  txnCode: string;
  totalDebits: string;
  totalCredits: string;
  transactionCount: number;
}

export class AccountingService {
  /**
   * Posts a double-entry journal voucher into the General Ledger.
   */
  static async postDoubleEntryJournal(params: PostJournalParams): Promise<JournalResult> {
    const { shopId, voucherNo, txnCode, sourceDocType, sourceDocId, postedByUserId, entries, session } = params;

    if (!session) {
      throw new Error('Mandatory Mongoose ClientSession required for financial ledger postings');
    }

    if (!entries || entries.length < 2) {
      throw new Error(`Double-entry journal requires at least 2 entries. Received: ${entries?.length || 0}`);
    }

    let totalDebits = toDecimal(0);
    let totalCredits = toDecimal(0);

    for (const entry of entries) {
      totalDebits = addMoney(totalDebits, entry.debit);
      totalCredits = addMoney(totalCredits, entry.credit);
    }

    const debitsFormatted = formatMoney(totalDebits);
    const creditsFormatted = formatMoney(totalCredits);

    if (!isMoneyEqual(totalDebits, totalCredits)) {
      throw new Error(
        `Double-entry imbalance for voucher ${voucherNo} (${txnCode}): Total Debits (${debitsFormatted}) !== Total Credits (${creditsFormatted})`
      );
    }

    // Enforce idempotency: prevent re-posting duplicate vouchers for the same tenant
    const existingTxn = await AccountTransaction.findOne({ shopId, voucherNo }).session(session);
    if (existingTxn) {
      throw new Error(
        `Idempotency violation: Voucher ${voucherNo} has already been posted to the general ledger for shop ${shopId}`
      );
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const debitDec = toDecimal(entry.debit);
      const creditDec = toDecimal(entry.credit);

      let account = await Account.findOne({ shopId, code: entry.accountCode }).session(session);

      if (!account) {
        account = new Account({
          shopId,
          code: entry.accountCode,
          name: entry.accountName || `Account ${entry.accountCode}`,
          accountType: entry.accountType || 'asset',
          normalBalance: entry.normalBalance || (entry.accountCode.startsWith('1') || entry.accountCode.startsWith('5') || entry.accountCode.startsWith('6') ? 'debit' : 'credit'),
          currentBalance: decimal128Setter(0),
          isSystemDefault: true
        });
        await account.save({ session });
      }

      const currentBal = toDecimal(account.currentBalance);
      let newBal = toDecimal(0);

      if (account.normalBalance === 'debit') {
        newBal = currentBal.plus(debitDec).minus(creditDec);
      } else {
        newBal = currentBal.plus(creditDec).minus(debitDec);
      }

      account.currentBalance = decimal128Setter(newBal);
      await account.save({ session });

      const txnRecord = new AccountTransaction({
        shopId,
        voucherNo,
        entryIndex: i,
        txnCode,
        accountId: account._id,
        debit: decimal128Setter(debitDec),
        credit: decimal128Setter(creditDec),
        runningBalanceAfter: decimal128Setter(newBal),
        description: entry.description,
        sourceDocType,
        sourceDocId,
        postedByUserId
      });

      await txnRecord.save({ session });
    }

    return {
      voucherNo,
      txnCode,
      totalDebits: debitsFormatted,
      totalCredits: creditsFormatted,
      transactionCount: entries.length
    };
  }

  /**
   * Seeds all standard Chart of Accounts (COA) records for a shop.
   */
  static async seedDefaultChartOfAccounts(
    shopId: mongoose.Types.ObjectId,
    session?: ClientSession
  ): Promise<number> {
    const { STANDARD_CHART_OF_ACCOUNTS } = await import('./journalMatrices.js');
    let seededCount = 0;

    for (const def of STANDARD_CHART_OF_ACCOUNTS) {
      const query: any = Account.findOne({ shopId, code: def.code });
      if (session && typeof query?.session === 'function') {
        query.session(session);
      }
      const existing = await query;

      if (!existing) {
        const account = new Account({
          shopId,
          code: def.code,
          name: def.name,
          accountType: def.accountType,
          normalBalance: def.normalBalance,
          currentBalance: decimal128Setter(0),
          isSystemDefault: true
        });

        if (session) {
          await account.save({ session });
        } else {
          await account.save();
        }
        seededCount++;
      }
    }

    return seededCount;
  }
}

export * from './journalMatrices.js';

