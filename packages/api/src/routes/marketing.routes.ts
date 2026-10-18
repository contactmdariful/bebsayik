import { Router, Request, Response } from 'express';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { OnboardingService } from '../services/onboarding/onboarding.service.js';
import { MarketingLead } from '../models/MarketingLead.js';

export const marketingRouter = Router();

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
 * POST /api/v1/marketing/leads
 * Public pre-launch Google Play / App Store badge lead capture (TC-43)
 */
marketingRouter.post('/leads', async (req: Request, res: Response) => {
  try {
    const lead = await OnboardingService.captureMarketingLead(req.body);
    sendSuccess(
      res,
      req,
      {
        id: lead._id.toString(),
        phone: lead.phone,
        shopName: lead.shopName,
        contactName: lead.contactName,
        leadSource: lead.leadSource,
        status: lead.status
      },
      201
    );
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * GET /api/v1/marketing/leads
 * Platform Admin retrieval of marketing leads
 */
marketingRouter.get('/leads', authGuard, requireRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const leads = await MarketingLead.find({}).sort({ createdAt: -1 });
    sendSuccess(res, req, leads, 200);
  } catch (err) {
    sendError(res, req, err);
  }
});
