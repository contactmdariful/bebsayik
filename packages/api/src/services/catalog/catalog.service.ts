import mongoose from 'mongoose';
import { Category, ICategory } from '../../models/Category.js';
import { Brand, IBrand } from '../../models/Brand.js';
import { Product } from '../../models/Product.js';
import { ProductVariant } from '../../models/ProductVariant.js';
import { ImeiSerial } from '../../models/ImeiSerial.js';
import { decimal128Setter, decimal128Getter } from '../../utils/money.js';

export function generateBarcode(): string {
  // Generate 12-digit internal Dokan EAN prefix (200 + random 9 digits) + Luhn/EAN check digit
  const base = `200${Math.floor(100000000 + Math.random() * 900000000)}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base.charAt(i), 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${base}${checkDigit}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class CatalogService {
  /* ================= CATEGORIES ================= */

  static async listCategories(
    shopId: mongoose.Types.ObjectId | string,
    query: { search?: string; isDeleted?: boolean } = {}
  ): Promise<ICategory[]> {
    const filter: any = { shopId, isDeleted: query.isDeleted ?? false };
    if (query.search) {
      filter.name = { $regex: query.search.trim(), $options: 'i' };
    }
    return Category.find(filter).sort({ name: 1 });
  }

  static async createCategory(
    shopId: mongoose.Types.ObjectId | string,
    data: { name: string; description?: string }
  ): Promise<ICategory> {
    const slug = slugify(data.name);
    const existing = await Category.findOne({ shopId, slug });
    if (existing) {
      if (existing.isDeleted) {
        existing.isDeleted = false;
        if (data.description !== undefined) {
          existing.description = data.description;
        }
        await existing.save();
        return existing;
      }
      const err: any = new Error(`Category with name "${data.name}" already exists`);
      err.code = 'CATEGORY_ALREADY_EXISTS';
      err.statusCode = 409;
      throw err;
    }

    const category = new Category({
      shopId,
      name: data.name.trim(),
      slug,
      description: data.description,
      isDeleted: false
    });
    return category.save();
  }

  static async updateCategory(
    shopId: mongoose.Types.ObjectId | string,
    id: string,
    data: { name?: string; description?: string }
  ): Promise<ICategory> {
    const category = await Category.findOne({ _id: id, shopId });
    if (!category) {
      const err: any = new Error('Category not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (data.name) {
      category.name = data.name.trim();
      category.slug = slugify(data.name);
    }
    if (data.description !== undefined) {
      category.description = data.description;
    }
    return category.save();
  }

  static async deleteCategory(
    shopId: mongoose.Types.ObjectId | string,
    id: string
  ): Promise<boolean> {
    const category = await Category.findOne({ _id: id, shopId });
    if (!category) {
      const err: any = new Error('Category not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const linkedProducts = await Product.countDocuments({
      shopId,
      categoryId: id,
      isDeleted: false
    });
    if (linkedProducts > 0) {
      const err: any = new Error(
        `Cannot delete category: ${linkedProducts} active products are currently assigned to it`
      );
      err.code = 'CATEGORY_HAS_ACTIVE_PRODUCTS';
      err.statusCode = 422;
      throw err;
    }

    category.isDeleted = true;
    await category.save();
    return true;
  }

  /* ================= BRANDS ================= */

  static async listBrands(
    shopId: mongoose.Types.ObjectId | string,
    query: { search?: string; isDeleted?: boolean } = {}
  ): Promise<IBrand[]> {
    const filter: any = { shopId, isDeleted: query.isDeleted ?? false };
    if (query.search) {
      filter.name = { $regex: query.search.trim(), $options: 'i' };
    }
    return Brand.find(filter).sort({ name: 1 });
  }

  static async createBrand(
    shopId: mongoose.Types.ObjectId | string,
    data: { name: string; logoUrl?: string; originCountry?: string }
  ): Promise<IBrand> {
    const slug = slugify(data.name);
    const existing = await Brand.findOne({ shopId, slug });
    if (existing) {
      if (existing.isDeleted) {
        existing.isDeleted = false;
        if (data.logoUrl !== undefined) {
          existing.logoUrl = data.logoUrl;
        }
        await existing.save();
        return existing;
      }
      const err: any = new Error(`Brand with name "${data.name}" already exists`);
      err.code = 'BRAND_ALREADY_EXISTS';
      err.statusCode = 409;
      throw err;
    }

    const brand = new Brand({
      shopId,
      name: data.name.trim(),
      slug,
      logoUrl: data.logoUrl,
      isDeleted: false
    });
    return brand.save();
  }

  static async updateBrand(
    shopId: mongoose.Types.ObjectId | string,
    id: string,
    data: { name?: string; logoUrl?: string }
  ): Promise<IBrand> {
    const brand = await Brand.findOne({ _id: id, shopId });
    if (!brand) {
      const err: any = new Error('Brand not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (data.name) {
      brand.name = data.name.trim();
      brand.slug = slugify(data.name);
    }
    if (data.logoUrl !== undefined) {
      brand.logoUrl = data.logoUrl;
    }
    return brand.save();
  }

  static async deleteBrand(
    shopId: mongoose.Types.ObjectId | string,
    id: string
  ): Promise<boolean> {
    const brand = await Brand.findOne({ _id: id, shopId });
    if (!brand) {
      const err: any = new Error('Brand not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const linkedProducts = await Product.countDocuments({
      shopId,
      brandId: id,
      isDeleted: false
    });
    if (linkedProducts > 0) {
      const err: any = new Error(
        `Cannot delete brand: ${linkedProducts} active products are currently assigned to it`
      );
      err.code = 'BRAND_HAS_ACTIVE_PRODUCTS';
      err.statusCode = 422;
      throw err;
    }

    brand.isDeleted = true;
    await brand.save();
    return true;
  }

  /* ================= PRODUCTS & VARIANTS ================= */

  static async listProducts(
    shopId: mongoose.Types.ObjectId | string,
    options: {
      search?: string;
      categoryId?: string;
      brandId?: string;
      hasImei?: boolean;
      productType?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ products: any[]; pagination: any }> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 25));
    const skip = (page - 1) * limit;

    const filter: any = { shopId, isDeleted: false };
    if (options.categoryId) filter.categoryId = options.categoryId;
    if (options.brandId) filter.brandId = options.brandId;
    if (options.hasImei !== undefined) filter.hasImei = options.hasImei;
    if (options.productType) filter.productType = options.productType;

    if (options.search) {
      const searchRegex = { $regex: options.search.trim(), $options: 'i' };
      filter.$or = [{ name: searchRegex }, { modelNumber: searchRegex }];
    }

    const [products, totalRecords] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name slug')
        .populate('brandId', 'name slug logoUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter)
    ]);

    const productIds = products.map((p) => p._id);
    const variants = await ProductVariant.find({
      shopId,
      productId: { $in: productIds },
      isDeleted: false
    }).lean();

    // Attach variants to corresponding products
    const variantsByProduct = new Map<string, any[]>();
    for (const v of variants) {
      const pid = v.productId.toString();
      if (!variantsByProduct.has(pid)) variantsByProduct.set(pid, []);
      variantsByProduct.get(pid)!.push({
        ...v,
        mrp: decimal128Getter(v.mrp),
        msp: decimal128Getter(v.msp),
        purchaseCost: decimal128Getter(v.purchaseCost)
      });
    }

    const enriched = products.map((p) => ({
      ...p,
      variants: variantsByProduct.get(p._id.toString()) || []
    }));

    return {
      products: enriched,
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

  static async getProduct(
    shopId: mongoose.Types.ObjectId | string,
    id: string
  ): Promise<any> {
    const product = await Product.findOne({ _id: id, shopId, isDeleted: false })
      .populate('categoryId', 'name slug')
      .populate('brandId', 'name slug logoUrl')
      .lean();

    if (!product) {
      const err: any = new Error('Product not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const variants = await ProductVariant.find({
      shopId,
      productId: id,
      isDeleted: false
    }).lean();

    // For handset variants, count active available IMEIs
    const enrichedVariants = await Promise.all(
      variants.map(async (v) => {
        let availableImeiCount = 0;
        if (product.hasImei) {
          availableImeiCount = await ImeiSerial.countDocuments({
            shopId,
            variantId: v._id,
            status: { $in: ['AVAILABLE', 'available'] }
          });
        }

        return {
          ...v,
          mrp: decimal128Getter(v.mrp),
          msp: decimal128Getter(v.msp),
          purchaseCost: decimal128Getter(v.purchaseCost),
          availableImeiCount: product.hasImei ? availableImeiCount : undefined
        };
      })
    );

    return {
      ...product,
      variants: enrichedVariants
    };
  }

  static async createProduct(
    shopId: mongoose.Types.ObjectId | string,
    data: {
      name: string;
      categoryId: string | mongoose.Types.ObjectId;
      brandId: string | mongoose.Types.ObjectId;
      modelNumber?: string;
      productType?: 'handset' | 'accessory' | 'spare_part';
      hasImei?: boolean;
      warrantyMonths?: number;
      description?: string;
      variants: Array<{
        variantName?: string;
        sku?: string;
        barcode?: string;
        attributes?: Record<string, any>;
        mrp: number | string;
        msp: number | string;
        purchaseCost?: number | string;
        reorderLevel?: number;
        currentStock?: number;
      }>;
    }
  ): Promise<any> {
    // Validate category and brand belong to shop or exist
    const [category, brand] = await Promise.all([
      Category.findOne({ _id: data.categoryId, shopId, isDeleted: false }),
      Brand.findOne({ _id: data.brandId, shopId, isDeleted: false })
    ]);

    if (!category) {
      const err: any = new Error('Invalid or unassigned Category ID for this shop');
      err.code = 'INVALID_CATEGORY';
      err.statusCode = 422;
      throw err;
    }
    if (!brand) {
      const err: any = new Error('Invalid or unassigned Brand ID for this shop');
      err.code = 'INVALID_BRAND';
      err.statusCode = 422;
      throw err;
    }

    if (!data.variants || data.variants.length === 0) {
      const err: any = new Error('A product must contain at least one variant SKU');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 422;
      throw err;
    }

    const hasImei = data.hasImei !== undefined ? data.hasImei : data.productType !== 'accessory';
    const productType = data.productType || (hasImei ? 'handset' : 'accessory');

    const product = new Product({
      shopId,
      name: data.name.trim(),
      categoryId: category._id,
      brandId: brand._id,
      modelNumber: data.modelNumber?.trim(),
      productType,
      hasImei,
      warrantyMonths: data.warrantyMonths || 0,
      description: data.description,
      isDeleted: false
    });
    await product.save();

    const createdVariants = [];
    for (let i = 0; i < data.variants.length; i++) {
      const v = data.variants[i];
      if (!v) continue;
      const barcode = v.barcode?.trim() || generateBarcode();
      const sku =
        v.sku?.trim() ||
        `${slugify(brand.name)}-${slugify(data.name)}-${i + 1}-${Math.floor(1000 + Math.random() * 9000)}`.toUpperCase();

      // Check unique barcode within shop
      const existingBarcode = await ProductVariant.findOne({
        shopId,
        barcode,
        isDeleted: false
      });
      if (existingBarcode) {
        const err: any = new Error(`Barcode "${barcode}" is already assigned to another variant`);
        err.code = 'DUPLICATE_BARCODE';
        err.statusCode = 409;
        throw err;
      }

      const variant = new ProductVariant({
        shopId,
        productId: product._id,
        sku,
        barcode,
        variantName: v.variantName || `${data.name} (SKU ${i + 1})`,
        attributes: v.attributes || {},
        mrp: decimal128Setter(v.mrp),
        msp: decimal128Setter(v.msp),
        purchaseCost: decimal128Setter(v.purchaseCost ?? v.msp),
        reorderLevel: v.reorderLevel || 5,
        alertQuantity: v.reorderLevel || 5,
        currentStock: hasImei ? 0 : Number(v.currentStock || 0),
        isDeleted: false
      });
      await variant.save();
      createdVariants.push({
        ...variant.toObject(),
        mrp: decimal128Getter(variant.mrp),
        msp: decimal128Getter(variant.msp),
        purchaseCost: decimal128Getter(variant.purchaseCost)
      });
    }

    return {
      ...product.toObject(),
      variants: createdVariants
    };
  }

  static async updateProduct(
    shopId: mongoose.Types.ObjectId | string,
    id: string,
    data: {
      name?: string;
      warrantyMonths?: number;
      description?: string;
      variants?: Array<{
        variantId?: string;
        minSellingPrice?: number | string;
        mrpPrice?: number | string;
        msp?: number | string;
        mrp?: number | string;
        reorderLevel?: number;
      }>;
    }
  ): Promise<any> {
    const product = await Product.findOne({ _id: id, shopId, isDeleted: false });
    if (!product) {
      const err: any = new Error('Product not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (data.name) product.name = data.name.trim();
    if (data.warrantyMonths !== undefined) product.warrantyMonths = Number(data.warrantyMonths);
    if (data.description !== undefined) product.description = data.description;
    await product.save();

    if (data.variants && data.variants.length > 0) {
      for (const vData of data.variants) {
        if (!vData.variantId) continue;
        const variant = await ProductVariant.findOne({
          _id: vData.variantId,
          productId: product._id,
          shopId
        });
        if (variant) {
          const newMsp = vData.msp ?? vData.minSellingPrice;
          const newMrp = vData.mrp ?? vData.mrpPrice;
          if (newMsp !== undefined) variant.msp = decimal128Setter(newMsp);
          if (newMrp !== undefined) variant.mrp = decimal128Setter(newMrp);
          if (vData.reorderLevel !== undefined) {
            variant.reorderLevel = Number(vData.reorderLevel);
            variant.alertQuantity = Number(vData.reorderLevel);
          }
          await variant.save();
        }
      }
    }

    return this.getProduct(shopId, id);
  }

  static async deleteProduct(
    shopId: mongoose.Types.ObjectId | string,
    id: string
  ): Promise<boolean> {
    const product = await Product.findOne({ _id: id, shopId, isDeleted: false });
    if (!product) {
      const err: any = new Error('Product not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // Safety check: Cannot delete if active IMEI stock exists
    const variants = await ProductVariant.find({ productId: id, shopId, isDeleted: false });
    const variantIds = variants.map((v) => v._id);

    const activeImeisForProduct = await ImeiSerial.countDocuments({
      shopId,
      variantId: { $in: variantIds },
      status: { $in: ['AVAILABLE', 'available', 'HELD_CART', 'held_cart'] }
    });

    if (activeImeisForProduct > 0) {
      const err: any = new Error(
        `Cannot delete product: Contains ${activeImeisForProduct} active serialized handsets in stock`
      );
      err.code = 'PRODUCT_HAS_ACTIVE_STOCK';
      err.statusCode = 422;
      throw err;
    }

    // Check non-serialized stock
    const accessoryStock = variants.reduce((sum, v) => sum + (v.currentStock || 0), 0);
    if (!product.hasImei && accessoryStock > 0) {
      const err: any = new Error(
        `Cannot delete accessory product: Contains ${accessoryStock} units in inventory`
      );
      err.code = 'PRODUCT_HAS_ACTIVE_STOCK';
      err.statusCode = 422;
      throw err;
    }

    // Soft delete product and variants
    product.isDeleted = true;
    await product.save();

    await ProductVariant.updateMany(
      { productId: id, shopId },
      { $set: { isDeleted: true } }
    );

    return true;
  }
}
