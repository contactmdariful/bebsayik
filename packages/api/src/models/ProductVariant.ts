import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IProductVariant extends Document {
  shopId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  sku: string;
  barcode?: string;
  variantName?: string;
  attributes: {
    color?: string;
    storage?: string;
    ram?: string;
    warrantyDurationDays?: number;
    [key: string]: any;
  };
  mrp: mongoose.Types.Decimal128;
  msp: mongoose.Types.Decimal128;
  purchaseCost: mongoose.Types.Decimal128;
  reorderLevel: number;
  alertQuantity: number;
  currentStock: number;
  batchExpiryDate?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true, trim: true },
    barcode: { type: String, trim: true },
    variantName: { type: String, trim: true },
    attributes: {
      type: Schema.Types.Mixed,
      default: {}
    },
    mrp: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    msp: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    purchaseCost: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    reorderLevel: { type: Number, default: 5 },
    alertQuantity: { type: Number, default: 5 },
    currentStock: { type: Number, default: 0 },
    batchExpiryDate: { type: Date },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

ProductVariantSchema.index({ shopId: 1, sku: 1 }, { unique: true });
ProductVariantSchema.index(
  { shopId: 1, barcode: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false, barcode: { $type: 'string' } } }
);
ProductVariantSchema.index({ shopId: 1, productId: 1 });

export const ProductVariant = mongoose.model<IProductVariant>('ProductVariant', ProductVariantSchema);
