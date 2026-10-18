import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface ISupplier extends Document {
  shopId: mongoose.Types.ObjectId;
  companyName: string;
  name?: string;
  contactPerson?: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  status: 'active' | 'inactive';
  openingPayable: mongoose.Types.Decimal128;
  currentDueBalance: mongoose.Types.Decimal128;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    alternatePhone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    openingPayable: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    currentDueBalance: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true, toJSON: { getters: true, virtuals: true }, toObject: { getters: true, virtuals: true } }
);

SupplierSchema.virtual('name')
  .get(function () {
    return this.companyName;
  })
  .set(function (val: string) {
    this.companyName = val;
  });

SupplierSchema.index(
  { shopId: 1, phone: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
SupplierSchema.index({ shopId: 1, isDeleted: 1 });
SupplierSchema.index({ shopId: 1, status: 1 });

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);
