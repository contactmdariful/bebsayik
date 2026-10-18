import mongoose, { Schema, Document } from 'mongoose';
import { decimal128Getter, decimal128Setter } from '../utils/money.js';

export interface IPersonalLedgerTransaction extends Document {
  shopId: mongoose.Types.ObjectId;
  contactId: mongoose.Types.ObjectId;
  type: 'amanat_received' | 'amanat_returned' | 'hawlat_given' | 'hawlat_collected' | 'expense_on_behalf';
  amount: mongoose.Types.Decimal128;
  notes?: string;
  recordedByUserId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PersonalLedgerTransactionSchema = new Schema<IPersonalLedgerTransaction>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'PersonalLedgerContact', required: true },
    type: {
      type: String,
      enum: ['amanat_received', 'amanat_returned', 'hawlat_given', 'hawlat_collected', 'expense_on_behalf'],
      required: true
    },
    amount: { type: Schema.Types.Decimal128, required: true, set: decimal128Setter, get: decimal128Getter },
    notes: { type: String },
    recordedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { getters: true }, toObject: { getters: true } }
);

PersonalLedgerTransactionSchema.index({ shopId: 1, contactId: 1, createdAt: -1 });

export const PersonalLedgerTransaction = mongoose.model<IPersonalLedgerTransaction>(
  'PersonalLedgerTransaction',
  PersonalLedgerTransactionSchema
);
