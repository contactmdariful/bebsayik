import { Router, Request, Response } from 'express';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { PosService } from '../services/pos/pos.service.js';

export const posRouter = Router();

function sendError(res: Response, req: Request, err: any) {
  const status = err.statusCode || err.status || 500;
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

function sendSuccess<T>(res: Response, req: Request, data: T, status = 200, metaExtras: any = {}) {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  res.status(status).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      ...metaExtras
    }
  });
}

/**
 * POST /api/v1/pos/checkout
 * Sourced from api-spec.md Section 5.11
 * Mandatory Idempotency-Key header (UUIDv4)
 * Atomic counter checkout with split payments, change calculation and ESC/POS thermal payload.
 */
posRouter.post(
  '/checkout',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const idempotencyKey = (req.headers['idempotency-key'] as string) || (req.body.idempotencyKey as string);
      if (!idempotencyKey) {
        return sendError(res, req, {
          statusCode: 400,
          code: 'IDEMPOTENCY_KEY_REQUIRED',
          message: 'Mandatory Idempotency-Key header is required for POS checkout'
        });
      }

      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const userId = (req as any).user?.userId || (req as any).user?._id;
      const paperWidthMm = req.body.paperWidthMm ? Number(req.body.paperWidthMm) : 80;

      const result = await PosService.processCheckout({
        shopId,
        userId,
        idempotencyKey,
        payload: req.body,
        paperWidthMm: (paperWidthMm === 58 ? 58 : 80)
      });

      return sendSuccess(res, req, result, 201);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/pos/held-carts
 * Sourced from api-spec.md Section 5.11
 * Stash active POS shopping cart (F5 key accelerator)
 */
posRouter.post(
  '/held-carts',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'SALESPERSON', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const userId = (req as any).user?.userId || (req as any).user?._id;

      const heldCart = await PosService.holdCart({
        shopId,
        userId,
        data: req.body
      });

      return sendSuccess(res, req, heldCart, 201);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/pos/held-carts
 * Sourced from api-spec.md Section 5.11
 * Recall list of stashed shopping carts (F6 key accelerator)
 */
posRouter.get(
  '/held-carts',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'SALESPERSON', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const carts = await PosService.getHeldCarts(shopId);
      return sendSuccess(res, req, carts);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);

/**
 * DELETE /api/v1/pos/held-carts/:id
 * Sourced from api-spec.md Section 5.11
 * Discard stashed cart and release reserved items
 */
posRouter.delete(
  '/held-carts/:id',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'SALESPERSON', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const cartId = String(req.params.id);
      const deleted = await PosService.deleteHeldCart(shopId, cartId);
      return sendSuccess(res, req, { deleted });
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/pos/invoices/:invoiceNo
 * Sourced from api-spec.md Section 5.11
 * Lookup invoice and return ESC/POS print payload with incremented reprintCount (TC-47)
 */
posRouter.get(
  '/invoices/:invoiceNo',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'SALESPERSON', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const invoiceNo = String(req.params.invoiceNo);
      const result = await PosService.reprintInvoice(shopId, invoiceNo);
      return sendSuccess(res, req, result);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/pos/invoices/:invoiceNo/reprint
 * Explicit invoice reprint action (TC-47)
 */
posRouter.post(
  '/invoices/:invoiceNo/reprint',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'SALESPERSON', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const invoiceNo = String(req.params.invoiceNo);
      const paperWidthMm = req.body.paperWidthMm ? Number(req.body.paperWidthMm) : 80;
      const result = await PosService.reprintInvoice(shopId, invoiceNo, paperWidthMm === 58 ? 58 : 80);
      return sendSuccess(res, req, result);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/pos/offline-sync
 * Sourced from api-spec.md Section 5.11 & TC-48
 * Replay batch of cached offline non-serialized accessory sales.
 * Strictly rejects any serialized handset sales.
 */
posRouter.post(
  '/offline-sync',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const userId = (req as any).user?.userId || (req as any).user?._id;

      const result = await PosService.syncOfflineBatch(shopId, userId, req.body);
      return sendSuccess(res, req, result, 200);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);
