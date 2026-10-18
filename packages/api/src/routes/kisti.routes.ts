import { Router, Request, Response } from 'express';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { KistiService } from '../services/kisti/kisti.service.js';
import {
  CreateKistiContractSchema,
  CollectKistiMilestoneSchema
} from '@bebsayik/shared-types';

export const kistiRouter = Router();

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
 * POST /api/v1/kisti/contracts
 * Sourced from api-spec.md Section 5.14
 * Book installment contract with hybrid down payment and dual guarantors (TX-11)
 */
kistiRouter.post(
  '/contracts',
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
          message: 'Mandatory Idempotency-Key header is required for Kisti contract booking'
        });
      }

      const parseResult = CreateKistiContractSchema.safeParse(req.body);
      if (!parseResult.success) {
        return sendError(res, req, {
          statusCode: 422,
          code: 'VALIDATION_ERROR',
          message: 'Invalid Kisti contract booking payload',
          details: parseResult.error.errors
        });
      }

      const result = await KistiService.bookContract({
        shopId: req.tenant!.shopId,
        userId: req.user!._id.toString(),
        idempotencyKey,
        ...parseResult.data
      });

      return sendSuccess(res, req, result, 201);
    } catch (err: any) {
      return sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/kisti/contracts
 * List Kisti contracts with search, status filters (active, overdue, defaulted, settled) & metrics
 */
kistiRouter.get(
  '/contracts',
  authGuard,
  tenantGuard,
  async (req: Request, res: Response) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const status = typeof req.query.status === 'string' ? (req.query.status as any) : undefined;
      const customerId = typeof req.query.customerId === 'string' ? req.query.customerId : undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await KistiService.listContracts({
        shopId: req.tenant!.shopId,
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
        ...(customerId ? { customerId } : {}),
        page,
        limit
      });

      return sendSuccess(res, req, result, 200, {
        page: result.page,
        limit: result.limit,
        total: result.total
      });
    } catch (err: any) {
      return sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/kisti/defaulters
 * List all defaulters (>30-day overdue) for follow-up and SMS reminders
 */
kistiRouter.get(
  '/defaulters',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN', 'ACCOUNTANT']),
  async (req: Request, res: Response) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await KistiService.listDefaulters({
        shopId: req.tenant!.shopId,
        page,
        limit
      });

      return sendSuccess(res, req, result, 200, {
        page: result.page,
        limit: result.limit,
        total: result.total
      });
    } catch (err: any) {
      return sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/kisti/contracts/:id
 * Retrieve contract breakdown with monthly amortization schedule and guarantor details
 */
kistiRouter.get(
  '/contracts/:id',
  authGuard,
  tenantGuard,
  async (req: Request, res: Response) => {
    try {
      const result = await KistiService.getContractById(req.tenant!.shopId, req.params.id as string);
      return sendSuccess(res, req, result, 200);
    } catch (err: any) {
      return sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/kisti/contracts/:id/collect-milestone
 * Collect installment milestone / partial payment / early settlement (TX-11)
 */
kistiRouter.post(
  '/contracts/:id/collect-milestone',
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
          message: 'Mandatory Idempotency-Key header is required for milestone collection'
        });
      }

      const parseResult = CollectKistiMilestoneSchema.safeParse(req.body);
      if (!parseResult.success) {
        return sendError(res, req, {
          statusCode: 422,
          code: 'VALIDATION_ERROR',
          message: 'Invalid milestone collection payload',
          details: parseResult.error.errors
        });
      }

      const result = await KistiService.collectMilestone({
        shopId: req.tenant!.shopId,
        userId: req.user!._id.toString(),
        contractId: req.params.id as string,
        idempotencyKey,
        ...parseResult.data
      });

      return sendSuccess(res, req, result, 200);
    } catch (err: any) {
      return sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/kisti/contracts/:id/early-settle
 * Full Early Settlement payoff of remaining balance
 */
kistiRouter.post(
  '/contracts/:id/early-settle',
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
          message: 'Mandatory Idempotency-Key header is required for early settlement'
        });
      }

      const result = await KistiService.earlySettleContract({
        shopId: req.tenant!.shopId,
        userId: req.user!._id.toString(),
        contractId: req.params.id as string,
        idempotencyKey,
        paymentMethod: req.body.paymentMethod || 'cash',
        accountId: req.body.accountId,
        notes: req.body.notes
      });

      return sendSuccess(res, req, result, 200);
    } catch (err: any) {
      return sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/kisti/contracts/:id/send-sms-reminder
 * Automated SMS Payment Reminder dispatch to customer and/or guarantors
 */
kistiRouter.post(
  '/contracts/:id/send-sms-reminder',
  authGuard,
  tenantGuard,
  requireRole(['STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const result = await KistiService.sendSmsReminder({
        shopId: req.tenant!.shopId,
        contractId: req.params.id as string,
        targetRecipient: req.body.targetRecipient || 'both'
      });

      return sendSuccess(res, req, result, 200);
    } catch (err: any) {
      return sendError(res, req, err);
    }
  }
);
