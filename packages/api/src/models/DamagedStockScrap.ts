import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IDamagedStockScrap extends Document {
  shopId: mongoose.Types.ObjectId;
  swvNo: string;
  variantId: mongoose.Types.ObjectId;
  imeiId?: mongoose.Types.ObjectId;
  imei1?: string;
  quantity: number;
  landedCost: mongoose.Types.Decimal128;
  damageReason: string;
  damageCategory?: string;
  photoUrl?: string;
  transactionReference?: string;
  approvedByUserId: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DamagedStockScrapSchema = new Schema<IDamagedStockScrap>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    swvNo: { type: String, required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    imeiId: { type: Schema.Types.ObjectId, ref: 'ImeiSerial' },
    imei1: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    landedCost: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    damageReason: { type: String, required: true },
    damageCategory: { type: String },
    photoUrl: { type: String },
    transactionReference: { type: String },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

DamagedStockScrapSchema.index({ shopId: 1, swvNo: 1 }, { unique: true });
DamagedStockScrapSchema.index({ shopId: 1, imei1: 1 });

export const DamagedStockScrap = mongoose.model<IDamagedStockScrap>('DamagedStockScrap', DamagedStockScrapSchema);
