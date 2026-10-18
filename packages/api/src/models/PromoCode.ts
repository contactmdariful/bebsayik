import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IPromoCode extends Document {
  code: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: mongoose.Types.Decimal128;
  validUntil: Date;
  usageLimit: number;
  timesUsed: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromoCodeSchema = new Schema<IPromoCode>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percentage', 'fixed_amount'], required: true },
    discountValue: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    validUntil: { type: Date, required: true },
    usageLimit: { type: Number, default: 100 },
    timesUsed: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

export const PromoCode = mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);
