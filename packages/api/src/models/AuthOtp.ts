import mongoose, { Schema, Document } from 'mongoose';

export interface IAuthOtp extends Document {
  phone: string;
  otpHash: string;
  purpose: 'login' | 'registration' | 'password_reset' | 'phone_change' | 'action_verify';
  attempts: number;
  consumed: boolean;
  createdAt: Date;
}

const AuthOtpSchema = new Schema<IAuthOtp>(
  {
    phone: { type: String, required: true },
    otpHash: { type: String, required: true },
    purpose: {
      type: String,
      enum: ['login', 'registration', 'password_reset', 'phone_change', 'action_verify'],
      required: true
    },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 120 }
  }
);

AuthOtpSchema.index({ phone: 1, purpose: 1, consumed: 1 });

export const AuthOtp = mongoose.model<IAuthOtp>('AuthOtp', AuthOtpSchema);
