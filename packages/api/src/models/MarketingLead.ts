import mongoose, { Schema, Document } from 'mongoose';

export interface IMarketingLead extends Document {
  phone: string;
  shopName?: string;
  contactName?: string;
  leadSource: string;
  status: 'new' | 'contacted' | 'converted' | 'dropped';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MarketingLeadSchema = new Schema<IMarketingLead>(
  {
    phone: { type: String, required: true, trim: true },
    shopName: { type: String, trim: true },
    contactName: { type: String, trim: true },
    leadSource: { type: String, default: 'landing_page' },
    status: { type: String, enum: ['new', 'contacted', 'converted', 'dropped'], default: 'new' },
    notes: { type: String }
  },
  { timestamps: true }
);

MarketingLeadSchema.index({ phone: 1 }, { unique: true });

export const MarketingLead = mongoose.model<IMarketingLead>('MarketingLead', MarketingLeadSchema);
