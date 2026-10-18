import mongoose, { Schema, Document } from 'mongoose';

export interface IShopHardwareConfig extends Document {
  shopId: mongoose.Types.ObjectId;
  counterId: string;
  terminalName?: string;
  stationFingerprint?: string;
  printerPaperWidth: '58mm' | '80mm';
  paperWidthMm: number;
  printerConnectionType: 'webusb' | 'bluetooth' | 'network' | 'raw_bt';
  printerAddress?: string;
  drawerKickCode?: string;
  drawerKickPulseHex?: string;
  kickDrawerOnSale: boolean;
  printDirectViaWebUsb: boolean;
  scannerWedgeSuffix: 'ENTER' | 'TAB';
  createdAt: Date;
  updatedAt: Date;
}

const ShopHardwareConfigSchema = new Schema<IShopHardwareConfig>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    counterId: { type: String, required: true, default: 'Counter-1' },
    terminalName: { type: String, default: 'Counter 1 - Main Station' },
    stationFingerprint: { type: String },
    printerPaperWidth: { type: String, enum: ['58mm', '80mm'], default: '80mm' },
    paperWidthMm: { type: Number, enum: [58, 80], default: 80 },
    printerConnectionType: { type: String, enum: ['webusb', 'bluetooth', 'network', 'raw_bt'], default: 'webusb' },
    printerAddress: { type: String },
    drawerKickCode: { type: String, default: '27,112,0,25,250' },
    drawerKickPulseHex: { type: String, default: '1B 70 00 19 FA' },
    kickDrawerOnSale: { type: Boolean, default: true },
    printDirectViaWebUsb: { type: Boolean, default: true },
    scannerWedgeSuffix: { type: String, enum: ['ENTER', 'TAB'], default: 'ENTER' }
  },
  { timestamps: true }
);

ShopHardwareConfigSchema.index({ shopId: 1, counterId: 1 }, { unique: true });
ShopHardwareConfigSchema.index({ shopId: 1, stationFingerprint: 1 });

export const ShopHardwareConfig = mongoose.model<IShopHardwareConfig>(
  'ShopHardwareConfig',
  ShopHardwareConfigSchema
);
