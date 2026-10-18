import mongoose, { Schema, Document } from 'mongoose';

export interface ISmsLog extends Document {
  shopId: mongoose.Types.ObjectId;
  recipientPhone: string;
  messageContent: string;
  templateType: 'otp' | 'sale_invoice' | 'repair_ready' | 'due_reminder' | 'marketing';
  status: 'sent' | 'delivered' | 'failed';
  gatewayResponseId?: string;
  createdAt: Date;
}

const SmsLogSchema = new Schema<ISmsLog>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    recipientPhone: { type: String, required: true },
    messageContent: { type: String, required: true },
    templateType: {
      type: String,
      enum: ['otp', 'sale_invoice', 'repair_ready', 'due_reminder', 'marketing'],
      required: true
    },
    status: { type: String, enum: ['sent', 'delivered', 'failed'], default: 'sent' },
    gatewayResponseId: { type: String }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SmsLogSchema.index({ shopId: 1, recipientPhone: 1, createdAt: -1 });

export const SmsLog = mongoose.model<ISmsLog>('SmsLog', SmsLogSchema);
