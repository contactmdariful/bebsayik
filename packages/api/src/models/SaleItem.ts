import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface ISaleItem extends Document {
  shopId: mongoose.Types.ObjectId;
  saleId: mongoose.Types.ObjectId;
  variantId: mongoose.Types.ObjectId;
  imeiId?: mongoose.Types.ObjectId;
  unitPrice: mongoose.Types.Decimal128;
  landedCost: mongoose.Types.Decimal128;
  quantity: number;
  subtotal: mongoose.Types.Decimal128;
  discount: mongoose.Types.Decimal128;
  total: mongoose.Types.Decimal128;
  warrantyExpireDate?: Date;
  createdAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    imeiId: { type: Schema.Types.ObjectId, ref: 'ImeiSerial' },
    unitPrice: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    landedCost: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    discount: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    total: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    warrantyExpireDate: { type: Date }
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { getters: true }, toObject: { getters: true } }
);

SaleItemSchema.index({ shopId: 1, saleId: 1 });
SaleItemSchema.index({ shopId: 1, imeiId: 1 });

export const SaleItem = mongoose.model<ISaleItem>('SaleItem', SaleItemSchema);
