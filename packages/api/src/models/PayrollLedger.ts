import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IPayrollLedger extends Document {
  shopId: mongoose.Types.ObjectId;
  payrollNo: string;
  employeeUserId: mongoose.Types.ObjectId;
  monthYear: string;
  baseSalary: mongoose.Types.Decimal128;
  repairCommission: mongoose.Types.Decimal128;
  salesBonus: mongoose.Types.Decimal128;
  deductions: mongoose.Types.Decimal128;
  netPayable: mongoose.Types.Decimal128;
  paymentStatus: 'pending' | 'disbursed';
  disbursedDate?: Date;
  paymentMethod?: 'bank_transfer' | 'cash';
  createdAt: Date;
  updatedAt: Date;
}

const PayrollLedgerSchema = new Schema<IPayrollLedger>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    payrollNo: { type: String, required: true },
    employeeUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    monthYear: { type: String, required: true },
    baseSalary: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    repairCommission: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    salesBonus: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    deductions: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    netPayable: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    paymentStatus: { type: String, enum: ['pending', 'disbursed'], default: 'pending' },
    disbursedDate: { type: Date },
    paymentMethod: { type: String, enum: ['bank_transfer', 'cash'] }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

PayrollLedgerSchema.index({ shopId: 1, payrollNo: 1 }, { unique: true });
PayrollLedgerSchema.index({ shopId: 1, employeeUserId: 1, monthYear: 1 });

export const PayrollLedger = mongoose.model<IPayrollLedger>('PayrollLedger', PayrollLedgerSchema);
