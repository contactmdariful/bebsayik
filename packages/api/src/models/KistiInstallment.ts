import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IKistiInstallment extends Document {
  shopId: mongoose.Types.ObjectId;
  contractId: mongoose.Types.ObjectId;
  installmentNumber: number;
  dueDate: Date;
  installmentAmount: mongoose.Types.Decimal128;
  paidAmount: mongoose.Types.Decimal128;
  paidDate?: Date;
  status: 'pending' | 'paid' | 'overdue';
  paymentReceiptNo?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KistiInstallmentSchema = new Schema<IKistiInstallment>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    contractId: { type: Schema.Types.ObjectId, ref: 'KistiContract', required: true },
    installmentNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    installmentAmount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    paidAmount: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    paidDate: { type: Date },
    status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
    paymentReceiptNo: { type: String },
    notes: { type: String }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

KistiInstallmentSchema.index({ shopId: 1, contractId: 1, installmentNumber: 1 });
KistiInstallmentSchema.index({ shopId: 1, dueDate: 1, status: 1 });

export const KistiInstallment = mongoose.model<IKistiInstallment>('KistiInstallment', KistiInstallmentSchema);
