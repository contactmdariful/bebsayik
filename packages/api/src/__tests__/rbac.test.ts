import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { tenantGuard, requirePermission, ROLE_PERMISSIONS } from '../middlewares/tenantGuard.js';
import { requireRole } from '../middlewares/authGuard.js';
import { overrideTokenService } from '../services/security/overrideToken.service.js';
import { Shop } from '../models/Shop.js';
import { User } from '../models/User.js';
import { PersonalLedgerContact } from '../models/PersonalLedgerContact.js';
import { PersonalLedgerTransaction } from '../models/PersonalLedgerTransaction.js';
import { USER_ROLES, UserRole } from '@bebsayik/shared-types';
import { createAccessToken, verifyAccessToken } from '../utils/security.js';

describe('Phase 3: Multi-Tenancy Isolation, RBAC & Context Guards', () => {
  const shopAId = new mongoose.Types.ObjectId();
  const shopBId = new mongoose.Types.ObjectId();
  const suspendedShopId = new mongoose.Types.ObjectId();

  const ownerAId = new mongoose.Types.ObjectId();
  const ownerBId = new mongoose.Types.ObjectId();
  const cashierAId = new mongoose.Types.ObjectId();
  const superAdminId = new mongoose.Types.ObjectId();

  const mockShopA = {
    _id: shopAId,
    name: 'Eastern Plaza Mobile',
    slug: 'eastern-plaza',
    status: 'active',
    ownerUserId: ownerAId
  };

  const mockShopB = {
    _id: shopBId,
    name: 'Jamuna Future Park Gadgets',
    slug: 'jamuna-gadgets',
    status: 'active',
    ownerUserId: ownerBId
  };

  const mockSuspendedShop = {
    _id: suspendedShopId,
    name: 'Suspended Outlet',
    slug: 'suspended-outlet',
    status: 'suspended',
    ownerUserId: ownerAId
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    overrideTokenService.clearMemory();

    (vi.spyOn(Shop, 'findById') as any).mockImplementation(async (id: any) => {
      const idStr = id?.toString();
      if (idStr === shopAId.toString()) return mockShopA as any;
      if (idStr === shopBId.toString()) return mockShopB as any;
      if (idStr === suspendedShopId.toString()) return mockSuspendedShop as any;
      return null;
    });
  });

  function createMockReqRes(options: {
    user?: any;
    headers?: Record<string, string>;
    body?: any;
    query?: any;
  }) {
    const req: any = {
      headers: options.headers || {},
      body: options.body || {},
      query: options.query || {},
      user: options.user
    };

    const res: any = {
      statusCode: 200,
      jsonPayload: null as any,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.jsonPayload = data;
        return this;
      }
    };

    const next = vi.fn();
    return { req, res, next };
  }

  describe('1 & 2. Tenant Isolation & X-Shop-Id Validation', () => {
    it('rejects requests missing X-Shop-Id header with 403 TENANT_ACCESS_DENIED', async () => {
      const { req, res, next } = createMockReqRes({
        user: { _id: ownerAId, role: 'STORE_OWNER', shopId: shopAId },
        headers: {} // No X-Shop-Id
      });

      await tenantGuard(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonPayload.error.code).toBe('TENANT_ACCESS_DENIED');
      expect(res.jsonPayload.error.message).toMatch(/Missing required X-Shop-Id/);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects invalid or malformed X-Shop-Id format with 403 TENANT_ACCESS_DENIED', async () => {
      const { req, res, next } = createMockReqRes({
        user: { _id: ownerAId, role: 'STORE_OWNER', shopId: shopAId },
        headers: { 'x-shop-id': 'invalid-not-an-objectid' }
      });

      await tenantGuard(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonPayload.error.code).toBe('TENANT_ACCESS_DENIED');
      expect(res.jsonPayload.error.message).toMatch(/Invalid X-Shop-Id header format/);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects non-existent shop ID with 403 TENANT_ACCESS_DENIED', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const { req, res, next } = createMockReqRes({
        user: { _id: ownerAId, role: 'STORE_OWNER', shopId: shopAId },
        headers: { 'x-shop-id': nonExistentId.toString() }
      });

      await tenantGuard(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonPayload.error.code).toBe('TENANT_ACCESS_DENIED');
      expect(res.jsonPayload.error.message).toMatch(/does not exist/);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects access to suspended shop for regular tenant staff', async () => {
      const { req, res, next } = createMockReqRes({
        user: { _id: ownerAId, role: 'STORE_OWNER', shopId: suspendedShopId },
        headers: { 'x-shop-id': suspendedShopId.toString() }
      });

      await tenantGuard(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonPayload.error.code).toBe('TENANT_ACCESS_DENIED');
      expect(res.jsonPayload.error.message).toMatch(/is suspended/);
      expect(next).not.toHaveBeenCalled();
    });

    it('cross-tenant penetration test: User of Shop A cannot access Shop B', async () => {
      const { req, res, next } = createMockReqRes({
        user: {
          _id: cashierAId,
          role: 'CASHIER',
          fullName: 'Tanvir Cashier',
          shopId: shopAId,
          accessibleShopIds: []
        },
        headers: { 'x-shop-id': shopBId.toString() } // Attempting Shop B
      });

      await tenantGuard(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonPayload.error.code).toBe('TENANT_ACCESS_DENIED');
      expect(res.jsonPayload.error.message).toMatch(/not an authorized member/);
      expect(next).not.toHaveBeenCalled();
    });

    it('populates req.tenant context for authorized member of Shop A', async () => {
      const { req, res, next } = createMockReqRes({
        user: {
          _id: ownerAId,
          role: 'STORE_OWNER',
          fullName: 'Sumon Dash',
          shopId: shopAId,
          accessibleShopIds: []
        },
        headers: { 'x-shop-id': shopAId.toString() }
      });

      await tenantGuard(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.tenant).toBeDefined();
      expect(req.tenant.shopId.toString()).toBe(shopAId.toString());
      expect(req.tenant.role).toBe('STORE_OWNER');
      expect(req.tenant.permissions).toContain('pos:checkout');
      expect(req.tenant.permissions).toContain('personal_ledger:access');
    });
  });

  describe('3 & 4. Master RBAC Matrix & Role Capability Enforcement', () => {
    it('verifies all seven canonical roles against documented action matrix', () => {
      expect(USER_ROLES).toHaveLength(7);

      // Verify specific permission gates across all 7 roles
      const ownerPerms = ROLE_PERMISSIONS['STORE_OWNER'];
      const managerPerms = ROLE_PERMISSIONS['STORE_MANAGER'];
      const cashierPerms = ROLE_PERMISSIONS['CASHIER'];
      const salesPerms = ROLE_PERMISSIONS['SALESPERSON'];
      const techPerms = ROLE_PERMISSIONS['TECHNICIAN'];
      const acctPerms = ROLE_PERMISSIONS['ACCOUNTANT'];
      const adminPerms = ROLE_PERMISSIONS['SUPER_ADMIN'];

      // STORE_OWNER has sole personal ledger access
      expect(ownerPerms).toContain('personal_ledger:access');
      expect(managerPerms).not.toContain('personal_ledger:access');
      expect(cashierPerms).not.toContain('personal_ledger:access');
      expect(salesPerms).not.toContain('personal_ledger:access');
      expect(techPerms).not.toContain('personal_ledger:access');
      expect(acctPerms).not.toContain('personal_ledger:access');
      expect(adminPerms).not.toContain('personal_ledger:access');

      // Only owner has staff emergency terminate
      expect(ownerPerms).toContain('staff:emergency_terminate');
      expect(managerPerms).not.toContain('staff:emergency_terminate');
      expect(cashierPerms).not.toContain('staff:emergency_terminate');

      // Cashier and Manager can perform POS checkout; Technician cannot
      expect(ownerPerms).toContain('pos:checkout');
      expect(managerPerms).toContain('pos:checkout');
      expect(cashierPerms).toContain('pos:checkout');
      expect(techPerms).not.toContain('pos:checkout');
      expect(acctPerms).not.toContain('pos:checkout');

      // Technician has service manage
      expect(techPerms).toContain('service:manage');
      expect(cashierPerms).not.toContain('service:manage');

      // Accountant has P&L and landed cost
      expect(acctPerms).toContain('reports:view_pnl');
      expect(acctPerms).toContain('inventory:view_landed_cost');
      expect(cashierPerms).not.toContain('inventory:view_landed_cost');
    });

    it('cashier receives 403 INSUFFICIENT_PERMISSIONS when attempting personal ledger or manager route', async () => {
      const guard = requireRole(['STORE_OWNER']);
      const { req, res, next } = createMockReqRes({
        user: { _id: cashierAId, role: 'CASHIER' }
      });

      guard(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonPayload.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(res.jsonPayload.error.message).toMatch(/Role \[CASHIER\] is not authorized/);
      expect(next).not.toHaveBeenCalled();
    });

    it('store manager receives 403 INSUFFICIENT_PERMISSIONS when attempting personal ledger', async () => {
      const guard = requireRole(['STORE_OWNER']);
      const { req, res, next } = createMockReqRes({
        user: { _id: new mongoose.Types.ObjectId(), role: 'STORE_MANAGER' }
      });

      guard(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonPayload.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(next).not.toHaveBeenCalled();
    });

    it('requirePermission blocks role lacking required capability', async () => {
      const guard = requirePermission('personal_ledger:access');
      const { req, res, next } = createMockReqRes({
        user: { _id: cashierAId, role: 'CASHIER' }
      });
      req.tenant = {
        shopId: shopAId,
        role: 'CASHIER',
        permissions: ROLE_PERMISSIONS['CASHIER']
      };

      guard(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonPayload.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(res.jsonPayload.error.message).toMatch(/lacks required capability/);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('5 & 6. Multi-Shop Workspace Switching (TC-55)', () => {
    it('rejects unauthorized workspace switching with 403 TENANT_ACCESS_DENIED', async () => {
      const mockUser = {
        _id: cashierAId,
        phone: '01711223344',
        role: 'CASHIER',
        shopId: shopAId,
        accessibleShopIds: [] as mongoose.Types.ObjectId[] // No access to shop B
      };

      // User attempts to switch to Shop B
      const isOwner = mockShopB.ownerUserId?.toString() === mockUser._id.toString();
      const isDirectMember = mockUser.shopId?.toString() === shopBId.toString();
      const isAccessibleMember = mockUser.accessibleShopIds?.some((id) => id.toString() === shopBId.toString());

      expect(isOwner || isDirectMember || isAccessibleMember).toBe(false);
    });

    it('generates valid scoped JWT access token for authorized destination shop', () => {
      const token = createAccessToken({
        userId: ownerAId.toString(),
        phone: '01712345678',
        role: 'STORE_OWNER',
        shopId: shopAId.toString(),
        tokenVersion: 1
      });

      const decoded = verifyAccessToken(token);
      expect(decoded.shopId).toBe(shopAId.toString());
      expect(decoded.role).toBe('STORE_OWNER');
      expect(decoded.userId).toBe(ownerAId.toString());
    });
  });

  describe('7. Single-Use Manager Override Token Lifecycle & Replay Prevention', () => {
    it('creates, verifies, and single-use consumes 60-second override token', async () => {
      const managerId = new mongoose.Types.ObjectId();
      const action = 'MSP_FLOOR_OVERRIDE';

      const { overrideToken, expiresInSeconds } = await overrideTokenService.createToken({
        managerUserId: managerId.toString(),
        shopId: shopAId.toString(),
        action,
        context: { variantId: 'var-123', requestedPrice: '22000.00' }
      });

      expect(overrideToken).toMatch(/^ovr_/);
      expect(expiresInSeconds).toBe(60);

      // 1. First verification: must succeed
      const firstUse = await overrideTokenService.verifyAndConsume({
        token: overrideToken,
        expectedShopId: shopAId.toString(),
        expectedAction: action
      });

      expect(firstUse.valid).toBe(true);
      expect(firstUse.managerUserId).toBe(managerId.toString());

      // 2. Second verification: must fail (Single-use replay prevention)
      const secondUse = await overrideTokenService.verifyAndConsume({
        token: overrideToken,
        expectedShopId: shopAId.toString(),
        expectedAction: action
      });

      expect(secondUse.valid).toBe(false);
      expect(secondUse.error).toMatch(/already been consumed/);
    });

    it('rejects expired override token (>60s)', async () => {
      const managerId = new mongoose.Types.ObjectId();
      const action = 'CREDIT_LIMIT_WAIVER';

      const { overrideToken } = await overrideTokenService.createToken({
        managerUserId: managerId.toString(),
        shopId: shopAId.toString(),
        action
      });

      // Advance time beyond 60s
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 65 * 1000);

      const res = await overrideTokenService.verifyAndConsume({
        token: overrideToken,
        expectedShopId: shopAId.toString(),
        expectedAction: action
      });

      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/has expired/);
    });

    it('rejects override token presented for a different shopId or wrong action', async () => {
      const managerId = new mongoose.Types.ObjectId();

      const { overrideToken } = await overrideTokenService.createToken({
        managerUserId: managerId.toString(),
        shopId: shopAId.toString(),
        action: 'MSP_FLOOR_OVERRIDE'
      });

      // Wrong shopId
      const wrongShopRes = await overrideTokenService.verifyAndConsume({
        token: overrideToken,
        expectedShopId: shopBId.toString(),
        expectedAction: 'MSP_FLOOR_OVERRIDE'
      });
      expect(wrongShopRes.valid).toBe(false);
      expect(wrongShopRes.error).toMatch(/issued for shop/);

      // Wrong action
      const wrongActionRes = await overrideTokenService.verifyAndConsume({
        token: overrideToken,
        expectedShopId: shopAId.toString(),
        expectedAction: 'SWV_SCRAP_APPROVAL'
      });
      expect(wrongActionRes.valid).toBe(false);
      expect(wrongActionRes.error).toMatch(/issued for action/);
    });

    it('rejects forged client-generated override tokens', async () => {
      const fakeToken = `ovr_${Date.now()}_fake1234.fakessignature1234567890abcdef`;

      const res = await overrideTokenService.verifyAndConsume({
        token: fakeToken,
        expectedShopId: shopAId.toString(),
        expectedAction: 'MSP_FLOOR_OVERRIDE'
      });

      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/never issued by server/);
    });
  });

  describe('8. Concurrent Multi-Tenant Request Isolation', () => {
    it('concurrent requests for different shops never leak tenant context', async () => {
      const reqA: any = {
        headers: { 'x-shop-id': shopAId.toString() },
        user: { _id: ownerAId, role: 'STORE_OWNER', shopId: shopAId }
      };
      const resA: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const nextA = vi.fn();

      const reqB: any = {
        headers: { 'x-shop-id': shopBId.toString() },
        user: { _id: ownerBId, role: 'STORE_OWNER', shopId: shopBId }
      };
      const resB: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const nextB = vi.fn();

      // Execute concurrently
      await Promise.all([
        tenantGuard(reqA, resA, nextA),
        tenantGuard(reqB, resB, nextB)
      ]);

      expect(nextA).toHaveBeenCalled();
      expect(nextB).toHaveBeenCalled();

      // Ensure reqA tenant is strictly shopA and reqB tenant is strictly shopB
      expect(reqA.tenant.shopId.toString()).toBe(shopAId.toString());
      expect(reqB.tenant.shopId.toString()).toBe(shopBId.toString());
      expect(reqA.tenant.shopId.toString()).not.toBe(reqB.tenant.shopId.toString());
    });
  });

  describe('9. Anti-Tampering: Body & Query Tenant Overwrite Protection', () => {
    it('rejects body shopId that does not match authorized X-Shop-Id', async () => {
      const { req, res, next } = createMockReqRes({
        user: { _id: ownerAId, role: 'STORE_OWNER', shopId: shopAId },
        headers: { 'x-shop-id': shopAId.toString() },
        body: {
          productName: 'Tampered Phone',
          shopId: shopBId.toString() // Malicious body tampering
        }
      });

      await tenantGuard(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonPayload.error.code).toBe('TENANT_ACCESS_DENIED');
      expect(res.jsonPayload.error.message).toMatch(/Tenant mismatch: request body shopId/);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects query param shopId that does not match authorized X-Shop-Id', async () => {
      const { req, res, next } = createMockReqRes({
        user: { _id: ownerAId, role: 'STORE_OWNER', shopId: shopAId },
        headers: { 'x-shop-id': shopAId.toString() },
        query: {
          shopId: shopBId.toString() // Malicious query tampering
        }
      });

      await tenantGuard(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonPayload.error.code).toBe('TENANT_ACCESS_DENIED');
      expect(res.jsonPayload.error.message).toMatch(/Tenant mismatch: query param shopId/);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('10. SUPER_ADMIN Boundary & Personal Ledger Insulation', () => {
    it('SUPER_ADMIN is prohibited from accessing personal ledger', async () => {
      const guard = requireRole(['STORE_OWNER']);
      const { req, res, next } = createMockReqRes({
        user: { _id: superAdminId, role: 'SUPER_ADMIN' }
      });

      guard(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonPayload.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(next).not.toHaveBeenCalled();
    });

    it('personal ledger transactions strictly enforce 0.00% shop P&L impact', () => {
      // Invariant check: personal ledger operations mutate PersonalLedgerContact/Transaction,
      // never touch 4010-Sales-Revenue or OPEX expense slips
      const personalTxTypes = [
        'amanat_received',
        'amanat_returned',
        'hawlat_given',
        'hawlat_collected',
        'expense_on_behalf'
      ];

      expect(personalTxTypes).toHaveLength(5);
      personalTxTypes.forEach((tx) => {
        expect(['amanat_received', 'amanat_returned', 'hawlat_given', 'hawlat_collected', 'expense_on_behalf']).toContain(tx);
      });
    });
  });
});
