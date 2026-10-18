import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { PersonalLedgerContact } from '../models/PersonalLedgerContact.js';
import { PersonalLedgerTransaction } from '../models/PersonalLedgerTransaction.js';
import { Decimal } from 'decimal.js';

export const personalLedgerRouter = Router();

// Apply authGuard, tenantGuard, and STRICT STORE_OWNER requirement to ALL routes in this router
personalLedgerRouter.use(authGuard);
personalLedgerRouter.use(tenantGuard);
personalLedgerRouter.use(requireRole(['STORE_OWNER']));

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
 * GET /api/v1/personal-ledger/contacts
 * Retrieve isolated personal ledger contacts for current shop owner
 */
personalLedgerRouter.get('/contacts', async (req: Request, res: Response) => {
  try {
    const shopId = req.tenant!.shopId;
    const contacts = await PersonalLedgerContact.find({
      shopId,
      isDeleted: false
    }).sort({ fullName: 1 });

    sendSuccess(res, req, contacts, 200);
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * POST /api/v1/personal-ledger/contacts
 * Create a new personal ledger contact (family, friend, personal loan)
 */
personalLedgerRouter.post('/contacts', async (req: Request, res: Response) => {
  try {
    const shopId = req.tenant!.shopId;
    const { name, fullName, phone, relationship } = req.body;
    const resolvedName = (fullName || name || '').trim();

    if (!resolvedName) {
      sendError(res, req, {
        code: 'VALIDATION_ERROR',
        status: 422,
        message: 'Contact name is required'
      });
      return;
    }

    if (!phone) {
      sendError(res, req, {
        code: 'VALIDATION_ERROR',
        status: 422,
        message: 'Contact phone is required'
      });
      return;
    }

    const contact = await PersonalLedgerContact.create({
      shopId,
      fullName: resolvedName,
      phone: phone.trim(),
      relationship: relationship || 'Personal',
      currentBalance: 0,
      isDeleted: false
    });

    sendSuccess(res, req, contact, 201);
  } catch (err: any) {
    if (err.code === 11000) {
      sendError(res, req, {
        code: 'CONFLICT',
        status: 409,
        message: 'A personal contact with this mobile number already exists in your personal ledger'
      });
      return;
    }
    sendError(res, req, err);
  }
});

/**
 * POST /api/v1/personal-ledger/transactions
 * Record non-P&L Amanat, Hawlat, or Expense on Behalf transaction
 * Sourced from api-spec.md Section 5.18 & TX-14, TX-15, TX-16
 * Strict invariant: 0.00% impact on store P&L
 */
personalLedgerRouter.post('/transactions', async (req: Request, res: Response) => {
  try {
    const shopId = req.tenant!.shopId;
    const { contactId, txType, type, amount, notes } = req.body;
    const resolvedType = txType || type;

    const validTypes = [
      'amanat_received',
      'amanat_returned',
      'hawlat_given',
      'hawlat_collected',
      'expense_on_behalf'
    ];

    if (!validTypes.includes(resolvedType)) {
      sendError(res, req, {
        code: 'VALIDATION_ERROR',
        status: 422,
        message: `Invalid transaction type. Allowed: [${validTypes.join(', ')}]`
      });
      return;
    }

    if (!contactId || !mongoose.Types.ObjectId.isValid(contactId)) {
      sendError(res, req, {
        code: 'VALIDATION_ERROR',
        status: 422,
        message: 'Valid contactId is required'
      });
      return;
    }

    const contact = await PersonalLedgerContact.findOne({
      _id: new mongoose.Types.ObjectId(contactId),
      shopId,
      isDeleted: false
    });

    if (!contact) {
      sendError(res, req, {
        code: 'NOT_FOUND',
        status: 404,
        message: 'Personal ledger contact not found in current shop workspace'
      });
      return;
    }

    const numAmount = new Decimal(amount || 0);
    if (numAmount.isNaN() || numAmount.lte(0)) {
      sendError(res, req, {
        code: 'VALIDATION_ERROR',
        status: 422,
        message: 'Transaction amount must be a positive monetary number'
      });
      return;
    }

    // Record personal transaction with exact Decimal128
    const tx = await PersonalLedgerTransaction.create({
      shopId,
      contactId: contact._id,
      type: resolvedType,
      amount: mongoose.Types.Decimal128.fromString(numAmount.toFixed(2)),
      notes: notes || '',
      recordedByUserId: req.user!._id
    });

    // Update running balance on contact without altering store accounts
    const currentBal = new Decimal(contact.currentBalance ? contact.currentBalance.toString() : '0');
    let newBal: Decimal;

    if (resolvedType === 'amanat_received' || resolvedType === 'hawlat_given') {
      newBal = currentBal.plus(numAmount);
    } else {
      newBal = currentBal.minus(numAmount);
    }

    contact.currentBalance = mongoose.Types.Decimal128.fromString(newBal.toFixed(2));
    await contact.save();

    sendSuccess(
      res,
      req,
      {
        transaction: tx,
        updatedBalance: newBal.toFixed(2),
        storePnlImpact: '0.00 BDT (Completely Insulated)'
      },
      201
    );
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * GET /api/v1/personal-ledger/statement/:contactId
 * Retrieve isolated personal statement for a specific contact
 */
personalLedgerRouter.get('/statement/:contactId', async (req: Request, res: Response) => {
  try {
    const shopId = req.tenant!.shopId;
    const { contactId } = req.params;

    if (!contactId || !mongoose.Types.ObjectId.isValid(contactId as string)) {
      sendError(res, req, {
        code: 'VALIDATION_ERROR',
        status: 422,
        message: 'Valid contactId parameter required'
      });
      return;
    }

    const contact = await PersonalLedgerContact.findOne({
      _id: new mongoose.Types.ObjectId(contactId as string),
      shopId,
      isDeleted: false
    });

    if (!contact) {
      sendError(res, req, {
        code: 'NOT_FOUND',
        status: 404,
        message: 'Personal ledger contact not found'
      });
      return;
    }

    const transactions = await PersonalLedgerTransaction.find({
      shopId,
      contactId: contact._id
    }).sort({ createdAt: -1 });

    sendSuccess(
      res,
      req,
      {
        contact,
        transactions,
        totalTransactions: transactions.length
      },
      200
    );
  } catch (err) {
    sendError(res, req, err);
  }
});
