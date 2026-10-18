import { Router, Request, Response } from 'express';
import { authService } from '../services/auth/index.js';
import { authGuard, requireRole } from '../middlewares/authGuard.js';

export const userRouter = Router();

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
 * POST /api/v1/users/:id/emergency-terminate
 * Owner master password verified -> set isActive: false -> increment staff tokenVersion -> instant 403 kill (<1s)
 */
userRouter.post(
  '/:id/emergency-terminate',
  authGuard,
  requireRole(['STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const targetStaffId = req.params.id;
      const { ownerPassword, reason } = req.body;

      if (!ownerPassword) {
        sendError(res, req, {
          code: 'VALIDATION_ERROR',
          status: 422,
          message: 'Owner master password is required to execute emergency termination',
          details: [{ field: 'ownerPassword', issue: 'Missing owner master password' }]
        });
        return;
      }

      const result = await authService.emergencyTerminateStaff({
        ownerUserId: req.user!._id.toString(),
        targetStaffId: targetStaffId as string,
        ownerPassword,
        reason
      });

      sendSuccess(res, req, result, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/users/manager-pin/verify
 * Sourced from api-spec.md Section 5.3
 * Verify 4-digit Manager Override PIN for sensitive discounts or credit waivers.
 */
userRouter.post(
  '/manager-pin/verify',
  authGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { pin, action, context } = req.body;

      if (!pin) {
        sendError(res, req, {
          code: 'VALIDATION_ERROR',
          status: 422,
          message: '4-digit Manager PIN is required',
          details: [{ field: 'pin', issue: 'Missing PIN' }]
        });
        return;
      }

      const shopId = req.tenant?.shopId?.toString() || (req.headers['x-shop-id'] as string);
      const result = await authService.verifyManagerPin({
        userId: req.user!._id.toString(),
        shopId,
        pin,
        action: action || 'OVERRIDE',
        context
      });

      sendSuccess(res, req, result, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);
