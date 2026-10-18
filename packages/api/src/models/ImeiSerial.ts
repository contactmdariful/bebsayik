import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export type ImeiLifecycleState =
  | 'AVAILABLE'
  | 'HELD_CART'
  | 'SOLD'
  | 'RETURNED_INSPECTION'
  | 'RETURNED_TO_SUPPLIER'
  | 'SCRAPPED'
  | 'IN_TRANSIT'
  | 'DISPUTED_IN_TRANSIT'
  | 'available'
  | 'held_cart'
  | 'sold'
  | 'returned_inspection'
  | 'returned_to_supplier'
  | 'scrapped'
  | 'in_transit'
  | 'disputed_in_transit';

export interface IImeiSerial extends Document {
  shopId: mongoose.Types.ObjectId;
  variantId: mongoose.Types.ObjectId;
  imei1: string;
  imei2?: string;
  serialNumber?: string;
  purchaseCost: mongoose.Types.Decimal128;
  specificCost?: mongoose.Types.Decimal128;
  sellingPrice?: mongoose.Types.Decimal128;
  source: 'purchase' | 'buyback' | 'trade_in';
  status: ImeiLifecycleState;
  stockLocation: string;
  purchaseDate: Date;
  intakeDate: Date;
  grnId?: mongoose.Types.ObjectId;
  saleId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ImeiSerialSchema = new Schema<IImeiSerial>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    imei1: { type: String, required: true, trim: true },
    imei2: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    purchaseCost: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    sellingPrice: { type: Schema.Types.Decimal128, set: decimal128Setter, get: decimal128Getter },
    source: { type: String, enum: ['purchase', 'buyback', 'trade_in'], default: 'purchase' },
    status: {
      type: String,
      enum: [
        'AVAILABLE',
        'HELD_CART',
        'SOLD',
        'RETURNED_INSPECTION',
        'RETURNED_TO_SUPPLIER',
        'SCRAPPED',
        'IN_TRANSIT',
        'DISPUTED_IN_TRANSIT',
        'available',
        'held_cart',
        'sold',
        'returned_inspection',
        'returned_to_supplier',
        'scrapped',
        'in_transit',
        'disputed_in_transit'
      ],
      default: 'AVAILABLE'
    },
    stockLocation: { type: String, default: 'main_outlet' },
    purchaseDate: { type: Date, default: Date.now },
    intakeDate: { type: Date, default: Date.now },
    grnId: { type: Schema.Types.ObjectId, ref: 'GoodsReceivedNote' },
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale' }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

ImeiSerialSchema.virtual('specificCost').get(function () {
  return this.purchaseCost;
});

ImeiSerialSchema.index(
  { shopId: 1, imei1: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['AVAILABLE', 'available', 'HELD_CART', 'held_cart'] }
    }
  }
);
ImeiSerialSchema.index({ shopId: 1, imei2: 1 });
ImeiSerialSchema.index({ shopId: 1, variantId: 1, status: 1 });
ImeiSerialSchema.index({ shopId: 1, status: 1, purchaseDate: 1 });
ImeiSerialSchema.index({ shopId: 1, status: 1, createdAt: 1 });

export const ImeiSerial = mongoose.model<IImeiSerial>('ImeiSerial', ImeiSerialSchema);
