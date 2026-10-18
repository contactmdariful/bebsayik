import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@bebsayik/shared-types';
import { verifyAccessToken, AccessTokenPayload } from '../utils/security.js';
import { User, IUser } from '../models/User.js';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      tokenPayload?: AccessTokenPayload;
    }
  }
}

export async function authGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header with Bearer token',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Bearer token missing from Authorization header',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User associated with token not found',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    // Instant Staff Emergency Kill-Switch Check
    if (user.isActive === false) {
      res.status(403).json({
        success: false,
        error: {
          code: 'STAFF_TERMINATED',
          message: 'Staff account has been deactivated by owner; token revoked immediately',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    // Instant Session Revocation Check via tokenVersion
    if (user.tokenVersion !== payload.tokenVersion) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Session has been revoked or superseded. Please log in again.',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired access token',
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    const effectiveRole = req.tenant?.role || req.user.role;
    if (!allowedRoles.includes(effectiveRole)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Role [${effectiveRole}] is not authorized to access this resource. Required one of: [${allowedRoles.join(', ')}]`,
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    next();
  };
}
