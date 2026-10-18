import mongoose, { ClientSession } from 'mongoose';
import {
  StockTransferNote,
  ImeiSerial,
  InventoryMovement,
  Shop,
  User
} from '../../models/index.js';
import { getSmsDriver } from '../sms/index.js';

export class TransferService {
  /**
   * Dispatch Stock Transfer Note (STN - TX-19)
   * Dispatches handsets out of godown warehouse -> status transitions to IN_TRANSIT.
   * Dispatched stock CANNOT be sold through POS cart.
   * Internal stock movement with 0.00% P&L impact.
   */
  static async dispatchTransfer(
    sourceShopId: mongoose.Types.ObjectId | string,
    data: {
      destinationShopId: string;
      imeiList: string[];
      notes?: string;
    },
    userId: mongoose.Types.ObjectId | string
  ): Promise<any> {
    const { destinationShopId, imeiList, notes } = data;

    if (!destinationShopId) {
      const err: any = new Error('Destination shop ID is required');
      err.statusCode = 400;
      err.code = 'MISSING_DESTINATION_SHOP';
      throw err;
    }

    if (sourceShopId.toString() === destinationShopId.toString()) {
      const err: any = new Error('Source and destination cannot be the same shop');
      err.statusCode = 400;
      err.code = 'INVALID_TRANSFER_DESTINATION';
      throw err;
    }

    const destinationShop = await Shop.findById(destinationShopId);
    if (!destinationShop) {
      const err: any = new Error('Destination shop not found');
      err.statusCode = 404;
      err.code = 'DESTINATION_SHOP_NOT_FOUND';
      throw err;
    }

    if (!imeiList || imeiList.length === 0) {
      const err: any = new Error('Transfer requires at least one IMEI');
      err.statusCode = 400;
      err.code = 'EMPTY_TRANSFER_IMEIS';
      throw err;
    }

    // 1. Validate all handsets exist and are in AVAILABLE state at source shop
    const validatedHandsets: any[] = [];
    for (const imei of imeiList) {
      const trimmed = imei.trim();
      const handset = await ImeiSerial.findOne({
        shopId: sourceShopId,
        imei1: trimmed
      });

      if (!handset) {
        const err: any = new Error(`Handset IMEI "${trimmed}" not found at source warehouse`);
        err.statusCode = 404;
        err.code = 'IMEI_NOT_FOUND';
        throw err;
      }

      if (handset.status !== 'AVAILABLE' && handset.status !== 'available') {
        const err: any = new Error(
          `Handset IMEI "${trimmed}" is not available for transfer (current status: ${handset.status})`
        );
        err.statusCode = 422;
        err.code = 'IMEI_NOT_AVAILABLE';
        throw err;
      }

      validatedHandsets.push(handset);
    }

    const stnNo = `STN-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(10000 + Math.random() * 90000)}`;

    // 2. Execute atomic dispatch
    const executeInTransaction = async (session: ClientSession) => {
      // Transition each handset to IN_TRANSIT
      for (const h of validatedHandsets) {
        h.status = 'IN_TRANSIT';
        if (session) {
          await h.save({ session });
        } else {
          await h.save();
        }

        // Record stock movement (out_transfer)
        const movement = new InventoryMovement({
          shopId: new mongoose.Types.ObjectId(sourceShopId),
          variantId: h.variantId,
          imeiId: h._id,
          movementType: 'out_transfer',
          quantityDelta: -1,
          referenceDocType: 'STN',
          performedByUserId: new mongoose.Types.ObjectId(userId),
          notes: `Dispatched STN ${stnNo} to ${destinationShop.name}`
        });
        await movement.save({ session });
      }

      // Create StockTransferNote
      const stn = new StockTransferNote({
        stnNo,
        fromShopId: new mongoose.Types.ObjectId(sourceShopId),
        toShopId: new mongoose.Types.ObjectId(destinationShopId),
        items: validatedHandsets.map((h) => ({
          variantId: h.variantId,
          imeiId: h._id,
          imei1: h.imei1,
          quantity: 1
        })),
        status: 'in_transit',
        dispatchedByUserId: new mongoose.Types.ObjectId(userId),
        notes
      });
      await stn.save({ session });

      return stn;
    };

    let session: ClientSession | null = null;
    let stnRecord: any;

    try {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        stnRecord = await executeInTransaction(session!);
      });
    } catch (sessionErr: any) {
      if (
        sessionErr?.message?.includes('Transactions are not supported') ||
        sessionErr?.message?.includes('replica set')
      ) {
        stnRecord = await executeInTransaction(null as any);
      } else {
        throw sessionErr;
      }
    } finally {
      if (session) await session.endSession();
    }

    return {
      success: true,
      stnNo: stnRecord.stnNo,
      status: stnRecord.status,
      dispatchedCount: validatedHandsets.length,
      destinationShop: destinationShop.name,
      notes: stnRecord.notes,
      createdAt: stnRecord.createdAt
    };
  }

  /**
   * Scan-to-Receive STN & Transit Discrepancy Workflow (TC-36)
   * If dispatched 20 units and 19 are received:
   * - 19 units become AVAILABLE at destination outlet.
   * - 1 missing unit is marked DISPUTED_IN_TRANSIT.
   * - High-priority SMS alert sent to Shop Owner via SMS adapter.
   * - 0.00% P&L impact.
   */
  static async receiveTransfer(
    destinationShopId: mongoose.Types.ObjectId | string,
    stnId: string,
    data: {
      receivedImeis: string[];
    },
    userId: mongoose.Types.ObjectId | string
  ): Promise<any> {
    const stn = await StockTransferNote.findOne({
      _id: stnId,
      toShopId: destinationShopId
    });

    if (!stn) {
      const err: any = new Error('Stock Transfer Note not found for this destination outlet');
      err.statusCode = 404;
      err.code = 'STN_NOT_FOUND';
      throw err;
    }

    if (stn.status !== 'in_transit') {
      const err: any = new Error(
        `STN cannot be received in its current status: ${stn.status} (already ${stn.status})`
      );
      err.statusCode = 422;
      err.code = 'INVALID_STN_STATUS';
      throw err;
    }

    const receivedSet = new Set((data.receivedImeis || []).map((i) => i.trim()));
    const acceptedHandsets: any[] = [];
    const missingHandsets: any[] = [];

    // Analyze received vs missing items
    for (const item of stn.items) {
      const handset = item.imeiId ? await ImeiSerial.findById(item.imeiId) : null;
      const imeiCode = item.imei1 || (handset ? handset.imei1 : '');

      if (receivedSet.has(imeiCode)) {
        acceptedHandsets.push({ item, handset, imeiCode });
      } else {
        missingHandsets.push({ item, handset, imeiCode });
      }
    }

    // Execute atomic receive
    const executeInTransaction = async (session: ClientSession) => {
      // 1. Accept matched handsets -> AVAILABLE at destination outlet
      for (const accepted of acceptedHandsets) {
        if (accepted.handset) {
          accepted.handset.shopId = new mongoose.Types.ObjectId(destinationShopId);
          accepted.handset.status = 'AVAILABLE';
          accepted.handset.stockLocation = 'main_outlet';
          if (session) {
            await accepted.handset.save({ session });
          } else {
            await accepted.handset.save();
          }

          // Record in_transfer movement
          const movement = new InventoryMovement({
            shopId: new mongoose.Types.ObjectId(destinationShopId),
            variantId: accepted.handset.variantId,
            imeiId: accepted.handset._id,
            movementType: 'in_transfer',
            quantityDelta: 1,
            referenceDocType: 'STN',
            performedByUserId: new mongoose.Types.ObjectId(userId),
            notes: `Received STN ${stn.stnNo}`
          });
          await movement.save({ session });
        }
      }

      // 2. Missing handsets -> DISPUTED_IN_TRANSIT (TC-36)
      const discrepancyList: any[] = [];
      for (const missing of missingHandsets) {
        if (missing.handset) {
          missing.handset.status = 'DISPUTED_IN_TRANSIT';
          if (session) {
            await missing.handset.save({ session });
          } else {
            await missing.handset.save();
          }
        }
        discrepancyList.push({
          imei1: missing.imeiCode,
          imeiId: missing.handset ? missing.handset._id : undefined,
          reason: 'Missing during destination physical verification (disputed in transit)'
        });
      }

      // 3. Update STN status & discrepancies
      if (discrepancyList.length > 0) {
        stn.status = 'discrepancy';
        stn.discrepancies = discrepancyList;
      } else {
        stn.status = 'completed';
      }

      stn.receivedByUserId = new mongoose.Types.ObjectId(userId);
      stn.receivedAt = new Date();
      if (session) {
        await stn.save({ session });
      } else {
        await stn.save();
      }

      return { stn, discrepancyList };
    };

    let session: ClientSession | null = null;
    let result: any;

    try {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        result = await executeInTransaction(session!);
      });
    } catch (sessionErr: any) {
      if (
        sessionErr?.message?.includes('Transactions are not supported') ||
        sessionErr?.message?.includes('replica set')
      ) {
        result = await executeInTransaction(null as any);
      } else {
        throw sessionErr;
      }
    } finally {
      if (session) await session.endSession();
    }

    // 4. If transit discrepancy occurred (TC-36), trigger owner SMS alert
    let smsSent = false;
    let smsMessageId: string | undefined;

    if (result.discrepancyList.length > 0) {
      try {
        // Find shop owner phone
        const owner = await User.findOne({
          shopId: destinationShopId,
          role: 'STORE_OWNER',
          isActive: true
        });

        const ownerPhone = owner?.phone || '01711111111';
        const msg = `ALERT: STN ${stn.stnNo} received with DISCREPANCY. Dispatched: ${stn.items.length}, Verified: ${acceptedHandsets.length}, Missing: ${result.discrepancyList.length}. Missing IMEIs: ${result.discrepancyList.map((d: any) => d.imei1).join(', ')}.`;

        const smsRes = await getSmsDriver().sendSms(ownerPhone, msg);
        if (smsRes.success) {
          smsSent = true;
          smsMessageId = smsRes.messageId;

          stn.smsNotificationSent = true;
          if (smsRes.messageId) {
            stn.smsMessageId = smsRes.messageId;
          }
          await stn.save();
        }
      } catch (smsErr) {
        console.error('[STN Alert] Failed to send owner SMS:', smsErr);
      }
    }

    return {
      success: true,
      stnNo: stn.stnNo,
      status: stn.status,
      dispatchedTotal: stn.items.length,
      receivedCount: acceptedHandsets.length,
      discrepancyCount: result.discrepancyList.length,
      discrepancies: result.discrepancyList,
      ownerSmsAlertSent: smsSent,
      smsMessageId,
      receivedAt: stn.receivedAt
    };
  }

  /**
   * List Stock Transfer Notes
   */
  static async getTransfers(
    shopId: mongoose.Types.ObjectId | string,
    query: {
      status?: string;
      direction?: 'incoming' | 'outgoing' | 'all';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<any> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.direction === 'incoming') {
      filter.toShopId = shopId;
    } else if (query.direction === 'outgoing') {
      filter.fromShopId = shopId;
    } else {
      filter.$or = [{ fromShopId: shopId }, { toShopId: shopId }];
    }

    if (query.status) {
      filter.status = query.status;
    }

    const [transfers, total] = await Promise.all([
      StockTransferNote.find(filter)
        .populate('fromShopId', 'name')
        .populate('toShopId', 'name')
        .populate('dispatchedByUserId', 'fullName phone')
        .populate('receivedByUserId', 'fullName phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      StockTransferNote.countDocuments(filter)
    ]);

    return {
      transfers: transfers.map((t) => ({
        id: t._id.toString(),
        stnNo: t.stnNo,
        fromShop: t.fromShopId,
        toShop: t.toShopId,
        itemsCount: t.items.length,
        items: t.items,
        status: t.status,
        discrepancies: t.discrepancies || [],
        smsNotificationSent: t.smsNotificationSent,
        notes: t.notes,
        dispatchedBy: t.dispatchedByUserId,
        receivedBy: t.receivedByUserId,
        createdAt: t.createdAt,
        receivedAt: t.receivedAt
      })),
      total,
      page,
      limit
    };
  }

  /**
   * Get single Stock Transfer Note by ID
   */
  static async getTransferById(
    shopId: mongoose.Types.ObjectId | string,
    transferId: string
  ): Promise<any> {
    const transfer = await StockTransferNote.findOne({
      _id: transferId,
      $or: [{ fromShopId: shopId }, { toShopId: shopId }]
    })
      .populate('fromShopId', 'name')
      .populate('toShopId', 'name')
      .populate('dispatchedByUserId', 'fullName phone')
      .populate('receivedByUserId', 'fullName phone')
      .populate('items.variantId', 'sku variantAttributes');

    if (!transfer) {
      const err: any = new Error('Stock Transfer Note not found');
      err.statusCode = 404;
      err.code = 'STN_NOT_FOUND';
      throw err;
    }

    return transfer;
  }
}
