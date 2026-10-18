import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { UserRole } from '@bebsayik/shared-types';
import { Shop } from '../models/Shop.js';

export type TenantPermission =
  | 'pos:checkout'
  | 'pos:create_cart'
  | 'pos:discount_below_msp'
  | 'pos:returns'
  | 'pos:drawer_kick'
  | 'inventory:view_landed_cost'
  | 'inventory:manage'
  | 'inventory:scrap'
  | 'customers:read'
  | 'customers:manage'
  | 'customers:collect_due'
  | 'kisti:collect'
  | 'service:manage'
  | 'service:view_split_all'
  | 'service:view_split_self'
  | 'mfs:transact'
  | 'personal_ledger:access'
  | 'closing:blind_count'
  | 'closing:view_variance'
  | 'staff:manage'
  | 'staff:emergency_terminate'
  | 'shop:manage'
  | 'reports:view_pnl'
  | 'reports:view_balance_sheet'
  | 'platform:admin';

export interface TenantContext {
  shopId: mongoose.Types.ObjectId;
  role: UserRole;
  permissions: TenantPermission[];
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

export const ROLE_PERMISSIONS: Record<UserRole, TenantPermission[]> = {
  SUPER_ADMIN: [
    'platform:admin'
  ],
  STORE_OWNER: [
    'pos:checkout',
    'pos:create_cart',
    'pos:discount_below_msp',
    'pos:returns',
    'pos:drawer_kick',
    'inventory:view_landed_cost',
    'inventory:manage',
    'inventory:scrap',
    'customers:read',
    'customers:manage',
    'customers:collect_due',
    'kisti:collect',
    'service:manage',
    'service:view_split_all',
    'service:view_split_self',
    'mfs:transact',
    'personal_ledger:access', // STORE_OWNER SOLELY
    'closing:blind_count',
    'closing:view_variance',
    'staff:manage',
    'staff:emergency_terminate',
    'shop:manage',
    'reports:view_pnl',
    'reports:view_balance_sheet'
  ],
  STORE_MANAGER: [
    'pos:checkout',
    'pos:create_cart',
    'pos:discount_below_msp',
    'pos:returns',
    'pos:drawer_kick',
    'inventory:view_landed_cost',
    'inventory:manage',
    'inventory:scrap',
    'customers:read',
    'customers:manage',
    'customers:collect_due',
    'kisti:collect',
    'service:manage',
    'service:view_split_all',
    'service:view_split_self',
    'mfs:transact',
    'closing:blind_count',
    'closing:view_variance',
    'staff:manage',
    'shop:manage',
    'reports:view_pnl'
    // Zero access to personal_ledger:access, staff:emergency_terminate, reports:view_balance_sheet
  ],
  CASHIER: [
    'pos:checkout',
    'pos:create_cart',
    'pos:returns',
    'pos:drawer_kick',
    'customers:read',
    'customers:collect_due',
    'kisti:collect',
    'closing:blind_count',
    'mfs:transact'
    // Zero access to personal_ledger, landed cost, variance, etc.
  ],
  SALESPERSON: [
    'pos:create_cart',
    'customers:read'
  ],
  TECHNICIAN: [
    'service:manage',
    'service:view_split_self',
    'customers:read'
  ],
  ACCOUNTANT: [
    'customers:read',
    'customers:manage',
    'reports:view_pnl',
    'reports:view_balance_sheet',
    'closing:view_variance',
    'inventory:view_landed_cost'
    // Zero access to personal_ledger:access
  ]
};

export function getRolePermissions(role: UserRole): TenantPermission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Multi-Tenancy Isolation Middleware
 * Enforces X-Shop-Id validation, user membership verification, and populates req.tenant
 */
export async function tenantGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;

  // 1. Authentication prerequisite
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required before tenant resolution',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
    return;
  }

  // 2. Extract and validate X-Shop-Id header
  const rawShopId = (req.headers['x-shop-id'] as string) || (req.headers['X-Shop-Id'] as string);

  if (!rawShopId) {
    res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_ACCESS_DENIED',
        message: 'Missing required X-Shop-Id tenant header',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(rawShopId)) {
    res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_ACCESS_DENIED',
        message: 'Invalid X-Shop-Id header format; must be a valid 24-character hexadecimal ObjectId',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
    return;
  }

  try {
    const shopIdObj = new mongoose.Types.ObjectId(rawShopId);

    // 3. Find shop in database
    const shop = await Shop.findById(shopIdObj);
    if (!shop) {
      res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_ACCESS_DENIED',
          message: `Shop workspace [${rawShopId}] does not exist`,
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    // 4. Check shop status (suspended shops block non-SUPER_ADMIN)
    if (shop.status === 'suspended' && req.user.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_ACCESS_DENIED',
          message: `Shop workspace [${shop.name}] is suspended by platform administration`,
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    // 5. Verify user authorization/membership in the requested shop
    const user = req.user;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const isShopOwner = shop.ownerUserId?.toString() === user._id.toString();
    const isDirectMember = user.shopId?.toString() === rawShopId;
    const isAccessibleMember = user.accessibleShopIds?.some((id) => id.toString() === rawShopId);

    if (!isSuperAdmin && !isShopOwner && !isDirectMember && !isAccessibleMember) {
      res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_ACCESS_DENIED',
          message: `User [${user.fullName}] is not an authorized member of shop [${shop.name}]`,
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    // 6. Anti-Tampering Check: ensure request body/query shopId cannot override X-Shop-Id
    if (req.body && req.body.shopId && req.body.shopId.toString() !== rawShopId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_ACCESS_DENIED',
          message: 'Tenant mismatch: request body shopId does not match authorized X-Shop-Id header',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    if (req.query && req.query.shopId && req.query.shopId.toString() !== rawShopId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_ACCESS_DENIED',
          message: 'Tenant mismatch: query param shopId does not match authorized X-Shop-Id header',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    // Sanitize body shopId to match verified tenant context
    if (req.body && typeof req.body === 'object') {
      req.body.shopId = shop._id;
    }

    // 7. Resolve effective role in this shop context
    const effectiveRole: UserRole = isShopOwner ? 'STORE_OWNER' : user.role;

    // 8. Populate req.tenant
    req.tenant = {
      shopId: shop._id,
      role: effectiveRole,
      permissions: getRolePermissions(effectiveRole)
    };

    next();
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal error resolving tenant context',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
}

/**
 * Capability-based Access Control Middleware
 */
export function requirePermission(permission: TenantPermission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;

    if (!req.tenant) {
      res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_ACCESS_DENIED',
          message: 'Tenant context required before permission evaluation',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    if (!req.tenant.permissions.includes(permission)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `User role [${req.tenant.role}] lacks required capability [${permission}]`,
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    next();
  };
}
