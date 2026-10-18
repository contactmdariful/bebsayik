import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface ISubscriptionInvoice extends Document {
  invoiceNo: string;
  shopId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  planCode?: string;
  amount: mongoose.Types.Decimal128;
  originalAmount?: mongoose.Types.Decimal128;
  discountAmount?: mongoose.Types.Decimal128;
  promoCode?: string;
  billingCycle: 'monthly' | 'yearly';
  paymentGateway: 'paystation' | 'eps' | 'bkash' | 'manual';
  gatewayTransactionId?: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paidAt?: Date;
  periodStart: Date;
  periodEnd: Date;
  gatewayResponse?: any;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionInvoiceSchema = new Schema<ISubscriptionInvoice>(
  {
    invoiceNo: { type: String, required: true, unique: true },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    planCode: { type: String },
    amount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    originalAmount: { type: Schema.Types.Decimal128, set: decimal128Setter, get: decimal128Getter },
    discountAmount: { type: Schema.Types.Decimal128, set: decimal128Setter, get: decimal128Getter },
    promoCode: { type: String },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], required: true },
    paymentGateway: { type: String, enum: ['paystation', 'eps', 'bkash', 'manual'], required: true },
    gatewayTransactionId: { type: String },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    paidAt: { type: Date },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    gatewayResponse: { type: Schema.Types.Mixed }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

SubscriptionInvoiceSchema.index({ shopId: 1, invoiceNo: 1 });
SubscriptionInvoiceSchema.index({ gatewayTransactionId: 1 }, { sparse: true });

export const SubscriptionInvoice = mongoose.model<ISubscriptionInvoice>(
  'SubscriptionInvoice',
  SubscriptionInvoiceSchema
);
