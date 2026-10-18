import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IPersonalLedgerContact extends Document {
  shopId: mongoose.Types.ObjectId;
  fullName: string;
  phone: string;
  relationship: string;
  currentBalance: mongoose.Types.Decimal128;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PersonalLedgerContactSchema = new Schema<IPersonalLedgerContact>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    relationship: { type: String, required: true },
    currentBalance: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

PersonalLedgerContactSchema.index(
  { shopId: 1, phone: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

export const PersonalLedgerContact = mongoose.model<IPersonalLedgerContact>(
  'PersonalLedgerContact',
  PersonalLedgerContactSchema
);
