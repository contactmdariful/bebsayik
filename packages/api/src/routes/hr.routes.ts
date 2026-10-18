import { Router, Request, Response } from 'express';
import { PayrollDisburseSchema } from '@bebsayik/shared-types';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { HrService } from '../services/hr/hr.service.js';

export const hrRouter = Router();

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
 * GET /api/v1/hr/staff
 * Lists all staff members in the shop.
 */
hrRouter.get(
  '/staff',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER']),
  async (req: Request, res: Response) => {
    try {
      const staff = await HrService.listStaff(req.tenant!.shopId);
      sendSuccess(res, req, staff, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/hr/payroll/summary
 * Retrieves monthly payroll aggregation with technician splits & sales bonuses.
 */
hrRouter.get(
  '/payroll/summary',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER']),
  async (req: Request, res: Response) => {
    try {
      const monthYear = (req.query.monthYear as string) || new Date().toISOString().slice(0, 7);
      const summary = await HrService.getPayrollSummary(req.tenant!.shopId, monthYear);
      sendSuccess(res, req, summary, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/hr/payroll/disburse
 * Disburses staff compensation, updates ledger, posts balanced journal (TX-18), and dispatches SMS.
 */
hrRouter.post(
  '/payroll/disburse',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER']),
  async (req: Request, res: Response) => {
    try {
      const parsed = PayrollDisburseSchema.parse(req.body);

      const result = await HrService.disbursePayroll({
        shopId: req.tenant!.shopId,
        employeeUserId: parsed.employeeUserId,
        monthYear: parsed.monthYear,
        disburseMethod: parsed.disburseMethod,
        sourceAccountCode: parsed.sourceAccountCode,
        baseSalary: req.body.baseSalary,
        deductions: req.body.deductions,
        postedByUserId: req.user!._id
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
