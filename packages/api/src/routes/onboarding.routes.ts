import { Router, Request, Response } from 'express';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { OnboardingService } from '../services/onboarding/onboarding.service.js';

export const onboardingRouter = Router();

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
 * POST /api/v1/onboarding/setup
 * 3-step Dokan setup wizard: Atomically creates shop, provisions STORE_OWNER, and sets up COA (TC-30)
 */
onboardingRouter.post('/setup', authGuard, async (req: Request, res: Response) => {
  try {
    const result = await OnboardingService.createShopTenant({
      userId: req.user!._id,
      input: req.body
    });

    sendSuccess(res, req, result, 201);
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * POST /api/v1/onboarding/opening-balances
 * Ingests opening stock, cash, bank, receivables, and payables balancing into Owner Equity (TC-24)
 */
onboardingRouter.post(
  '/opening-balances',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const result = await OnboardingService.postOpeningBalances({
        shopId: req.tenant!.shopId,
        postedByUserId: req.user!._id,
        input: req.body
      });

      sendSuccess(res, req, result, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);
