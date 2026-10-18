import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  shopId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    description: { type: String },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

CategorySchema.index({ shopId: 1, slug: 1 }, { unique: true });
CategorySchema.index({ shopId: 1, isDeleted: 1 });

export const Category = mongoose.model<ICategory>('Category', CategorySchema);
