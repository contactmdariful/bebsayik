import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IServicePartsConsumed extends Document {
  shopId: mongoose.Types.ObjectId;
  serviceJobId: mongoose.Types.ObjectId;
  variantId: mongoose.Types.ObjectId;
  quantity: number;
  purchaseCost: mongoose.Types.Decimal128;
  billedPrice: mongoose.Types.Decimal128;
  createdAt: Date;
}

const ServicePartsConsumedSchema = new Schema<IServicePartsConsumed>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    serviceJobId: { type: Schema.Types.ObjectId, ref: 'ServiceJob', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    quantity: { type: Number, required: true, min: 1 },
    purchaseCost: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    billedPrice: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter }
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { getters: true }, toObject: { getters: true } }
);

ServicePartsConsumedSchema.index({ shopId: 1, serviceJobId: 1 });

export const ServicePartsConsumed = mongoose.model<IServicePartsConsumed>('ServicePartsConsumed', ServicePartsConsumedSchema);
