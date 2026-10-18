import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IAccountTransaction extends Document {
  shopId: mongoose.Types.ObjectId;
  voucherNo: string;
  entryIndex: number;
  txnCode: string;
  accountId: mongoose.Types.ObjectId;
  debit: mongoose.Types.Decimal128;
  credit: mongoose.Types.Decimal128;
  runningBalanceAfter: mongoose.Types.Decimal128;
  description: string;
  sourceDocType: string;
  sourceDocId?: mongoose.Types.ObjectId;
  postedByUserId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const AccountTransactionSchema = new Schema<IAccountTransaction>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    voucherNo: { type: String, required: true },
    entryIndex: { type: Number, required: true, default: 0 },
    txnCode: { type: String, required: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    debit: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    credit: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    runningBalanceAfter: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    description: { type: String, required: true },
    sourceDocType: { type: String, required: true },
    sourceDocId: { type: Schema.Types.ObjectId },
    postedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { getters: true }, toObject: { getters: true } }
);

AccountTransactionSchema.index({ shopId: 1, accountId: 1, createdAt: -1 });
AccountTransactionSchema.index({ shopId: 1, voucherNo: 1, entryIndex: 1 }, { unique: true });
AccountTransactionSchema.index({ shopId: 1, voucherNo: 1 });

export const AccountTransaction = mongoose.model<IAccountTransaction>('AccountTransaction', AccountTransactionSchema);
