import { Router, Request, Response } from 'express';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { CatalogService, CatalogImportService } from '../services/catalog/index.js';

export const catalogRouter = Router();

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

/* ================= CATEGORIES ================= */

catalogRouter.get('/categories', authGuard, tenantGuard, async (req: Request, res: Response) => {
  try {
    const categories = await CatalogService.listCategories(req.tenant!.shopId, {
      search: req.query.search as string
    });
    sendSuccess(res, req, categories, 200);
  } catch (err) {
    sendError(res, req, err);
  }
});

catalogRouter.post(
  '/categories',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        sendError(res, req, {
          status: 422,
          code: 'VALIDATION_ERROR',
          message: 'Category name is required'
        });
        return;
      }
      const category = await CatalogService.createCategory(req.tenant!.shopId, {
        name,
        description
      });
      sendSuccess(res, req, category, 201);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

catalogRouter.patch(
  '/categories/:id',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const category = await CatalogService.updateCategory(
        req.tenant!.shopId,
        req.params.id as string,
        req.body
      );
      sendSuccess(res, req, category, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

catalogRouter.delete(
  '/categories/:id',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      await CatalogService.deleteCategory(req.tenant!.shopId, req.params.id as string);
      sendSuccess(res, req, { message: 'Category deleted successfully' }, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/* ================= BRANDS ================= */

catalogRouter.get('/brands', authGuard, tenantGuard, async (req: Request, res: Response) => {
  try {
    const brands = await CatalogService.listBrands(req.tenant!.shopId, {
      search: req.query.search as string
    });
    sendSuccess(res, req, brands, 200);
  } catch (err) {
    sendError(res, req, err);
  }
});

catalogRouter.post(
  '/brands',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { name, logoUrl, originCountry } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        sendError(res, req, {
          status: 422,
          code: 'VALIDATION_ERROR',
          message: 'Brand name is required'
        });
        return;
      }
      const brand = await CatalogService.createBrand(req.tenant!.shopId, {
        name,
        logoUrl,
        originCountry
      });
      sendSuccess(res, req, brand, 201);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

catalogRouter.patch(
  '/brands/:id',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const brand = await CatalogService.updateBrand(req.tenant!.shopId, req.params.id as string, req.body);
      sendSuccess(res, req, brand, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

catalogRouter.delete(
  '/brands/:id',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      await CatalogService.deleteBrand(req.tenant!.shopId, req.params.id as string);
      sendSuccess(res, req, { message: 'Brand deleted successfully' }, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/* ================= PRODUCTS & VARIANTS ================= */

catalogRouter.get('/products', authGuard, tenantGuard, async (req: Request, res: Response) => {
  try {
    const { search, categoryId, brandId, hasImei, productType, page, limit } = req.query;
    const options: any = {};
    if (search) options.search = String(search);
    if (categoryId) options.categoryId = String(categoryId);
    if (brandId) options.brandId = String(brandId);
    if (hasImei !== undefined) options.hasImei = hasImei === 'true' || hasImei === '1';
    if (productType) options.productType = String(productType);
    if (page) options.page = Number(page);
    if (limit) options.limit = Number(limit);

    const result = await CatalogService.listProducts(req.tenant!.shopId, options);

    sendSuccess(res, req, result.products, 200, { pagination: result.pagination });
  } catch (err) {
    sendError(res, req, err);
  }
});

catalogRouter.get('/products/:id', authGuard, tenantGuard, async (req: Request, res: Response) => {
  try {
    const product = await CatalogService.getProduct(req.tenant!.shopId, req.params.id as string);
    sendSuccess(res, req, product, 200);
  } catch (err) {
    sendError(res, req, err);
  }
});

catalogRouter.post(
  '/products',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { name, categoryId, brandId, modelNumber, productType, hasImei, warrantyMonths, description, variants } =
        req.body;

      if (!name || !categoryId || !brandId) {
        sendError(res, req, {
          status: 422,
          code: 'VALIDATION_ERROR',
          message: 'name, categoryId, and brandId are required'
        });
        return;
      }

      const product = await CatalogService.createProduct(req.tenant!.shopId, {
        name,
        categoryId,
        brandId,
        modelNumber,
        productType,
        hasImei,
        warrantyMonths,
        description,
        variants: variants || []
      });

      sendSuccess(res, req, product, 201);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

catalogRouter.patch(
  '/products/:id',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const updated = await CatalogService.updateProduct(
        req.tenant!.shopId,
        req.params.id as string,
        req.body
      );
      sendSuccess(res, req, updated, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

catalogRouter.delete(
  '/products/:id',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      await CatalogService.deleteProduct(req.tenant!.shopId, req.params.id as string);
      sendSuccess(res, req, { message: 'Product deleted successfully' }, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/* ================= EXCEL / CSV IMPORT ================= */

catalogRouter.get(
  '/import-template',
  authGuard,
  tenantGuard,
  (_req: Request, res: Response) => {
    const csv = CatalogImportService.getImportTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="bebsayik_catalog_template.csv"');
    res.send(csv);
  }
);

catalogRouter.post(
  '/import-excel',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      // Accepts CSV text in body, or JSON rows array, or raw body string
      let input: any = req.body;
      if (typeof req.body === 'object' && req.body.csvText) {
        input = req.body.csvText;
      } else if (typeof req.body === 'object' && Array.isArray(req.body.rows)) {
        input = req.body.rows;
      } else if (typeof req.body === 'string') {
        input = req.body;
      }

      const previewOnly = req.query.preview === 'true' || Boolean(req.body?.preview);
      const result = await CatalogImportService.importCatalog(
        req.tenant!.shopId,
        input,
        { previewOnly }
      );

      sendSuccess(res, req, result, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);
