import mongoose from 'mongoose';
import { ShopHardwareConfig, IShopHardwareConfig } from '../../models/index.js';

export interface ReceiptItemData {
  name: string;
  imei?: string | undefined;
  qty: number;
  price: string;
  total: string;
}

export interface ReceiptData {
  shopName: string;
  branch?: string | undefined;
  phone?: string | undefined;
  binNumber?: string | undefined;
  invoiceNo: string;
  date: string;
  cashier: string;
  customer: string;
  customerPhone?: string | undefined;
  items: ReceiptItemData[];
  subTotal: string;
  discount: string;
  vat?: string | undefined;
  grandTotal: string;
  paid: string;
  due: string;
  change: string;
  reprintCount?: number | undefined;
  footer?: string | undefined;
}

export interface EscPosPrintPayload {
  format: 'ESC_POS_V1';
  paperWidth: 58 | 80;
  kickDrawer: boolean;
  rawEscPosBase64: string;
  receiptData: ReceiptData;
}

export class HardwareService {
  /**
   * Cash Drawer Kick Pulse (RJ11 Pin 2):
   * ESC p 0 25 250 -> 0x1B 0x70 0x00 0x19 0xFA
   */
  public static readonly DRAWER_KICK_PULSE = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);

  /**
   * ESC/POS Control Codes
   */
  public static readonly CMD_INIT = Buffer.from([0x1b, 0x40]); // ESC @
  public static readonly CMD_ALIGN_LEFT = Buffer.from([0x1b, 0x61, 0x00]);
  public static readonly CMD_ALIGN_CENTER = Buffer.from([0x1b, 0x61, 0x01]);
  public static readonly CMD_ALIGN_RIGHT = Buffer.from([0x1b, 0x61, 0x02]);
  public static readonly CMD_BOLD_ON = Buffer.from([0x1b, 0x45, 0x01]);
  public static readonly CMD_BOLD_OFF = Buffer.from([0x1b, 0x45, 0x00]);
  public static readonly CMD_DOUBLE_SIZE = Buffer.from([0x1d, 0x21, 0x11]);
  public static readonly CMD_NORMAL_SIZE = Buffer.from([0x1d, 0x21, 0x00]);
  public static readonly CMD_FEED_CUT = Buffer.from([0x1d, 0x56, 0x42, 0x02]); // GS V 66 2 (feed 2 lines & partial cut)

  /**
   * Retrieve hardware config for a shop and optional terminal fingerprint
   */
  static async getStationConfig(
    shopId: mongoose.Types.ObjectId | string,
    stationFingerprint?: string
  ): Promise<IShopHardwareConfig> {
    const sId = new mongoose.Types.ObjectId(shopId);

    if (stationFingerprint) {
      const config = await ShopHardwareConfig.findOne({
        shopId: sId,
        $or: [{ stationFingerprint }, { counterId: stationFingerprint }]
      });
      if (config) return config;
    }

    let defaultConfig = await ShopHardwareConfig.findOne({ shopId: sId });
    if (!defaultConfig) {
      defaultConfig = await ShopHardwareConfig.create({
        shopId: sId,
        counterId: stationFingerprint || 'Counter-1',
        terminalName: 'Counter 1 - Main Station',
        stationFingerprint: stationFingerprint || 'default-station',
        printerPaperWidth: '80mm',
        paperWidthMm: 80,
        printerConnectionType: 'webusb',
        kickDrawerOnSale: true,
        printDirectViaWebUsb: true,
        scannerWedgeSuffix: 'ENTER'
      });
    }

    return defaultConfig;
  }

  /**
   * Save / update hardware config for a station
   */
  static async saveStationConfig(
    shopId: mongoose.Types.ObjectId | string,
    data: {
      counterId?: string;
      terminalName?: string;
      stationFingerprint?: string;
      paperWidthMm?: number;
      printerPaperWidth?: '58mm' | '80mm';
      printerConnectionType?: 'webusb' | 'bluetooth' | 'network' | 'raw_bt';
      printerAddress?: string;
      kickDrawerOnSale?: boolean;
      printDirectViaWebUsb?: boolean;
      scannerWedgeSuffix?: 'ENTER' | 'TAB';
    }
  ): Promise<IShopHardwareConfig> {
    const sId = new mongoose.Types.ObjectId(shopId);
    const counterKey = data.counterId || data.stationFingerprint || 'Counter-1';

    const widthMm = data.paperWidthMm || (data.printerPaperWidth === '58mm' ? 58 : 80);
    const widthStr = widthMm === 58 ? '58mm' : '80mm';

    const updated = await ShopHardwareConfig.findOneAndUpdate(
      { shopId: sId, counterId: counterKey },
      {
        $set: {
          shopId: sId,
          counterId: counterKey,
          terminalName: data.terminalName || `Terminal - ${counterKey}`,
          stationFingerprint: data.stationFingerprint || counterKey,
          paperWidthMm: widthMm,
          printerPaperWidth: widthStr,
          printerConnectionType: data.printerConnectionType || 'webusb',
          printerAddress: data.printerAddress,
          kickDrawerOnSale: data.kickDrawerOnSale !== undefined ? data.kickDrawerOnSale : true,
          printDirectViaWebUsb: data.printDirectViaWebUsb !== undefined ? data.printDirectViaWebUsb : true,
          scannerWedgeSuffix: data.scannerWedgeSuffix || 'ENTER',
          drawerKickPulseHex: '1B 70 00 19 FA'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return updated;
  }

  /**
   * Build complete ESC/POS binary buffer and Base64 payload
   */
  static buildEscPosPayload(receiptData: ReceiptData, paperWidthMm: 58 | 80 = 80, kickDrawer = true): EscPosPrintPayload {
    const colWidth = paperWidthMm === 58 ? 32 : 48;
    const buffers: Buffer[] = [];

    // 1. Initialize printer
    buffers.push(this.CMD_INIT);

    // 2. RJ11 Cash drawer kick pulse if requested
    if (kickDrawer) {
      buffers.push(this.DRAWER_KICK_PULSE);
    }

    // 3. Header: Shop Name (Centered, Double size, Bold)
    buffers.push(this.CMD_ALIGN_CENTER);
    buffers.push(this.CMD_BOLD_ON);
    buffers.push(this.CMD_DOUBLE_SIZE);
    buffers.push(Buffer.from(`${receiptData.shopName}\n`, 'ascii'));

    buffers.push(this.CMD_NORMAL_SIZE);
    buffers.push(this.CMD_BOLD_OFF);

    if (receiptData.branch) {
      buffers.push(Buffer.from(`${receiptData.branch}\n`, 'ascii'));
    }
    if (receiptData.phone) {
      buffers.push(Buffer.from(`Phone: ${receiptData.phone}\n`, 'ascii'));
    }
    if (receiptData.binNumber) {
      buffers.push(Buffer.from(`BIN / Mushak: ${receiptData.binNumber}\n`, 'ascii'));
    }

    // 4. Duplicate reprint watermark banner if reprintCount > 0 (TC-47)
    if (receiptData.reprintCount && receiptData.reprintCount > 0) {
      buffers.push(this.CMD_BOLD_ON);
      const reprintBanner = `*** DUPLICATE REPRINT (COPY #${receiptData.reprintCount}) ***\n`;
      buffers.push(Buffer.from(reprintBanner, 'ascii'));
      buffers.push(this.CMD_BOLD_OFF);
    }

    const divider = '='.repeat(colWidth) + '\n';
    const subDivider = '-'.repeat(colWidth) + '\n';

    buffers.push(Buffer.from(divider, 'ascii'));

    // 5. Metadata (Left aligned)
    buffers.push(this.CMD_ALIGN_LEFT);
    buffers.push(Buffer.from(`Invoice: ${receiptData.invoiceNo}\n`, 'ascii'));
    buffers.push(Buffer.from(`Date:    ${receiptData.date}\n`, 'ascii'));
    buffers.push(Buffer.from(`Cashier: ${receiptData.cashier}\n`, 'ascii'));
    buffers.push(Buffer.from(`Customer:${receiptData.customer}${receiptData.customerPhone ? ' (' + receiptData.customerPhone + ')' : ''}\n`, 'ascii'));
    buffers.push(Buffer.from(subDivider, 'ascii'));

    // 6. Items Table
    // Column format 80mm: Item (26), Qty (4), Rate (8), Total (10)
    // Column format 58mm: Item (16), Qty (3), Total (11)
    if (colWidth === 48) {
      const headerLine = 'Item'.padEnd(24) + 'Qty'.padStart(5) + 'Rate'.padStart(9) + 'Total'.padStart(10) + '\n';
      buffers.push(this.CMD_BOLD_ON);
      buffers.push(Buffer.from(headerLine, 'ascii'));
      buffers.push(this.CMD_BOLD_OFF);
      buffers.push(Buffer.from(subDivider, 'ascii'));

      for (const item of receiptData.items) {
        const rawName = item.name || 'Item';
        const namePart = rawName.length > 23 ? rawName.substring(0, 23) : rawName.padEnd(24);
        const qtyPart = String(item.qty).padStart(5);
        const ratePart = item.price.padStart(9);
        const totPart = item.total.padStart(10);
        buffers.push(Buffer.from(`${namePart}${qtyPart}${ratePart}${totPart}\n`, 'ascii'));

        if (item.imei) {
          buffers.push(Buffer.from(`  IMEI: ${item.imei}\n`, 'ascii'));
        }
      }
    } else {
      // 58mm layout
      const headerLine = 'Item'.padEnd(16) + 'Qty'.padStart(4) + 'Total'.padStart(12) + '\n';
      buffers.push(this.CMD_BOLD_ON);
      buffers.push(Buffer.from(headerLine, 'ascii'));
      buffers.push(this.CMD_BOLD_OFF);
      buffers.push(Buffer.from(subDivider, 'ascii'));

      for (const item of receiptData.items) {
        const rawName = item.name || 'Item';
        const namePart = rawName.length > 15 ? rawName.substring(0, 15) : rawName.padEnd(16);
        const qtyPart = String(item.qty).padStart(4);
        const totPart = item.total.padStart(12);
        buffers.push(Buffer.from(`${namePart}${qtyPart}${totPart}\n`, 'ascii'));

        if (item.imei) {
          buffers.push(Buffer.from(` IMEI: ${item.imei}\n`, 'ascii'));
        }
      }
    }

    buffers.push(Buffer.from(divider, 'ascii'));

    // 7. Totals & Settlement
    const formatLine = (label: string, value: string): string => {
      const padLen = colWidth - label.length;
      return label + value.padStart(Math.max(1, padLen)) + '\n';
    };

    buffers.push(Buffer.from(formatLine('Sub Total:', receiptData.subTotal), 'ascii'));
    if (receiptData.discount && Number(receiptData.discount) > 0) {
      buffers.push(Buffer.from(formatLine('Discount:', `-${receiptData.discount}`), 'ascii'));
    }
    if (receiptData.vat && Number(receiptData.vat) > 0) {
      buffers.push(Buffer.from(formatLine('VAT (Mushak 6.3):', receiptData.vat), 'ascii'));
    }

    buffers.push(this.CMD_BOLD_ON);
    buffers.push(Buffer.from(formatLine('GRAND TOTAL:', receiptData.grandTotal), 'ascii'));
    buffers.push(this.CMD_BOLD_OFF);
    buffers.push(Buffer.from(subDivider, 'ascii'));

    buffers.push(Buffer.from(formatLine('Paid Amount:', receiptData.paid), 'ascii'));
    if (Number(receiptData.change) > 0) {
      buffers.push(Buffer.from(formatLine('Change Return:', receiptData.change), 'ascii'));
    }
    if (Number(receiptData.due) > 0) {
      buffers.push(this.CMD_BOLD_ON);
      buffers.push(Buffer.from(formatLine('Customer Due:', receiptData.due), 'ascii'));
      buffers.push(this.CMD_BOLD_OFF);
    }

    // 8. Footer
    buffers.push(this.CMD_ALIGN_CENTER);
    buffers.push(Buffer.from('\n', 'ascii'));
    const footerText = receiptData.footer || 'Sold items non-refundable after 7 days.\nPowered by Bebsayik.com\n';
    buffers.push(Buffer.from(footerText + '\n\n', 'ascii'));

    // 9. Cut paper
    buffers.push(this.CMD_FEED_CUT);

    const fullBuffer = Buffer.concat(buffers);

    return {
      format: 'ESC_POS_V1',
      paperWidth: paperWidthMm,
      kickDrawer,
      rawEscPosBase64: fullBuffer.toString('base64'),
      receiptData
    };
  }
}
