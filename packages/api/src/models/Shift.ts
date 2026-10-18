import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IShift extends Document {
  shopId: mongoose.Types.ObjectId;
  cashierUserId: mongoose.Types.ObjectId;
  openingCash: mongoose.Types.Decimal128;
  closingCashExpected?: mongoose.Types.Decimal128;
  closingCashActual?: mongoose.Types.Decimal128;
  cashDiscrepancy?: mongoose.Types.Decimal128;
  recountCount: number;
  status: 'open' | 'closed';
  openedAt: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftSchema = new Schema<IShift>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    cashierUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    openingCash: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    closingCashExpected: { type: Schema.Types.Decimal128, set: decimal128Setter, get: decimal128Getter },
    closingCashActual: { type: Schema.Types.Decimal128, set: decimal128Setter, get: decimal128Getter },
    cashDiscrepancy: { type: Schema.Types.Decimal128, set: decimal128Setter, get: decimal128Getter },
    recountCount: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

ShiftSchema.index({ shopId: 1, cashierUserId: 1, status: 1 });

export const Shift = mongoose.model<IShift>('Shift', ShiftSchema);
