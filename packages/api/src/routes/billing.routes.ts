import { Router, Request, Response } from 'express';
import { BillingService } from '../services/billing/billing.service.js';
import { authGuard } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';

export const billingRouter = Router();

/**
 * GET /api/v1/billing/plans
 * List all available SaaS subscription tiers
 */
billingRouter.get('/plans', async (_req: Request, res: Response) => {
  const requestId = (_req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  try {
    const plans = await BillingService.getPlans();
    res.json({
      success: true,
      data: plans,
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code || 'PLANS_FETCH_FAILED',
        message: err.message || 'Failed to fetch subscription plans',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
});

/**
 * POST /api/v1/billing/validate-coupon
 * Validate a promotional coupon code
 */
billingRouter.post('/validate-coupon', async (req: Request, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  try {
    const result = await BillingService.validateCoupon(req.body);
    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({
      success: false,
      error: {
        code: err.code || 'COUPON_VALIDATION_FAILED',
        message: err.message || 'Failed to validate coupon',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
});

/**
 * POST /api/v1/billing/checkout
 * Generate a subscription checkout invoice and payment gateway redirect
 */
billingRouter.post('/checkout', authGuard, tenantGuard, async (req: Request, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  try {
    const shopId = req.tenant?.shopId || req.body.shopId;
    if (!shopId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'SHOP_ID_REQUIRED',
          message: 'Shop ID is required for checkout',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    const checkout = await BillingService.createCheckout({
      shopId,
      input: req.body
    });

    res.status(201).json({
      success: true,
      data: checkout,
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({
      success: false,
      error: {
        code: err.code || 'CHECKOUT_FAILED',
        message: err.message || 'Failed to initiate checkout',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
});

/**
 * GET /api/v1/billing/subscription
 * Get current shop subscription status, expiry dates, and entitlements
 */
billingRouter.get('/subscription', authGuard, tenantGuard, async (req: Request, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  try {
    const shopId = req.tenant?.shopId || (req.query.shopId as string);
    if (!shopId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'SHOP_ID_REQUIRED',
          message: 'Shop context is required',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    const status = await BillingService.getSubscriptionStatus(shopId);
    res.json({
      success: true,
      data: status,
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code || 'SUBSCRIPTION_STATUS_FAILED',
        message: err.message || 'Failed to fetch subscription status',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
});
