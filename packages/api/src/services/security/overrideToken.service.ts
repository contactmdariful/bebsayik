import crypto from 'crypto';
import { ENV } from '../../config/env.js';

export interface OverrideTokenRecord {
  token: string;
  nonce: string;
  managerUserId: string;
  shopId: string;
  action: string;
  context?: any;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
}

export class OverrideTokenService {
  private tokenStore: Map<string, OverrideTokenRecord> = new Map();
  private readonly secret: string;

  constructor() {
    this.secret = ENV.JWT_ACCESS_SECRET || 'bebsayik_override_token_secret_min32';
  }

  private generateSignature(data: string): string {
    return crypto.createHmac('sha256', this.secret).update(data).digest('hex').substring(0, 32);
  }

  /**
   * Create a signed, 60-second single-use override token for sensitive counter actions
   */
  async createToken(params: {
    managerUserId: string;
    shopId: string;
    action: string;
    context?: any;
  }): Promise<{ overrideToken: string; expiresInSeconds: number }> {
    const { managerUserId, shopId, action, context } = params;
    const now = Date.now();
    const expiresAt = now + 60 * 1000; // strictly 60 seconds validity
    const nonce = crypto.randomBytes(8).toString('hex');

    const dataPayload = `${managerUserId}:${shopId}:${action}:${expiresAt}:${nonce}`;
    const signature = this.generateSignature(dataPayload);
    const token = `ovr_token_${now}_${nonce}.${signature}`;

    const record: OverrideTokenRecord = {
      token,
      nonce,
      managerUserId,
      shopId,
      action,
      context,
      createdAt: now,
      expiresAt,
      consumed: false
    };

    this.tokenStore.set(token, record);

    return {
      overrideToken: token,
      expiresInSeconds: 60
    };
  }

  /**
   * Verify and atomically consume a single-use override token
   */
  async verifyAndConsume(params: {
    token: string;
    expectedShopId: string;
    expectedAction: string;
  }): Promise<{
    valid: boolean;
    managerUserId?: string;
    error?: string;
  }> {
    const { token, expectedShopId, expectedAction } = params;

    if (!token || typeof token !== 'string' || !token.startsWith('ovr_')) {
      return {
        valid: false,
        error: 'Invalid override token format'
      };
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return {
        valid: false,
        error: 'Malformed override token'
      };
    }

    const record = this.tokenStore.get(token);
    if (!record) {
      return {
        valid: false,
        error: 'Override token not found or never issued by server'
      };
    }

    // Verify cryptographic signature
    const dataPayload = `${record.managerUserId}:${record.shopId}:${record.action}:${record.expiresAt}:${record.nonce}`;
    const expectedSig = this.generateSignature(dataPayload);
    if (parts[1] !== expectedSig) {
      return {
        valid: false,
        error: 'Invalid override token cryptographic signature'
      };
    }

    // Check single-use / replay
    if (record.consumed) {
      return {
        valid: false,
        error: 'Override token has already been consumed (single-use only)'
      };
    }

    // Check 60-second expiration
    if (Date.now() > record.expiresAt) {
      return {
        valid: false,
        error: 'Override token has expired (strictly 60-second validity)'
      };
    }

    // Check shop isolation scope
    if (record.shopId !== expectedShopId) {
      return {
        valid: false,
        error: `Override token was issued for shop [${record.shopId}], but presented for shop [${expectedShopId}]`
      };
    }

    // Check action scope
    if (record.action !== expectedAction) {
      return {
        valid: false,
        error: `Override token was issued for action [${record.action}], but presented for action [${expectedAction}]`
      };
    }

    // Atomically mark as consumed (Replay prevention)
    record.consumed = true;

    return {
      valid: true,
      managerUserId: record.managerUserId
    };
  }

  clearMemory(): void {
    this.tokenStore.clear();
  }
}

export const overrideTokenService = new OverrideTokenService();
