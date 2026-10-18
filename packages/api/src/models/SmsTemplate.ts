import mongoose, { Schema, Document } from 'mongoose';

export interface ISmsTemplate extends Document {
  shopId: mongoose.Types.ObjectId;
  tag: string;
  templateBody: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SmsTemplateSchema = new Schema<ISmsTemplate>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    tag: { type: String, required: true },
    templateBody: { type: String, required: true },
    isEnabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

SmsTemplateSchema.index({ shopId: 1, tag: 1 }, { unique: true });

export const SmsTemplate = mongoose.model<ISmsTemplate>('SmsTemplate', SmsTemplateSchema);
