import { Router, Request, Response } from 'express';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { TransferService } from '../services/procurement/transfer.service.js';

export const transferRouter = Router();

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
 * POST /api/v1/inventory/transfers/dispatch
 * Sourced from api-spec.md Section 5.7
 * Create Stock Transfer Note (STN - TX-19) and scan handsets out of godown.
 */
transferRouter.post(
  '/dispatch',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const result = await TransferService.dispatchTransfer(
        req.tenant!.shopId,
        req.body,
        req.user!._id
      );
      sendSuccess(res, req, result, 201);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/inventory/transfers/:id/receive
 * Sourced from api-spec.md Section 5.7
 * Scan and verify received handsets at destination outlet. Handles discrepancies (TC-36).
 */
transferRouter.post(
  '/:id/receive',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const result = await TransferService.receiveTransfer(
        req.tenant!.shopId,
        req.params.id as string,
        req.body,
        req.user!._id
      );
      sendSuccess(res, req, result, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/inventory/transfers
 * List STN transfers filtered by status or direction.
 */
transferRouter.get(
  '/',
  authGuard,
  tenantGuard,
  async (req: Request, res: Response) => {
    try {
      const { status, direction, page, limit } = req.query;
      const opts: { status?: string; direction?: 'incoming' | 'outgoing' | 'all'; page?: number; limit?: number } = {};
      if (status) opts.status = status as string;
      if (direction) opts.direction = direction as 'incoming' | 'outgoing' | 'all';
      if (page) opts.page = Number(page);
      if (limit) opts.limit = Number(limit);

      const result = await TransferService.getTransfers(req.tenant!.shopId, opts);
      sendSuccess(res, req, result.transfers, 200, {
        total: result.total,
        page: result.page,
        limit: result.limit
      });
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/inventory/transfers/:id
 * Retrieve STN details and discrepancy audit.
 */
transferRouter.get(
  '/:id',
  authGuard,
  tenantGuard,
  async (req: Request, res: Response) => {
    try {
      const result = await TransferService.getTransferById(
        req.tenant!.shopId,
        req.params.id as string
      );
      sendSuccess(res, req, result, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);
