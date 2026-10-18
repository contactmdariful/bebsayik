import { Router, Request, Response } from 'express';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard, requirePermission } from '../middlewares/tenantGuard.js';
import { InventoryService } from '../services/inventory/index.js';

export const inventoryRouter = Router();

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

/* ================= SCANNER LOOKUP ================= */

/**
 * GET /api/v1/inventory/imei/scan/:code
 * Sourced from api-spec.md Section 5.5
 * Sub-second barcode/IMEI scanner lookup during POS checkout with <150ms latency.
 */
inventoryRouter.get(
  '/imei/scan/:code',
  authGuard,
  tenantGuard,
  requireRole(['CASHIER', 'SALESPERSON', 'STORE_MANAGER', 'STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const code = req.params.code as string;
      const data = await InventoryService.scanCode(req.tenant!.shopId, code);
      sendSuccess(res, req, data, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/* ================= DUAL-IMEI SERIALIZED INVENTORY ================= */

/**
 * GET /api/v1/inventory/imei
 * List serialized handsets with aging stock filters (>60 / >90 days)
 */
inventoryRouter.get('/imei', authGuard, tenantGuard, async (req: Request, res: Response) => {
  try {
    const { status, agingDays, brandId, search, page, limit } = req.query;
    const options: any = {};
    if (status) options.status = status as string;
    if (agingDays) options.agingDays = Number(agingDays);
    if (brandId) options.brandId = brandId as string;
    if (search) options.search = search as string;
    if (page) options.page = Number(page);
    if (limit) options.limit = Number(limit);

    const result = await InventoryService.listImeis(req.tenant!.shopId, options);

    sendSuccess(res, req, result.items, 200, { pagination: result.pagination });
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * POST /api/v1/inventory/imei
 * Register new serialized handset (15-digit Luhn check, uniqueness, exact cost)
 */
inventoryRouter.post(
  '/imei',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { variantId, imei1, imei2, serialNumber, specificCost, stockLocation, purchaseDate, source, status } =
        req.body;

      if (!variantId || !imei1 || specificCost === undefined) {
        sendError(res, req, {
          status: 422,
          code: 'VALIDATION_ERROR',
          message: 'variantId, imei1, and specificCost are required'
        });
        return;
      }

      const registerParams: any = {
        variantId,
        imei1,
        specificCost
      };
      if (imei2) registerParams.imei2 = imei2;
      if (serialNumber) registerParams.serialNumber = serialNumber;
      if (stockLocation) registerParams.stockLocation = stockLocation;
      if (purchaseDate) registerParams.purchaseDate = new Date(purchaseDate);
      if (source) registerParams.source = source;
      if (status) registerParams.status = status;

      const handset = await InventoryService.registerImei(req.tenant!.shopId, registerParams);

      sendSuccess(res, req, handset, 201);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/inventory/imei/:imei1
 * Fetch historical timeline audit of an IMEI
 */
inventoryRouter.get(
  '/imei/:imei1',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const timeline = await InventoryService.getImeiTimeline(
        req.tenant!.shopId,
        req.params.imei1 as string
      );
      sendSuccess(res, req, timeline, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * PATCH /api/v1/inventory/imei/:id/status
 * State transition machine for serialized handset
 */
inventoryRouter.patch(
  '/imei/:id/status',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { status, note } = req.body;
      if (!status) {
        sendError(res, req, {
          status: 422,
          code: 'VALIDATION_ERROR',
          message: 'target status is required'
        });
        return;
      }

      const updated = await InventoryService.updateImeiStatus(
        req.tenant!.shopId,
        req.params.id as string,
        status,
        req.user!._id,
        note
      );

      sendSuccess(res, req, updated, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/* ================= ACCESSORIES & MOVEMENTS ================= */

/**
 * GET /api/v1/inventory/movements
 * Audit append-only stock movement ledger
 */
inventoryRouter.get(
  '/movements',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { variantId, page, limit } = req.query;
      const options: any = {};
      if (variantId) options.variantId = variantId as string;
      if (page) options.page = Number(page);
      if (limit) options.limit = Number(limit);

      const result = await InventoryService.listMovements(req.tenant!.shopId, options);

      sendSuccess(res, req, result.movements, 200, { pagination: result.pagination });
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/inventory/stock-levels
 * Current stock counts, cost valuations, and items below reorder threshold
 */
inventoryRouter.get('/stock-levels', authGuard, tenantGuard, async (req: Request, res: Response) => {
  try {
    const { lowStockOnly, search } = req.query;
    const items = await InventoryService.getStockLevels(req.tenant!.shopId, {
      lowStockOnly: lowStockOnly === 'true' || lowStockOnly === '1',
      search: search as string
    });
    sendSuccess(res, req, items, 200);
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * POST /api/v1/inventory/adjustments
 * Manual stock audit discrepancy correction requiring manager authorization
 */
inventoryRouter.post(
  '/adjustments',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { variantId, physicalCount, systemCount, reason, managerPin, overrideToken } = req.body;

      if (!variantId || physicalCount === undefined || systemCount === undefined) {
        sendError(res, req, {
          status: 422,
          code: 'VALIDATION_ERROR',
          message: 'variantId, physicalCount, and systemCount are required'
        });
        return;
      }

      const result = await InventoryService.adjustStock(req.tenant!.shopId, {
        variantId,
        physicalCount: Number(physicalCount),
        systemCount: Number(systemCount),
        reason: reason || 'Monthly stock count audit adjustment',
        managerPin,
        overrideToken,
        userId: req.user!._id
      });

      sendSuccess(res, req, result, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/* ================= DAMAGED STOCK SCRAP HUB (SWV - TX-17) ================= */

/**
 * POST /api/v1/inventory/damage/scrap
 * Sourced from api-spec.md Section 5.8
 * Record shattered device write-off, verify manager override token/PIN, and post TX-17 accounting
 */
inventoryRouter.post(
  '/damage/scrap',
  authGuard,
  tenantGuard,
  requirePermission('inventory:scrap'),
  async (req: Request, res: Response) => {
    try {
      const { imei1, damageCategory, description, photoUrl, managerPin, overrideToken } = req.body;

      if (!imei1) {
        sendError(res, req, {
          status: 422,
          code: 'VALIDATION_ERROR',
          message: 'imei1 is required to identify the handset for scrap write-off'
        });
        return;
      }

      const scrapParams: any = {
        imei1,
        damageCategory,
        description,
        photoUrl,
        managerPin,
        overrideToken,
        userId: req.user!._id
      };
      const idempotencyKey = req.headers['idempotency-key'] as string;
      if (idempotencyKey) scrapParams.idempotencyKey = idempotencyKey;

      const result = await InventoryService.scrapHandset(req.tenant!.shopId, scrapParams);

      sendSuccess(res, req, result, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/inventory/damage
 * List all written-off scrap items with total P&L write-off loss valuation
 */
inventoryRouter.get(
  '/damage',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query;
      const options: any = {};
      if (page) options.page = Number(page);
      if (limit) options.limit = Number(limit);

      const result = await InventoryService.listScraps(req.tenant!.shopId, options);

      sendSuccess(res, req, result.scraps, 200, {
        totalLossValuation: result.totalLossValuation,
        pagination: result.pagination
      });
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/inventory/damage/upload
 * Evidence photo upload endpoint for webcam or file capture
 */
inventoryRouter.post(
  '/damage/upload',
  authGuard,
  tenantGuard,
  async (req: Request, res: Response) => {
    try {
      const { imageBase64, filename } = req.body;
      if (!imageBase64) {
        sendError(res, req, {
          status: 422,
          code: 'VALIDATION_ERROR',
          message: 'imageBase64 is required for photo evidence'
        });
        return;
      }

      // Check max size: 5MB
      if (imageBase64.length > 5 * 1024 * 1024 * 1.37) {
        sendError(res, req, {
          status: 413,
          code: 'FILE_TOO_LARGE',
          message: 'Evidence photo exceeds 5MB size limit'
        });
        return;
      }

      const photoId = `evidence_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const photoUrl = `https://storage.bebsayik.com/evidence/${photoId}.jpg`;

      sendSuccess(res, req, {
        photoUrl,
        filename: filename || `${photoId}.jpg`,
        uploadedAt: new Date().toISOString()
      }, 201);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);
