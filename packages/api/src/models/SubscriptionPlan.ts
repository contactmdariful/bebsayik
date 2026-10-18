import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface ISubscriptionPlan extends Document {
  code: 'starter' | 'pro' | 'enterprise' | 'silver' | 'gold' | 'diamond';
  name: string;
  monthlyPrice: mongoose.Types.Decimal128;
  yearlyPrice: mongoose.Types.Decimal128;
  maxShops: number;
  maxStaffPerShop: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    code: { type: String, enum: ['starter', 'pro', 'enterprise', 'silver', 'gold', 'diamond'], required: true, unique: true },
    name: { type: String, required: true },
    monthlyPrice: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    yearlyPrice: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    maxShops: { type: Number, default: 1 },
    maxStaffPerShop: { type: Number, default: 5 },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
