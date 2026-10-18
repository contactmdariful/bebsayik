import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { UserRole, FreshStartResetSchema } from '@bebsayik/shared-types';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { Shop, IShop } from '../models/Shop.js';
import { createAccessToken } from '../utils/security.js';
import { FreshStartService } from '../services/shop/freshStart.service.js';

export const shopRouter = Router();

function sendError(res: Response, req: Request, err: any) {
  const status = err.status || 500;
  const code = err.code || 'SERVER_ERROR';
  const message = err.message || 'Internal server error';
  const details = err.details;
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
      requestId
    }
  });
}

function sendSuccess<T>(res: Response, req: Request, data: T, status = 200) {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  res.status(status).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId
    }
  });
}

/**
 * GET /api/v1/shops/my-shops
 * Retrieve all dokans/workspaces authorized for the current user
 */
shopRouter.get('/my-shops', authGuard, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    let shops: IShop[] = [];

    if (isSuperAdmin) {
      shops = await Shop.find({}).sort({ createdAt: -1 });
    } else {
      const shopIdsToQuery = new Set<string>();

      if (user.shopId) {
        shopIdsToQuery.add(user.shopId.toString());
      }
      if (user.accessibleShopIds && user.accessibleShopIds.length > 0) {
        user.accessibleShopIds.forEach((id) => shopIdsToQuery.add(id.toString()));
      }

      // Query owned shops
      const ownedShops = await Shop.find({ ownerUserId: user._id });
      ownedShops.forEach((s) => shopIdsToQuery.add(s._id.toString()));

      if (shopIdsToQuery.size > 0) {
        shops = await Shop.find({
          _id: { $in: Array.from(shopIdsToQuery).map((id) => new mongoose.Types.ObjectId(id)) }
        });
      }
    }

    const currentShopId = user.shopId?.toString();
    const result = shops.map((s) => {
      let role: UserRole = user.role;
      if (s.ownerUserId?.toString() === user._id.toString()) {
        role = 'STORE_OWNER';
      }

      return {
        id: s._id.toString(),
        name: s.name,
        slug: s.slug,
        businessType: s.businessType,
        binNumber: s.binNumber,
        status: s.status,
        role,
        isCurrent: currentShopId === s._id.toString()
      };
    });

    sendSuccess(res, req, result, 200);
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * POST /api/v1/shops/switch-workspace
 * Switch active shop context and issue new scoped tenant JWT (TC-55)
 */
shopRouter.post('/switch-workspace', authGuard, async (req: Request, res: Response) => {
  try {
    const { targetShopId } = req.body;
    const user = req.user!;

    if (!targetShopId || !mongoose.Types.ObjectId.isValid(targetShopId)) {
      sendError(res, req, {
        code: 'VALIDATION_ERROR',
        status: 422,
        message: 'Valid targetShopId is required'
      });
      return;
    }

    const targetShop = await Shop.findById(targetShopId);
    if (!targetShop) {
      sendError(res, req, {
        code: 'TENANT_ACCESS_DENIED',
        status: 403,
        message: `Target shop [${targetShopId}] does not exist`
      });
      return;
    }

    if (targetShop.status === 'suspended' && user.role !== 'SUPER_ADMIN') {
      sendError(res, req, {
        code: 'TENANT_ACCESS_DENIED',
        status: 403,
        message: `Shop [${targetShop.name}] is suspended`
      });
      return;
    }

    // Verify user authorization for target shop
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const isOwner = targetShop.ownerUserId?.toString() === user._id.toString();
    const isDirectMember = user.shopId?.toString() === targetShopId;
    const isAccessibleMember = user.accessibleShopIds?.some((id) => id.toString() === targetShopId);

    if (!isSuperAdmin && !isOwner && !isDirectMember && !isAccessibleMember) {
      sendError(res, req, {
        code: 'TENANT_ACCESS_DENIED',
        status: 403,
        message: `User is not authorized to switch into shop [${targetShop.name}]`
      });
      return;
    }

    const effectiveRole: UserRole = isOwner ? 'STORE_OWNER' : user.role;

    // Update active shopId on user
    user.shopId = targetShop._id;
    await user.save();

    // Issue fresh scoped access token
    const accessToken = createAccessToken({
      userId: user._id.toString(),
      phone: user.phone,
      role: effectiveRole,
      shopId: targetShop._id.toString(),
      tokenVersion: user.tokenVersion
    });

    sendSuccess(
      res,
      req,
      {
        accessToken,
        targetShop: {
          id: targetShop._id.toString(),
          name: targetShop.name,
          slug: targetShop.slug,
          role: effectiveRole,
          status: targetShop.status
        }
      },
      200
    );
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * GET /api/v1/shops/profile
 * Retrieve shop metadata, logo, NBR BIN, and thermal receipt headers
 */
shopRouter.get('/profile', authGuard, tenantGuard, async (req: Request, res: Response) => {
  try {
    const shop = await Shop.findById(req.tenant!.shopId);
    if (!shop) {
      sendError(res, req, { code: 'TENANT_ACCESS_DENIED', status: 403, message: 'Shop not found' });
      return;
    }

    sendSuccess(
      res,
      req,
      {
        id: shop._id.toString(),
        name: shop.name,
        slug: shop.slug,
        businessType: shop.businessType,
        binNumber: shop.binNumber,
        logoUrl: shop.logoUrl,
        receiptHeader: shop.receiptHeader,
        receiptFooter: shop.receiptFooter,
        returnPolicyDays: shop.returnPolicyDays,
        currency: shop.currency,
        phone: shop.phone,
        status: shop.status
      },
      200
    );
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * PATCH /api/v1/shops/profile
 * Update shop profile branding, thermal footer, and return policy days
 * Sourced from api-spec.md Section 5.2
 */
shopRouter.patch(
  '/profile',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shop = await Shop.findById(req.tenant!.shopId);
      if (!shop) {
        sendError(res, req, { code: 'TENANT_ACCESS_DENIED', status: 403, message: 'Shop not found' });
        return;
      }

      const { name, logoUrl, receiptHeader, receiptFooter, binNumber, returnPolicyDays, phone } = req.body;

      if (name) shop.name = name;
      if (logoUrl !== undefined) shop.logoUrl = logoUrl;
      if (receiptHeader !== undefined) shop.receiptHeader = receiptHeader;
      if (receiptFooter !== undefined) shop.receiptFooter = receiptFooter;
      if (binNumber !== undefined) shop.binNumber = binNumber;
      if (returnPolicyDays !== undefined) shop.returnPolicyDays = Number(returnPolicyDays);
      if (phone !== undefined) shop.phone = phone;

      await shop.save();

      sendSuccess(
        res,
        req,
        {
          id: shop._id.toString(),
          name: shop.name,
          slug: shop.slug,
          binNumber: shop.binNumber,
          logoUrl: shop.logoUrl,
          receiptHeader: shop.receiptHeader,
          receiptFooter: shop.receiptFooter,
          returnPolicyDays: shop.returnPolicyDays,
          status: shop.status
        },
        200
      );
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/shops/fresh-start-reset
 * Pre-Launch Fresh Start Reset Protocol (TC-18).
 * 2FA-secured purge of test transactions while preserving master catalog and settings.
 */
shopRouter.post(
  '/fresh-start-reset',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const parsed = FreshStartResetSchema.parse(req.body);

      const result = await FreshStartService.executeFreshStartReset({
        shopId: req.tenant!.shopId,
        ownerUserId: req.user!._id,
        masterPassword: parsed.masterPassword,
        confirmationPhrase: parsed.confirmationPhrase
      });

      sendSuccess(res, req, result, 200);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        sendError(res, req, { status: 400, code: 'VALIDATION_ERROR', message: err.errors[0]?.message, details: err.errors });
        return;
      }
      sendError(res, req, err);
    }
  }
);
