import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface ICustomerReturnVoucher extends Document {
  shopId: mongoose.Types.ObjectId;
  crvNo: string;
  invoiceNo: string;
  idempotencyKey?: string;
  saleId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  totalReturnAmount: mongoose.Types.Decimal128;
  dueReductionAmount: mongoose.Types.Decimal128;
  refundAmount: mongoose.Types.Decimal128;
  refundMethod: 'cash' | 'store_credit' | 'bank_card' | 'mfs_bkash' | 'mfs_nagad';
  refundAccountId?: mongoose.Types.ObjectId;
  restockStock: boolean;
  reason?: string;
  returnedItems: Array<{
    variantId: mongoose.Types.ObjectId;
    imeiId?: mongoose.Types.ObjectId;
    imei1?: string;
    quantity: number;
    unitPrice: mongoose.Types.Decimal128;
    refundPrice: mongoose.Types.Decimal128;
    condition: 'restockable' | 'defective' | 'quarantine';
    landedCost?: mongoose.Types.Decimal128;
  }>;
  authorizedByUserId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerReturnVoucherSchema = new Schema<ICustomerReturnVoucher>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    crvNo: { type: String, required: true },
    invoiceNo: { type: String, required: true },
    idempotencyKey: { type: String, trim: true },
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    totalReturnAmount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    dueReductionAmount: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    refundAmount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    refundMethod: {
      type: String,
      enum: ['cash', 'store_credit', 'bank_card', 'mfs_bkash', 'mfs_nagad'],
      default: 'cash'
    },
    refundAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    restockStock: { type: Boolean, default: true },
    reason: { type: String },
    returnedItems: [
      {
        variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
        imeiId: { type: Schema.Types.ObjectId, ref: 'ImeiSerial' },
        imei1: { type: String },
        quantity: { type: Number, required: true },
        unitPrice: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
        refundPrice: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
        condition: { type: String, enum: ['restockable', 'defective', 'quarantine'], default: 'restockable' },
        landedCost: { type: Schema.Types.Decimal128, set: decimal128Setter, get: decimal128Getter }
      }
    ],
    authorizedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

CustomerReturnVoucherSchema.index({ shopId: 1, crvNo: 1 }, { unique: true });
CustomerReturnVoucherSchema.index({ shopId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
CustomerReturnVoucherSchema.index({ shopId: 1, saleId: 1 });
CustomerReturnVoucherSchema.index({ shopId: 1, customerId: 1 });
CustomerReturnVoucherSchema.index({ shopId: 1, createdAt: -1 });

export const CustomerReturnVoucher = mongoose.model<ICustomerReturnVoucher>(
  'CustomerReturnVoucher',
  CustomerReturnVoucherSchema
);
