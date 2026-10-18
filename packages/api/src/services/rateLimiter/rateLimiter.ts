import Redis from 'ioredis';
import { ENV } from '../../config/env.js';

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  remaining: number;
  retryAfterSeconds: number;
}

export class SlidingWindowRateLimiter {
  private redis: Redis | null = null;
  private memoryStore: Map<string, number[]> = new Map();
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

  async check(key: string, maxRequests: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    if (this.redisAvailable && this.redis) {
      try {
        const pipeline = this.redis.pipeline();
        pipeline.zremrangebyscore(key, 0, windowStart);
        pipeline.zadd(key, now, `${now}-${Math.random()}`);
        pipeline.zcard(key);
        pipeline.expire(key, windowSeconds);

        const results = await pipeline.exec();
        const count = (results?.[2]?.[1] as number) || 1;

        const allowed = count <= maxRequests;
        const remaining = Math.max(0, maxRequests - count);
        const retryAfterSeconds = allowed ? 0 : windowSeconds;

        return {
          allowed,
          currentCount: count,
          remaining,
          retryAfterSeconds
        };
      } catch {
        // Fall back to memoryStore if Redis query fails
      }
    }

    // In-memory sliding window implementation
    let timestamps = this.memoryStore.get(key) || [];
    // Filter timestamps within current window
    timestamps = timestamps.filter((t) => t > windowStart);

    timestamps.push(now);
    this.memoryStore.set(key, timestamps);

    const count = timestamps.length;
    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);

    // Calculate retryAfterSeconds from oldest timestamp in window
    let retryAfterSeconds = 0;
    if (!allowed && timestamps.length > 0) {
      const oldest = timestamps[0]!;
      retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowSeconds * 1000 - now) / 1000));
    }

    return {
      allowed,
      currentCount: count,
      remaining,
      retryAfterSeconds
    };
  }

  async reset(key: string): Promise<void> {
    this.memoryStore.delete(key);
    if (this.redisAvailable && this.redis) {
      try {
        await this.redis.del(key);
      } catch {
        // Ignore
      }
    }
  }

  clearMemory(): void {
    this.memoryStore.clear();
  }
}

export const rateLimiter = new SlidingWindowRateLimiter();
