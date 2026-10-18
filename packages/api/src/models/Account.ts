import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IAccount extends Document {
  shopId: mongoose.Types.ObjectId;
  code: string;
  name: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'cogs' | 'expense';
  normalBalance: 'debit' | 'credit';
  currentBalance: mongoose.Types.Decimal128;
  isSystemDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    accountType: {
      type: String,
      enum: ['asset', 'liability', 'equity', 'revenue', 'cogs', 'expense'],
      required: true
    },
    normalBalance: { type: String, enum: ['debit', 'credit'], required: true },
    currentBalance: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    isSystemDefault: { type: Boolean, default: false }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

AccountSchema.index({ shopId: 1, code: 1 }, { unique: true });
AccountSchema.index({ shopId: 1, name: 1 }, { unique: true });
AccountSchema.index({ shopId: 1, accountType: 1 });

export const Account = mongoose.model<IAccount>('Account', AccountSchema);
