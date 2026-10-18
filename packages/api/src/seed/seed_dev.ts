import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../database/connection.js';
import {
  Shop,
  User,
  Category,
  Brand,
  Product,
  ProductVariant,
  ImeiSerial
} from '../models/index.js';
import { AccountingService } from '../services/accounting/accounting.service.js';
import { decimal128Setter } from '../utils/money.js';

/**
 * Kanchan Telecom Demo Store Standard Seed Profile
 * Codified per AGENT.md Section 13 and prompt.md Phase 0 & Phase 1
 */
export const KANCHAN_TELECOM_SEED_PROFILE = {
  shop: {
    _id: new mongoose.Types.ObjectId('6709a12b3c4d5e6f7a8b9c00'),
    name: 'Kanchan Telecom (Eastern Plaza Outlet)',
    slug: 'kanchan-telecom',
    subdomain: 'kanchan-telecom',
    customDomain: 'kanchan.bebsayik.com',
    binNumber: '002918274-0101',
    returnPolicyDays: 7,
    status: 'active' as const,
    subscriptionPlan: 'pro' as const,
    subscriptionStatus: 'active' as const
  },
  users: [
    {
      _id: new mongoose.Types.ObjectId('6709a12b3c4d5e6f7a8b9c01'),
      name: 'Sumon Dash',
      phone: '01712345678',
      role: 'STORE_OWNER' as const,
      managerPin: '9812',
      isActive: true
    },
    {
      _id: new mongoose.Types.ObjectId('6709a12b3c4d5e6f7a8b9c02'),
      name: 'Tanvir Ahmed',
      phone: '01711223344',
      role: 'CASHIER' as const,
      pin: '1234',
      isActive: true
    },
    {
      _id: new mongoose.Types.ObjectId('6709a12b3c4d5e6f7a8b9c03'),
      name: 'Rafiqul Islam',
      phone: '01722334455',
      role: 'TECHNICIAN' as const,
      pin: '1234',
      isActive: true
    }
  ],
  sampleHandsets: [
    {
      category: 'Smartphones',
      brand: 'Xiaomi / Redmi',
      modelName: 'Redmi Note 13 Pro 5G',
      variant: '8GB / 128GB - Phantom Black',
      sku: 'REDMI-N13P-8-128-BLK',
      imei1: '860123456789014', // Valid 15-digit Luhn
      imei2: '860123456789022', // Valid 15-digit Luhn
      specificLandedCost: '24200.00',
      minSellingPrice: '24500.00',
      mrpPrice: '27500.00',
      status: 'available' as const
    }
  ]
};

export async function runDemoSeeder(): Promise<void> {
  console.log('[Seeder] Initializing Kanchan Telecom Demo Seeder...');
  await connectDatabase();

  const shopData = KANCHAN_TELECOM_SEED_PROFILE.shop;
  const shop = await Shop.findOneAndUpdate(
    { _id: shopData._id },
    { $set: shopData },
    { upsert: true, new: true }
  );
  console.log(`[Seeder] Shop synchronized: ${shop.name} (${shop._id})`);

  for (const userData of KANCHAN_TELECOM_SEED_PROFILE.users) {
    await User.findOneAndUpdate(
      { phone: userData.phone },
      {
        $set: {
          ...userData,
          shopId: shop._id
        }
      },
      { upsert: true, new: true }
    );
    console.log(`[Seeder] User synchronized: ${userData.name} [${userData.role}]`);
  }

  // Seed Standard Chart of Accounts (COA)
  const coaCount = await AccountingService.seedDefaultChartOfAccounts(shop._id);
  console.log(`[Seeder] Standard Chart of Accounts verified: ${coaCount} new accounts created (total 35 accounts)`);

  // Seed Catalog and Sample Handsets
  for (const item of KANCHAN_TELECOM_SEED_PROFILE.sampleHandsets) {
    const category = await Category.findOneAndUpdate(
      { shopId: shop._id, name: item.category },
      { $set: { shopId: shop._id, name: item.category, code: 'CAT-SMARTPHONE' } },
      { upsert: true, new: true }
    );

    const brand = await Brand.findOneAndUpdate(
      { shopId: shop._id, name: item.brand },
      { $set: { shopId: shop._id, name: item.brand, code: 'BRD-REDMI' } },
      { upsert: true, new: true }
    );

    const product = await Product.findOneAndUpdate(
      { shopId: shop._id, name: item.modelName },
      {
        $set: {
          shopId: shop._id,
          categoryId: category._id,
          brandId: brand._id,
          name: item.modelName,
          deviceType: 'mobile',
          trackingType: 'imei'
        }
      },
      { upsert: true, new: true }
    );

    const variant = await ProductVariant.findOneAndUpdate(
      { shopId: shop._id, productId: product._id, sku: item.sku },
      {
        $set: {
          shopId: shop._id,
          productId: product._id,
          sku: item.sku,
          attributes: { color: 'Phantom Black', ram: '8GB', storage: '128GB' },
          purchaseCost: decimal128Setter(item.specificLandedCost),
          mrp: decimal128Setter(item.mrpPrice),
          msp: decimal128Setter(item.minSellingPrice)
        }
      },
      { upsert: true, new: true }
    );

    await ImeiSerial.findOneAndUpdate(
      { shopId: shop._id, imei1: item.imei1 },
      {
        $set: {
          shopId: shop._id,
          variantId: variant._id,
          imei1: item.imei1,
          imei2: item.imei2,
          purchaseCost: decimal128Setter(item.specificLandedCost),
          sellingPrice: decimal128Setter(item.mrpPrice),
          status: item.status
        }
      },
      { upsert: true, new: true }
    );

    console.log(`[Seeder] Sample handset synchronized: ${item.modelName} [IMEI1: ${item.imei1}]`);
  }

  console.log('[Seeder] Kanchan Telecom seed profile successfully completed.');
}

if (process.argv[1] && process.argv[1].includes('seed_dev')) {
  runDemoSeeder()
    .then(async () => {
      await disconnectDatabase();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seeder] Failed with error:', err);
      await disconnectDatabase();
      process.exit(1);
    });
}
