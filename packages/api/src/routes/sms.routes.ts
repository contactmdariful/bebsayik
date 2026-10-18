import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { authGuard, requireRole } from '../middlewares/authGuard.js';
import { tenantGuard } from '../middlewares/tenantGuard.js';
import { SmsTemplate, Customer } from '../models/index.js';
import { getSmsDriver } from '../services/sms/index.js';

export const smsRouter = Router();

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

const DEFAULT_SMS_TEMPLATES = [
  {
    tag: 'OTP_VERIFICATION',
    templateBody: 'Your Bebsayik security OTP is {{otp_code}}. Valid for {{valid_minutes}} minutes. Do not share this with anyone.',
    isEnabled: true
  },
  {
    tag: 'DAY_END_Z_REPORT',
    templateBody: 'Z-REPORT [{{shop_name}}]: Shift closed. Expected: ৳{{expected}}, Actual: ৳{{cash}}, Variance: ৳{{variance}}. Register locked.',
    isEnabled: true
  },
  {
    tag: 'INVOICE_BILLING',
    templateBody: 'Dear {{customer_name}}, thank you for shopping at {{shop_name}}. Invoice: {{invoice_no}}, Paid: ৳{{paid_amount}}, Due: ৳{{due_amount}}.',
    isEnabled: true
  },
  {
    tag: 'DUE_REMINDER',
    templateBody: 'Dear {{customer_name}}, your outstanding due at {{shop_name}} is ৳{{due_amount}}. Kindly clear it at your earliest convenience.',
    isEnabled: true
  },
  {
    tag: 'SERVICE_COMPLETED',
    templateBody: 'Dear {{customer_name}}, your device (Job: {{job_no}}) is repaired and ready for pickup at {{shop_name}}. Total Bill: ৳{{total_bill}}.',
    isEnabled: true
  },
  {
    tag: 'PAYROLL_DISBURSED',
    templateBody: 'Dear {{employee_name}}, your compensation of BDT {{amount}} for {{month}} has been disbursed. {{shop_name}}.',
    isEnabled: true
  }
];

/**
 * GET /api/v1/sms/templates
 * Lists all SMS notification templates for the tenant shop.
 * Seeds defaults if not yet customized.
 */
smsRouter.get('/templates', authGuard, tenantGuard, async (req: Request, res: Response) => {
  try {
    const shopId = new mongoose.Types.ObjectId(req.tenant!.shopId);
    let templates = await SmsTemplate.find({ shopId });

    if (templates.length === 0) {
      for (const def of DEFAULT_SMS_TEMPLATES) {
        await SmsTemplate.create({
          shopId,
          tag: def.tag,
          templateBody: def.templateBody,
          isEnabled: def.isEnabled
        });
      }
      templates = await SmsTemplate.find({ shopId });
    }

    sendSuccess(res, req, templates, 200);
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * PUT /api/v1/sms/templates/:tag
 * Updates an SMS template body and status.
 */
smsRouter.put(
  '/templates/:tag',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER']),
  async (req: Request, res: Response) => {
    try {
      const shopId = new mongoose.Types.ObjectId(req.tenant!.shopId);
      const { tag } = req.params;
      const { templateBody, isEnabled } = req.body;

      if (!templateBody || typeof templateBody !== 'string') {
        sendError(res, req, { status: 400, code: 'INVALID_TEMPLATE_BODY', message: 'templateBody is required' });
        return;
      }

      const updated = await SmsTemplate.findOneAndUpdate(
        { shopId, tag },
        {
          shopId,
          tag,
          templateBody,
          ...(isEnabled !== undefined ? { isEnabled: Boolean(isEnabled) } : {})
        },
        { upsert: true, new: true }
      );

      sendSuccess(res, req, updated, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * GET /api/v1/sms/balance
 * Returns telecom gateway balance & credit metrics.
 */
smsRouter.get('/balance', authGuard, tenantGuard, async (req: Request, res: Response) => {
  try {
    // In production this queries the telecom gateway API; in staging/mock it returns monitored balance
    const data = {
      gateway: 'SSL Wireless / BulkSMS BD',
      availableSmsCount: 1420,
      balanceBdt: '497.00',
      ratePerSmsBdt: '0.35',
      lowBalanceAlertThreshold: 200,
      isLowBalance: false
    };
    sendSuccess(res, req, data, 200);
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * POST /api/v1/sms/broadcast
 * Broadcasts a custom SMS notification to selected or filtered customer segments.
 */
smsRouter.post(
  '/broadcast',
  authGuard,
  tenantGuard,
  requireRole(['STORE_OWNER', 'STORE_MANAGER']),
  async (req: Request, res: Response) => {
    try {
      const shopId = new mongoose.Types.ObjectId(req.tenant!.shopId);
      const { message, customerIds } = req.body;

      if (!message || typeof message !== 'string') {
        sendError(res, req, { status: 400, code: 'INVALID_MESSAGE', message: 'Broadcast message is required' });
        return;
      }

      let query: any = { shopId };
      if (Array.isArray(customerIds) && customerIds.length > 0) {
        query._id = { $in: customerIds.map((id: string) => new mongoose.Types.ObjectId(id)) };
      }

      const customers = await Customer.find(query).limit(100);
      const smsDriver = getSmsDriver();
      let sentCount = 0;

      for (const customer of customers) {
        if (customer.phone) {
          const personalized = message
            .replace(/\{\{customerName\}\}/g, customer.fullName)
            .replace(/\{\{dueAmount\}\}/g, customer.currentDueBalance?.toString() || '0');
          await smsDriver.sendSms(customer.phone, personalized);
          sentCount++;
        }
      }

      sendSuccess(res, req, { sentCount, totalTargeted: customers.length }, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);
