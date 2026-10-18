import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  shopId: mongoose.Types.ObjectId;
  name: string;
  categoryId: mongoose.Types.ObjectId;
  brandId: mongoose.Types.ObjectId;
  modelNumber?: string;
  productType: 'handset' | 'accessory' | 'spare_part';
  hasImei: boolean;
  warrantyMonths: number;
  hasVariants: boolean;
  description?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true },
    modelNumber: { type: String, trim: true },
    productType: { type: String, enum: ['handset', 'accessory', 'spare_part'], default: 'handset' },
    hasImei: { type: Boolean, default: true },
    warrantyMonths: { type: Number, default: 0 },
    hasVariants: { type: Boolean, default: true },
    description: { type: String },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

ProductSchema.index({ shopId: 1, productType: 1 });
ProductSchema.index({ shopId: 1, categoryId: 1 });
ProductSchema.index({ shopId: 1, brandId: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
