import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import http from 'http';
import mongoose from 'mongoose';
import { app } from '../index.js';
import { validateEnv } from '../config/env.js';

describe('Phase 14: Production Containerization, Health Endpoints & Environment Hardening', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('1. Environment Schema & Security Validation (validateEnv)', () => {
    it('accepts valid development environment with fallback defaults', () => {
      const parsed = validateEnv({
        NODE_ENV: 'development',
        PORT: '5000'
      });

      expect(parsed.NODE_ENV).toBe('development');
      expect(parsed.PORT).toBe(5000);
      expect(parsed.MONGODB_URI).toBeDefined();
      expect(parsed.JWT_ACCESS_SECRET).toBeDefined();
    });

    it('rejects weak placeholder JWT secrets when NODE_ENV === "production"', () => {
      expect(() => {
        validateEnv({
          NODE_ENV: 'production',
          PORT: '5000',
          MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/prod?replicaSet=rs0',
          REDIS_URI: 'rediss://user:pass@redis.prod:6379',
          JWT_ACCESS_SECRET: 'dev_jwt_access_secret_min32characters_bebsayik',
          JWT_REFRESH_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        });
      }).toThrow(/Production JWT_ACCESS_SECRET must not use default or development placeholder strings/);
    });

    it('rejects identical JWT access and refresh secrets in production', () => {
      const sameSecret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      expect(() => {
        validateEnv({
          NODE_ENV: 'production',
          PORT: '5000',
          MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/prod?replicaSet=rs0',
          REDIS_URI: 'rediss://user:pass@redis.prod:6379',
          JWT_ACCESS_SECRET: sameSecret,
          JWT_REFRESH_SECRET: sameSecret
        });
      }).toThrow(/must be distinct cryptographic keys/);
    });

    it('rejects localhost MongoDB URI in production unless ALLOW_LOCAL_SERVICES_IN_PROD is set', () => {
      expect(() => {
        validateEnv({
          NODE_ENV: 'production',
          PORT: '5000',
          MONGODB_URI: 'mongodb://localhost:27017/prod_db',
          REDIS_URI: 'rediss://user:pass@redis.prod:6379',
          JWT_ACCESS_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          JWT_REFRESH_SECRET: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
          ALLOW_LOCAL_SERVICES_IN_PROD: 'false'
        });
      }).toThrow(/Production MONGODB_URI must not point to localhost/);
    });

    it('successfully validates hardened production environment credentials', () => {
      const prodConfig = validateEnv({
        NODE_ENV: 'production',
        PORT: '5000',
        MONGODB_URI: 'mongodb+srv://app_user:StrongAtlasPass2026!@bebsayik.cluster.mongodb.net/prod?replicaSet=rs0',
        MONGODB_DB_NAME: 'bebsayik_production',
        REDIS_URI: 'rediss://prod_user:StrongRedisPass2026!@redis.bebsayik.internal:6379',
        JWT_ACCESS_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        JWT_REFRESH_SECRET: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
        DOMAIN_MARKETING: 'bebsayik.com',
        DOMAIN_APP: 'app.bebsayik.com',
        DOMAIN_ADMIN: 'admin.bebsayik.com',
        DOMAIN_API: 'api.bebsayik.com'
      });

      expect(prodConfig.NODE_ENV).toBe('production');
      expect(prodConfig.PORT).toBe(5000);
      expect(prodConfig.MONGODB_URI).toContain('mongodb+srv://');
      expect(prodConfig.JWT_ACCESS_SECRET).not.toBe(prodConfig.JWT_REFRESH_SECRET);
    });
  });

  describe('2. Health & Diagnostic Endpoints (/api/v1/health)', () => {
    it('GET /api/v1/health returns system info, version 2.0.0, and memory statistics', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health`);
      const body = await res.json() as any;

      expect([200, 503]).toContain(res.status);
      expect(body.system).toBe('Bebsayik.com Modular API Gateway');
      expect(body.version).toBe('2.0.0');
      expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(body.memory).toBeDefined();
      expect(typeof body.memory.rssMb).toBe('number');
      expect(typeof body.memory.heapUsedMb).toBe('number');
      expect(body.timestamp).toBeDefined();
    });

    it('GET /api/v1/health/liveness returns HTTP 200 { status: "alive" }', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health/liveness`);
      const body = await res.json() as any;

      expect(res.status).toBe(200);
      expect(body.status).toBe('alive');
      expect(body.timestamp).toBeDefined();
    });

    it('GET /api/v1/health/readiness returns ready state in test environment', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health/readiness`);
      const body = await res.json() as any;

      expect(res.status).toBe(200);
      expect(body.ready).toBe(true);
      expect(body.timestamp).toBeDefined();
    });

    it('GET /api/v1/health/readiness returns 503 when database is disconnected in non-test mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      const readyStateSpy = vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0 as any);

      try {
        // Temporarily set to production to test readyState guard
        (process.env as any).NODE_ENV = 'production';
        const res = await fetch(`${baseUrl}/api/v1/health/readiness`);
        const body = await res.json() as any;

        expect(res.status).toBe(503);
        expect(body.ready).toBe(false);
        expect(body.database).toBe('disconnected');
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
        readyStateSpy.mockRestore();
      }
    });
  });
});
