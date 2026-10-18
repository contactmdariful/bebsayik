import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IMfsTransaction extends Document {
  shopId: mongoose.Types.ObjectId;
  provider: 'bkash' | 'nagad' | 'rocket' | 'upay';
  transactionType: 'cash_in' | 'cash_out' | 'sim_b2b_refill' | 'agent_commission';
  simPhoneNumber: string;
  amount: mongoose.Types.Decimal128;
  commission: mongoose.Types.Decimal128;
  counterpartyPhone: string;
  trxId?: string;
  shiftId: mongoose.Types.ObjectId;
  performedByUserId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const MfsTransactionSchema = new Schema<IMfsTransaction>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    provider: { type: String, enum: ['bkash', 'nagad', 'rocket', 'upay'], required: true },
    transactionType: {
      type: String,
      enum: ['cash_in', 'cash_out', 'sim_b2b_refill', 'agent_commission'],
      required: true
    },
    simPhoneNumber: { type: String, required: true },
    amount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    commission: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    counterpartyPhone: { type: String, required: true },
    trxId: { type: String },
    shiftId: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
    performedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { getters: true }, toObject: { getters: true } }
);

MfsTransactionSchema.index({ shopId: 1, provider: 1, createdAt: -1 });

export const MfsTransaction = mongoose.model<IMfsTransaction>('MfsTransaction', MfsTransactionSchema);
