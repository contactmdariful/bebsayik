import mongoose from 'mongoose';
import {
  Sale,
  SaleItem,
  HeldCart,
  CustomerReturnVoucher,
  MoneyReceipt,
  Shift,
  ShiftDenomination,
  StockTransferNote,
  InventoryMovement,
  DamagedStockScrap,
  WarrantyClaim,
  GoodsReceivedNote,
  PurchaseReturnVoucher,
  PurchaseOrder,
  KistiContract,
  KistiInstallment,
  BuybackAgreement,
  ServiceJob,
  ServicePartsConsumed,
  Account,
  AccountTransaction,
  PersonalLedgerTransaction,
  EmployeeTarget,
  PayrollLedger,
  ImeiSerial,
  Customer,
  Supplier,
  ProductVariant,
  User,
  Shop
} from '../../models/index.js';
import { verifyPassword } from '../../utils/security.js';
import { decimal128Setter } from '../../utils/money.js';

export interface FreshStartResetInput {
  shopId: mongoose.Types.ObjectId | string;
  ownerUserId: mongoose.Types.ObjectId | string;
  masterPassword: string;
  confirmationPhrase: string;
}

export class FreshStartService {
  /**
   * Pre-Launch Fresh Start Reset Protocol (TC-18).
   * Securely purges all test transactional, inventory, and ledger history
   * while STRICTLY PRESERVING master catalog, categories, brands, users, and shop settings.
   */
  static async executeFreshStartReset(input: FreshStartResetInput) {
    const shopId = new mongoose.Types.ObjectId(input.shopId);
    const ownerUserId = new mongoose.Types.ObjectId(input.ownerUserId);

    if (input.confirmationPhrase !== 'PURGE-TEST-TRANSACTIONS') {
      const err: any = new Error("Invalid confirmation phrase. Must be 'PURGE-TEST-TRANSACTIONS'.");
      err.status = 400;
      err.code = 'INVALID_CONFIRMATION_PHRASE';
      throw err;
    }

    // 1. Authenticate Owner Master Password
    const owner = await User.findById(ownerUserId);
    if (!owner) {
      const err: any = new Error('Owner account not found');
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    if (!owner.passwordHash) {
      const err: any = new Error('Owner does not have a password configured');
      err.status = 400;
      err.code = 'PASSWORD_NOT_CONFIGURED';
      throw err;
    }

    const isPasswordValid = await verifyPassword(owner.passwordHash, input.masterPassword);
    if (!isPasswordValid) {
      const err: any = new Error('Invalid master password. 2FA authorization failed.');
      err.status = 401;
      err.code = 'INVALID_MASTER_PASSWORD';
      throw err;
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      const err: any = new Error('Shop not found');
      err.status = 404;
      err.code = 'SHOP_NOT_FOUND';
      throw err;
    }

    // 2. Perform transactional purges
    const purgeCounts: Record<string, number> = {};

    // A. POS Sales & Receipts
    const sales = await Sale.find({ shopId }, { _id: 1 });
    const saleIds = sales.map((s) => s._id);

    const [deletedSaleItems, deletedSales, deletedHeldCarts, deletedReturns, deletedReceipts] = await Promise.all([
      SaleItem.deleteMany({ saleId: { $in: saleIds } }),
      Sale.deleteMany({ shopId }),
      HeldCart.deleteMany({ shopId }),
      CustomerReturnVoucher.deleteMany({ shopId }),
      MoneyReceipt.deleteMany({ shopId })
    ]);
    purgeCounts.saleItems = deletedSaleItems.deletedCount;
    purgeCounts.sales = deletedSales.deletedCount;
    purgeCounts.heldCarts = deletedHeldCarts.deletedCount;
    purgeCounts.returnVouchers = deletedReturns.deletedCount;
    purgeCounts.moneyReceipts = deletedReceipts.deletedCount;

    // B. Shifts & Blind Counts
    const shifts = await Shift.find({ shopId }, { _id: 1 });
    const shiftIds = shifts.map((s) => s._id);
    const [deletedDenoms, deletedShifts] = await Promise.all([
      ShiftDenomination.deleteMany({ shiftId: { $in: shiftIds } }),
      Shift.deleteMany({ shopId })
    ]);
    purgeCounts.shiftDenominations = deletedDenoms.deletedCount;
    purgeCounts.shifts = deletedShifts.deletedCount;

    // C. Inventory Movements & Procurement
    const [
      deletedSTNs,
      deletedMovements,
      deletedScraps,
      deletedClaims,
      deletedGRNs,
      deletedPRVs,
      deletedPOs
    ] = await Promise.all([
      StockTransferNote.deleteMany({ fromShopId: shopId }),
      InventoryMovement.deleteMany({ shopId }),
      DamagedStockScrap.deleteMany({ shopId }),
      WarrantyClaim.deleteMany({ shopId }),
      GoodsReceivedNote.deleteMany({ shopId }),
      PurchaseReturnVoucher.deleteMany({ shopId }),
      PurchaseOrder.deleteMany({ shopId })
    ]);
    purgeCounts.stockTransferNotes = deletedSTNs.deletedCount;
    purgeCounts.inventoryMovements = deletedMovements.deletedCount;
    purgeCounts.damagedStockScraps = deletedScraps.deletedCount;
    purgeCounts.warrantyClaims = deletedClaims.deletedCount;
    purgeCounts.goodsReceivedNotes = deletedGRNs.deletedCount;
    purgeCounts.purchaseReturnVouchers = deletedPRVs.deletedCount;
    purgeCounts.purchaseOrders = deletedPOs.deletedCount;

    // D. Kisti & Buybacks
    const [deletedInstallments, deletedKisti, deletedBuybacks] = await Promise.all([
      KistiInstallment.deleteMany({ shopId }),
      KistiContract.deleteMany({ shopId }),
      BuybackAgreement.deleteMany({ shopId })
    ]);
    purgeCounts.kistiInstallments = deletedInstallments.deletedCount;
    purgeCounts.kistiContracts = deletedKisti.deletedCount;
    purgeCounts.buybackAgreements = deletedBuybacks.deletedCount;

    // E. Technician Service Jobs
    const jobs = await ServiceJob.find({ shopId }, { _id: 1 });
    const jobIds = jobs.map((j) => j._id);
    const [deletedParts, deletedJobs] = await Promise.all([
      ServicePartsConsumed.deleteMany({ serviceJobId: { $in: jobIds } }),
      ServiceJob.deleteMany({ shopId })
    ]);
    purgeCounts.servicePartsConsumed = deletedParts.deletedCount;
    purgeCounts.serviceJobs = deletedJobs.deletedCount;

    // F. General Ledger & Accounts
    const [deletedTxns, deletedPersonalTxns, deletedTargets, deletedPayrolls] = await Promise.all([
      AccountTransaction.deleteMany({ shopId }),
      PersonalLedgerTransaction.deleteMany({ shopId }),
      EmployeeTarget.deleteMany({ shopId }),
      PayrollLedger.deleteMany({ shopId })
    ]);
    purgeCounts.accountTransactions = deletedTxns.deletedCount;
    purgeCounts.personalTransactions = deletedPersonalTxns.deletedCount;
    purgeCounts.employeeTargets = deletedTargets.deletedCount;
    purgeCounts.payrollLedgers = deletedPayrolls.deletedCount;

    // 3. Reset IMEI numbers to available state
    const imeisReset = await ImeiSerial.updateMany(
      { shopId },
      {
        $set: {
          status: 'available'
        },
        $unset: {
          saleId: '',
          purchaseId: '',
          stockTransferNoteId: '',
          damagedStockScrapId: '',
          warrantyClaimId: ''
        }
      }
    );
    purgeCounts.imeisReset = imeisReset.modifiedCount;

    // 4. Reset Customer dues to zero
    await Customer.updateMany(
      { shopId },
      {
        $set: {
          currentDueBalance: decimal128Setter(0)
        }
      }
    );

    // 5. Reset Supplier payables to zero
    await Supplier.updateMany(
      { shopId },
      {
        $set: {
          currentDueBalance: decimal128Setter(0)
        }
      }
    );

    // 6. Reset Chart of Accounts balances to zero
    await Account.updateMany(
      { shopId },
      {
        $set: {
          currentBalance: decimal128Setter(0)
        }
      }
    );

    // 7. Reset ProductVariant stockQuantity to zero
    await ProductVariant.updateMany(
      { shopId },
      {
        $set: {
          stockQuantity: 0
        }
      }
    );

    return {
      success: true,
      message: 'Pre-launch Fresh Start Reset completed. Test transactions purged; catalog, categories, and settings intact.',
      purgedAt: new Date().toISOString(),
      shopId: shopId.toString(),
      shopName: shop.name,
      purgeMetrics: purgeCounts
    };
  }
}
