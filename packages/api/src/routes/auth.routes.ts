import { Router, Request, Response } from 'express';
import { authService } from '../services/auth/index.js';
import { verifyTurnstile } from '../middlewares/turnstile.js';
import { authGuard, requireRole } from '../middlewares/authGuard.js';

export const authRouter = Router();

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
 * POST /api/v1/auth/otp/request
 */
authRouter.post('/otp/request', verifyTurnstile, async (req: Request, res: Response) => {
  try {
    const { phone, purpose } = req.body;
    const result = await authService.requestOtp({
      phone,
      purpose: purpose || 'login',
      ip: req.ip ?? undefined
    });
    sendSuccess(res, req, result, 200);
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * POST /api/v1/auth/otp/verify
 */
authRouter.post('/otp/verify', async (req: Request, res: Response) => {
  try {
    const { phone, otp, purpose } = req.body;
    const result = await authService.verifyOtp({ phone, otp, purpose });

    // Set HTTP-only secure cookie for refresh token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    sendSuccess(
      res,
      req,
      {
        accessToken: result.accessToken,
        user: result.user,
        shops: result.shops
      },
      200
    );
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * POST /api/v1/auth/login
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    const result = await authService.loginWithPassword({ phone, password });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    sendSuccess(
      res,
      req,
      {
        accessToken: result.accessToken,
        user: result.user,
        shops: result.shops
      },
      200
    );
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * POST /api/v1/auth/refresh
 */
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      sendError(res, req, {
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Refresh token cookie or body payload is required'
      });
      return;
    }

    const result = await authService.refreshSession(refreshToken);
    sendSuccess(res, req, result, 200);
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * POST /api/v1/auth/logout
 */
authRouter.post('/logout', authGuard, async (req: Request, res: Response) => {
  res.clearCookie('refreshToken');
  sendSuccess(res, req, { message: 'Logged out successfully' }, 200);
});

/**
 * POST /api/v1/auth/recovery/reset
 */
authRouter.post('/recovery/reset', async (req: Request, res: Response) => {
  try {
    const { phone, otp, newPassword } = req.body;
    const result = await authService.resetPassword({ phone, otp, newPassword });
    sendSuccess(res, req, result, 200);
  } catch (err) {
    sendError(res, req, err);
  }
});

/**
 * POST /api/v1/auth/phone-change/initiate
 */
authRouter.post(
  '/phone-change/initiate',
  authGuard,
  requireRole(['STORE_OWNER']),
  async (req: Request, res: Response) => {
    try {
      const { newPhone } = req.body;
      const result = await authService.initiatePhoneChange({
        userId: req.user!._id.toString(),
        newPhone
      });
      sendSuccess(res, req, result, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);

/**
 * POST /api/v1/auth/phone-change/complete
 */
authRouter.post(
  '/phone-change/complete',
  authGuard,
  requireRole(['STORE_OWNER']),
  async (req: Request, res: Response) => {
    try {
      const { oldPhoneOtp, newPhoneOtp } = req.body;
      const result = await authService.completePhoneChange({
        userId: req.user!._id.toString(),
        oldPhoneOtp,
        newPhoneOtp
      });
      res.clearCookie('refreshToken');
      sendSuccess(res, req, result, 200);
    } catch (err) {
      sendError(res, req, err);
    }
  }
);
