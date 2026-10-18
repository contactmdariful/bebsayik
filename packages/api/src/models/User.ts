import mongoose, { Schema, Document } from 'mongoose';
import { USER_ROLES, UserRole } from '@bebsayik/shared-types';

export interface IUser extends Document {
  phone: string;
  fullName: string;
  email?: string | undefined;
  passwordHash?: string | undefined;
  managerPinHash?: string | undefined;
  role: UserRole;
  shopId?: mongoose.Types.ObjectId | undefined;
  accessibleShopIds: mongoose.Types.ObjectId[];
  tokenVersion: number;
  failedLoginAttempts: number;
  lockedUntil?: Date | null | undefined;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    passwordHash: { type: String },
    managerPinHash: { type: String },
    role: { type: String, enum: USER_ROLES, required: true },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop' },
    accessibleShopIds: [{ type: Schema.Types.ObjectId, ref: 'Shop' }],
    tokenVersion: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

UserSchema.index({ shopId: 1, role: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
