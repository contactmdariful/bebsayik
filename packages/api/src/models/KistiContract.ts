import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IKistiContract extends Document {
  shopId: mongoose.Types.ObjectId;
  contractNo: string;
  idempotencyKey?: string;
  customerId: mongoose.Types.ObjectId;
  saleId: mongoose.Types.ObjectId;
  imei1?: string;
  productName?: string;
  principalAmount: mongoose.Types.Decimal128;
  interestFeeAmount: mongoose.Types.Decimal128;
  downPaymentAmount: mongoose.Types.Decimal128;
  totalPayableAmount: mongoose.Types.Decimal128;
  remainingDueAmount: mongoose.Types.Decimal128;
  installmentPeriodMonths: number;
  guarantor1: {
    fullName: string;
    phone: string;
    nid: string;
    relation: string;
  };
  guarantor2?: {
    fullName: string;
    phone: string;
    nid: string;
    relation: string;
  };
  status: 'active' | 'defaulted' | 'settled';
  notes?: string;
  createdByUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const KistiContractSchema = new Schema<IKistiContract>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    contractNo: { type: String, required: true },
    idempotencyKey: { type: String, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
    imei1: { type: String, trim: true },
    productName: { type: String, trim: true },
    principalAmount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    interestFeeAmount: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    downPaymentAmount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    totalPayableAmount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    remainingDueAmount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    installmentPeriodMonths: { type: Number, required: true },
    guarantor1: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      nid: { type: String, required: true },
      relation: { type: String, required: true }
    },
    guarantor2: {
      fullName: { type: String },
      phone: { type: String },
      nid: { type: String },
      relation: { type: String }
    },
    status: { type: String, enum: ['active', 'defaulted', 'settled'], default: 'active' },
    notes: { type: String },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

KistiContractSchema.index({ shopId: 1, contractNo: 1 }, { unique: true });
KistiContractSchema.index({ shopId: 1, customerId: 1 });
KistiContractSchema.index({ shopId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
KistiContractSchema.index({ shopId: 1, status: 1 });
KistiContractSchema.index({ shopId: 1, createdAt: -1 });

export const KistiContract = mongoose.model<IKistiContract>('KistiContract', KistiContractSchema);
