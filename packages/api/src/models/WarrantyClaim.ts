import mongoose, { Schema, Document } from 'mongoose';

export interface IWarrantyClaim extends Document {
  shopId: mongoose.Types.ObjectId;
  claimNo: string;
  imeiId?: mongoose.Types.ObjectId;
  variantId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  brandRmaNo?: string;
  issueDescription: string;
  status: 'received_from_customer' | 'sent_to_brand_care' | 'repaired' | 'replaced' | 'returned_to_customer';
  receivedAt: Date;
  returnedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WarrantyClaimSchema = new Schema<IWarrantyClaim>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    claimNo: { type: String, required: true },
    imeiId: { type: Schema.Types.ObjectId, ref: 'ImeiSerial' },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    brandRmaNo: { type: String },
    issueDescription: { type: String, required: true },
    status: {
      type: String,
      enum: ['received_from_customer', 'sent_to_brand_care', 'repaired', 'replaced', 'returned_to_customer'],
      default: 'received_from_customer'
    },
    receivedAt: { type: Date, default: Date.now },
    returnedAt: { type: Date }
  },
  { timestamps: true }
);

WarrantyClaimSchema.index({ shopId: 1, claimNo: 1 }, { unique: true });

export const WarrantyClaim = mongoose.model<IWarrantyClaim>('WarrantyClaim', WarrantyClaimSchema);
