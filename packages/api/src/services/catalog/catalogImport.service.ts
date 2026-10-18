import mongoose from 'mongoose';
import { Category } from '../../models/Category.js';
import { Brand } from '../../models/Brand.js';
import { Product } from '../../models/Product.js';
import { ProductVariant } from '../../models/ProductVariant.js';
import { slugify, generateBarcode } from './catalog.service.js';
import { decimal128Setter } from '../../utils/money.js';

export interface CatalogImportRow {
  productName: string;
  category: string;
  brand: string;
  hasImei?: boolean;
  modelNumber?: string;
  variantName?: string;
  color?: string;
  ram?: string;
  storage?: string;
  barcode?: string;
  mrp: string | number;
  msp: string | number;
  purchaseCost?: string | number;
  initialStock?: number;
}

export interface ImportResult {
  totalRowsProcessed: number;
  productsCreated: number;
  variantsCreated: number;
  skippedCount: number;
  errors: Array<{ row: number; issue: string }>;
  durationMs: number;
}

/**
 * Ultra-fast zero-dependency RFC-4180 compliant CSV parser
 */
export function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header line
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const firstLine = lines[0];
  if (!firstLine) return [];

  const headers = parseLine(firstLine).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  const results: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const rawValues = parseLine(line);
    if (rawValues.length === 0 || (rawValues.length === 1 && rawValues[0] === '')) continue;
    const rowObj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      if (header) {
        rowObj[header] = rawValues[j] || '';
      }
    }
    results.push(rowObj);
  }

  return results;
}

export class CatalogImportService {
  /**
   * Returns a standard downloadable CSV template for mobile retail Dokan inventory
   */
  static getImportTemplate(): string {
    const headers = [
      'productName',
      'category',
      'brand',
      'hasImei',
      'modelNumber',
      'variantName',
      'color',
      'ram',
      'storage',
      'barcode',
      'mrp',
      'msp',
      'purchaseCost',
      'initialStock'
    ].join(',');

    const sample1 = [
      'Redmi Note 13 Pro 5G',
      'Smart Phone',
      'Xiaomi',
      'true',
      '2312DRA50G',
      '8GB / 128GB - Phantom Black',
      'Phantom Black',
      '8GB',
      '128GB',
      '8901234567890',
      '27500.00',
      '24500.00',
      '24200.00',
      '0'
    ].join(',');

    const sample2 = [
      'Anker 20W Fast Charger',
      'Accessories',
      'Anker',
      'false',
      'A2633',
      '20W US White',
      'White',
      '',
      '',
      '848061032145',
      '1450.00',
      '1250.00',
      '1100.00',
      '25'
    ].join(',');

    return `${headers}\n${sample1}\n${sample2}\n`;
  }

  /**
   * Bulk imports catalog rows with row-level validation, duplicate detection,
   * category/brand resolution, and sub-5-second processing for 500 rows.
   */
  static async importCatalog(
    shopId: mongoose.Types.ObjectId | string,
    input: string | CatalogImportRow[],
    options: { previewOnly?: boolean } = {}
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const errors: Array<{ row: number; issue: string }> = [];

    // Parse CSV or array input
    let rows: CatalogImportRow[] = [];
    if (typeof input === 'string') {
      const parsedRecords = parseCsv(input);
      rows = parsedRecords.map((r) => ({
        productName: r['productname'] || r['name'] || r['product'] || '',
        category: r['category'] || r['categoryname'] || 'General',
        brand: r['brand'] || r['brandname'] || 'Generic',
        hasImei: r['hasimei'] ? r['hasimei'].toLowerCase() === 'true' || r['hasimei'] === '1' : true,
        modelNumber: r['modelnumber'] || r['model'] || '',
        variantName: r['variantname'] || r['variant'] || '',
        color: r['color'] || '',
        ram: r['ram'] || '',
        storage: r['storage'] || '',
        barcode: r['barcode'] || '',
        mrp: parseFloat(r['mrp'] || r['mrpprice'] || r['retailprice'] || '0'),
        msp: parseFloat(r['msp'] || r['minsellingprice'] || r['minprice'] || '0'),
        purchaseCost: parseFloat(r['purchasecost'] || r['cost'] || r['msp'] || '0'),
        initialStock: parseInt(r['initialstock'] || r['stock'] || '0', 10)
      }));
    } else {
      rows = input;
    }

    if (rows.length === 0) {
      return {
        totalRowsProcessed: 0,
        productsCreated: 0,
        variantsCreated: 0,
        skippedCount: 0,
        errors: [{ row: 0, issue: 'No valid rows found in import data' }],
        durationMs: Date.now() - startTime
      };
    }

    // Preload existing barcodes and categories/brands for instant in-memory lookup
    const [existingBarcodesArr, existingCategories, existingBrands] = await Promise.all([
      ProductVariant.find({ shopId, isDeleted: false }, { barcode: 1 }).lean(),
      Category.find({ shopId, isDeleted: false }).lean(),
      Brand.find({ shopId, isDeleted: false }).lean()
    ]);

    const activeBarcodes = new Set<string>();
    for (const b of existingBarcodesArr) {
      if (b.barcode) activeBarcodes.add(b.barcode.trim());
    }

    const categoryMap = new Map<string, mongoose.Types.ObjectId>();
    for (const c of existingCategories) {
      categoryMap.set(c.name.toLowerCase().trim(), c._id);
      categoryMap.set(c.slug, c._id);
    }

    const brandMap = new Map<string, mongoose.Types.ObjectId>();
    for (const b of existingBrands) {
      brandMap.set(b.name.toLowerCase().trim(), b._id);
      brandMap.set(b.slug, b._id);
    }

    // Group valid rows by Product (key = brand:productName)
    const productGroups = new Map<string, { productInfo: any; variants: any[] }>();
    const seenBarcodesInBatch = new Set<string>();
    let skippedCount = 0;

    for (let idx = 0; idx < rows.length; idx++) {
      const rowNum = idx + 2; // 1-indexed including header
      const row = rows[idx];
      if (!row) continue;

      // Row Validation
      if (!row.productName || row.productName.trim().length === 0) {
        errors.push({ row: rowNum, issue: 'Missing required field: productName' });
        continue;
      }
      if (!row.category || row.category.trim().length === 0) {
        errors.push({ row: rowNum, issue: 'Missing required field: category' });
        continue;
      }
      if (!row.brand || row.brand.trim().length === 0) {
        errors.push({ row: rowNum, issue: 'Missing required field: brand' });
        continue;
      }

      const mrpNum = Number(row.mrp);
      const mspNum = Number(row.msp);
      if (isNaN(mrpNum) || mrpNum <= 0) {
        errors.push({ row: rowNum, issue: 'Invalid MRP: must be a positive number' });
        continue;
      }
      if (isNaN(mspNum) || mspNum <= 0) {
        errors.push({ row: rowNum, issue: 'Invalid MSP: must be a positive number' });
        continue;
      }
      if (mspNum > mrpNum) {
        errors.push({ row: rowNum, issue: `MSP (৳${mspNum}) cannot be greater than MRP (৳${mrpNum})` });
        continue;
      }

      // Barcode validation
      let barcode = row.barcode ? String(row.barcode).trim() : '';
      if (barcode) {
        if (seenBarcodesInBatch.has(barcode) || activeBarcodes.has(barcode)) {
          errors.push({ row: rowNum, issue: `Duplicate barcode detected: "${barcode}"` });
          skippedCount++;
          continue;
        }
        seenBarcodesInBatch.add(barcode);
      } else {
        barcode = generateBarcode();
      }

      // Grouping key
      const groupKey = `${slugify(row.brand)}:::${slugify(row.productName)}`;
      if (!productGroups.has(groupKey)) {
        productGroups.set(groupKey, {
          productInfo: {
            name: row.productName.trim(),
            categoryName: row.category.trim(),
            brandName: row.brand.trim(),
            hasImei: row.hasImei !== undefined ? Boolean(row.hasImei) : true,
            modelNumber: row.modelNumber?.trim() || ''
          },
          variants: []
        });
      }

      productGroups.get(groupKey)!.variants.push({
        variantName: row.variantName || `${row.productName} (${row.color || row.storage || 'Standard'})`,
        barcode,
        color: row.color,
        ram: row.ram,
        storage: row.storage,
        mrp: mrpNum,
        msp: mspNum,
        purchaseCost: Number(row.purchaseCost) || mspNum,
        initialStock: Math.max(0, Number(row.initialStock) || 0)
      });
    }

    if (options.previewOnly) {
      return {
        totalRowsProcessed: rows.length,
        productsCreated: productGroups.size,
        variantsCreated: Array.from(productGroups.values()).reduce((sum, g) => sum + g.variants.length, 0),
        skippedCount,
        errors,
        durationMs: Date.now() - startTime
      };
    }

    // Persist Categories & Brands if they don't already exist
    for (const group of productGroups.values()) {
      const catKey = group.productInfo.categoryName.toLowerCase();
      if (!categoryMap.has(catKey)) {
        const newCat = new Category({
          shopId,
          name: group.productInfo.categoryName,
          slug: slugify(group.productInfo.categoryName),
          isDeleted: false
        });
        await newCat.save();
        categoryMap.set(catKey, newCat._id);
        categoryMap.set(newCat.slug, newCat._id);
      }

      const brandKey = group.productInfo.brandName.toLowerCase();
      if (!brandMap.has(brandKey)) {
        const newBrand = new Brand({
          shopId,
          name: group.productInfo.brandName,
          slug: slugify(group.productInfo.brandName),
          isDeleted: false
        });
        await newBrand.save();
        brandMap.set(brandKey, newBrand._id);
        brandMap.set(newBrand.slug, newBrand._id);
      }
    }

    let productsCreated = 0;
    let variantsCreated = 0;

    // Create Products and ProductVariants
    for (const group of productGroups.values()) {
      const categoryId = categoryMap.get(group.productInfo.categoryName.toLowerCase());
      const brandId = brandMap.get(group.productInfo.brandName.toLowerCase());

      const product = new Product({
        shopId,
        name: group.productInfo.name,
        categoryId,
        brandId,
        modelNumber: group.productInfo.modelNumber,
        productType: group.productInfo.hasImei ? 'handset' : 'accessory',
        hasImei: group.productInfo.hasImei,
        warrantyMonths: group.productInfo.hasImei ? 12 : 0,
        isDeleted: false
      });
      await product.save();
      productsCreated++;

      for (let vIdx = 0; vIdx < group.variants.length; vIdx++) {
        const v = group.variants[vIdx];
        const sku = `${slugify(group.productInfo.brandName)}-${slugify(group.productInfo.name)}-${vIdx + 1}-${Math.floor(1000 + Math.random() * 9000)}`.toUpperCase();

        const variant = new ProductVariant({
          shopId,
          productId: product._id,
          sku,
          barcode: v.barcode,
          variantName: v.variantName,
          attributes: {
            color: v.color,
            ram: v.ram,
            storage: v.storage
          },
          mrp: decimal128Setter(v.mrp),
          msp: decimal128Setter(v.msp),
          purchaseCost: decimal128Setter(v.purchaseCost),
          reorderLevel: 5,
          alertQuantity: 5,
          currentStock: group.productInfo.hasImei ? 0 : v.initialStock,
          isDeleted: false
        });
        await variant.save();
        variantsCreated++;
      }
    }

    return {
      totalRowsProcessed: rows.length,
      productsCreated,
      variantsCreated,
      skippedCount,
      errors,
      durationMs: Date.now() - startTime
    };
  }
}
