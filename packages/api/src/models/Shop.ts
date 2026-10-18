import mongoose, { Schema, Document } from 'mongoose';

export interface IShop extends Document {
  name: string;
  slug: string;
  subdomain?: string;
  businessType: 'single_store' | 'multi_branch';
  binNumber?: string;
  logoUrl?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  returnPolicyDays: number;
  currency: string;
  phone?: string;
  address?: any;
  status: 'trial' | 'active' | 'grace_period' | 'read_only' | 'suspended';
  ownerUserId?: mongoose.Types.ObjectId;
  subscriptionPlanId?: mongoose.Types.ObjectId;
  subscriptionExpiresAt?: Date;
  trialEndsAt?: Date;
  gracePeriodEndsAt?: Date;
  previousStatus?: string;
  suspensionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShopSchema = new Schema<IShop>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    subdomain: { type: String, lowercase: true, trim: true },
    businessType: { type: String, enum: ['single_store', 'multi_branch'], default: 'single_store' },
    binNumber: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    receiptHeader: { type: String, trim: true },
    receiptFooter: { type: String, trim: true },
    returnPolicyDays: { type: Number, default: 7 },
    currency: { type: String, default: 'BDT' },
    phone: { type: String, trim: true },
    address: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['trial', 'active', 'grace_period', 'read_only', 'suspended'],
      default: 'active'
    },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    subscriptionPlanId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    subscriptionExpiresAt: { type: Date },
    trialEndsAt: { type: Date },
    gracePeriodEndsAt: { type: Date },
    previousStatus: { type: String },
    suspensionReason: { type: String }
  },
  { timestamps: true }
);

ShopSchema.index({ status: 1 });
ShopSchema.index({ ownerUserId: 1 });

export const Shop = mongoose.model<IShop>('Shop', ShopSchema);
