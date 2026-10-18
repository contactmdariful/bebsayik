import { Router, Request, Response } from 'express';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { CustomerService } from '../services/customers/customer.service.js';

export const customerRouter = Router();

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
 * GET /api/v1/customers
 * Sourced from api-spec.md Section 5.13
 * List customers with search, dues filter (?hasDue=true), and credit limits.
 */
customerRouter.get(
  '/',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'SALESPERSON', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const search = req.query.search ? String(req.query.search) : undefined;
      const hasDue = req.query.hasDue === 'true';
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

      const result = await CustomerService.listCustomers({
        shopId,
        search,
        hasDue,
        page,
        limit
      });

      return sendSuccess(res, req, result.customers, 200, {
        total: result.total,
        totalDues: result.totalDues,
        page: result.page,
        limit: result.limit
      });
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/customers
 * Sourced from api-spec.md Section 5.13
 * Quick-add customer record during checkout (F3 modal).
 */
customerRouter.post(
  '/',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'SALESPERSON', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const customer = await CustomerService.createCustomer(shopId, req.body);
      return sendSuccess(res, req, customer, 201);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/customers/:id
 * Retrieve customer details and credit limits
 */
customerRouter.get(
  '/:id',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'SALESPERSON', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const customer = await CustomerService.getCustomerById(shopId, String(req.params.id));
      return sendSuccess(res, req, customer, 200);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/customers/:id/statement
 * Sourced from api-spec.md Section 5.13
 * Retrieve customer 360° statement, invoices, due ledger, and Kisti contracts.
 */
customerRouter.get(
  '/:id/statement',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'SALESPERSON', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const statement = await CustomerService.getCustomerStatement(shopId, String(req.params.id));
      return sendSuccess(res, req, statement, 200);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/customers/:id/collect-due
 * Sourced from api-spec.md Section 5.13 & TX-06
 * Receive cash/MFS payment against customer's outstanding Bakir Khata balance.
 */
customerRouter.post(
  '/:id/collect-due',
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
            message: 'Mandatory Idempotency-Key header is required for due collection',
            timestamp: new Date().toISOString()
          }
        });
      }

      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const userId = (req as any).user?.userId || (req as any).user?._id;
      const paperWidthMm = req.body.paperWidthMm ? Number(req.body.paperWidthMm) : 80;

      const result = await CustomerService.collectDue({
        shopId,
        userId,
        customerId: String(req.params.id),
        idempotencyKey,
        amount: req.body.amount,
        paymentMethod: req.body.paymentMethod || 'cash',
        accountId: req.body.accountId,
        notes: req.body.notes,
        paperWidthMm: paperWidthMm === 58 ? 58 : 80
      });

      return sendSuccess(res, req, result, 201);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/customers/:id/send-sms-reminder
 * Sourced from api-spec.md Section 5.13
 * Dispatch automated due payment SMS reminder to customer mobile.
 */
customerRouter.post(
  '/:id/send-sms-reminder',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const result = await CustomerService.sendDueSmsReminder(shopId, String(req.params.id));
      return sendSuccess(res, req, result, 200);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);

/**
 * PATCH /api/v1/customers/:id
 * Sourced from api-spec.md Section 5.13
 * Update customer profile, address, or credit limit.
 */
customerRouter.patch(
  '/:id',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const updated = await CustomerService.updateCustomer(shopId, String(req.params.id), req.body);
      return sendSuccess(res, req, updated, 200);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);
