import Redis from 'ioredis';
import crypto from 'crypto';
import { ENV } from '../../config/env.js';

export interface LockResult {
  acquired: boolean;
  token: string;
}

export class DistributedLockService {
  private redis: Redis | null = null;
  private memoryLocks: Map<string, { token: string; expiresAt: number }> = new Map();
  private redisAvailable = false;

  constructor() {
    if (ENV.REDIS_URI && process.env.NODE_ENV !== 'test') {
      try {
        this.redis = new Redis(ENV.REDIS_URI, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false
        });
        this.redis
          .connect()
          .then(() => {
            this.redisAvailable = true;
          })
          .catch(() => {
            this.redisAvailable = false;
          });
        this.redis.on('error', () => {
          this.redisAvailable = false;
        });
      } catch {
        this.redisAvailable = false;
      }
    }
  }

  /**
   * Acquire a distributed lock with TTL in seconds.
   * Key pattern: e.g. "lock:imei:<imeiOrId>"
   */
  async acquireLock(key: string, ttlSeconds = 15): Promise<LockResult> {
    const token = crypto.randomUUID();

    if (this.redisAvailable && this.redis) {
      try {
        const reply = await this.redis.set(key, token, 'EX', ttlSeconds, 'NX');
        return {
          acquired: reply === 'OK',
          token
        };
      } catch {
        // Fall back to in-memory lock
      }
    }

    // In-memory lock fallback
    const now = Date.now();
    const existing = this.memoryLocks.get(key);
    if (existing && existing.expiresAt > now) {
      return { acquired: false, token: '' };
    }

    this.memoryLocks.set(key, {
      token,
      expiresAt: now + ttlSeconds * 1000
    });

    return { acquired: true, token };
  }

  /**
   * Release lock safely with token ownership check
   */
  async releaseLock(key: string, token: string): Promise<boolean> {
    if (!token) return false;

    if (this.redisAvailable && this.redis) {
      try {
        // Lua script ensures atomic check and delete
        const luaScript = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        const res = await this.redis.eval(luaScript, 1, key, token);
        return res === 1;
      } catch {
        // Fall back to in-memory check
      }
    }

    const existing = this.memoryLocks.get(key);
    if (existing && existing.token === token) {
      this.memoryLocks.delete(key);
      return true;
    }

    return false;
  }

  /**
   * Clear all locks (for testing)
   */
  clearMemoryLocks(): void {
    this.memoryLocks.clear();
  }
}

export const lockService = new DistributedLockService();
