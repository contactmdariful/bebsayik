import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IBuybackAgreement extends Document {
  shopId: mongoose.Types.ObjectId;
  agreementNo: string;
  sellerFullName: string;
  sellerPhone: string;
  sellerNid: string;
  sellerPhotoUrl?: string;
  deviceImei1: string;
  deviceBrandModel: string;
  offeredAmount: mongoose.Types.Decimal128;
  paymentMethod: 'cash' | 'trade_in_credit';
  policeUndertakingAccepted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BuybackAgreementSchema = new Schema<IBuybackAgreement>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    agreementNo: { type: String, required: true },
    sellerFullName: { type: String, required: true },
    sellerPhone: { type: String, required: true },
    sellerNid: { type: String, required: true },
    sellerPhotoUrl: { type: String },
    deviceImei1: { type: String, required: true },
    deviceBrandModel: { type: String, required: true },
    offeredAmount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    paymentMethod: { type: String, enum: ['cash', 'trade_in_credit'], default: 'cash' },
    policeUndertakingAccepted: { type: Boolean, required: true }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

BuybackAgreementSchema.index({ shopId: 1, agreementNo: 1 }, { unique: true });
BuybackAgreementSchema.index({ shopId: 1, deviceImei1: 1 });

export const BuybackAgreement = mongoose.model<IBuybackAgreement>('BuybackAgreement', BuybackAgreementSchema);
