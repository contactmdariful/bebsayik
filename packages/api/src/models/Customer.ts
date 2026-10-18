import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface ICustomer extends Document {
  shopId: mongoose.Types.ObjectId;
  fullName: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  nidNumber?: string;
  creditLimit: mongoose.Types.Decimal128;
  currentDueBalance: mongoose.Types.Decimal128;
  rewardPoints: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    alternatePhone: { type: String, trim: true },
    address: { type: String },
    nidNumber: { type: String, trim: true },
    creditLimit: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    currentDueBalance: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    rewardPoints: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

CustomerSchema.index(
  { shopId: 1, phone: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
CustomerSchema.index({ shopId: 1, isDeleted: 1 });

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
