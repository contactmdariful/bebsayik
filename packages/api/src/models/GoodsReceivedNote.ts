import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IGoodsReceivedNote extends Document {
  shopId: mongoose.Types.ObjectId;
  grnNo: string;
  poId?: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  items: Array<{
    variantId: mongoose.Types.ObjectId;
    quantity: number;
    unitCost: mongoose.Types.Decimal128;
    imeiPairs?: Array<{ imei1: string; imei2?: string }>;
  }>;
  totalInvoiceAmount: mongoose.Types.Decimal128;
  paidAmount: mongoose.Types.Decimal128;
  dueAmount: mongoose.Types.Decimal128;
  transactionReference?: string;
  receivedByUserId: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GoodsReceivedNoteSchema = new Schema<IGoodsReceivedNote>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    grnNo: { type: String, required: true },
    poId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items: [
      {
        variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitCost: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
        imeiPairs: [
          {
            imei1: { type: String, required: true, trim: true },
            imei2: { type: String, trim: true }
          }
        ]
      }
    ],
    totalInvoiceAmount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    paidAmount: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    dueAmount: { type: Schema.Types.Decimal128, default: 0, set: decimal128Setter, get: decimal128Getter },
    transactionReference: { type: String },
    receivedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

GoodsReceivedNoteSchema.index({ shopId: 1, grnNo: 1 }, { unique: true });
GoodsReceivedNoteSchema.index({ shopId: 1, supplierId: 1 });
GoodsReceivedNoteSchema.index({ shopId: 1, poId: 1 });

export const GoodsReceivedNote = mongoose.model<IGoodsReceivedNote>('GoodsReceivedNote', GoodsReceivedNoteSchema);
