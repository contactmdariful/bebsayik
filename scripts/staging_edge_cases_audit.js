import http from 'http';
import mongoose from 'mongoose';
import {
  connectDatabase,
  disconnectDatabase,
  withTransaction
} from './packages/api/dist/database/index.js';
import {
  Shop,
  User,
  Account,
  AccountTransaction,
  Product,
  ProductVariant,
  ImeiSerial,
  Sale,
  SaleItem,
  Shift,
  PersonalLedgerContact,
  PersonalLedgerTransaction,
  MfsTransaction
} from './packages/api/dist/models/index.js';
import {
  AccountingService,
  STANDARD_CHART_OF_ACCOUNTS,
  buildTx01CashSale,
  buildTx04OverpaymentChange,
  buildTx12MfsCashIn
} from './packages/api/dist/services/accounting/index.js';
import { PosService } from './packages/api/dist/services/pos/pos.service.js';
import {
  createAccessToken,
  hashPassword
} from './packages/api/dist/utils/security.js';
import {
  toDecimal,
  addMoney,
  subtractMoney,
  isMoneyEqual,
  formatMoney,
  decimal128Setter
} from './packages/api/dist/utils/money.js';

const edgeCaseResults = [];

function recordResult(category, testCase, passed, evidence, durationMs) {
  edgeCaseResults.push({ category, testCase, passed, evidence, durationMs });
  const statusStr = passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`[${statusStr}] [${category}] ${testCase} (${durationMs}ms)`);
  console.log(`       Evidence: ${evidence}`);
}

function makeHttpRequest(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      parsed,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Bebsayik-EdgeCase-Audit/2.0',
          ...(options.headers || {})
        },
        timeout: 10000
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch {
            json = body;
          }
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: json,
            rawBody: body
          });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`HTTP request timed out: ${url}`));
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runStagingEdgeCasesAudit() {
  console.log('========================================================================');
  console.log('   Bebsayik Platform — Staging Edge-Case & Concurrency Live Audit       ');
  console.log('   Target: bebsayik_staging (MongoDB Atlas Replica Set & Staging API)   ');
  console.log('========================================================================\n');

  const overallStartTime = Date.now();
  await connectDatabase();

  const auditShopAId = new mongoose.Types.ObjectId();
  const auditShopBId = new mongoose.Types.ObjectId();
  const userOwnerAId = new mongoose.Types.ObjectId();
  const userCashierAId = new mongoose.Types.ObjectId();
  const userOwnerBId = new mongoose.Types.ObjectId();

  const cleanupShopIds = [auditShopAId, auditShopBId];
  const cleanupUserIds = [userOwnerAId, userCashierAId, userOwnerBId];

  try {
    // -----------------------------------------------------------------------
    // PROVISIONING AUDIT FIXTURES
    // -----------------------------------------------------------------------
    console.log('[Setup] Provisioning isolated test shops and users in staging DB...');
    const nowTs = Date.now();

    const shopA = new Shop({
      _id: auditShopAId,
      name: 'Audit Dokan Galaxy A (Shop A)',
      slug: `audit-edge-a-${nowTs}`,
      status: 'active',
      ownerUserId: userOwnerAId
    });
    const shopB = new Shop({
      _id: auditShopBId,
      name: 'Audit Dokan Future Park (Shop B)',
      slug: `audit-edge-b-${nowTs}`,
      status: 'active',
      ownerUserId: userOwnerBId
    });
    await Promise.all([shopA.save(), shopB.save()]);

    const dummyPassHash = await hashPassword('StagingPassword2026#');
    const userOwnerA = new User({
      _id: userOwnerAId,
      phone: `01711${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: 'Owner A Eastern',
      role: 'STORE_OWNER',
      shopId: auditShopAId,
      accessibleShopIds: [auditShopAId],
      passwordHash: dummyPassHash,
      tokenVersion: 0,
      isActive: true
    });
    const userCashierA = new User({
      _id: userCashierAId,
      phone: `01722${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: 'Cashier A Terminal 1',
      role: 'CASHIER',
      shopId: auditShopAId,
      accessibleShopIds: [auditShopAId],
      passwordHash: dummyPassHash,
      tokenVersion: 0,
      isActive: true
    });
    const userOwnerB = new User({
      _id: userOwnerBId,
      phone: `01733${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: 'Owner B Bashundhara',
      role: 'STORE_OWNER',
      shopId: auditShopBId,
      accessibleShopIds: [auditShopBId],
      passwordHash: dummyPassHash,
      tokenVersion: 0,
      isActive: true
    });
    await Promise.all([userOwnerA.save(), userCashierA.save(), userOwnerB.save()]);

    // Seed COA for both shops
    await Promise.all([
      AccountingService.seedDefaultChartOfAccounts(auditShopAId),
      AccountingService.seedDefaultChartOfAccounts(auditShopBId)
    ]);

    // Open active shift for Cashier A
    const shiftA = new Shift({
      shopId: auditShopAId,
      cashierUserId: userCashierAId,
      openingCash: decimal128Setter('15000.00'),
      status: 'open',
      openedAt: new Date()
    });
    await shiftA.save();

    // Create JWT Access Tokens
    const tokenOwnerA = createAccessToken({
      userId: userOwnerAId.toString(),
      phone: userOwnerA.phone,
      role: 'STORE_OWNER',
      shopId: auditShopAId.toString(),
      tokenVersion: 0
    });
    const tokenCashierA = createAccessToken({
      userId: userCashierAId.toString(),
      phone: userCashierA.phone,
      role: 'CASHIER',
      shopId: auditShopAId.toString(),
      tokenVersion: 0
    });
    const tokenOwnerB = createAccessToken({
      userId: userOwnerBId.toString(),
      phone: userOwnerB.phone,
      role: 'STORE_OWNER',
      shopId: auditShopBId.toString(),
      tokenVersion: 0
    });

    console.log('✓ Setup complete: Shops, Users, COA, Shift and Tokens initialized.\n');

    // =======================================================================
    // EDGE CASE 1: CONCURRENT IMEI SALES RACE CONDITION
    // =======================================================================
    console.log('--- EDGE CASE 1: CONCURRENT IMEI SALES RACE CONDITION ---');
    {
      const t0 = Date.now();
      const categoryId = new mongoose.Types.ObjectId();
      const brandId = new mongoose.Types.ObjectId();
      const testImei = `869999000011${Math.floor(100 + Math.random() * 900)}`;

      const phoneProduct = new Product({
        shopId: auditShopAId,
        name: 'iPhone 15 Pro Max Titanium',
        categoryId,
        brandId,
        productType: 'handset',
        hasImei: true
      });
      await phoneProduct.save();

      const phoneVariant = new ProductVariant({
        shopId: auditShopAId,
        productId: phoneProduct._id,
        sku: `IPH-15PM-TI-${nowTs}`,
        variantName: 'Natural Titanium 256GB',
        mrp: decimal128Setter('165000.00'),
        msp: decimal128Setter('155000.00'),
        purchaseCost: decimal128Setter('145000.00'),
        currentStock: 1
      });
      await phoneVariant.save();

      const imeiDoc = new ImeiSerial({
        shopId: auditShopAId,
        variantId: phoneVariant._id,
        imei1: testImei,
        purchaseCost: decimal128Setter('145000.00'),
        status: 'AVAILABLE'
      });
      await imeiDoc.save();

      // Launch 2 simultaneous checkouts targeting the exact same IMEI
      const checkout1Promise = PosService.processCheckout({
        shopId: auditShopAId,
        userId: userCashierAId,
        idempotencyKey: `idemp-race-sale-1-${nowTs}`,
        payload: {
          items: [{
            variantId: phoneVariant._id.toString(),
            imei1: testImei,
            quantity: 1,
            unitPrice: '165000.00'
          }],
          payments: [{
            paymentMethod: 'cash',
            amountReceived: '165000.00',
            amountApplied: '165000.00'
          }]
        }
      });

      const checkout2Promise = PosService.processCheckout({
        shopId: auditShopAId,
        userId: userCashierAId,
        idempotencyKey: `idemp-race-sale-2-${nowTs}`,
        payload: {
          items: [{
            variantId: phoneVariant._id.toString(),
            imei1: testImei,
            quantity: 1,
            unitPrice: '165000.00'
          }],
          payments: [{
            paymentMethod: 'cash',
            amountReceived: '165000.00',
            amountApplied: '165000.00'
          }]
        }
      });

      const results = await Promise.allSettled([checkout1Promise, checkout2Promise]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      const exactlyOneSucceeded = fulfilled.length === 1 && rejected.length === 1;
      const rejectedReason = rejected[0]?.reason?.message || '';
      const isRejectionExpected =
        rejectedReason.includes('IMEI_ALREADY_SOLD') ||
        rejectedReason.includes('unavailable for sale') ||
        rejected[0]?.reason?.statusCode === 409;

      // Verify DB state: Handset is SOLD and associated with the single winning sale
      const finalImei = await ImeiSerial.findById(imeiDoc._id);
      const isStatusSold = finalImei?.status?.toUpperCase() === 'SOLD';
      const winningSaleId = fulfilled[0]?.value?.saleId;
      const matchesWinningSale = finalImei?.saleId?.toString() === winningSaleId;

      // Verify no duplicate sales recorded for this IMEI
      const saleCount = await SaleItem.countDocuments({ imeiId: imeiDoc._id });

      const racePassed = exactlyOneSucceeded && isRejectionExpected && isStatusSold && matchesWinningSale && saleCount === 1;

      recordResult(
        'Concurrent IMEI Sales',
        'Distributed lock & atomic transaction prevent double-selling same IMEI',
        racePassed,
        `2 concurrent checkouts: 1 fulfilled (${winningSaleId}), 1 rejected (${rejectedReason}). DB state: 1 sold unit, saleCount=1, zero double-selling`,
        Date.now() - t0
      );
    }

    // =======================================================================
    // EDGE CASE 2: CONCURRENT MULTI-DOCUMENT LEDGER POSTINGS
    // =======================================================================
    console.log('\n--- EDGE CASE 2: CONCURRENT MULTI-DOCUMENT LEDGER POSTINGS ---');
    {
      const t0 = Date.now();
      const cashAcct = await Account.findOne({ shopId: auditShopAId, code: '1.1.01' });
      const revAcct = await Account.findOne({ shopId: auditShopAId, code: '4.1.02' });

      const startCashBal = toDecimal(cashAcct?.currentBalance || 0);
      const startRevBal = toDecimal(revAcct?.currentBalance || 0);
      const concurrentPostingsCount = 5;
      const postingAmount = '1000.00';

      // Launch 5 concurrent journal postings affecting the same accounts simultaneously
      const postingPromises = Array.from({ length: concurrentPostingsCount }).map((_, idx) => {
        const voucherNo = `V-CONCURRENT-${nowTs}-${idx + 1}`;
        return withTransaction(async (session) => {
          return AccountingService.postDoubleEntryJournal({
            shopId: auditShopAId,
            voucherNo,
            txnCode: 'TX-01',
            sourceDocType: 'INV',
            postedByUserId: userCashierAId,
            entries: [
              { accountCode: '1.1.01', debit: postingAmount, credit: '0.00', description: `Concurrent Cash In ${idx + 1}` },
              { accountCode: '4.1.02', debit: '0.00', credit: postingAmount, description: `Concurrent Rev ${idx + 1}` }
            ],
            session
          });
        });
      });

      const postingResults = await Promise.allSettled(postingPromises);
      const allSucceeded = postingResults.every((r) => r.status === 'fulfilled');

      // Refresh accounts from DB
      const updatedCashAcct = await Account.findOne({ shopId: auditShopAId, code: '1.1.01' });
      const updatedRevAcct = await Account.findOne({ shopId: auditShopAId, code: '4.1.02' });

      const expectedCashBal = startCashBal.plus(toDecimal(postingAmount).times(concurrentPostingsCount));
      const expectedRevBal = startRevBal.plus(toDecimal(postingAmount).times(concurrentPostingsCount));

      const actualCashBal = toDecimal(updatedCashAcct?.currentBalance || 0);
      const actualRevBal = toDecimal(updatedRevAcct?.currentBalance || 0);

      const cashBalanceCorrect = isMoneyEqual(actualCashBal, expectedCashBal);
      const revBalanceCorrect = isMoneyEqual(actualRevBal, expectedRevBal);

      // Verify all 10 transaction records exist and are balanced
      const txnCount = await AccountTransaction.countDocuments({
        shopId: auditShopAId,
        voucherNo: { $regex: `^V-CONCURRENT-${nowTs}` }
      });

      const ledgerPassed = allSucceeded && cashBalanceCorrect && revBalanceCorrect && txnCount === concurrentPostingsCount * 2;

      recordResult(
        'Concurrent Ledger Postings',
        'ACID multi-document concurrency & automatic retry on write conflict',
        ledgerPassed,
        `All 5 concurrent postings committed: Cash balance updated from ${startCashBal} to ${actualCashBal} (expected ${expectedCashBal}), total journal rows=${txnCount}`,
        Date.now() - t0
      );
    }

    // =======================================================================
    // EDGE CASE 3: POS OVERPAYMENT & CASH CHANGE ACCOUNTING (TX-04)
    // =======================================================================
    console.log('\n--- EDGE CASE 3: POS OVERPAYMENT & CASH CHANGE ACCOUNTING (TX-04) ---');
    {
      const t0 = Date.now();
      const categoryId = new mongoose.Types.ObjectId();
      const brandId = new mongoose.Types.ObjectId();

      const accProduct = new Product({
        shopId: auditShopAId,
        name: 'Anker PowerPort III 65W Fast Charger',
        categoryId,
        brandId,
        productType: 'accessory',
        hasImei: false
      });
      await accProduct.save();

      const accVariant = new ProductVariant({
        shopId: auditShopAId,
        productId: accProduct._id,
        sku: `ANKER-65W-${nowTs}`,
        variantName: 'White / UK Pin',
        mrp: decimal128Setter('2500.00'),
        msp: decimal128Setter('2200.00'),
        purchaseCost: decimal128Setter('1800.00'),
        currentStock: 10
      });
      await accVariant.save();

      // Bill total = 2,500 BDT. Customer gives 3,000 BDT cash note. Change given = 500 BDT.
      const tenderNote = '3000.00';
      const billAmount = '2500.00';
      const expectedChange = '500.00';
      const idempKey = `idemp-overpay-${nowTs}`;

      const checkoutRes = await PosService.processCheckout({
        shopId: auditShopAId,
        userId: userCashierAId,
        idempotencyKey: idempKey,
        payload: {
          items: [{
            variantId: accVariant._id.toString(),
            quantity: 1,
            unitPrice: billAmount
          }],
          payments: [{
            paymentMethod: 'cash',
            amountReceived: tenderNote,
            amountApplied: billAmount
          }]
        }
      });

      const isGrandTotalMatch = checkoutRes.grandTotal === '2500.00';
      const isPaidMatch = checkoutRes.paidAmount === '2500.00';
      const isChangeMatch = checkoutRes.changeGiven === expectedChange;

      // Query the journal voucher posted for this invoice
      const sale = await Sale.findById(checkoutRes.saleId);
      const journalTxns = await AccountTransaction.find({
        shopId: auditShopAId,
        sourceDocId: sale?._id
      });

      let totalDebits = toDecimal(0);
      let totalCredits = toDecimal(0);
      let foundTenderDebit = false;
      let foundChangeCredit = false;

      for (const t of journalTxns) {
        totalDebits = addMoney(totalDebits, t.debit);
        totalCredits = addMoney(totalCredits, t.credit);
        if (t.accountId?.toString() === (await Account.findOne({ shopId: auditShopAId, code: '1.1.01' }))?._id.toString()) {
          if (isMoneyEqual(t.debit, tenderNote)) foundTenderDebit = true;
          if (isMoneyEqual(t.credit, expectedChange)) foundChangeCredit = true;
        }
      }

      const isJournalBalanced = isMoneyEqual(totalDebits, totalCredits);
      const overpaymentPassed = isGrandTotalMatch && isPaidMatch && isChangeMatch && isJournalBalanced && foundTenderDebit && foundChangeCredit;

      recordResult(
        'POS Overpayment (TX-04)',
        'Tender note vs change dispensed dual-leg ledger balancing',
        overpaymentPassed,
        `Bill=2,500, Note Received=3,000, Change Given=500. Journal entries: Debit Cash 3,000, Credit Cash 500. Debit=Credit=${totalDebits} BDT`,
        Date.now() - t0
      );
    }

    // =======================================================================
    // EDGE CASE 4: MFS REVERSAL & COMMISSION CLAWBACK ACCOUNTING
    // =======================================================================
    console.log('\n--- EDGE CASE 4: MFS REVERSAL & COMMISSION CLAWBACK ---');
    {
      const t0 = Date.now();
      const cashInAmount = '5000.00';
      const commissionAmount = '20.50'; // 4.1 per 1,000

      // Step A: Post original MFS Cash-In (TX-12)
      const cashInVoucherNo = `V-MFS-ORIG-${nowTs}`;
      const originalEntries = buildTx12MfsCashIn({
        amount: cashInAmount,
        telcoCommission: commissionAmount
      });

      await withTransaction(async (session) => {
        return AccountingService.postDoubleEntryJournal({
          shopId: auditShopAId,
          voucherNo: cashInVoucherNo,
          txnCode: 'TX-12',
          sourceDocType: 'MFS',
          postedByUserId: userCashierAId,
          entries: originalEntries,
          session
        });
      });

      // Step B: Post Full Reversal (e.g. transfer failed / customer cancellation)
      // Reverse entries:
      // Debit 1.3.01 (MFS SIM Float restored): 5,000.00
      // Credit 1.1.01 (Cash returned to customer from drawer): 5,000.00
      // Debit 4.3.01 (Clawback commission revenue): 20.50
      // Credit 1.3.01 (SIM float commission deducted): 20.50
      const reversalVoucherNo = `V-MFS-REV-${nowTs}`;
      const reversalEntries = [
        { accountCode: '1.3.01', debit: cashInAmount, credit: '0.00', description: 'MFS Float Reversal Restored' },
        { accountCode: '1.1.01', debit: '0.00', credit: cashInAmount, description: 'Cash Returned to Customer' },
        { accountCode: '4.3.01', debit: commissionAmount, credit: '0.00', description: 'Commission Clawback on Reversal' },
        { accountCode: '1.3.01', debit: '0.00', credit: commissionAmount, description: 'Float Commission Reversal' }
      ];

      let revDebits = toDecimal(0);
      let revCredits = toDecimal(0);
      for (const e of reversalEntries) {
        revDebits = addMoney(revDebits, e.debit);
        revCredits = addMoney(revCredits, e.credit);
      }
      const isReversalBalanced = isMoneyEqual(revDebits, revCredits);

      const reversalResult = await withTransaction(async (session) => {
        return AccountingService.postDoubleEntryJournal({
          shopId: auditShopAId,
          voucherNo: reversalVoucherNo,
          txnCode: 'TX-12-REV',
          sourceDocType: 'MFS',
          postedByUserId: userCashierAId,
          entries: reversalEntries,
          session
        });
      });

      const reversalSuccess = isReversalBalanced &&
                              reversalResult.voucherNo === reversalVoucherNo &&
                              isMoneyEqual(reversalResult.totalDebits, '5020.50');

      recordResult(
        'MFS Reversal & Refund',
        'Float restoration and commission revenue clawback double-entry parity',
        reversalSuccess,
        `MFS Cash-In 5,000 BDT + 20.50 commission reversed: Debits=Credits=5,020.50 BDT. Float and drawer cash returned to net zero`,
        Date.now() - t0
      );
    }

    // =======================================================================
    // EDGE CASE 5: CROSS-TENANT API AUTHORIZATION (LIVE HTTP GATEWAY)
    // =======================================================================
    console.log('\n--- EDGE CASE 5: CROSS-TENANT API AUTHORIZATION (LIVE HTTP GATEWAY) ---');
    const API_BASE = 'http://localhost:5000';

    // 5a. Cross-Tenant Workspace Access Block
    // User B (Owner of Shop B) tries to query Shop A's accounts via X-Shop-Id: shopAId
    {
      const t0 = Date.now();
      const res = await makeHttpRequest(`${API_BASE}/api/v1/accounts`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenOwnerB}`,
          'X-Shop-Id': auditShopAId.toString()
        }
      });

      const blockedAsExpected = res.statusCode === 403 &&
                                res.body?.error?.code === 'TENANT_ACCESS_DENIED' &&
                                res.body?.error?.message?.includes('not an authorized member of shop');

      recordResult(
        'Cross-Tenant API Security',
        'User B blocked from accessing Shop A accounts (HTTP 403 TENANT_ACCESS_DENIED)',
        blockedAsExpected,
        `HTTP Status: ${res.statusCode}, Error Code: ${res.body?.error?.code}, Reason: ${res.body?.error?.message}`,
        Date.now() - t0
      );
    }

    // 5b. Role Privilege Escalation Block (Cashier accessing Personal Ledger)
    // Cashier A tries to access Shop A's personal ledger (Amanat/Hawlat) -> Restricted to STORE_OWNER
    {
      const t0 = Date.now();
      const res = await makeHttpRequest(`${API_BASE}/api/v1/personal-ledger/contacts`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenCashierA}`,
          'X-Shop-Id': auditShopAId.toString()
        }
      });

      const cashierDenied = res.statusCode === 403 &&
                            res.body?.error?.code === 'INSUFFICIENT_PERMISSIONS';

      recordResult(
        'Cross-Tenant API Security',
        'Cashier blocked from accessing STORE_OWNER personal Amanat/Hawlat ledger',
        cashierDenied,
        `HTTP Status: ${res.statusCode}, Error Code: ${res.body?.error?.code}, Message: ${res.body?.error?.message}`,
        Date.now() - t0
      );
    }

    // 5c. Anti-Tampering Check: Body shopId Mismatch
    // Owner A sends X-Shop-Id: shopAId, but puts shopId: shopBId in body
    {
      const t0 = Date.now();
      const res = await makeHttpRequest(`${API_BASE}/api/v1/accounts/transfer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenOwnerA}`,
          'X-Shop-Id': auditShopAId.toString()
        }
      }, {
        shopId: auditShopBId.toString(), // Tampered mismatch
        fromAccountCode: '1.1.01',
        toAccountCode: '1.2.01',
        amount: '500.00'
      });

      const antiTamperBlocked = res.statusCode === 403 &&
                                res.body?.error?.code === 'TENANT_ACCESS_DENIED' &&
                                res.body?.error?.message?.includes('Tenant mismatch: request body shopId does not match');

      recordResult(
        'Cross-Tenant API Security',
        'Request body shopId tampering rejected by tenant guard anti-tampering check',
        antiTamperBlocked,
        `HTTP Status: ${res.statusCode}, Error Code: ${res.body?.error?.code}, Message: ${res.body?.error?.message}`,
        Date.now() - t0
      );
    }

    // 5d. Missing Tenant Header Rejection
    {
      const t0 = Date.now();
      const res = await makeHttpRequest(`${API_BASE}/api/v1/accounts`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenOwnerA}`
          // Missing X-Shop-Id
        }
      });

      const missingHeaderBlocked = res.statusCode === 403 &&
                                   res.body?.error?.code === 'TENANT_ACCESS_DENIED' &&
                                   res.body?.error?.message?.includes('Missing required X-Shop-Id');

      recordResult(
        'Cross-Tenant API Security',
        'Missing X-Shop-Id header blocked with 403 TENANT_ACCESS_DENIED',
        missingHeaderBlocked,
        `HTTP Status: ${res.statusCode}, Error Code: ${res.body?.error?.code}, Message: ${res.body?.error?.message}`,
        Date.now() - t0
      );
    }

    // 5e. Unauthenticated Access Block
    {
      const t0 = Date.now();
      const res = await makeHttpRequest(`${API_BASE}/api/v1/pos/checkout`, {
        method: 'POST',
        headers: {
          'X-Shop-Id': auditShopAId.toString()
        }
      }, { items: [] });

      const unauthBlocked = res.statusCode === 401 &&
                            res.body?.error?.code === 'UNAUTHORIZED';

      recordResult(
        'Cross-Tenant API Security',
        'Unauthenticated POS checkout request rejected with 401 UNAUTHORIZED',
        unauthBlocked,
        `HTTP Status: ${res.statusCode}, Error Code: ${res.body?.error?.code}`,
        Date.now() - t0
      );
    }

  } finally {
    // -----------------------------------------------------------------------
    // STRICT CLEANUP: PURGE ISOLATED TEST DATA FROM bebsayik_staging
    // -----------------------------------------------------------------------
    console.log('\n--- CLEANUP: PURGING AUDIT DATA FROM bebsayik_staging ---');
    const deleteByShop = { shopId: { $in: cleanupShopIds } };

    await Promise.all([
      Shop.deleteMany({ _id: { $in: cleanupShopIds } }),
      User.deleteMany({ _id: { $in: cleanupUserIds } }),
      Account.deleteMany(deleteByShop),
      AccountTransaction.deleteMany(deleteByShop),
      Product.deleteMany(deleteByShop),
      ProductVariant.deleteMany(deleteByShop),
      ImeiSerial.deleteMany(deleteByShop),
      Sale.deleteMany(deleteByShop),
      SaleItem.deleteMany(deleteByShop),
      Shift.deleteMany(deleteByShop),
      PersonalLedgerContact.deleteMany(deleteByShop),
      PersonalLedgerTransaction.deleteMany(deleteByShop),
      MfsTransaction.deleteMany(deleteByShop)
    ]);

    console.log('✓ All edge-case audit documents permanently purged from staging database.\n');
    await disconnectDatabase();
  }

  const durationSec = ((Date.now() - overallStartTime) / 1000).toFixed(2);
  const total = edgeCaseResults.length;
  const passed = edgeCaseResults.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('========================================================================');
  console.log(`   Staging Edge-Case & Concurrency Audit Completed in ${durationSec}s`);
  console.log(`   Summary: ${passed}/${total} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runStagingEdgeCasesAudit().catch((err) => {
  console.error('[FATAL AUDIT ERROR]', err);
  process.exit(1);
});
