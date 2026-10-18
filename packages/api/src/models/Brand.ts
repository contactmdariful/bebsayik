import mongoose, { Schema, Document } from 'mongoose';

export interface IBrand extends Document {
  shopId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  logoUrl?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    logoUrl: { type: String },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

BrandSchema.index({ shopId: 1, slug: 1 }, { unique: true });
BrandSchema.index({ shopId: 1, isDeleted: 1 });

export const Brand = mongoose.model<IBrand>('Brand', BrandSchema);
