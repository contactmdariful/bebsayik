import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface ISale extends Document {
  shopId: mongoose.Types.ObjectId;
  invoiceNo: string;
  idempotencyKey?: string;
  customerId?: mongoose.Types.ObjectId;
  mushak63No?: string;
  shiftId: mongoose.Types.ObjectId;
  subtotalAmount: mongoose.Types.Decimal128;
  discountAmount: mongoose.Types.Decimal128;
  vatAmount: mongoose.Types.Decimal128;
  grandTotalAmount: mongoose.Types.Decimal128;
  paidAmount: mongoose.Types.Decimal128;
  dueAmount: mongoose.Types.Decimal128;
  changeAmount: mongoose.Types.Decimal128;
  paymentMethods: Array<{
    method: 'cash' | 'mfs_bkash' | 'mfs_nagad' | 'bank_card' | 'customer_due' | 'trade_in' | 'bkash_merchant' | 'nagad_merchant' | 'other_mfs' | 'kisti';
    amount: mongoose.Types.Decimal128;
    accountId?: mongoose.Types.ObjectId;
    referenceTxnId?: string;
  }>;
  status: 'completed' | 'partially_refunded' | 'refunded' | 'voided';
  reprintCount: number;
  soldByUserId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    invoiceNo: { type: String, required: true },
    idempotencyKey: { type: String, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    mushak63No: { type: String },
    shiftId: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
    subtotalAmount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    discountAmount: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    vatAmount: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    grandTotalAmount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    paidAmount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    dueAmount: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    changeAmount: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    paymentMethods: [
      {
        method: {
          type: String,
          enum: ['cash', 'mfs_bkash', 'mfs_nagad', 'bank_card', 'customer_due', 'trade_in', 'bkash_merchant', 'nagad_merchant', 'other_mfs', 'kisti'],
          required: true
        },
        amount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
        accountId: { type: Schema.Types.ObjectId, ref: 'Account' },
        referenceTxnId: { type: String }
      }
    ],
    status: { type: String, enum: ['completed', 'partially_refunded', 'refunded', 'voided'], default: 'completed' },
    reprintCount: { type: Number, default: 0 },
    soldByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

SaleSchema.index({ shopId: 1, invoiceNo: 1 }, { unique: true });
SaleSchema.index({ shopId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
SaleSchema.index({ shopId: 1, customerId: 1 });
SaleSchema.index({ shopId: 1, shiftId: 1 });
SaleSchema.index({ shopId: 1, createdAt: -1 });
SaleSchema.index(
  { shopId: 1, customerId: 1, dueAmount: 1 },
  { partialFilterExpression: { dueAmount: { $gt: 0 } } }
);

export const Sale = mongoose.model<ISale>('Sale', SaleSchema);
