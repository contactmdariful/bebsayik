import mongoose, { ClientSession } from 'mongoose';
import { ImeiSerial, IImeiSerial, ImeiLifecycleState } from '../../models/ImeiSerial.js';
import { ProductVariant } from '../../models/ProductVariant.js';
import { InventoryMovement } from '../../models/InventoryMovement.js';
import { DamagedStockScrap } from '../../models/DamagedStockScrap.js';
import { User } from '../../models/User.js';
import { AccountingService } from '../accounting/accounting.service.js';
import { buildTx17ScrapWriteOff } from '../accounting/journalMatrices.js';
import { overrideTokenService } from '../security/overrideToken.service.js';
import { decimal128Setter, decimal128Getter, toDecimal, addMoney } from '../../utils/money.js';
import { validateLuhn } from '@bebsayik/shared-types';
import argon2 from 'argon2';

/**
 * Valid lifecycle transitions state machine
 */
export const VALID_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  AVAILABLE: ['HELD_CART', 'SOLD', 'SCRAPPED', 'IN_TRANSIT', 'RETURNED_TO_SUPPLIER'],
  available: ['HELD_CART', 'SOLD', 'SCRAPPED', 'IN_TRANSIT', 'RETURNED_TO_SUPPLIER'],
  HELD_CART: ['AVAILABLE', 'SOLD', 'SCRAPPED'],
  held_cart: ['AVAILABLE', 'SOLD', 'SCRAPPED'],
  SOLD: ['RETURNED_INSPECTION'],
  sold: ['RETURNED_INSPECTION'],
  RETURNED_INSPECTION: ['AVAILABLE', 'SCRAPPED', 'RETURNED_TO_SUPPLIER'],
  returned_inspection: ['AVAILABLE', 'SCRAPPED', 'RETURNED_TO_SUPPLIER'],
  IN_TRANSIT: ['AVAILABLE', 'RETURNED_INSPECTION', 'DISPUTED_IN_TRANSIT'],
  in_transit: ['AVAILABLE', 'RETURNED_INSPECTION', 'DISPUTED_IN_TRANSIT', 'available', 'disputed_in_transit'],
  DISPUTED_IN_TRANSIT: ['AVAILABLE', 'SCRAPPED', 'RETURNED_TO_SUPPLIER'],
  disputed_in_transit: ['AVAILABLE', 'SCRAPPED', 'RETURNED_TO_SUPPLIER', 'available', 'scrapped', 'returned_to_supplier'],
  RETURNED_TO_SUPPLIER: [],
  returned_to_supplier: [],
  SCRAPPED: [],
  scrapped: []
};

export class InventoryService {
  // In-memory high-speed cache for scanner lookups (fallback / sub-150ms cache)
  private static scanCache: Map<string, { payload: any; expiresAt: number; shopId: string }> = new Map();

  static clearCache(): void {
    this.scanCache.clear();
  }

  static validateLuhnImei(imei: string): boolean {
    return validateLuhn(imei);
  }

  /* ================= SCANNER LOOKUP & CACHING ================= */

  static async scanCode(
    shopId: mongoose.Types.ObjectId | string,
    code: string
  ): Promise<any> {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      const err: any = new Error('Barcode or IMEI code cannot be empty');
      err.code = 'INVALID_CODE';
      err.statusCode = 400;
      throw err;
    }

    const cacheKey = `scan:${shopId.toString()}:${trimmedCode}`;
    const cached = this.scanCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      // Ensure strict tenant isolation: Never return cache across shops
      if (cached.shopId === shopId.toString()) {
        return cached.payload;
      }
    }

    // 1. Search by IMEI1
    let handset = await ImeiSerial.findOne({
      shopId,
      imei1: trimmedCode
    })
      .populate({
        path: 'variantId',
        populate: { path: 'productId' }
      })
      .lean();

    // 2. Search by IMEI2 if not found in IMEI1
    if (!handset) {
      handset = await ImeiSerial.findOne({
        shopId,
        imei2: trimmedCode
      })
        .populate({
          path: 'variantId',
          populate: { path: 'productId' }
        })
        .lean();
    }

    if (handset && handset.variantId) {
      const variant: any = handset.variantId;
      const product: any = variant.productId || {};

      const result = {
        lookupType: 'IMEI',
        imeiId: handset._id.toString(),
        imei1: handset.imei1,
        imei2: handset.imei2,
        status: handset.status,
        productId: product._id?.toString(),
        productName: product.name || 'Mobile Handset',
        variantId: variant._id.toString(),
        variantName: variant.variantName || `${product.name} (${variant.sku})`,
        sku: variant.sku,
        mrpPrice: decimal128Getter(variant.mrp),
        minSellingPrice: decimal128Getter(variant.msp),
        specificPurchaseCost: decimal128Getter(handset.purchaseCost),
        stockLocation: handset.stockLocation,
        purchaseDate: handset.purchaseDate || handset.createdAt,
        hasImei: true
      };

      // Store in scan cache for 60 seconds
      this.scanCache.set(cacheKey, {
        payload: result,
        expiresAt: now + 60 * 1000,
        shopId: shopId.toString()
      });

      return result;
    }

    // 3. Search by Barcode on ProductVariant (Accessories or Packaged Handset SKUs)
    const variant = await ProductVariant.findOne({
      shopId,
      barcode: trimmedCode,
      isDeleted: false
    })
      .populate('productId')
      .lean();

    if (variant && variant.productId) {
      const product: any = variant.productId;
      const result = {
        lookupType: 'BARCODE',
        productId: product._id?.toString(),
        productName: product.name || 'Product Item',
        variantId: variant._id.toString(),
        variantName: variant.variantName || `${product.name} (${variant.sku})`,
        sku: variant.sku,
        barcode: variant.barcode,
        mrpPrice: decimal128Getter(variant.mrp),
        minSellingPrice: decimal128Getter(variant.msp),
        specificPurchaseCost: decimal128Getter(variant.purchaseCost),
        stockQuantity: variant.currentStock || 0,
        hasImei: product.hasImei ?? false
      };

      this.scanCache.set(cacheKey, {
        payload: result,
        expiresAt: now + 60 * 1000,
        shopId: shopId.toString()
      });

      return result;
    }

    const notFoundErr: any = new Error(
      `No active inventory record or barcode found matching: "${trimmedCode}"`
    );
    notFoundErr.code = 'SCANNER_CODE_NOT_FOUND';
    notFoundErr.statusCode = 404;
    throw notFoundErr;
  }

  static invalidateScanCache(shopId: mongoose.Types.ObjectId | string, code?: string) {
    if (code) {
      this.scanCache.delete(`scan:${shopId.toString()}:${code.trim()}`);
    } else {
      for (const [key, val] of this.scanCache.entries()) {
        if (val.shopId === shopId.toString()) {
          this.scanCache.delete(key);
        }
      }
    }
  }

  /* ================= DUAL-IMEI SERIALIZED INVENTORY ================= */

  static async registerImei(
    shopId: mongoose.Types.ObjectId | string,
    data: {
      variantId: string | mongoose.Types.ObjectId;
      imei1: string;
      imei2?: string;
      serialNumber?: string;
      specificCost: number | string;
      stockLocation?: string;
      purchaseDate?: Date;
      source?: 'purchase' | 'buyback' | 'trade_in';
      status?: ImeiLifecycleState;
    }
  ): Promise<IImeiSerial> {
    const imei1 = data.imei1.trim();
    const imei2 = data.imei2?.trim();

    // 1. Validate 15-digit Luhn check
    if (!validateLuhn(imei1)) {
      const err: any = new Error(
        `Invalid Primary IMEI "${imei1}": must be 15 numeric digits passing the Luhn algorithm checksum`
      );
      err.code = 'INVALID_IMEI_LUHN';
      err.statusCode = 422;
      throw err;
    }

    if (imei2 && !validateLuhn(imei2)) {
      const err: any = new Error(
        `Invalid Secondary IMEI "${imei2}": must be 15 numeric digits passing the Luhn algorithm checksum`
      );
      err.code = 'INVALID_IMEI_LUHN';
      err.statusCode = 422;
      throw err;
    }

    // 2. Validate Variant exists for shop
    const variant = await ProductVariant.findOne({
      _id: data.variantId,
      shopId,
      isDeleted: false
    });
    if (!variant) {
      const err: any = new Error('Product Variant not found for this shop');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // 3. Database-level uniqueness check for active IMEI
    const existingActive = await ImeiSerial.findOne({
      shopId,
      imei1,
      status: { $in: ['AVAILABLE', 'available', 'HELD_CART', 'held_cart'] }
    });
    if (existingActive) {
      const err: any = new Error(
        `Handset with IMEI1 "${imei1}" is already in active Dokan inventory (Status: ${existingActive.status})`
      );
      err.code = 'DUPLICATE_ACTIVE_IMEI';
      err.statusCode = 409;
      throw err;
    }

    const handset = new ImeiSerial({
      shopId,
      variantId: variant._id,
      imei1,
      imei2,
      serialNumber: data.serialNumber?.trim(),
      purchaseCost: decimal128Setter(data.specificCost),
      source: data.source || 'purchase',
      status: (data.status || 'AVAILABLE').toUpperCase(),
      stockLocation: data.stockLocation || 'main_outlet',
      purchaseDate: data.purchaseDate || new Date(),
      intakeDate: data.purchaseDate || new Date()
    });

    await handset.save();
    this.invalidateScanCache(shopId, imei1);
    if (imei2) this.invalidateScanCache(shopId, imei2);

    return handset;
  }

  static async listImeis(
    shopId: mongoose.Types.ObjectId | string,
    options: {
      status?: string;
      agingDays?: number;
      brandId?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ items: any[]; pagination: any }> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 25));
    const skip = (page - 1) * limit;

    const filter: any = { shopId };

    if (options.status) {
      filter.status = { $in: [options.status.toUpperCase(), options.status.toLowerCase()] };
    }

    // Aging inventory filter (>60 or >90 days unsold)
    if (options.agingDays) {
      const cutoff = new Date(Date.now() - Number(options.agingDays) * 24 * 60 * 60 * 1000);
      filter.status = { $in: ['AVAILABLE', 'available'] };
      filter.$or = [
        { purchaseDate: { $lte: cutoff } },
        { createdAt: { $lte: cutoff } }
      ];
    }

    if (options.search) {
      const s = options.search.trim();
      filter.$or = [
        { imei1: { $regex: s, $options: 'i' } },
        { imei2: { $regex: s, $options: 'i' } },
        { serialNumber: { $regex: s, $options: 'i' } }
      ];
    }

    const [items, totalRecords] = await Promise.all([
      ImeiSerial.find(filter)
        .populate({
          path: 'variantId',
          populate: { path: 'productId brandId' }
        })
        .sort({ purchaseDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ImeiSerial.countDocuments(filter)
    ]);

    const enriched = items.map((item: any) => {
      const variant = item.variantId || {};
      const product = variant.productId || {};
      return {
        _id: item._id,
        imei1: item.imei1,
        imei2: item.imei2,
        serialNumber: item.serialNumber,
        status: item.status,
        specificCost: decimal128Getter(item.purchaseCost),
        purchaseCost: decimal128Getter(item.purchaseCost),
        stockLocation: item.stockLocation,
        purchaseDate: item.purchaseDate || item.createdAt,
        productName: product.name || 'Mobile Handset',
        variantName: variant.variantName || variant.sku,
        sku: variant.sku,
        brandName: product.brandId?.name || ''
      };
    });

    return {
      items: enriched,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        hasNextPage: page * limit < totalRecords,
        hasPrevPage: page > 1
      }
    };
  }

  static async updateImeiStatus(
    shopId: mongoose.Types.ObjectId | string,
    imeiId: string,
    targetStatus: ImeiLifecycleState,
    userId: mongoose.Types.ObjectId | string,
    note?: string
  ): Promise<IImeiSerial> {
    const handset = await ImeiSerial.findOne({ _id: imeiId, shopId });
    if (!handset) {
      const err: any = new Error('Serialized Handset not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const current = handset.status.toUpperCase();
    const target = targetStatus.toUpperCase();

    if (current === target) {
      return handset;
    }

    // Validate state transition machine
    const allowed = VALID_LIFECYCLE_TRANSITIONS[current] || [];
    if (!allowed.map((s) => s.toUpperCase()).includes(target)) {
      const err: any = new Error(
        `Illegal lifecycle transition: Cannot transition IMEI from [${current}] to [${target}]`
      );
      err.code = 'INVALID_LIFECYCLE_TRANSITION';
      err.statusCode = 422;
      throw err;
    }

    handset.status = target as ImeiLifecycleState;
    await handset.save();

    // Record audit movement if relevant
    const movement = new InventoryMovement({
      shopId,
      variantId: handset.variantId,
      imeiId: handset._id,
      movementType: target === 'SOLD' ? 'out_sale' : target === 'SCRAPPED' ? 'out_scrap' : 'transfer',
      quantityDelta: target === 'SOLD' || target === 'SCRAPPED' ? -1 : 0,
      referenceDocType: 'INV',
      referenceDocId: handset._id,
      performedByUserId: userId,
      notes: note || `State transitioned from ${current} to ${target}`
    });
    await movement.save();

    this.invalidateScanCache(shopId, handset.imei1);
    if (handset.imei2) this.invalidateScanCache(shopId, handset.imei2);

    return handset;
  }

  static async getImeiTimeline(
    shopId: mongoose.Types.ObjectId | string,
    imei1: string
  ): Promise<any> {
    const handset = await ImeiSerial.findOne({ shopId, imei1 })
      .populate({
        path: 'variantId',
        populate: { path: 'productId' }
      })
      .lean();

    if (!handset) {
      const err: any = new Error(`Handset with IMEI1 "${imei1}" not found`);
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const movements = await InventoryMovement.find({
      shopId,
      imeiId: handset._id
    })
      .populate('performedByUserId', 'fullName phone role')
      .sort({ createdAt: -1 })
      .lean();

    const scraps = await DamagedStockScrap.find({
      shopId,
      imeiId: handset._id
    })
      .populate('approvedByUserId', 'fullName phone role')
      .lean();

    return {
      handset: {
        ...handset,
        specificCost: decimal128Getter(handset.purchaseCost),
        purchaseCost: decimal128Getter(handset.purchaseCost)
      },
      movements,
      scraps
    };
  }

  /* ================= NON-SERIALIZED ACCESSORIES & STOCK ================= */

  static async getStockLevels(
    shopId: mongoose.Types.ObjectId | string,
    options: { lowStockOnly?: boolean; search?: string } = {}
  ): Promise<any[]> {
    const filter: any = { shopId, isDeleted: false };

    const variants = await ProductVariant.find(filter)
      .populate('productId')
      .lean();

    let enriched = variants.map((v: any) => {
      const product = v.productId || {};
      const reorderLevel = v.reorderLevel ?? v.alertQuantity ?? 5;
      const isLowStock = !product.hasImei && v.currentStock <= reorderLevel;

      return {
        variantId: v._id,
        productId: product._id,
        productName: product.name || 'Unnamed Product',
        variantName: v.variantName || v.sku,
        sku: v.sku,
        barcode: v.barcode,
        hasImei: product.hasImei ?? false,
        currentStock: v.currentStock || 0,
        reorderLevel,
        isLowStock,
        mrp: decimal128Getter(v.mrp),
        msp: decimal128Getter(v.msp),
        purchaseCost: decimal128Getter(v.purchaseCost)
      };
    });

    if (options.lowStockOnly) {
      enriched = enriched.filter((item) => item.isLowStock);
    }

    if (options.search) {
      const s = options.search.toLowerCase().trim();
      enriched = enriched.filter(
        (item) =>
          item.productName.toLowerCase().includes(s) ||
          item.variantName.toLowerCase().includes(s) ||
          item.sku.toLowerCase().includes(s) ||
          (item.barcode && item.barcode.includes(s))
      );
    }

    return enriched;
  }

  static async listMovements(
    shopId: mongoose.Types.ObjectId | string,
    options: { variantId?: string; limit?: number; page?: number } = {}
  ): Promise<{ movements: any[]; pagination: any }> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 25));
    const skip = (page - 1) * limit;

    const filter: any = { shopId };
    if (options.variantId) filter.variantId = options.variantId;

    const [movements, totalRecords] = await Promise.all([
      InventoryMovement.find(filter)
        .populate('variantId', 'variantName sku')
        .populate('performedByUserId', 'fullName phone role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventoryMovement.countDocuments(filter)
    ]);

    return {
      movements,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        hasNextPage: page * limit < totalRecords,
        hasPrevPage: page > 1
      }
    };
  }

  static async adjustStock(
    shopId: mongoose.Types.ObjectId | string,
    params: {
      variantId: string | mongoose.Types.ObjectId;
      physicalCount: number;
      systemCount: number;
      reason: string;
      managerPin?: string;
      overrideToken?: string;
      userId: string | mongoose.Types.ObjectId;
    }
  ) {
    const { variantId, physicalCount, systemCount, reason, managerPin, overrideToken, userId } =
      params;

    // 1. Authorize manager via override token or PIN
    if (overrideToken) {
      const tokenVerification = await overrideTokenService.verifyAndConsume({
        token: overrideToken,
        expectedShopId: shopId.toString(),
        expectedAction: 'STOCK_ADJUSTMENT'
      });
      if (!tokenVerification.valid) {
        const err: any = new Error(
          `Manager override token rejected: ${tokenVerification.error || 'Invalid or consumed token'}`
        );
        err.code = 'UNAUTHORIZED_MANAGER_OVERRIDE';
        err.statusCode = 403;
        throw err;
      }
    } else if (managerPin) {
      const user = await User.findById(userId);
      if (!user) {
        const err: any = new Error('User not found');
        err.code = 'UNAUTHORIZED';
        err.statusCode = 401;
        throw err;
      }
      if (!user.managerPinHash) {
        const err: any = new Error('No Manager PIN configured for this account');
        err.code = 'MANAGER_PIN_NOT_SET';
        err.statusCode = 403;
        throw err;
      }
      const isPinValid = await argon2.verify(user.managerPinHash, managerPin);
      if (!isPinValid) {
        const err: any = new Error('Invalid Manager Override PIN');
        err.code = 'INVALID_MANAGER_PIN';
        err.statusCode = 403;
        throw err;
      }
    } else {
      const err: any = new Error('Manager PIN or signed Override Token is required to adjust stock');
      err.code = 'MANAGER_AUTHORIZATION_REQUIRED';
      err.statusCode = 403;
      throw err;
    }

    const variant = await ProductVariant.findOne({
      _id: variantId,
      shopId,
      isDeleted: false
    });
    if (!variant) {
      const err: any = new Error('Product Variant not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const quantityDelta = physicalCount - systemCount;
    variant.currentStock = physicalCount;
    await variant.save();

    const movement = new InventoryMovement({
      shopId,
      variantId: variant._id,
      movementType: 'adjustment',
      quantityDelta,
      referenceDocType: 'ADJ',
      referenceDocId: variant._id,
      performedByUserId: userId,
      notes: reason || 'Manual stock audit adjustment'
    });
    await movement.save();

    return {
      variantId: variant._id,
      previousStock: systemCount,
      newStock: physicalCount,
      quantityDelta,
      updatedAt: new Date()
    };
  }

  /* ================= DAMAGED STOCK SCRAP HUB (SWV - TX-17) ================= */

  static async scrapHandset(
    shopId: mongoose.Types.ObjectId | string,
    params: {
      imei1: string;
      damageCategory?: string;
      description?: string;
      photoUrl?: string;
      managerPin?: string;
      overrideToken?: string;
      userId: string | mongoose.Types.ObjectId;
      idempotencyKey?: string;
    }
  ): Promise<any> {
    const {
      imei1,
      damageCategory = 'SHATTERED_DISPLAY',
      description = 'Customer or handling physical damage',
      photoUrl,
      managerPin,
      overrideToken,
      userId
    } = params;

    const trimmedImei = imei1.trim();

    // 1. Authorize manager via single-use override token or PIN
    if (overrideToken) {
      let tokenVerification = await overrideTokenService.verifyAndConsume({
        token: overrideToken,
        expectedShopId: shopId.toString(),
        expectedAction: 'SCRAP_HANDSET'
      });
      if (!tokenVerification.valid) {
        tokenVerification = await overrideTokenService.verifyAndConsume({
          token: overrideToken,
          expectedShopId: shopId.toString(),
          expectedAction: 'INVENTORY_SCRAP'
        });
      }
      if (!tokenVerification.valid) {
        const err: any = new Error(
          `Manager override token rejected: ${tokenVerification.error || 'Invalid or expired override token'}`
        );
        err.code = 'UNAUTHORIZED_MANAGER_OVERRIDE';
        err.statusCode = 403;
        throw err;
      }
    } else if (managerPin) {
      const user = await User.findById(userId);
      if (!user) {
        const err: any = new Error('User not found');
        err.code = 'UNAUTHORIZED';
        err.statusCode = 401;
        throw err;
      }
      if (!user.managerPinHash) {
        const err: any = new Error('No Manager PIN configured for this account');
        err.code = 'MANAGER_PIN_NOT_SET';
        err.statusCode = 403;
        throw err;
      }
      const isPinValid = await argon2.verify(user.managerPinHash, managerPin);
      if (!isPinValid) {
        const err: any = new Error('Invalid Manager Override PIN');
        err.code = 'INVALID_MANAGER_PIN';
        err.statusCode = 403;
        throw err;
      }
    } else {
      const err: any = new Error('Manager PIN or signed Override Token is required to scrap inventory');
      err.code = 'MANAGER_AUTHORIZATION_REQUIRED';
      err.statusCode = 403;
      throw err;
    }

    // 2. Look up handset
    const handset = await ImeiSerial.findOne({
      shopId,
      imei1: trimmedImei
    });

    if (!handset) {
      const err: any = new Error(`Handset with IMEI1 "${trimmedImei}" not found in this shop`);
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // Idempotency: Check if already scrapped
    if (handset.status === 'SCRAPPED' || handset.status === 'scrapped') {
      const existingScrap = await DamagedStockScrap.findOne({
        shopId,
        imeiId: handset._id
      });
      if (existingScrap) {
        return {
          scrap: existingScrap,
          swvNo: existingScrap.swvNo,
          exactLandedCost: decimal128Getter(existingScrap.landedCost),
          status: 'ALREADY_SCRAPPED',
          message: 'Handset has already been written off as scrapped'
        };
      }
    }

    // Handset must be AVAILABLE or RETURNED_INSPECTION to scrap
    const eligibleStatuses = ['AVAILABLE', 'available', 'RETURNED_INSPECTION', 'returned_inspection'];
    if (!eligibleStatuses.includes(handset.status)) {
      const err: any = new Error(
        `Cannot scrap handset: current status is [${handset.status}]. Only AVAILABLE or RETURNED_INSPECTION items may be scrapped.`
      );
      err.code = 'HANDSET_NOT_ELIGIBLE_FOR_SCRAP';
      err.statusCode = 422;
      throw err;
    }

    const exactCostDecimal = decimal128Getter(handset.purchaseCost);
    const swvNo = `SWV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(10000 + Math.random() * 90000)}`;

    // 3. Execute atomic transaction
    const executeInTransaction = async (session: ClientSession) => {
      // Transition IMEI to SCRAPPED
      handset.status = 'SCRAPPED';
      await handset.save({ session });

      // Post TX-17 double-entry journal voucher
      // Debit: 5020-Damaged-Stock-Loss (amount: exactCostDecimal)
      // Credit: 1210-Handset-Inventory (amount: exactCostDecimal)
      const journalEntries = buildTx17ScrapWriteOff({
        landedCost: exactCostDecimal,
        lossAccountCode: '5020',
        inventoryAccountCode: '1210'
      });

      const journal = await AccountingService.postDoubleEntryJournal({
        shopId: handset.shopId,
        voucherNo: swvNo,
        txnCode: 'TX-17',
        sourceDocType: 'SWV',
        postedByUserId: new mongoose.Types.ObjectId(userId),
        entries: journalEntries,
        session
      });

      // Create DamagedStockScrap record
      const scrap = new DamagedStockScrap({
        shopId,
        swvNo,
        variantId: handset.variantId,
        imeiId: handset._id,
        imei1: handset.imei1,
        quantity: 1,
        landedCost: handset.purchaseCost,
        damageCategory,
        damageReason: description,
        photoUrl: photoUrl || 'https://storage.bebsayik.com/evidence/placeholder.jpg',
        transactionReference: journal.voucherNo,
        approvedByUserId: userId,
        notes: description
      });
      await scrap.save({ session });

      // Append immutable stock movement
      const movement = new InventoryMovement({
        shopId,
        variantId: handset.variantId,
        imeiId: handset._id,
        movementType: 'out_scrap',
        quantityDelta: -1,
        referenceDocType: 'SWV',
        referenceDocId: scrap._id,
        performedByUserId: userId,
        notes: `Scrap write-off ${swvNo}: ${description}`
      });
      await movement.save({ session });

      return { scrap, journal };
    };

    let session: ClientSession | null = null;
    let result;

    try {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        result = await executeInTransaction(session!);
      });
    } catch (sessionErr: any) {
      // If transactions are unsupported (e.g. standalone Mongo test container without replica set),
      // fallback to safe direct execution
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

    this.invalidateScanCache(shopId, handset.imei1);
    if (handset.imei2) this.invalidateScanCache(shopId, handset.imei2);

    return {
      success: true,
      swvNo,
      scrapId: result!.scrap._id.toString(),
      imei1: handset.imei1,
      exactLandedCost: exactCostDecimal,
      accountingVoucher: result!.journal.voucherNo,
      journalEntries: [
        { accountCode: '5020', type: 'DEBIT', amount: exactCostDecimal, accountName: 'Damaged Stock Loss' },
        { accountCode: '1210', type: 'CREDIT', amount: exactCostDecimal, accountName: 'Handset Inventory' }
      ],
      photoUrl: result!.scrap.photoUrl
    };
  }

  static async listScraps(
    shopId: mongoose.Types.ObjectId | string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ scraps: any[]; totalLossValuation: string; pagination: any }> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 25));
    const skip = (page - 1) * limit;

    const filter = { shopId };

    const [scraps, totalRecords] = await Promise.all([
      DamagedStockScrap.find(filter)
        .populate({
          path: 'variantId',
          populate: { path: 'productId' }
        })
        .populate('approvedByUserId', 'fullName phone role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DamagedStockScrap.countDocuments(filter)
    ]);

    // Calculate total written off scrap loss sum
    const allScrapsForShop = await DamagedStockScrap.find(filter, { landedCost: 1 }).lean();
    let totalLossValuation = toDecimal(0);
    for (const s of allScrapsForShop) {
      totalLossValuation = addMoney(totalLossValuation, decimal128Getter(s.landedCost));
    }

    return {
      scraps: scraps.map((s: any) => ({
        ...s,
        landedCost: decimal128Getter(s.landedCost)
      })),
      totalLossValuation: totalLossValuation.toFixed(2),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        hasNextPage: page * limit < totalRecords,
        hasPrevPage: page > 1
      }
    };
  }
}
