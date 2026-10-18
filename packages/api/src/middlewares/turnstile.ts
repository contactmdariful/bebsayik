import { Request, Response, NextFunction } from 'express';

export async function verifyTurnstile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.body?.turnstileToken;

  // In test or local dev environments, permit dummy or mock Turnstile tokens
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    if (!token || token.startsWith('0.XXXXX') || token.startsWith('mock-') || token === 'valid_turnstile_token') {
      return next();
    }
  }

  if (!token) {
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Cloudflare Turnstile verification token is required',
        details: [{ field: 'turnstileToken', issue: 'Missing turnstile verification token' }],
        timestamp: new Date().toISOString(),
        requestId: (req.headers['x-request-id'] as string) || `req_${Date.now()}`
      }
    });
    return;
  }

  // If Turnstile secret key is configured, verify with Cloudflare
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (secretKey) {
    try {
      const formData = new URLSearchParams();
      formData.append('secret', secretKey);
      formData.append('response', token);
      formData.append('remoteip', req.ip || '');

      const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData
      });
      const data = (await cfRes.json()) as { success: boolean };
      if (!data.success) {
        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cloudflare Turnstile token validation failed',
            details: [{ field: 'turnstileToken', issue: 'Invalid or expired turnstile token' }],
            timestamp: new Date().toISOString(),
            requestId: (req.headers['x-request-id'] as string) || `req_${Date.now()}`
          }
        });
        return;
      }
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to verify Turnstile challenge with Cloudflare',
          timestamp: new Date().toISOString(),
          requestId: (req.headers['x-request-id'] as string) || `req_${Date.now()}`
        }
      });
      return;
    }
  }

  next();
}
