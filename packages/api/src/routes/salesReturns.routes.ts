import { Router, Request, Response } from 'express';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { ReturnsService } from '../services/returns/returns.service.js';

export const salesReturnsRouter = Router();

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
 * POST /api/v1/sales/returns
 * Sourced from api-spec.md Section 5.12 (CRV - TX-05)
 * Process 7-day return validation, restock condition inspection, and refund.
 */
salesReturnsRouter.post(
  '/',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const idempotencyKey =
        (req.headers['idempotency-key'] as string) || (req.body.idempotencyKey as string);

      if (!idempotencyKey) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'IDEMPOTENCY_KEY_REQUIRED',
            message: 'Mandatory Idempotency-Key header is required for processing returns',
            timestamp: new Date().toISOString()
          }
        });
      }

      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const userId = (req as any).user?.userId || (req as any).user?._id;
      const paperWidthMm = req.body.paperWidthMm ? Number(req.body.paperWidthMm) : 80;

      const result = await ReturnsService.processSalesReturn({
        shopId,
        userId,
        idempotencyKey,
        invoiceNo: req.body.invoiceNo,
        items: req.body.items,
        refundMethod: req.body.refundMethod || 'cash',
        refundAccountId: req.body.refundAccountId,
        reason: req.body.reason,
        managerPin: req.body.managerPin,
        overrideToken: req.body.overrideToken,
        paperWidthMm: paperWidthMm === 58 ? 58 : 80
      });

      return sendSuccess(res, req, result, 201);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/sales/returns
 * Sourced from api-spec.md Section 5.12
 * List historical sales returns, reasons, and condition logs.
 */
salesReturnsRouter.get(
  '/',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const invoiceNo = req.query.invoiceNo ? String(req.query.invoiceNo) : undefined;

      const result = await ReturnsService.listSalesReturns({
        shopId,
        page,
        limit,
        invoiceNo
      });

      return sendSuccess(res, req, result.returns, 200, {
        total: result.total,
        page: result.page,
        limit: result.limit
      });
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/sales/returns/:id
 * Retrieve details of a specific Customer Return Voucher
 */
salesReturnsRouter.get(
  '/:id',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const result = await ReturnsService.getSalesReturnById(shopId, String(req.params.id));
      return sendSuccess(res, req, result, 200);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);
