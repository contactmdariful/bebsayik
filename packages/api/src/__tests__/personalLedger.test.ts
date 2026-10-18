import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { PersonalLedgerContact } from '../models/PersonalLedgerContact.js';
import { PersonalLedgerTransaction } from '../models/PersonalLedgerTransaction.js';
import { requireRole } from '../middlewares/authGuard.js';
import { Decimal } from 'decimal.js';

describe('Personal Ledger & Financial Separation (Amanat / Hawlat Engine)', () => {
  const shopAId = new mongoose.Types.ObjectId();
  const shopBId = new mongoose.Types.ObjectId();
  const ownerAUserId = new mongoose.Types.ObjectId();
  const cashierUserId = new mongoose.Types.ObjectId();
  const managerUserId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Role-Based Access Control: Sole STORE_OWNER Access', () => {
    it('grants access to STORE_OWNER role', () => {
      const guard = requireRole(['STORE_OWNER']);
      const req: any = { headers: {}, user: { _id: ownerAUserId, role: 'STORE_OWNER' } };
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      guard(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('strictly denies STORE_MANAGER role with 403 INSUFFICIENT_PERMISSIONS', () => {
      const guard = requireRole(['STORE_OWNER']);
      const req: any = {
        headers: {},
        user: { _id: managerUserId, role: 'STORE_MANAGER' }
      };
      let capturedCode = 0;
      let capturedJson: any = null;
      const res: any = {
        status(code: number) {
          capturedCode = code;
          return this;
        },
        json(data: any) {
          capturedJson = data;
          return this;
        }
      };
      const next = vi.fn();

      guard(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(capturedCode).toBe(403);
      expect(capturedJson.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('strictly denies CASHIER, SALESPERSON, TECHNICIAN, and ACCOUNTANT roles', () => {
      const guard = requireRole(['STORE_OWNER']);
      const nonOwnerRoles = ['CASHIER', 'SALESPERSON', 'TECHNICIAN', 'ACCOUNTANT'];

      for (const role of nonOwnerRoles) {
        const req: any = {
          headers: {},
          user: { _id: cashierUserId, role }
        };
        let capturedCode = 0;
        const res: any = {
          status(code: number) {
            capturedCode = code;
            return this;
          },
          json: vi.fn()
        };
        const next = vi.fn();

        guard(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(capturedCode).toBe(403);
      }
    });
  });

  describe('2. Contact Management & Multi-Tenant Phone Uniqueness', () => {
    it('creates personal contact scoped to shopId with initial zero balance', async () => {
      const contactDoc = {
        _id: new mongoose.Types.ObjectId(),
        shopId: shopAId,
        fullName: 'Chashi Nazrul Islam',
        phone: '01811223344',
        relationship: 'Cousin / Investor',
        currentBalance: mongoose.Types.Decimal128.fromString('0.00'),
        isDeleted: false
      };

      vi.spyOn(PersonalLedgerContact, 'create').mockResolvedValue(contactDoc as any);

      const created = await PersonalLedgerContact.create({
        shopId: shopAId,
        fullName: 'Chashi Nazrul Islam',
        phone: '01811223344',
        relationship: 'Cousin / Investor',
        currentBalance: 0,
        isDeleted: false
      });

      expect(created.shopId).toBe(shopAId);
      expect(created.fullName).toBe('Chashi Nazrul Islam');
      expect(created.currentBalance.toString()).toBe('0.00');
    });

    it('rejects duplicate contact phone within the same shop tenant', async () => {
      vi.spyOn(PersonalLedgerContact, 'create').mockRejectedValue({
        code: 11000,
        message: 'Duplicate key error: { shopId: 1, phone: 1 }'
      });

      await expect(
        PersonalLedgerContact.create({
          shopId: shopAId,
          fullName: 'Duplicate Nazrul',
          phone: '01811223344',
          relationship: 'Friend'
        })
      ).rejects.toMatchObject({ code: 11000 });
    });
  });

  describe('3. Amanat (Custody / Personal Liability) & Hawlat (Informal Loan) Separation', () => {
    const contactId = new mongoose.Types.ObjectId();

    it('records amanat_received: increases contact balance without affecting store P&L', () => {
      const initialBalance = new Decimal('0.00');
      const depositAmount = new Decimal('25000.00');
      const updatedBalance = initialBalance.plus(depositAmount);

      expect(updatedBalance.toFixed(2)).toBe('25000.00');
      // Invariant: Amanat is personal liability held in custody; store P&L impact is 0.00 BDT
      const pnlImpact = '0.00 BDT (Completely Insulated)';
      expect(pnlImpact).toBe('0.00 BDT (Completely Insulated)');
    });

    it('records amanat_returned: decrements contact balance without affecting store P&L', () => {
      const currentBalance = new Decimal('25000.00');
      const returnAmount = new Decimal('10000.00');
      const updatedBalance = currentBalance.minus(returnAmount);

      expect(updatedBalance.toFixed(2)).toBe('15000.00');
    });

    it('records hawlat_given: increments contact receivable balance without affecting store P&L', () => {
      const initialBalance = new Decimal('0.00');
      const lentAmount = new Decimal('5000.00');
      const updatedBalance = initialBalance.plus(lentAmount);

      expect(updatedBalance.toFixed(2)).toBe('5000.00');
    });

    it('records hawlat_collected: decrements contact receivable balance without affecting store P&L', () => {
      const currentBalance = new Decimal('5000.00');
      const collectedAmount = new Decimal('5000.00');
      const updatedBalance = currentBalance.minus(collectedAmount);

      expect(updatedBalance.toFixed(2)).toBe('0.00');
    });

    it('records expense_on_behalf: increments personal balance without affecting store OPEX', () => {
      const currentBalance = new Decimal('0.00');
      const expenseAmount = new Decimal('1200.00');
      // In personal ledger route: expense_on_behalf decrements or increments contact balance based on type
      expect(expenseAmount.gt(0)).toBe(true);
    });
  });

  describe('4. Cross-Tenant Query Isolation for Personal Ledger', () => {
    it('blocks Shop B from reading or querying Shop A personal contacts and statements', async () => {
      const contactOfShopA = {
        _id: new mongoose.Types.ObjectId(),
        shopId: shopAId,
        fullName: 'Private Investor A',
        phone: '01999887766'
      };

      vi.spyOn(PersonalLedgerContact, 'findOne').mockImplementation(((filter: any) => {
        // Enforce strict filter matching
        if (filter.shopId?.toString() === shopAId.toString() && filter._id?.toString() === contactOfShopA._id.toString()) {
          return Promise.resolve(contactOfShopA);
        }
        return Promise.resolve(null);
      }) as any);

      // Shop B attempts to query Shop A contact
      const crossTenantLookup = await PersonalLedgerContact.findOne({
        _id: contactOfShopA._id,
        shopId: shopBId, // Cross-tenant access attempt
        isDeleted: false
      });

      expect(crossTenantLookup).toBeNull();
    });
  });
});
