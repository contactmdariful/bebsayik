import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { CatalogService } from '../services/catalog/catalog.service.js';
import { CatalogImportService } from '../services/catalog/catalogImport.service.js';
import { InventoryService } from '../services/inventory/inventory.service.js';
import { AccountingService } from '../services/accounting/accounting.service.js';
import { overrideTokenService } from '../services/security/overrideToken.service.js';
import {
  Product,
  ProductVariant,
  Category,
  Brand,
  ImeiSerial,
  InventoryMovement,
  DamagedStockScrap,
  User,
  Account,
  AccountTransaction
} from '../models/index.js';

describe('Phase 5: Product Catalog, Dual-IMEI Inventory & Damaged Stock Scrap', () => {
  const shopAId = new mongoose.Types.ObjectId();
  const shopBId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const managerId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.restoreAllMocks();
    overrideTokenService.clearMemory();
    InventoryService.clearCache();
  });

  // =========================================================================
  // 1. PRODUCT CATALOG, TAXONOMY & TENANT ISOLATION
  // =========================================================================
  describe('Product Catalog & Tenant Isolation', () => {
    it('creates product and automatically creates default variant and slug', async () => {
      const categoryId = new mongoose.Types.ObjectId();
      const brandId = new mongoose.Types.ObjectId();
      const mockProductId = new mongoose.Types.ObjectId();

      vi.spyOn(Category, 'findOne').mockResolvedValue({ _id: categoryId, shopId: shopAId, name: 'Handset' } as any);
      vi.spyOn(Brand, 'findOne').mockResolvedValue({ _id: brandId, shopId: shopAId, name: 'Xiaomi' } as any);
      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue(null);

      const mockSavedProduct = {
        _id: mockProductId,
        shopId: shopAId,
        name: 'Redmi Note 13 Pro',
        categoryId,
        brandId,
        hasImei: true,
        warrantyMonths: 12,
        isDeleted: false,
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({
          _id: mockProductId,
          shopId: shopAId,
          name: 'Redmi Note 13 Pro',
          categoryId,
          brandId,
          hasImei: true
        })
      };

      vi.spyOn(Product.prototype, 'save').mockResolvedValue(mockSavedProduct as any);
      vi.spyOn(ProductVariant.prototype, 'save').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        shopId: shopAId,
        productId: mockProductId,
        sku: 'RMI-13-PRO',
        mrp: '28500.00',
        msp: '25000.00',
        toObject: () => ({ sku: 'RMI-13-PRO', mrp: '28500.00' })
      } as any);

      const result = await CatalogService.createProduct(shopAId, {
        name: 'Redmi Note 13 Pro',
        categoryId,
        brandId,
        hasImei: true,
        warrantyMonths: 12,
        variants: [
          {
            sku: 'RMI-13-PRO',
            mrp: 28500,
            msp: 25000,
            purchaseCost: 24000
          }
        ]
      });

      expect(result.name).toBe('Redmi Note 13 Pro');
      expect(result.variants).toHaveLength(1);
      expect(result.shopId).toEqual(shopAId);
    });

    it('enforces strict tenant scoping when fetching products', async () => {
      const mockProducts = [
        { _id: new mongoose.Types.ObjectId(), shopId: shopAId, name: 'Phone Shop A' }
      ];

      const findSpy = vi.spyOn(Product, 'find').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockProducts)
      } as any);

      vi.spyOn(Product, 'countDocuments').mockResolvedValue(1);
      vi.spyOn(ProductVariant, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      } as any);

      const result = await CatalogService.listProducts(shopAId, {
        page: 1,
        limit: 10
      });

      expect(findSpy).toHaveBeenCalledWith(expect.objectContaining({ shopId: shopAId, isDeleted: false }));
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Phone Shop A');
    });

    it('blocks deleting a product if active serial inventory exists', async () => {
      const productId = new mongoose.Types.ObjectId();
      const variantId = new mongoose.Types.ObjectId();

      vi.spyOn(Product, 'findOne').mockResolvedValue({
        _id: productId,
        shopId: shopAId,
        name: 'Active Phone',
        hasImei: true,
        isDeleted: false
      } as any);

      vi.spyOn(ProductVariant, 'find').mockResolvedValue([{ _id: variantId }] as any);

      // Simulate 3 active handsets in stock
      vi.spyOn(ImeiSerial, 'countDocuments').mockResolvedValue(3);

      await expect(
        CatalogService.deleteProduct(shopAId, productId.toString())
      ).rejects.toThrow('Cannot delete product: Contains 3 active serialized handsets in stock');
    });

    it('rejects cross-tenant product modification', async () => {
      const productId = new mongoose.Types.ObjectId();

      // Product belongs to Shop B
      vi.spyOn(Product, 'findOne').mockResolvedValue(null);

      await expect(
        CatalogService.updateProduct(shopAId, productId.toString(), {
          name: 'Hacked Name'
        })
      ).rejects.toThrow('Product not found');
    });
  });

  // =========================================================================
  // 2. DUAL-IMEI SERIALIZED HANDSET INVENTORY & LUHN CHECK
  // =========================================================================
  describe('Dual-IMEI Validation & Landed Cost Preservation', () => {
    it('validates 15-digit Luhn check digit correctly', () => {
      // Valid Luhn numbers (sum % 10 === 0)
      expect(InventoryService.validateLuhnImei('867492041234569')).toBe(true);
      expect(InventoryService.validateLuhnImei('354892019876541')).toBe(true);
      expect(InventoryService.validateLuhnImei('860293049182736')).toBe(true);

      // Invalid check digits
      expect(InventoryService.validateLuhnImei('867492041234568')).toBe(false);
      expect(InventoryService.validateLuhnImei('354892019876540')).toBe(false);

      // Invalid length
      expect(InventoryService.validateLuhnImei('12345678901234')).toBe(false);
      expect(InventoryService.validateLuhnImei('1234567890123456')).toBe(false);
      expect(InventoryService.validateLuhnImei('ABC492041234567')).toBe(false);
    });

    it('rejects registering handset with invalid Luhn IMEI', async () => {
      const variantId = new mongoose.Types.ObjectId();

      await expect(
        InventoryService.registerImei(shopAId, {
          variantId,
          imei1: '867492041234568', // Bad Luhn digit
          specificCost: 20000
        })
      ).rejects.toThrow('must be 15 numeric digits passing the Luhn algorithm checksum');
    });

    it('blocks duplicate active IMEI registration', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const validImei = '867492041234569';

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({ _id: variantId } as any);

      // Simulate existing active IMEI record in shop
      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        imei1: validImei,
        status: 'AVAILABLE'
      } as any);

      await expect(
        InventoryService.registerImei(shopAId, {
          variantId,
          imei1: validImei,
          specificCost: 22000
        })
      ).rejects.toThrow('already in active Dokan inventory');
    });

    it('preserves exact landed cost independently for two handsets without cost averaging', async () => {
      const variantId = new mongoose.Types.ObjectId();

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue({ _id: variantId } as any);
      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue(null);

      const imei1PhoneA = '867492041234569'; // Valid
      const imei1PhoneB = '354892019876541'; // Valid

      let savedCostA: any = null;
      let savedCostB: any = null;

      vi.spyOn(ImeiSerial.prototype, 'save').mockImplementation(function (this: any) {
        if (this.imei1 === imei1PhoneA) {
          savedCostA = this.purchaseCost;
        } else if (this.imei1 === imei1PhoneB) {
          savedCostB = this.purchaseCost;
        }
        return Promise.resolve(this);
      });

      // Handset A @ ৳18,000
      await InventoryService.registerImei(shopAId, {
        variantId,
        imei1: imei1PhoneA,
        specificCost: 18000
      });

      // Handset B @ ৳19,000
      await InventoryService.registerImei(shopAId, {
        variantId,
        imei1: imei1PhoneB,
        specificCost: 19000
      });

      // Assert each handset retains exact individual landed cost
      expect(savedCostA?.toString()).toBe('18000.00');
      expect(savedCostB?.toString()).toBe('19000.00');
      expect(savedCostA).not.toEqual(savedCostB);
    });

    it('enforces valid lifecycle state machine transitions and blocks invalid ones', async () => {
      const handsetId = new mongoose.Types.ObjectId();

      // Case 1: Valid transition AVAILABLE -> HELD_CART
      const mockHandsetAvailable = {
        _id: handsetId,
        shopId: shopAId,
        status: 'AVAILABLE',
        imei1: '867492041234569',
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue(mockHandsetAvailable as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);

      const res1 = await InventoryService.updateImeiStatus(
        shopAId,
        handsetId.toString(),
        'HELD_CART',
        userId
      );
      expect(res1.status).toBe('HELD_CART');

      // Case 2: SCRAPPED is a terminal state; cannot transition back to AVAILABLE
      const mockHandsetScrapped = {
        _id: handsetId,
        shopId: shopAId,
        status: 'SCRAPPED',
        imei1: '867492041234569',
        save: vi.fn()
      };
      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue(mockHandsetScrapped as any);

      await expect(
        InventoryService.updateImeiStatus(
          shopAId,
          handsetId.toString(),
          'AVAILABLE',
          userId
        )
      ).rejects.toThrow('Illegal lifecycle transition: Cannot transition IMEI from [SCRAPPED] to [AVAILABLE]');
    });
  });

  // =========================================================================
  // 3. SCANNER LOOKUP & CACHE ISOLATION
  // =========================================================================
  describe('Barcode & IMEI Scanner Lookup', () => {
    it('resolves IMEI1 and returns serialized handset data', async () => {
      const validImei = '867492041234569';
      const mockHandset = {
        _id: new mongoose.Types.ObjectId(),
        shopId: shopAId,
        imei1: validImei,
        status: 'AVAILABLE',
        purchaseCost: '28000.00',
        variantId: {
          _id: new mongoose.Types.ObjectId(),
          sku: 'G-S24',
          productId: { _id: new mongoose.Types.ObjectId(), name: 'Galaxy S24', hasImei: true }
        }
      };

      vi.spyOn(ImeiSerial, 'findOne').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockHandset)
        })
      } as any);

      const res = await InventoryService.scanCode(shopAId, validImei);

      expect(res.lookupType).toBe('IMEI');
      expect(res.imei1).toBe(validImei);
      expect(res.productName).toBe('Galaxy S24');
    });

    it('resolves barcode and returns accessory variant data', async () => {
      const barcode = '8901234567890';
      const mockVariant = {
        _id: new mongoose.Types.ObjectId(),
        shopId: shopAId,
        barcode,
        sku: 'ANK-CHG-20W',
        currentStock: 45,
        productId: { _id: new mongoose.Types.ObjectId(), name: 'Anker 20W Charger', hasImei: false }
      };

      vi.spyOn(ImeiSerial, 'findOne').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null)
        })
      } as any);

      vi.spyOn(ProductVariant, 'findOne').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockVariant)
        })
      } as any);

      const res = await InventoryService.scanCode(shopAId, barcode);

      expect(res.lookupType).toBe('BARCODE');
      expect(res.barcode).toBe(barcode);
      expect(res.productName).toBe('Anker 20W Charger');
    });

    it('does not leak items across tenant boundaries in scanner cache', async () => {
      const validImei = '867492041234569';

      // Item exists in Shop B, but Shop A attempts scan
      vi.spyOn(ImeiSerial, 'findOne').mockImplementation((query: any) => {
        if (query.shopId?.toString() === shopBId.toString()) {
          return {
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue({
                _id: new mongoose.Types.ObjectId(),
                shopId: shopBId,
                imei1: validImei,
                variantId: { productId: { name: 'Shop B Phone' } }
              })
            })
          } as any;
        }
        return {
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(null)
          })
        } as any;
      });

      vi.spyOn(ProductVariant, 'findOne').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null)
        })
      } as any);

      await expect(InventoryService.scanCode(shopAId, validImei)).rejects.toThrow(
        'No active inventory record or barcode found'
      );
    });
  });

  // =========================================================================
  // 4. ACCESSORIES LEDGER & MANUAL ADJUSTMENTS
  // =========================================================================
  describe('Accessories Stock & Append-Only Ledger', () => {
    it('performs atomic stock adjustment with append-only movement log', async () => {
      const variantId = new mongoose.Types.ObjectId();
      const mockVariant = {
        _id: variantId,
        shopId: shopAId,
        currentStock: 15,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(ProductVariant, 'findOne').mockResolvedValue(mockVariant as any);

      let createdMovement: any = null;
      vi.spyOn(InventoryMovement.prototype, 'save').mockImplementation(function (this: any) {
        createdMovement = this;
        return Promise.resolve(this);
      });

      const tokenResult = await overrideTokenService.createToken({
        shopId: shopAId.toString(),
        managerUserId: managerId.toString(),
        action: 'STOCK_ADJUSTMENT',
        context: { variantId: variantId.toString() }
      });

      const result = await InventoryService.adjustStock(shopAId, {
        variantId,
        physicalCount: 20,
        systemCount: 15,
        reason: 'Shipment restock verification',
        overrideToken: tokenResult.overrideToken,
        userId
      });

      expect(result.previousStock).toBe(15);
      expect(result.newStock).toBe(20);
      expect(result.quantityDelta).toBe(5);
      expect(createdMovement.quantityDelta).toBe(5);
      expect(createdMovement.movementType).toBe('adjustment');
    });

    it('identifies low stock when current stock is at or below alert threshold', async () => {
      const mockVariants = [
        {
          _id: new mongoose.Types.ObjectId(),
          shopId: shopAId,
          sku: 'CASE-01',
          currentStock: 2,
          alertQuantity: 5,
          productId: { _id: new mongoose.Types.ObjectId(), name: 'Silicone Case', hasImei: false }
        },
        {
          _id: new mongoose.Types.ObjectId(),
          shopId: shopAId,
          sku: 'GLASS-01',
          currentStock: 25,
          alertQuantity: 10,
          productId: { _id: new mongoose.Types.ObjectId(), name: 'Glass Protector', hasImei: false }
        }
      ];

      vi.spyOn(ProductVariant, 'find').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockVariants)
        })
      } as any);

      const levels = await InventoryService.getStockLevels(shopAId);
      const lowStockItems = levels.filter(l => l.isLowStock);

      expect(levels).toHaveLength(2);
      expect(lowStockItems).toHaveLength(1);
      expect(lowStockItems[0].sku).toBe('CASE-01');
    });
  });

  // =========================================================================
  // 5. DAMAGED STOCK SCRAP HUB & TX-17 ACCOUNTING INVARIANT
  // =========================================================================
  describe('Damaged Stock Scrap Hub & Accounting Invariant', () => {
    it('executes atomic scrap write-off with TX-17 double-entry posting for exact cost ৳12,000', async () => {
      const handsetId = new mongoose.Types.ObjectId();
      const exactCost = 12000;
      const validImei = '867492041234569';

      const mockHandset = {
        _id: handsetId,
        shopId: shopAId,
        imei1: validImei,
        purchaseCost: '12000.00',
        status: 'AVAILABLE',
        variantId: new mongoose.Types.ObjectId(),
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(ImeiSerial, 'findOne').mockResolvedValue(mockHandset as any);
      vi.spyOn(DamagedStockScrap, 'findOne').mockResolvedValue(null);
      vi.spyOn(DamagedStockScrap.prototype, 'save').mockResolvedValue(true as any);
      vi.spyOn(InventoryMovement.prototype, 'save').mockResolvedValue(true as any);

      // Spy on AccountingService.postDoubleEntryJournal to verify exact TX-17 debits/credits
      let postedJournalArgs: any = null;
      vi.spyOn(AccountingService, 'postDoubleEntryJournal').mockImplementation(async (args) => {
        postedJournalArgs = args;
        return {
          voucherNo: args.voucherNo,
          totalDebits: '12000.00',
          totalCredits: '12000.00',
          transactionCount: 2
        };
      });

      // Generate valid signed manager override token
      const tokenResult = await overrideTokenService.createToken({
        shopId: shopAId.toString(),
        managerUserId: managerId.toString(),
        action: 'SCRAP_HANDSET',
        context: { imei1: validImei }
      });

      const fakeSession = {
        startTransaction: vi.fn(),
        commitTransaction: vi.fn(),
        abortTransaction: vi.fn(),
        endSession: vi.fn(),
        withTransaction: vi.fn().mockImplementation(async (cb: any) => cb())
      } as any;

      vi.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession);

      const scrapResult = await InventoryService.scrapHandset(shopAId, {
        imei1: validImei,
        damageCategory: 'WATER_DAMAGE',
        description: 'Liquid submersion causing dead motherboard',
        photoUrl: 'https://assets.bebsayik.com/damage-evidence/photo1.jpg',
        overrideToken: tokenResult.overrideToken,
        userId
      });

      // 1. Verify handset status updated to SCRAPPED
      expect(mockHandset.status).toBe('SCRAPPED');

      // 2. Verify scrap record
      expect(scrapResult.exactLandedCost).toBe('12000.00');
      expect(scrapResult.imei1).toBe(validImei);

      // 3. Verify double-entry accounting TX-17 entries
      expect(postedJournalArgs).not.toBeNull();
      expect(postedJournalArgs.txnCode).toBe('TX-17');

      const debitLeg = postedJournalArgs.entries.find((e: any) => e.accountCode === '5020');
      const creditLeg = postedJournalArgs.entries.find((e: any) => e.accountCode === '1210');

      expect(debitLeg).toBeDefined();
      expect(debitLeg.debit).toBe('12000.00');
      expect(Number(debitLeg.credit)).toBe(0);

      expect(creditLeg).toBeDefined();
      expect(creditLeg.credit).toBe('12000.00');
      expect(Number(creditLeg.debit)).toBe(0);
    });

    it('rejects damaged stock scrap if manager override token is invalid or expired', async () => {
      const validImei = '867492041234569';

      await expect(
        InventoryService.scrapHandset(shopAId, {
          imei1: validImei,
          damageCategory: 'SHATTERED_SCREEN',
          description: 'Cracked screen',
          overrideToken: 'invalid-fake-token',
          userId
        })
      ).rejects.toThrow('Manager override token rejected');
    });
  });

  // =========================================================================
  // 6. BENCHMARKS (1,000 LOOKUPS & 500-ROW CSV IMPORT)
  // =========================================================================
  describe('Performance Benchmarks', () => {
    it('benchmarks 1,000 scanner lookup operations and measures p50, p95, p99 latency', async () => {
      const testImei = '867492041234569';
      const mockItem = {
        _id: new mongoose.Types.ObjectId(),
        shopId: shopAId,
        imei1: testImei,
        status: 'AVAILABLE',
        purchaseCost: '18000.00',
        variantId: {
          _id: new mongoose.Types.ObjectId(),
          sku: 'SKU-BENCH',
          productId: { _id: new mongoose.Types.ObjectId(), name: 'Bench Phone', hasImei: true }
        }
      };

      vi.spyOn(ImeiSerial, 'findOne').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockItem)
        })
      } as any);

      const latencies: number[] = [];
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const t0 = performance.now();
        await InventoryService.scanCode(shopAId, testImei);
        const t1 = performance.now();
        latencies.push(t1 - t0);
      }

      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(iterations * 0.50)];
      const p95 = latencies[Math.floor(iterations * 0.95)];
      const p99 = latencies[Math.floor(iterations * 0.99)];

      console.log(`[BENCHMARK] 1,000 Scanner Lookups -> p50: ${p50.toFixed(3)}ms, p95: ${p95.toFixed(3)}ms, p99: ${p99.toFixed(3)}ms`);

      // Target: p99 latency below 150ms
      expect(p99).toBeLessThan(150);
    });

    it('benchmarks 500-row bulk import under 5 seconds', async () => {
      // Generate 500 valid CSV rows
      const rows = [
        'productName,category,brand,hasImei,modelNumber,variantName,color,ram,storage,barcode,mrp,msp,purchaseCost,initialStock'
      ];
      for (let i = 1; i <= 500; i++) {
        rows.push(`Product Item ${i},Smartphones,BrandX,false,MOD-${i},Std,Black,8GB,128GB,890000000${i},1400,1200,1000,5`);
      }
      const csvContent = rows.join('\n');

      vi.spyOn(ProductVariant, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      } as any);
      vi.spyOn(Category, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ _id: new mongoose.Types.ObjectId(), name: 'Smartphones', slug: 'smartphones' }])
      } as any);
      vi.spyOn(Brand, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ _id: new mongoose.Types.ObjectId(), name: 'BrandX', slug: 'brandx' }])
      } as any);
      vi.spyOn(Category.prototype, 'save').mockResolvedValue(true as any);
      vi.spyOn(Brand.prototype, 'save').mockResolvedValue(true as any);
      vi.spyOn(Product.prototype, 'save').mockResolvedValue(true as any);
      vi.spyOn(ProductVariant.prototype, 'save').mockResolvedValue(true as any);

      const t0 = performance.now();
      const importResult = await CatalogImportService.importCatalog(shopAId, csvContent);
      const t1 = performance.now();
      const elapsedSeconds = (t1 - t0) / 1000;

      console.log(`[BENCHMARK] 500 Rows Ingested -> ${importResult.productsCreated} products, ${importResult.variantsCreated} variants created in ${elapsedSeconds.toFixed(3)}s`);

      expect(importResult.totalRowsProcessed).toBe(500);
      expect(importResult.productsCreated).toBe(500);
      // Target: under 5 seconds
      expect(elapsedSeconds).toBeLessThan(5);
    });
  });
});
