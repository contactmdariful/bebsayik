import mongoose, { Schema, Document } from 'mongoose';

export interface IShiftDenomination extends Document {
  shopId: mongoose.Types.ObjectId;
  shiftId: mongoose.Types.ObjectId;
  note1000: number;
  note500: number;
  note200: number;
  note100: number;
  note50: number;
  note20: number;
  note10: number;
  coins: number;
  totalComputedCash: string;
  createdAt: Date;
}

const ShiftDenominationSchema = new Schema<IShiftDenomination>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    shiftId: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
    note1000: { type: Number, default: 0 },
    note500: { type: Number, default: 0 },
    note200: { type: Number, default: 0 },
    note100: { type: Number, default: 0 },
    note50: { type: Number, default: 0 },
    note20: { type: Number, default: 0 },
    note10: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    totalComputedCash: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ShiftDenominationSchema.index({ shopId: 1, shiftId: 1 }, { unique: true });

export const ShiftDenomination = mongoose.model<IShiftDenomination>('ShiftDenomination', ShiftDenominationSchema);
