import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDevice extends Document {
  userId: mongoose.Types.ObjectId;
  shopId?: mongoose.Types.ObjectId;
  deviceId?: string;
  deviceFingerprint: string;
  deviceName?: string;
  pinHash?: string;
  userAgent?: string;
  ipAddress?: string;
  isTrusted: boolean;
  isRevoked: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserDeviceSchema = new Schema<IUserDevice>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop' },
    deviceId: { type: String, trim: true },
    deviceFingerprint: { type: String, required: true },
    deviceName: { type: String },
    pinHash: { type: String },
    userAgent: { type: String },
    ipAddress: { type: String },
    isTrusted: { type: Boolean, default: false },
    isRevoked: { type: Boolean, default: false },
    lastActiveAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

UserDeviceSchema.index({ userId: 1, deviceFingerprint: 1 }, { unique: true });

export const UserDevice = mongoose.model<IUserDevice>('UserDevice', UserDeviceSchema);
