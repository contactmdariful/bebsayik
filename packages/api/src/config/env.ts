import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

// Look for .env in root and packages/api directory
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'packages/api/.env'),
  path.resolve(process.cwd(), '../../.env')
];

const isTest = process.env.NODE_ENV === 'test';
for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: !isTest });
  }
}

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().default(5000),
    MONGODB_URI: z
      .string()
      .min(1, 'MONGODB_URI is required')
      .default('mongodb://localhost:27017/bebsayik_dev?replicaSet=rs0'),
    MONGODB_DB_NAME: z.string().default('bebsayik_dev'),
    MONGODB_MAX_POOL_SIZE: z.coerce.number().default(50),
    MONGODB_MIN_POOL_SIZE: z.coerce.number().default(10),
    REDIS_URI: z.string().min(1, 'REDIS_URI is required').default('redis://localhost:6379'),
    JWT_ACCESS_SECRET: z
      .string()
      .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters')
      .default('dev_jwt_access_secret_min32characters_bebsayik'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters')
      .default('dev_jwt_refresh_secret_min32characters_bebsayik'),
    SESSION_COOKIE_SECRET: z.string().optional(),
    TURNSTILE_SITE_KEY: z.string().optional(),
    TURNSTILE_SECRET_KEY: z.string().optional(),
    SMS_GATEWAY_PROVIDER: z.string().default('mock'),
    SMS_API_KEY: z.string().optional(),
    SMS_SENDER_ID: z.string().default('Bebsayik'),
    PAYSTATION_MERCHANT_ID: z.string().optional(),
    PAYSTATION_WEBHOOK_SECRET: z.string().optional(),
    DOMAIN_MARKETING: z.string().default('bebsayik.com'),
    DOMAIN_APP: z.string().default('app.bebsayik.com'),
    DOMAIN_ADMIN: z.string().default('admin.bebsayik.com'),
    DOMAIN_API: z.string().default('api.bebsayik.com'),
    ALLOW_LOCAL_SERVICES_IN_PROD: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          return val.toLowerCase() === 'true' || val === '1';
        }
        return Boolean(val);
      }, z.boolean())
      .default(false)
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      // 1. JWT Access Secret cannot be dev or default placeholder
      if (
        data.JWT_ACCESS_SECRET.includes('dev_') ||
        data.JWT_ACCESS_SECRET.includes('change_in_production') ||
        data.JWT_ACCESS_SECRET === 'dev_jwt_access_secret_min32characters_bebsayik'
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_ACCESS_SECRET'],
          message: 'Production JWT_ACCESS_SECRET must not use default or development placeholder strings'
        });
      }

      // 2. JWT Refresh Secret cannot be dev or default placeholder
      if (
        data.JWT_REFRESH_SECRET.includes('dev_') ||
        data.JWT_REFRESH_SECRET.includes('change_in_production') ||
        data.JWT_REFRESH_SECRET === 'dev_jwt_refresh_secret_min32characters_bebsayik'
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message: 'Production JWT_REFRESH_SECRET must not use default or development placeholder strings'
        });
      }

      // 3. Secrets must be distinct
      if (data.JWT_ACCESS_SECRET === data.JWT_REFRESH_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct cryptographic keys'
        });
      }

      // 4. MONGODB_URI cannot point to localhost without explicit override
      if (
        !data.ALLOW_LOCAL_SERVICES_IN_PROD &&
        (data.MONGODB_URI.includes('localhost') || data.MONGODB_URI.includes('127.0.0.1'))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['MONGODB_URI'],
          message:
            'Production MONGODB_URI must not point to localhost/127.0.0.1; must use managed cluster (e.g. MongoDB Atlas replica set)'
        });
      }
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(rawEnv: Record<string, any> = process.env): EnvConfig {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((e) => `  - [${e.path.join('.')}]: ${e.message}`)
      .join('\n');
    const msg = `[CRITICAL] Invalid environment configuration detected:\n${errorDetails}`;
    if (rawEnv.NODE_ENV === 'production') {
      console.error(msg);
      throw new Error(msg);
    } else {
      console.warn(
        `[Config Warning] Non-fatal environment issues in ${rawEnv.NODE_ENV || 'dev'} mode:\n${errorDetails}`
      );
      return envSchema.parse({ ...rawEnv, NODE_ENV: rawEnv.NODE_ENV || 'development' });
    }
  }
  return result.data;
}

// Export default singleton ENV for application runtime
export const ENV: EnvConfig = validateEnv(process.env);
