import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IPurchaseOrder extends Document {
  shopId: mongoose.Types.ObjectId;
  poNo: string;
  supplierId: mongoose.Types.ObjectId;
  totalEstimatedAmount: mongoose.Types.Decimal128;
  status:
    | 'draft'
    | 'ordered'
    | 'partially_received'
    | 'completed'
    | 'cancelled'
    | 'PARTIALLY_FULFILLED'
    | 'FULFILLED';
  expectedDeliveryDate?: Date;
  items: Array<{
    variantId: mongoose.Types.ObjectId;
    orderedQuantity: number;
    receivedQuantity: number;
    estimatedCost: mongoose.Types.Decimal128;
  }>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    poNo: { type: String, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    totalEstimatedAmount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    status: {
      type: String,
      enum: [
        'draft',
        'ordered',
        'partially_received',
        'completed',
        'cancelled',
        'PARTIALLY_FULFILLED',
        'FULFILLED'
      ],
      default: 'ordered'
    },
    expectedDeliveryDate: { type: Date },
    items: [
      {
        variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
        orderedQuantity: { type: Number, required: true, min: 1 },
        receivedQuantity: { type: Number, default: 0 },
        estimatedCost: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter }
      }
    ],
    notes: { type: String }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

PurchaseOrderSchema.index({ shopId: 1, poNo: 1 }, { unique: true });
PurchaseOrderSchema.index({ shopId: 1, supplierId: 1 });
PurchaseOrderSchema.index({ shopId: 1, status: 1 });

export const PurchaseOrder = mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
