import { Router, Request, Response } from 'express';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { HardwareService } from '../services/hardware/hardware.service.js';

export const hardwareRouter = Router();

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
 * GET /api/v1/hardware/station
 * Sourced from api-spec.md Section 5.23
 * Retrieve terminal hardware config (58mm/80mm ESC/POS, drawer kick pulse)
 */
hardwareRouter.get(
  '/station',
  authGuard,
  tenantGuard,
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const stationFingerprint = (req.query.stationFingerprint as string) || (req.headers['x-station-id'] as string);

      const config = await HardwareService.getStationConfig(shopId, stationFingerprint);
      return sendSuccess(res, req, config);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);

/**
 * PUT /api/v1/hardware/station
 * Sourced from api-spec.md Section 5.23
 * Save browser station fingerprint, paper width, and scanner wedge preferences
 */
hardwareRouter.put(
  '/station',
  authGuard,
  tenantGuard,
  requireRole(['STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const shopId = (req as any).tenantShopId || req.headers['x-shop-id'];
      const updated = await HardwareService.saveStationConfig(shopId, req.body);
      return sendSuccess(res, req, updated);
    } catch (err) {
      return sendError(res, req, err);
    }
  }
);
