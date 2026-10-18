import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';
import { setupDatabaseGracefulShutdown, connectDatabase } from './database/index.js';
import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { shopRouter } from './routes/shop.routes.js';
import { personalLedgerRouter } from './routes/personalLedger.routes.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { inventoryRouter } from './routes/inventory.routes.js';
import { procurementRouter } from './routes/procurement.routes.js';
import { transferRouter } from './routes/transfer.routes.js';
import { posRouter } from './routes/pos.routes.js';
import { hardwareRouter } from './routes/hardware.routes.js';
import { salesReturnsRouter } from './routes/salesReturns.routes.js';
import { customerRouter } from './routes/customer.routes.js';
import { kistiRouter } from './routes/kisti.routes.js';
import { closingRouter } from './routes/closing.routes.js';
import { accountsRouter } from './routes/accounts.routes.js';
import { hrRouter } from './routes/hr.routes.js';
import { smsRouter } from './routes/sms.routes.js';
import { onboardingRouter } from './routes/onboarding.routes.js';
import { marketingRouter } from './routes/marketing.routes.js';
import { billingRouter } from './routes/billing.routes.js';
import { webhookRouter } from './routes/webhook.routes.js';
import { adminRouter } from './routes/admin.routes.js';

export * from './database/index.js';
export * from './models/index.js';
export * from './services/accounting/index.js';
export * from './services/auth/index.js';
export * from './services/sms/index.js';
export * from './services/rateLimiter/index.js';
export * from './services/security/overrideToken.service.js';
export * from './services/catalog/index.js';
export * from './services/inventory/index.js';
export * from './services/procurement/index.js';
export * from './services/pos/index.js';
export * from './services/hardware/index.js';
export * from './services/returns/returns.service.js';
export * from './services/customers/customer.service.js';
export * from './services/kisti/index.js';
export * from './services/closing/closing.service.js';
export * from './services/accounts/accounts.service.js';
export * from './services/hr/hr.service.js';
export * from './services/shop/freshStart.service.js';
export * from './services/lock/lock.service.js';
export * from './services/onboarding/onboarding.service.js';
export * from './services/billing/billing.service.js';
export * from './services/admin/admin.service.js';
export * from './middlewares/authGuard.js';
export * from './middlewares/tenantGuard.js';
export * from './middlewares/rbacGuard.js';
export * from './utils/money.js';
export * from './utils/security.js';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  })
);
app.use(cookieParser());

app.get('/api/v1/health', (_req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const isTest = process.env.NODE_ENV === 'test' || ENV.NODE_ENV === 'test';
  const isOk = isDbConnected || isTest;
  const status = isOk ? 'ok' : 'degraded';

  res.status(isOk ? 200 : 503).json({
    status,
    system: 'Bebsayik.com Modular API Gateway',
    version: '2.0.0',
    environment: process.env.NODE_ENV || ENV.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: isDbConnected ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState
    },
    memory: {
      rssMb: parseFloat((process.memoryUsage().rss / 1024 / 1024).toFixed(2)),
      heapUsedMb: parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
      heapTotalMb: parseFloat((process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2))
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/health/liveness', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/health/readiness', (_req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const isTest = process.env.NODE_ENV === 'test';
  if (isDbConnected || isTest) {
    res.status(200).json({
      ready: true,
      database: isDbConnected ? 'connected' : 'mock_connected',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      ready: false,
      database: 'disconnected',
      reason: 'Database connection not ready to receive traffic',
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/shops', shopRouter);
app.use('/api/v1/personal-ledger', personalLedgerRouter);
app.use('/api/v1/catalog', catalogRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/procurement', procurementRouter);
app.use('/api/v1/inventory/transfers', transferRouter);
app.use('/api/v1/pos', posRouter);
app.use('/api/v1/hardware', hardwareRouter);
app.use('/api/v1/sales/returns', salesReturnsRouter);
app.use('/api/v1/customers', customerRouter);
app.use('/api/v1/kisti', kistiRouter);
app.use('/api/v1/closing', closingRouter);
app.use('/api/v1/accounts', accountsRouter);
app.use('/api/v1/hr', hrRouter);
app.use('/api/v1/sms', smsRouter);
app.use('/api/v1/onboarding', onboardingRouter);
app.use('/api/v1/marketing', marketingRouter);
app.use('/api/v1/billing', billingRouter);
app.use('/api/v1/webhooks', webhookRouter);
app.use('/api/v1/admin', adminRouter);

if (process.env.NODE_ENV !== 'test') {
  setupDatabaseGracefulShutdown();
  connectDatabase()
    .then(() => {
      app.listen(ENV.PORT, () => {
        console.log(`Bebsayik API Gateway listening on port ${ENV.PORT} [ENV: ${ENV.NODE_ENV}]`);
      });
    })
    .catch((err) => {
      console.error('[Startup Error] Failed to connect to database:', err);
    });
}
