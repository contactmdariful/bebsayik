import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IMoneyReceipt extends Document {
  shopId: mongoose.Types.ObjectId;
  receiptNo: string;
  idempotencyKey?: string;
  customerId: mongoose.Types.ObjectId;
  receiptType: 'due_collection' | 'kisti_installment' | 'advance';
  kistiContractId?: mongoose.Types.ObjectId;
  milestoneNo?: number;
  isEarlySettlement?: boolean;
  amount: mongoose.Types.Decimal128;
  paymentMethod: 'cash' | 'mfs_bkash' | 'mfs_nagad' | 'bank_card';
  accountId?: mongoose.Types.ObjectId;
  referenceTxnId?: string;
  allocatedInvoices: Array<{
    saleId: mongoose.Types.ObjectId;
    invoiceNo: string;
    amountAllocated: mongoose.Types.Decimal128;
  }>;
  previousDue: mongoose.Types.Decimal128;
  remainingDue: mongoose.Types.Decimal128;
  notes?: string;
  collectedByUserId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MoneyReceiptSchema = new Schema<IMoneyReceipt>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    receiptNo: { type: String, required: true },
    idempotencyKey: { type: String, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    receiptType: {
      type: String,
      enum: ['due_collection', 'kisti_installment', 'advance'],
      default: 'due_collection'
    },
    kistiContractId: { type: Schema.Types.ObjectId, ref: 'KistiContract' },
    milestoneNo: { type: Number },
    isEarlySettlement: { type: Boolean, default: false },
    amount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    paymentMethod: {
      type: String,
      enum: ['cash', 'mfs_bkash', 'mfs_nagad', 'bank_card'],
      required: true
    },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    referenceTxnId: { type: String, trim: true },
    allocatedInvoices: [
      {
        saleId: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
        invoiceNo: { type: String, required: true },
        amountAllocated: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter }
      }
    ],
    previousDue: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    remainingDue: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    notes: { type: String },
    collectedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

MoneyReceiptSchema.index({ shopId: 1, receiptNo: 1 }, { unique: true });
MoneyReceiptSchema.index({ shopId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
MoneyReceiptSchema.index({ shopId: 1, customerId: 1, createdAt: -1 });
MoneyReceiptSchema.index({ shopId: 1, kistiContractId: 1, createdAt: -1 });

export const MoneyReceipt = mongoose.model<IMoneyReceipt>('MoneyReceipt', MoneyReceiptSchema);
