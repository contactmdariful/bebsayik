import { Router, Request, Response } from 'express';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { ProcurementService } from '../services/procurement/procurement.service.js';

export const procurementRouter = Router();

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

/* ================= SUPPLIER CRM ================= */

/**
 * GET /api/v1/procurement/suppliers
 * List suppliers with outstanding payables and pagination.
 */
procurementRouter.get(
  '/suppliers',
  authGuard,
  tenantGuard,
  async (req: Request, res: Response) => {
    try {
      const { search, status, page, limit } = req.query;
      const opts: { search?: string; status?: 'active' | 'inactive'; page?: number; limit?: number } = {};
      if (search) opts.search = search as string;
      if (status) opts.status = status as 'active' | 'inactive';
      if (page) opts.page = Number(page);
      if (limit) opts.limit = Number(limit);

      const result = await ProcurementService.getSuppliers(req.tenant!.shopId, opts);
      sendSuccess(res, req, result.suppliers, 200, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalDue: result.totalDue
      });
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/procurement/suppliers
 * Create a new supplier record.
 */
procurementRouter.post(
  '/suppliers',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const supplier = await ProcurementService.createSupplier(req.tenant!.shopId, req.body);
      sendSuccess(res, req, supplier, 201);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/procurement/suppliers/:id
 * Retrieve supplier profile.
 */
procurementRouter.get(
  '/suppliers/:id',
  authGuard,
  tenantGuard,
  async (req: Request, res: Response) => {
    try {
      const supplier = await ProcurementService.getSupplierById(req.tenant!.shopId, req.params.id as string);
      sendSuccess(res, req, supplier, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * PATCH /api/v1/procurement/suppliers/:id
 * Update supplier details.
 */
procurementRouter.patch(
  '/suppliers/:id',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const supplier = await ProcurementService.updateSupplier(
        req.tenant!.shopId,
        req.params.id as string,
        req.body
      );
      sendSuccess(res, req, supplier, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/procurement/suppliers/:id/statement
 * 360-degree Supplier Statement: purchases, payments, returns, and running ledger.
 */
procurementRouter.get(
  '/suppliers/:id/statement',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const statement = await ProcurementService.getSupplierStatement(
        req.tenant!.shopId,
        req.params.id as string
      );
      sendSuccess(res, req, statement, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/procurement/suppliers/:id/payment
 * Record supplier payout against outstanding payables (TX-08).
 */
procurementRouter.post(
  '/suppliers/:id/payment',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const idempotencyKey = (req.headers['idempotency-key'] as string) || (req.body.referenceNo as string);
      const result = await ProcurementService.recordSupplierPayment(
        req.tenant!.shopId,
        req.params.id as string,
        req.body,
        req.user!._id,
        idempotencyKey
      );
      sendSuccess(res, req, result, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/* ================= PURCHASE ORDERS ================= */

/**
 * POST /api/v1/procurement/orders
 * Create new Purchase Order.
 */
procurementRouter.post(
  '/orders',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const po = await ProcurementService.createPurchaseOrder(
        req.tenant!.shopId,
        req.body,
        req.user!._id
      );
      sendSuccess(res, req, po, 201);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/procurement/orders
 * List purchase orders with status filtering.
 */
procurementRouter.get(
  '/orders',
  authGuard,
  tenantGuard,
  async (req: Request, res: Response) => {
    try {
      const { status, supplierId, page, limit } = req.query;
      const opts: { status?: string; supplierId?: string; page?: number; limit?: number } = {};
      if (status) opts.status = status as string;
      if (supplierId) opts.supplierId = supplierId as string;
      if (page) opts.page = Number(page);
      if (limit) opts.limit = Number(limit);

      const result = await ProcurementService.getPurchaseOrders(req.tenant!.shopId, opts);
      sendSuccess(res, req, result.orders, 200, {
        total: result.total,
        page: result.page,
        limit: result.limit
      });
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/* ================= GOODS RECEIVED NOTES (GRN - TX-07) ================= */

/**
 * POST /api/v1/procurement/grn
 * Ingest partial or full GRN shipment, scan IMEIs, freeze landed cost (TX-07).
 */
procurementRouter.post(
  '/grn',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const idempotencyKey = (req.headers['idempotency-key'] as string) || (req.body.purchaseNo as string);
      const result = await ProcurementService.processGrn(
        req.tenant!.shopId,
        req.body,
        req.user!._id,
        idempotencyKey
      );
      sendSuccess(res, req, result, 201);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/* ================= PURCHASE RETURN VOUCHERS (PRV - TX-08) ================= */

/**
 * POST /api/v1/procurement/returns
 * Return defective handsets or accessories to supplier (PRV - TX-08).
 */
procurementRouter.post(
  '/returns',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const idempotencyKey = req.headers['idempotency-key'] as string;
      const result = await ProcurementService.processPurchaseReturn(
        req.tenant!.shopId,
        req.body,
        req.user!._id,
        idempotencyKey
      );
      sendSuccess(res, req, result, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);
