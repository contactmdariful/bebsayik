import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryMovement extends Document {
  shopId: mongoose.Types.ObjectId;
  variantId: mongoose.Types.ObjectId;
  imeiId?: mongoose.Types.ObjectId;
  movementType: 'in_purchase' | 'out_sale' | 'in_customer_return' | 'out_supplier_return' | 'out_scrap' | 'transfer' | 'adjustment';
  quantityDelta: number;
  referenceDocType: 'GRN' | 'INV' | 'CRV' | 'PRV' | 'SWV' | 'STN' | 'ADJ';
  referenceDocId: mongoose.Types.ObjectId;
  performedByUserId: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    imeiId: { type: Schema.Types.ObjectId, ref: 'ImeiSerial' },
    movementType: {
      type: String,
      enum: ['in_purchase', 'out_sale', 'in_customer_return', 'out_supplier_return', 'out_scrap', 'transfer', 'adjustment'],
      required: true
    },
    quantityDelta: { type: Number, required: true },
    referenceDocType: {
      type: String,
      enum: ['GRN', 'INV', 'CRV', 'PRV', 'SWV', 'STN', 'ADJ'],
      required: true
    },
    referenceDocId: { type: Schema.Types.ObjectId, required: true },
    performedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

InventoryMovementSchema.index({ shopId: 1, variantId: 1, createdAt: -1 });

export const InventoryMovement = mongoose.model<IInventoryMovement>('InventoryMovement', InventoryMovementSchema);
