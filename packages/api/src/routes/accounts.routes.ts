import { Router, Request, Response } from 'express';
import { InterAccountTransferSchema, ExpenseVoucherSchema } from '@bebsayik/shared-types';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { AccountsService } from '../services/accounts/accounts.service.js';

export const accountsRouter = Router();

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
 * GET /api/v1/accounts
 * Lists all Chart of Accounts for the tenant shop with real-time balances.
 */
accountsRouter.get('/', authGuard, tenantGuard, async (req: Request, res: Response) => {
  try {
    const accounts = await AccountsService.listAccounts(req.tenant!.shopId);
    sendSuccess(res, req, accounts, 200);
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * GET /api/v1/accounts/transactions
 * Returns paginated general ledger transactions.
 */
accountsRouter.get('/transactions', authGuard, tenantGuard, async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string | undefined;
    const accountCode = req.query.accountCode as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;

    const result = await AccountsService.getLedgerTransactions(req.tenant!.shopId, {
      accountId,
      accountCode,
      limit,
      skip
    });

    sendSuccess(res, req, result, 200);
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * POST /api/v1/accounts/transfer
 * Executes an inter-account fund transfer (e.g. Cash in Drawer to Bank).
 */
accountsRouter.post(
  '/transfer',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER']),
  async (req: Request, res: Response) => {
    try {
      const parsed = InterAccountTransferSchema.parse(req.body);

      const result = await AccountsService.transferFunds({
        shopId: req.tenant!.shopId,
        fromAccountCode: parsed.fromAccountCode,
        toAccountCode: parsed.toAccountCode,
        amount: parsed.amount,
        notes: parsed.notes,
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

/**
 * POST /api/v1/accounts/expenses
 * Records an OPEX petty expense voucher (e.g. tea, rent, electricity).
 */
accountsRouter.post(
  '/expenses',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER', 'CASHIER']),
  async (req: Request, res: Response) => {
    try {
      const parsed = ExpenseVoucherSchema.parse(req.body);

      const result = await AccountsService.recordExpense({
        shopId: req.tenant!.shopId,
        categoryCode: parsed.categoryCode,
        paidFromAccountCode: parsed.paidFromAccountCode,
        amount: parsed.amount,
        payeeName: parsed.payeeName,
        notes: parsed.notes,
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
