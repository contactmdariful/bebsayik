import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from './connection.js';
import {
  Shop,
  User,
  Account,
  AccountTransaction,
  Customer,
  Supplier,
  ProductVariant,
  ImeiSerial,
  Sale,
  AuthOtp,
  MarketingLead,
  PhoneChangeRequest
} from '../models/index.js';
import { withTransaction } from './transaction.js';
import { AccountingService } from '../services/accounting/accounting.service.js';
import { decimal128Setter } from '../utils/money.js';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

export async function runLiveConstraintsAudit(): Promise<TestResult[]> {
  console.log('=== Bebsayik Phase 1: MongoDB Atlas Live Constraints & Edge Cases Audit ===\n');
  await connectDatabase();

  const results: TestResult[] = [];
  const testShopId = new mongoose.Types.ObjectId();
  const otherShopId = new mongoose.Types.ObjectId();
  const testUserId = new mongoose.Types.ObjectId();

  try {
    // ---------------------------------------------------------
    // TEST 1: Atlas Index Synchronization across critical models
    // ---------------------------------------------------------
    console.log('[Audit 1/7] Synchronizing indexes on MongoDB Atlas cluster...');
    const syncModels = [
      Account,
      AccountTransaction,
      Customer,
      Supplier,
      ProductVariant,
      ImeiSerial,
      Sale,
      AuthOtp,
      MarketingLead,
      PhoneChangeRequest,
      Shop,
      User
    ];

    for (const model of syncModels) {
      await model.syncIndexes();
    }
    results.push({
      name: 'Index Synchronization (All critical models)',
      passed: true,
      details: 'Indexes cleanly created/verified on MongoDB Atlas replica set without error'
    });
    console.log('  -> PASS: All model indexes synchronized on Atlas.\n');

    // ---------------------------------------------------------
    // TEST 2: Tenant Isolation on Unique Indexes (Same Code in Different Shops vs Same Shop)
    // ---------------------------------------------------------
    console.log('[Audit 2/7] Verifying Tenant Isolation on Accounts...');
    // Create account 1.1.01 in Shop A
    const acctShopA = new Account({
      shopId: testShopId,
      code: 'TEST.1.1.01',
      name: 'Counter 1 Cash Drawer (Shop A)',
      accountType: 'asset',
      normalBalance: 'debit',
      currentBalance: decimal128Setter('1000.00')
    });
    await acctShopA.save();

    // Create account 1.1.01 in Shop B (MUST SUCCEED due to tenant isolation)
    const acctShopB = new Account({
      shopId: otherShopId,
      code: 'TEST.1.1.01',
      name: 'Counter 1 Cash Drawer (Shop B)',
      accountType: 'asset',
      normalBalance: 'debit',
      currentBalance: decimal128Setter('2000.00')
    });
    await acctShopB.save();

    // Attempt to create duplicate 1.1.01 in Shop A (MUST FAIL with E11000)
    let duplicateRejected = false;
    try {
      const acctShopADup = new Account({
        shopId: testShopId,
        code: 'TEST.1.1.01',
        name: 'Another Drawer (Shop A)',
        accountType: 'asset',
        normalBalance: 'debit',
        currentBalance: decimal128Setter('500.00')
      });
      await acctShopADup.save();
    } catch (err: any) {
      if (err.code === 11000 || err.message.includes('E11000')) {
        duplicateRejected = true;
      }
    }

    results.push({
      name: 'Tenant Isolation on Accounts (ShopId + Code)',
      passed: duplicateRejected,
      details: duplicateRejected
        ? 'Shop A duplicate rejected by E11000, while Shop B independently created identical account code'
        : 'FAILED: Duplicate was not rejected by MongoDB Atlas unique index'
    });
    console.log(`  -> ${duplicateRejected ? 'PASS' : 'FAIL'}: Tenant isolation verified for Accounts.\n`);

    // ---------------------------------------------------------
    // TEST 3: Partial Unique Index on Available IMEIs
    // ---------------------------------------------------------
    console.log('[Audit 3/7] Verifying Partial Unique Index on Available IMEIs...');
    const testImei = '860123456789014';
    const variantId = new mongoose.Types.ObjectId();

    // Insert handset 1 as available
    const imeiDoc1 = new ImeiSerial({
      shopId: testShopId,
      variantId,
      imei1: testImei,
      purchaseCost: decimal128Setter('24200.00'),
      status: 'available'
    });
    await imeiDoc1.save();

    // Attempt to insert handset 2 with same IMEI as available (MUST FAIL)
    let duplicateImeiRejected = false;
    try {
      const imeiDoc2 = new ImeiSerial({
        shopId: testShopId,
        variantId,
        imei1: testImei,
        purchaseCost: decimal128Setter('24200.00'),
        status: 'available'
      });
      await imeiDoc2.save();
    } catch (err: any) {
      if (err.code === 11000 || err.message.includes('E11000')) {
        duplicateImeiRejected = true;
      }
    }

    // Now update handset 1 status to 'sold'
    imeiDoc1.status = 'sold';
    await imeiDoc1.save();

    // Now insert handset 3 with same IMEI as 'sold' or non-available (e.g. buyback or historical record) (MUST SUCCEED)
    let nonAvailableAllowed = false;
    try {
      const imeiDoc3 = new ImeiSerial({
        shopId: testShopId,
        variantId,
        imei1: testImei,
        purchaseCost: decimal128Setter('18000.00'),
        status: 'sold'
      });
      await imeiDoc3.save();
      nonAvailableAllowed = true;
      await ImeiSerial.deleteOne({ _id: imeiDoc3._id });
    } catch {
      nonAvailableAllowed = false;
    }

    const imeiTestPassed = duplicateImeiRejected && nonAvailableAllowed;
    results.push({
      name: 'Partial Unique Index on Available IMEIs',
      passed: imeiTestPassed,
      details: imeiTestPassed
        ? 'Duplicate available IMEI rejected by partial index, while sold handsets can coexist'
        : `FAILED: duplicateRejected=${duplicateImeiRejected}, nonAvailableAllowed=${nonAvailableAllowed}`
    });
    console.log(`  -> ${imeiTestPassed ? 'PASS' : 'FAIL'}: IMEI partial unique index verified.\n`);

    // ---------------------------------------------------------
    // TEST 4: TTL Index Expiration Configuration on AuthOtp
    // ---------------------------------------------------------
    console.log('[Audit 4/7] Verifying TTL Index metadata on AuthOtp collection...');
    const otpIndexes = await AuthOtp.collection.indexes();
    const ttlIndex = otpIndexes.find((idx: any) => idx.expireAfterSeconds !== undefined);
    const ttlPassed = ttlIndex !== undefined && ttlIndex.expireAfterSeconds === 120;

    results.push({
      name: 'TTL Index on AuthOtp (120s Auto-Purge)',
      passed: ttlPassed,
      details: ttlPassed
        ? `Found TTL index on field [${Object.keys(ttlIndex.key).join(', ')}] with expireAfterSeconds: ${ttlIndex.expireAfterSeconds}`
        : 'FAILED: TTL index with 120s expiration not found on AuthOtp collection'
    });
    console.log(`  -> ${ttlPassed ? 'PASS' : 'FAIL'}: AuthOtp TTL index verified on Atlas.\n`);

    // ---------------------------------------------------------
    // TEST 5: MongoDB Multi-Document ACID Transaction Rollback
    // ---------------------------------------------------------
    console.log('[Audit 5/7] Verifying MongoDB Multi-Document ACID Transaction Rollback...');
    const canaryVoucher = 'CANARY-ROLLBACK-001';

    let rollbackVerified = false;
    try {
      await withTransaction(async (session) => {
        // Step 1: Insert record inside transaction
        const canaryTxn = new AccountTransaction({
          shopId: testShopId,
          voucherNo: canaryVoucher,
          entryIndex: 0,
          txnCode: 'TX-01',
          accountId: acctShopA._id,
          debit: decimal128Setter('500.00'),
          credit: decimal128Setter('0.00'),
          runningBalanceAfter: decimal128Setter('1500.00'),
          description: 'Canary Transaction to be rolled back',
          sourceDocType: 'TEST',
          postedByUserId: testUserId
        });
        await canaryTxn.save({ session });

        // Step 2: Trigger intentional failure to force rollback
        throw new Error('INTENTIONAL_CANARY_FAILURE');
      });
    } catch (err: any) {
      if (err.message === 'INTENTIONAL_CANARY_FAILURE') {
        // Step 3: Verify the record was rolled back from MongoDB Atlas
        const found = await AccountTransaction.findOne({ shopId: testShopId, voucherNo: canaryVoucher });
        rollbackVerified = found === null;
      }
    }

    results.push({
      name: 'Multi-Document ACID Transaction Rollback',
      passed: rollbackVerified,
      details: rollbackVerified
        ? 'Verified complete rollback on MongoDB Atlas: transaction writes were uncommitted on failure'
        : 'FAILED: Write survived transaction abortion'
    });
    console.log(`  -> ${rollbackVerified ? 'PASS' : 'FAIL'}: Multi-document ACID rollback verified on Atlas.\n`);

    // ---------------------------------------------------------
    // TEST 6: Double-Entry Journal Idempotency Protection
    // ---------------------------------------------------------
    console.log('[Audit 6/7] Verifying Double-Entry Journal Idempotency...');
    const testVoucherNo = 'V-AUDIT-IDEMP-2026';

    const journalParams = {
      shopId: testShopId,
      voucherNo: testVoucherNo,
      txnCode: 'TX-01',
      sourceDocType: 'INV',
      postedByUserId: testUserId,
      entries: [
        { accountCode: 'TEST.1.1.01', debit: '5000.00', credit: '0.00', description: 'Cash In' },
        { accountCode: 'TEST.4.1.01', debit: '0.00', credit: '5000.00', description: 'Sales Revenue' }
      ]
    };

    // First posting via withTransaction
    await withTransaction(async (session) => {
      return AccountingService.postDoubleEntryJournal({ ...journalParams, session });
    });

    // Re-attempting duplicate posting with same voucherNo (MUST REJECT)
    let idempotencyBlocked = false;
    try {
      await withTransaction(async (session) => {
        return AccountingService.postDoubleEntryJournal({ ...journalParams, session });
      });
    } catch (err: any) {
      if (err.message.includes('Idempotency violation')) {
        idempotencyBlocked = true;
      }
    }

    results.push({
      name: 'Double-Entry Journal Idempotency Guard',
      passed: idempotencyBlocked,
      details: idempotencyBlocked
        ? `Re-posting voucher ${testVoucherNo} was immediately rejected with Idempotency violation`
        : 'FAILED: Duplicate journal voucher was erroneously permitted'
    });
    console.log(`  -> ${idempotencyBlocked ? 'PASS' : 'FAIL'}: Journal idempotency verified.\n`);

    // ---------------------------------------------------------
    // TEST 7: Decimal128 Money Precision Invariant in Database Storage
    // ---------------------------------------------------------
    console.log('[Audit 7/7] Verifying Decimal128 precision & zero float drift in storage...');
    const queriedAccount = await Account.findOne({ shopId: testShopId, code: 'TEST.1.1.01' });
    const rawDecimal128 = queriedAccount?.get('currentBalance', null, { getters: false });
    const isDecimal128 = rawDecimal128 instanceof mongoose.Types.Decimal128;
    const getterValue = queriedAccount?.currentBalance;
    const balanceString = rawDecimal128?.toString();
    const precisionPassed = isDecimal128 && balanceString === '6000.00' && String(getterValue) === '6000.00';

    results.push({
      name: 'Decimal128 Monetary Precision in Storage',
      passed: precisionPassed,
      details: precisionPassed
        ? `Raw BSON storage is authentic Decimal128 [${balanceString}], and schema getter converts cleanly to '${getterValue}' (0.00 drift)`
        : `FAILED: isDecimal128=${isDecimal128}, raw=${balanceString}, getter=${getterValue}`
    });
    console.log(`  -> ${precisionPassed ? 'PASS' : 'FAIL'}: Decimal128 storage precision verified.\n`);

    // Clean up test audit records
    await Account.deleteMany({ shopId: { $in: [testShopId, otherShopId] } });
    await AccountTransaction.deleteMany({ shopId: testShopId });
    await ImeiSerial.deleteMany({ shopId: testShopId });

  } finally {
    await disconnectDatabase();
  }

  console.log('=== Audit Summary ===');
  results.forEach((r, idx) => {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${idx + 1}. ${r.name}: ${r.details}`);
  });
  console.log('=====================\n');

  return results;
}

if (process.argv[1] && process.argv[1].includes('verify_phase1_constraints')) {
  runLiveConstraintsAudit()
    .then((results) => {
      const allPassed = results.every((r) => r.passed);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('[Audit Error]', err);
      process.exit(1);
    });
}
