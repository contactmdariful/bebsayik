import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IPurchaseReturnVoucher extends Document {
  shopId: mongoose.Types.ObjectId;
  prvNo: string;
  supplierId: mongoose.Types.ObjectId;
  grnId?: mongoose.Types.ObjectId;
  items: Array<{
    variantId: mongoose.Types.ObjectId;
    imei1?: string;
    returnCost: mongoose.Types.Decimal128;
    reason?: string;
    quantity?: number;
  }>;
  totalRefundAmount: mongoose.Types.Decimal128;
  reason: string;
  transactionReference?: string;
  notes?: string;
  processedByUserId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseReturnVoucherSchema = new Schema<IPurchaseReturnVoucher>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    prvNo: { type: String, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    grnId: { type: Schema.Types.ObjectId, ref: 'GoodsReceivedNote' },
    items: [
      {
        variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
        imei1: { type: String, trim: true },
        returnCost: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
        reason: { type: String },
        quantity: { type: Number, default: 1 }
      }
    ],
    totalRefundAmount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    reason: { type: String, required: true },
    transactionReference: { type: String },
    notes: { type: String },
    processedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

PurchaseReturnVoucherSchema.index({ shopId: 1, prvNo: 1 }, { unique: true });
PurchaseReturnVoucherSchema.index({ shopId: 1, supplierId: 1 });

export const PurchaseReturnVoucher = mongoose.model<IPurchaseReturnVoucher>('PurchaseReturnVoucher', PurchaseReturnVoucherSchema);
