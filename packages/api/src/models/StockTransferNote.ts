import mongoose, { Schema, Document } from 'mongoose';

export interface IStockTransferNote extends Document {
  stnNo: string;
  fromShopId: mongoose.Types.ObjectId;
  toShopId: mongoose.Types.ObjectId;
  items: Array<{
    variantId: mongoose.Types.ObjectId;
    imeiId?: mongoose.Types.ObjectId;
    imei1?: string;
    quantity: number;
  }>;
  status: 'pending' | 'in_transit' | 'received' | 'rejected' | 'discrepancy' | 'completed';
  dispatchedByUserId: mongoose.Types.ObjectId;
  receivedByUserId?: mongoose.Types.ObjectId;
  discrepancies?: Array<{
    imei1: string;
    imeiId?: mongoose.Types.ObjectId;
    reason?: string;
  }>;
  notes?: string;
  smsNotificationSent?: boolean;
  smsMessageId?: string;
  receivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StockTransferNoteSchema = new Schema<IStockTransferNote>(
  {
    stnNo: { type: String, required: true },
    fromShopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    toShopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    items: [
      {
        variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
        imeiId: { type: Schema.Types.ObjectId, ref: 'ImeiSerial' },
        imei1: { type: String, trim: true },
        quantity: { type: Number, required: true, min: 1 }
      }
    ],
    status: {
      type: String,
      enum: ['pending', 'in_transit', 'received', 'rejected', 'discrepancy', 'completed'],
      default: 'in_transit'
    },
    dispatchedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receivedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    discrepancies: [
      {
        imei1: { type: String, required: true },
        imeiId: { type: Schema.Types.ObjectId, ref: 'ImeiSerial' },
        reason: { type: String }
      }
    ],
    notes: { type: String },
    smsNotificationSent: { type: Boolean, default: false },
    smsMessageId: { type: String },
    receivedAt: { type: Date }
  },
  { timestamps: true }
);

StockTransferNoteSchema.index({ fromShopId: 1, stnNo: 1 });
StockTransferNoteSchema.index({ toShopId: 1, stnNo: 1 });
StockTransferNoteSchema.index({ fromShopId: 1, status: 1 });
StockTransferNoteSchema.index({ toShopId: 1, status: 1 });

export const StockTransferNote = mongoose.model<IStockTransferNote>('StockTransferNote', StockTransferNoteSchema);
