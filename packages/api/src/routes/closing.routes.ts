import { Router, Request, Response } from 'express';
import { ShiftOpenSchema, ShiftBlindCountSchema, ShiftFinalizeSchema } from '@bebsayik/shared-types';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { ClosingService } from '../services/closing/closing.service.js';

export const closingRouter = Router();

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
 * POST /api/v1/closing/shift-open
 * Records morning cash float and opens cashier drawer shift.
 */
closingRouter.post(
  '/shift-open',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'CASHIER']),
  async (req: Request, res: Response) => {
    try {
      const parsed = ShiftOpenSchema.parse(req.body);
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

      const result = await ClosingService.openShift({
        shopId: req.tenant!.shopId,
        cashierUserId: req.user!._id,
        openingCash: parsed.openingCash,
        idempotencyKey
      });

      sendSuccess(res, req, result, 201);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        sendError(res, req, { status: 400, code: 'VALIDATION_ERROR', message: err.errors[0]?.message, details: err.errors });
        return;
      }
      sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/closing/current-shift
 * Fetches the currently open shift and active denominations count for this terminal shop.
 */
closingRouter.get(
  '/current-shift',
  authGuard,
  tenantGuard,
  async (req: Request, res: Response) => {
    try {
      const result = await ClosingService.getCurrentShift(req.tenant!.shopId, req.user?._id);
      sendSuccess(res, req, result, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/closing/submit-blind-count
 * Submits physical note denominations count.
 * Enforces the Single Recount Grace Protocol (Decision 4).
 */
closingRouter.post(
  '/submit-blind-count',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'CASHIER']),
  async (req: Request, res: Response) => {
    try {
      const parsed = ShiftBlindCountSchema.parse(req.body);
      const shiftId = req.body.shiftId;
      if (!shiftId) {
        sendError(res, req, { status: 400, code: 'MISSING_SHIFT_ID', message: 'shiftId is required' });
        return;
      }

      const result = await ClosingService.submitBlindCount({
        shopId: req.tenant!.shopId,
        cashierUserId: req.user!._id,
        shiftId,
        denominations: {
          note1000: parsed.note1000,
          note500: parsed.note500,
          note200: parsed.note200,
          note100: parsed.note100,
          note50: parsed.note50,
          note20: parsed.note20,
          note10: parsed.note10,
          coins: parsed.coins
        },
        requestRecount: parsed.requestRecount
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

/**
 * POST /api/v1/closing/finalize
 * Finalizes shift, locks register, validates variance justification,
 * returns thermal ESC/POS payload, and dispatches owner SMS.
 */
closingRouter.post(
  '/finalize',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'CASHIER']),
  async (req: Request, res: Response) => {
    try {
      const parsed = ShiftFinalizeSchema.parse(req.body);
      const shiftId = req.body.shiftId;
      if (!shiftId) {
        sendError(res, req, { status: 400, code: 'MISSING_SHIFT_ID', message: 'shiftId is required' });
        return;
      }

      const result = await ClosingService.finalizeShift({
        shopId: req.tenant!.shopId,
        cashierUserId: req.user!._id,
        shiftId,
        reason: parsed.reason,
        paperWidthMm: req.body.paperWidthMm
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
