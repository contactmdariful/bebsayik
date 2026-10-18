import mongoose, { Schema, Document } from 'mongoose';

export interface IHeldCart extends Document {
  shopId: mongoose.Types.ObjectId;
  cartSlot?: string;
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  note?: string;
  items: Array<{
    variantId: mongoose.Types.ObjectId;
    imeiId?: mongoose.Types.ObjectId;
    imei1?: string;
    quantity: number;
    unitPrice: string;
    discountAmount?: string;
    productName?: string;
  }>;
  heldByUserId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const HeldCartSchema = new Schema<IHeldCart>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    cartSlot: { type: String, default: 'HOLD' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    note: { type: String, trim: true },
    items: [
      {
        variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
        imeiId: { type: Schema.Types.ObjectId, ref: 'ImeiSerial' },
        imei1: { type: String, trim: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: String, required: true },
        discountAmount: { type: String, default: '0.00' },
        productName: { type: String }
      }
    ],
    heldByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

HeldCartSchema.index({ shopId: 1, createdAt: -1 });
HeldCartSchema.index({ shopId: 1, heldByUserId: 1 });

export const HeldCart = mongoose.model<IHeldCart>('HeldCart', HeldCartSchema);
