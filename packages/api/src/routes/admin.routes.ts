import { Router, Request, Response } from 'express';
import { AdminService } from '../services/admin/admin.service.js';
import { BillingService } from '../services/billing/billing.service.js';
import { authGuard, requireRole } from '../middlewares/authGuard.js';

export const adminRouter = Router();

// Guard all admin routes strictly to SUPER_ADMIN (TC-44)
adminRouter.use(authGuard);
adminRouter.use(requireRole(['SUPER_ADMIN']));

/**
 * GET /api/v1/admin/analytics/kpis
 * Global SaaS KPI Analytics (MRR, ARR, active shops, churn, SMS balance)
 */
adminRouter.get('/analytics/kpis', async (_req: Request, res: Response) => {
  const requestId = (_req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  try {
    const kpis = await AdminService.getKpiAnalytics();
    res.json({
      success: true,
      data: kpis,
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code || 'ADMIN_KPIS_FAILED',
        message: err.message || 'Failed to fetch admin KPIs',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
});

/**
 * GET /api/v1/admin/shops
 * Tenant shop directory with filtering, searching, and pagination
 */
adminRouter.get('/shops', async (req: Request, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  try {
    const result = await AdminService.listShops({
      status: req.query.status as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20
    });

    res.json({
      success: true,
      data: result.shops,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        pagination: result.pagination
      }
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code || 'SHOP_LIST_FAILED',
        message: err.message || 'Failed to list tenant shops',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
});

/**
 * POST /api/v1/admin/shops/:id/suspend
 * Non-destructive shop suspension (TC-38)
 */
adminRouter.post('/shops/:id/suspend', async (req: Request, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  const shopId = req.params.id as string;
  try {
    const shop = await AdminService.suspendShop(shopId, req.body);
    res.json({
      success: true,
      data: shop,
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({
      success: false,
      error: {
        code: err.code || 'SUSPENSION_FAILED',
        message: err.message || 'Failed to suspend shop',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
});

/**
 * POST /api/v1/admin/shops/:id/reactivate
 * 1-Click Shop Reactivation (TC-38)
 */
adminRouter.post('/shops/:id/reactivate', async (req: Request, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  const shopId = req.params.id as string;
  try {
    const shop = await AdminService.reactivateShop(shopId);
    res.json({
      success: true,
      data: shop,
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({
      success: false,
      error: {
        code: err.code || 'REACTIVATION_FAILED',
        message: err.message || 'Failed to reactivate shop',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
});

/**
 * POST /api/v1/admin/shops/:id/emergency-phone-migration
 * Emergency Hotline Lost SIM Phone Migration (TC-56)
 */
adminRouter.post('/shops/:id/emergency-phone-migration', async (req: Request, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  const shopId = req.params.id as string;
  try {
    const result = await AdminService.emergencyPhoneMigration({
      shopId,
      input: req.body,
      adminUserId: req.user!._id.toString()
    });

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
        code: err.code || 'PHONE_MIGRATION_FAILED',
        message: err.message || 'Failed to execute emergency phone migration',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
});

/**
 * PATCH /api/v1/admin/plans/:code/price
 * Subscription Plan Price Versioning (TC-39)
 */
adminRouter.patch('/plans/:code/price', async (req: Request, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  const planCode = req.params.code as string;
  try {
    const updatedPlan = await AdminService.updatePlanPrice(planCode, req.body);
    res.json({
      success: true,
      data: updatedPlan,
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({
      success: false,
      error: {
        code: err.code || 'PLAN_PRICE_UPDATE_FAILED',
        message: err.message || 'Failed to update plan price',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
});

/**
 * GET /api/v1/admin/payments
 * Audit ledger of subscription invoices and gateway payments
 */
adminRouter.get('/payments', async (req: Request, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  try {
    const result = await AdminService.listPayments({
      status: req.query.status as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20
    });

    res.json({
      success: true,
      data: result.payments,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        pagination: result.pagination
      }
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code || 'PAYMENTS_FETCH_FAILED',
        message: err.message || 'Failed to fetch payment ledger',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
});

/**
 * POST /api/v1/admin/sweeper/lifecycle
 * Trigger subscription lifecycle sweep (TC-25, TC-35)
 */
adminRouter.post('/sweeper/lifecycle', async (_req: Request, res: Response) => {
  const requestId = (_req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  try {
    const sweepResult = await BillingService.sweepSubscriptionLifecycles();
    res.json({
      success: true,
      data: sweepResult,
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'LIFECYCLE_SWEEP_FAILED',
        message: err.message,
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
});

/**
 * POST /api/v1/admin/sweeper/invoices
 * Trigger delayed gateway invoice sweep (TC-49)
 */
adminRouter.post('/sweeper/invoices', async (req: Request, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  try {
    const minutes = req.body.minutes ? parseInt(req.body.minutes, 10) : 3;
    const sweepResult = await BillingService.sweepPendingGatewayInvoices(minutes);
    res.json({
      success: true,
      data: sweepResult,
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INVOICE_SWEEP_FAILED',
        message: err.message,
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
});
