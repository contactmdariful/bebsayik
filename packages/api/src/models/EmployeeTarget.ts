import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IEmployeeTarget extends Document {
  shopId: mongoose.Types.ObjectId;
  employeeUserId: mongoose.Types.ObjectId;
  monthYear: string;
  salesRevenueTarget: mongoose.Types.Decimal128;
  handsetUnitTarget: number;
  achievedRevenue: mongoose.Types.Decimal128;
  achievedHandsetUnits: number;
  commissionBonusAmount: mongoose.Types.Decimal128;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeTargetSchema = new Schema<IEmployeeTarget>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    employeeUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    monthYear: { type: String, required: true },
    salesRevenueTarget: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    handsetUnitTarget: { type: Number, required: true },
    achievedRevenue: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    achievedHandsetUnits: { type: Number, default: 0 },
    commissionBonusAmount: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

EmployeeTargetSchema.index({ shopId: 1, employeeUserId: 1, monthYear: 1 }, { unique: true });

export const EmployeeTarget = mongoose.model<IEmployeeTarget>('EmployeeTarget', EmployeeTargetSchema);
