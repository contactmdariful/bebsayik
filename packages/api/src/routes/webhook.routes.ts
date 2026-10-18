import { Router, Request, Response } from 'express';
import { BillingService } from '../services/billing/billing.service.js';

export const webhookRouter = Router();

async function handleGatewayWebhook(
  gateway: 'paystation' | 'eps' | 'bkash',
  req: Request,
  res: Response
) {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  const signature =
    (req.headers[`x-${gateway}-signature`] as string) ||
    (req.headers['x-webhook-signature'] as string) ||
    req.body.signature;

  try {
    const result = await BillingService.processWebhook({
      gateway,
      rawBody,
      signature,
      payload: req.body
    });

    res.status(200).json({
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
        code: err.code || 'WEBHOOK_PROCESSING_FAILED',
        message: err.message || 'Webhook processing failed',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
}

/**
 * POST /api/v1/webhooks/paystation
 * PayStation Payment Gateway Webhook Handler
 */
webhookRouter.post('/paystation', (req: Request, res: Response) => {
  handleGatewayWebhook('paystation', req, res);
});

/**
 * POST /api/v1/webhooks/eps
 * Easy Pay Way (EPS) Payment Gateway Webhook Handler
 */
webhookRouter.post('/eps', (req: Request, res: Response) => {
  handleGatewayWebhook('eps', req, res);
});

/**
 * POST /api/v1/webhooks/bkash
 * bKash Merchant Payment Webhook Handler
 */
webhookRouter.post('/bkash', (req: Request, res: Response) => {
  handleGatewayWebhook('bkash', req, res);
});
