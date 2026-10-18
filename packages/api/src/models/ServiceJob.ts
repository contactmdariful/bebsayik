import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IServiceJob extends Document {
  shopId: mongoose.Types.ObjectId;
  jobNo: string;
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  deviceModel: string;
  imeiOrSerial?: string;
  patternLockCoords?: string;
  reportedFault: string;
  technicianUserId?: mongoose.Types.ObjectId;
  laborCharge: mongoose.Types.Decimal128;
  partsCharge: mongoose.Types.Decimal128;
  totalBill: mongoose.Types.Decimal128;
  technicianShare: mongoose.Types.Decimal128;
  storeShare: mongoose.Types.Decimal128;
  status: 'received' | 'diagnosing' | 'waiting_for_parts' | 'completed' | 'delivered' | 'cancelled';
  receivedAt: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceJobSchema = new Schema<IServiceJob>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    jobNo: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    deviceModel: { type: String, required: true },
    imeiOrSerial: { type: String },
    patternLockCoords: { type: String },
    reportedFault: { type: String, required: true },
    technicianUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    laborCharge: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    partsCharge: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    totalBill: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    technicianShare: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    storeShare: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    status: {
      type: String,
      enum: ['received', 'diagnosing', 'waiting_for_parts', 'completed', 'delivered', 'cancelled'],
      default: 'received'
    },
    receivedAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

ServiceJobSchema.index({ shopId: 1, jobNo: 1 }, { unique: true });
ServiceJobSchema.index({ shopId: 1, technicianUserId: 1 });

export const ServiceJob = mongoose.model<IServiceJob>('ServiceJob', ServiceJobSchema);
