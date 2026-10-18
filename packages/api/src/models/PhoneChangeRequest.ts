import mongoose, { Schema, Document } from 'mongoose';

export interface IPhoneChangeRequest extends Document {
  shopId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  oldPhone: string;
  newPhone: string;
  oldPhoneOtpHash: string;
  newPhoneOtpHash: string;
  oldPhoneVerified: boolean;
  newPhoneVerified: boolean;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  createdAt: Date;
}

const PhoneChangeRequestSchema = new Schema<IPhoneChangeRequest>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    oldPhone: { type: String, required: true },
    newPhone: { type: String, required: true },
    oldPhoneOtpHash: { type: String, required: true },
    newPhoneOtpHash: { type: String, required: true },
    oldPhoneVerified: { type: Boolean, default: false },
    newPhoneVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'completed', 'expired', 'cancelled'],
      default: 'pending'
    },
    createdAt: { type: Date, default: Date.now, expires: 180 }
  }
);

PhoneChangeRequestSchema.index({ userId: 1 });
PhoneChangeRequestSchema.index(
  { shopId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export const PhoneChangeRequest = mongoose.model<IPhoneChangeRequest>(
  'PhoneChangeRequest',
  PhoneChangeRequestSchema
);
