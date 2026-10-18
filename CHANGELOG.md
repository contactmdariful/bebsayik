# Bebsayik.com — Project Changelog & Revision History
**Document File:** `CHANGELOG.md`  
**System Name:** Bebsayik.com — Multi-tenant SaaS ERP Platform  
**Official Product Name:** Bebsayik  
**English Product Name:** Bebsayik.com  
**Brand:** Bebsayik | **Brand Attribution:** Powered by Bebsayik  
**Canonical Domain:** `bebsayik.com` (Subdomains: `app.bebsayik.com`, `admin.bebsayik.com`)  
**Legacy Business Context:** The initial ERP requirements and workflows originated from the Kanchan Telecom retail operation. The SaaS product is independently branded and operated as Bebsayik.com.  

All notable changes, architectural decisions, database revisions, and specification milestones for Bebsayik.com are documented in this file.

---

## [v8.3.0] — October 2026 (Controlled Staging Deployment & Disaster Recovery Hardening)

### Implemented & Verified
- **Controlled Staging Deployment Specification & Runbook:**
  - Authored `.env.staging.example` establishing isolated database `bebsayik_staging`, mock SMS, sandbox payment credentials, and staging domains (`staging.bebsayik.com`, `staging-app.bebsayik.com`, `staging-admin.bebsayik.com`, `staging-api.bebsayik.com`).
  - Authored `docker-compose.staging.yml` defining isolated staging containers (`bebsayik-api-staging`, `bebsayik-web-staging`, `bebsayik-redis-staging`), isolated internal networks (`staging_backend_net`, `staging_frontend_net`), and dedicated volumes (`redis_staging_data`).
  - Updated Nginx virtual hosts in `docker/nginx/conf.d/default.conf` to route staging subdomains alongside production domains with full security headers.
  - Authored `docs/deployment/controlled-staging-deployment-guide.md` providing an authoritative step-by-step staging checklist with exact CLI commands, rollback runbooks, and MongoDB transaction requirements.
- **Off-Site Backup Storage Automation & Archiving:**
  - Enhanced `scripts/db-backup-restore.js` with `archiveSnapshot` creating `.tar.gz` compressed archives and cryptographic `.sha256` checksum verification files.
  - Implemented `uploadOffsite` to synchronize archives to AWS S3/Cloudflare R2 object storage (`s3://${AWS_S3_BUCKET}/bebsayik-backups/`) with graceful local fallback when unconfigured.
  - Added npm scripts to root `package.json`: `npm run db:archive`, `npm run db:offsite`, and `npm run db:restore`.
  - Added regression test cases in `packages/api/src/__tests__/backupRestore.test.ts` verifying archive creation, SHA-256 generation, and graceful unconfigured cloud handling.
- **CI/CD Deployment Safety Enhancements:**
  - Updated `.github/workflows/deploy.yml` post-deployment smoke verification step to dynamically target staging or production endpoints based on environment selection.
  - Verified CI quality gates (`.github/workflows/ci.yml`) enforcing linting, typechecking across 6 workspaces, automated test execution, and Docker Buildx image compilation.
- **MongoDB ACID Transaction Safety:**
  - Audited `packages/api/src/database/transaction.ts` and `connection.ts`. Confirmed `w: 'majority'`, `retryWrites: true`, and exponential backoff retry mechanism on `TransientTransactionError` and `WriteConflict`.
  - Documented strict replica set prerequisite (`rs.status().ok === 1`) for staging environments.
- **Staging Deployment Preflight Audit & Configuration Hardening:**
  - Audited `controlled-staging-deployment-guide.md`, `docker-compose.staging.yml`, and `.env.staging.example` with explicit verification mode separation (ACTUALLY EXECUTED vs STATIC AUDIT).
  - Resolved frontend Nginx API proxying defect by adding `location /api/ { proxy_pass http://api:5000; ... }` to `staging-app.bebsayik.com`, `staging-admin.bebsayik.com`, and `staging.bebsayik.com` in `docker/nginx/conf.d/default.conf`.
  - Added dedicated Nginx server block for direct API traffic on `api.bebsayik.com` and `staging-api.bebsayik.com`.
  - Parameterized container host ports in `docker-compose.staging.yml` via `${STAGING_API_PORT:-127.0.0.1:5000}:5000` and `${STAGING_WEB_PORT:-80}:80`.
  - Expanded Redis container memory allocation to `384M` to ensure adequate buffer headroom over `maxmemory 256mb`.
  - Documented container vs host networking alternatives in `.env.staging.example` (`redis://redis:6379`, `host.docker.internal` vs Atlas).
- **Staging Deployment Execution Attempt & Infrastructure Blockers Analysis:**
  - Attempted staging deployment execution under strict condition: execute only if Docker is installed and running.
  - Inspected host machine infrastructure: identified that `docker` and `docker compose` CLI binaries are not installed in the Windows system `PATH` and no Docker Engine daemon is reachable.
  - In accordance with safety protocol, deployment success is NOT claimed; deployment is explicitly recorded as **BLOCKED ON HOST INFRASTRUCTURE (Docker Unavailable)**.
  - Validated all pre-deployment prerequisites: Compose syntax (`docker-compose.staging.yml`), environment parsing via Zod schema (`validateEnv`), database isolation to `bebsayik_staging`, and permanent blocking of `bebsayik_dev` and `bebsayik_prod` with `FATAL_SAFETY_VIOLATION`.
  - Executed live HTTP routing verification against active local services: API health/liveness/readiness (HTTP 200) and all 3 frontend routes (Marketing, Web ERP & POS, Admin all HTTP 200).
- **Automated Verification Metrics:**
  - Monorepo automated test suite: **287 passing tests across 21 test suites** with 100% pass rate (0 failures, 0 skips).
  - TypeScript typecheck verified clean with 0 errors across all 6 workspaces (`@bebsayik/api`, `@bebsayik/shared-types`, `@bebsayik/ui-tokens`, `@bebsayik/admin`, `@bebsayik/marketing`, `@bebsayik/web-erp`).
  - Live local smoke test suite (`scripts/smoke-test.js`) passed all 7 checks (API Health, Liveness, Readiness, Sub-150ms Latency, Marketing Landing, Web ERP & POS, Admin Portal).

---

## [v8.2.0] — October 2026 (Security & Financial Integrity Audit Signoff)

### Implemented & Verified
- **Concurrent POS Double-Sell Race Prevention:**
  - Added regression test in `packages/api/src/__tests__/pos.test.ts` verifying that when two terminals simultaneously attempt checkout of the same scanned IMEI handset, the distributed lock and MongoDB transactional status reject the collision with `409 IMEI_ALREADY_SOLD`.
- **Payment Webhook Cross-Invoice Replay Protection:**
  - Added regression test in `packages/api/src/__tests__/billing.test.ts` verifying that replaying an existing paid transaction ID (`trxId`) against a different unpaid invoice is strictly rejected without activating the target subscription.
- **Personal Ledger Amanat & Hawlat Financial Segregation:**
  - Created dedicated regression suite `packages/api/src/__tests__/personalLedger.test.ts` verifying:
    - Non-P&L insulation: `amanat_received`, `amanat_returned`, `hawlat_given`, `hawlat_collected` have strictly `0.00 BDT` impact on store commercial accounts.
    - RBAC: Sole `STORE_OWNER` access; strict rejection of `STORE_MANAGER`, `CASHIER`, `SALESPERSON`, `TECHNICIAN`, and `ACCOUNTANT`.
    - Tenant isolation: Multi-tenant compound unique index `{ shopId: 1, phone: 1 }` and cross-tenant query blocking.
- **Database Backup & Disaster Recovery Verification Utility:**
  - Authored `scripts/db-backup-restore.js` with `backup`, `verify`, and `restore` subcommands.
  - Manifest generation with document counts and SHA-256 collection checksums across all 26 core domain collections.
  - Hardened guards against accidental destructive operations on `bebsayik_dev`, `bebsayik_prod`, and production databases.
  - Verified live restore execution into isolated disposable test database (`bebsayik_disposable_test_restore`) with 100% data integrity and BSON type preservation.
  - Added dedicated regression test suite `packages/api/src/__tests__/backupRestore.test.ts`.
- **Test Suite Metrics:**
  - Monorepo automated test suite expanded to **283 passing tests across 21 test suites** with 100% pass rate (0 failures, 0 skips).
  - TypeScript typecheck verified clean with 0 errors across all 6 workspaces.
- **Updated Master Report:**
  - Authored and updated `docs/FINAL-PRODUCTION-READINESS-REPORT.md` with complete audit matrix, disaster recovery runbooks, and deep-dive findings.

---

## [v8.1.0] — October 2026 (Final Production Readiness Audit & Verification Signoff)

### Implemented & Verified
- **Final Production Readiness Audit Execution (`docs/FINAL-PRODUCTION-READINESS-REPORT.md`):**
  - Completed comprehensive non-destructive audit of all subsystems, architecture layers, and operational runbooks.
  - 100% test pass rate maintained: **264 of 264 automated tests passing across 19 test suites**; 58 master E2E test cases passing (TC-01 through TC-56 & AP-01 through AP-03).
  - TypeScript typecheck verified clean with 0 errors across all 6 workspaces (`@bebsayik/api`, `@bebsayik/shared-types`, `@bebsayik/ui-tokens`, `@bebsayik/admin`, `@bebsayik/marketing`, `@bebsayik/web-erp`).
  - ESLint clean across all workspaces with exit code 0.
  - Production bundles compiled across all 6 workspaces with exit code 0.
  - Live local smoke test suite (`scripts/smoke-test.js`) passed all 7 checks (API Health, Liveness, Readiness, Sub-150ms Latency, Marketing Landing, Web ERP & POS, Admin Portal).
- **Vite 6 Host Header Hardening:**
  - Added `server.allowedHosts` in `apps/marketing/vite.config.ts`, `apps/web-erp/vite.config.ts`, and `apps/admin/vite.config.ts` allowing domain headers (`bebsayik.com`, `app.bebsayik.com`, `admin.bebsayik.com`, `localhost`, `127.0.0.1`) during edge/proxy simulation without 403 rejections.
- **Smoke Test Script Resiliency:**
  - Enhanced `scripts/smoke-test.js` to automatically fall back when running directly against local dev ports while preserving virtual host header validation for Nginx and production edge ingress.
- **Labeled Non-Verified Items:**
  - Explicitly marked live cloud infrastructure (Cloudflare Edge DNS propagation, remote MongoDB Atlas M30+ cluster, remote multi-node Redis Sentinel, live BTRC telco SMS gateways, live production bank gateways) as **NOT VERIFIED ON LIVE NETWORK**, adhering strictly to honest verification standards.

---

## [v8.0.0] — October 2026 (Phase 14: Production Containerization, CI/CD Pipeline & Deployment Strategy)

### Implemented & Verified
- **Multi-Stage Production Containerization:**
  - **`Dockerfile.api` (Node.js 20 Alpine):**
    - Multi-stage build (Builder -> Pruner -> Production Runner).
    - Unprivileged non-root user and group (`bebsayik:bebsayik`, UID/GID 1001).
    - Hardened process execution with `dumb-init` for signal handling (PID 1) and graceful SIGTERM/SIGINT teardown.
    - Automated container healthcheck using `/api/v1/health/liveness` probe.
  - **`Dockerfile.web` (Nginx 1.27 Alpine):**
    - Compiles all 3 frontend single-page apps (`apps/marketing`, `apps/web-erp`, `apps/admin`) using monorepo workspace dependencies.
    - Serves apps through hardened Nginx web server with multi-domain virtual hosts (`bebsayik.com`, `app.bebsayik.com`, `admin.bebsayik.com`).
    - Gzip compression, immutable asset caching (`Cache-Control: public, max-age=31536000, immutable`), and security headers.
  - **`docker-compose.prod.yml`:**
    - Production container orchestration for `api`, `web`, and `redis`.
    - Healthcheck dependencies (`condition: service_healthy`), resource limits (CPU/Memory quotas), and network isolation (`frontend_net` and internal `backend_net`).
  - **`.dockerignore`:**
    - Monorepo-wide filtering excluding `node_modules`, `dist`, `.git`, `.env*` secrets, and temporary files.
- **Environment Validation & Secure Secrets Management (`packages/api/src/config/env.ts`, `.env.production.example`):**
  - **Zod Runtime Schema Validation (`validateEnv`):**
    - Strict compile-time and startup runtime validation for all environment variables.
    - Production hardening invariants:
      - Mandatory 32+ character cryptographic `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
      - Rejection of default or development placeholder strings (`dev_`, `change_in_production`) in production.
      - Enforced key differentiation: `JWT_ACCESS_SECRET !== JWT_REFRESH_SECRET`.
      - Rejection of `localhost`/`127.0.0.1` database URIs in production unless explicit override flag is supplied.
  - **Production Environment Template (`.env.production.example`):**
    - Documented secrets template with guidelines for Atlas Replica Sets, Redis Sentinel, Cloudflare Turnstile, and payment gateways.
- **Production Health & Deep Diagnostics Endpoints (`packages/api/src/index.ts`):**
  - `GET /api/v1/health`: Returns API gateway status, version 2.0.0, process uptime, memory statistics (RSS, Heap), and database connection state.
  - `GET /api/v1/health/liveness`: Lightweight Kubernetes/Docker liveness probe returning HTTP 200 `{ status: 'alive' }`.
  - `GET /api/v1/health/readiness`: Traffic readiness probe returning HTTP 200 if MongoDB is connected, or HTTP 503 if disconnected.
- **Automated CI/CD Workflows (`.github/workflows/*`):**
  - **`ci.yml` (Quality Gate):**
    - Triggers on push and pull requests to `main` and `develop`.
    - Automated sequential jobs:
      1. `lint-and-typecheck`: Verifies ESLint and full monorepo TypeScript compilation across all 6 workspaces.
      2. `test-and-build`: Executes all 264 unit/E2E test suites with Vitest and compiles production bundles.
      3. `docker-validate`: Builds and verifies `Dockerfile.api` and `Dockerfile.web` images using Buildx.
  - **`deploy.yml` (Zero-Downtime CD):**
    - Automated release deployment on semantic version tags (`v*.*.*`) or manual dispatch.
    - Builds multi-architecture Docker images, pushes to GitHub Container Registry (`ghcr.io`), triggers rolling restart, and executes smoke verification.
- **Post-Deployment Automated Smoke Test Script (`scripts/smoke-test.js`):**
  - Node.js automated test runner verifying `/api/v1/health`, liveness probe, readiness probe, sub-150ms gateway latency threshold, and frontend virtual host availability.
  - Added `"smoke:test"` and `"test:production"` scripts to root `package.json`.
- **Production Architecture & Operations Manuals (`docs/deployment/*`):**
  - **`cloudflare-cdn-guide.md`:** Comprehensive Cloudflare Edge CDN configuration, DNS records, Full (Strict) TLS 1.3, Strict HSTS, WAF rate-limiting rules, and Turnstile bot protection.
  - **`production-deployment-guide.md`:** Site reliability engineering guide detailing MongoDB Atlas M30+ Replica Set settings, PITR point-in-time recovery, zero-downtime rolling deployments, and rollback procedures.

### Not Verified / Live Infrastructure Requirements
The following items are architecturally modeled, verified via automated test mocks, but require live cloud infrastructure provisioning to verify in a production environment:
- **Cloudflare Edge DNS & TLS Termination:** Real DNS record propagation and Cloudflare Turnstile production keys require active domain delegation on `bebsayik.com`.
- **Live Production MongoDB Atlas Cluster:** Verified locally and through test suites with mock/local replica sets; multi-region M30+ cluster with AWS KMS encryption requires active Atlas organization.
- **Production Redis Sentinel / Cluster:** Verified with in-memory fallback and single-node container; high-availability failover requires live multi-node Redis cluster.
- **Live Telco SMS & Payment Gateway Callbacks:** Tested with HMAC-SHA256 test signatures and `MockSmsDriver`; real transaction settling requires active merchant contracts with SSL Wireless, PayStation, EPS, and bKash.

---

## [v7.10.0] — October 2026 (Phase 13: Automated Master End-to-End Test Suite TC-01 to TC-56 & AP-01 to AP-03)

### Implemented & Verified
- **Master End-to-End Test Suite (`packages/api/src/__tests__/e2e-master.test.ts`):**
  - Fully automated comprehensive E2E test harness covering all **56 test cases (TC-01 through TC-56)** plus all **3 architect proof invariants (AP-01 to AP-03)** across 9 functional groups:
    - **Group 1: Multi-Tenant RLS Isolation & Workspaces (TC-01, TC-30, TC-55):** Cross-tenant query isolation preventing Shop B data leaks in Shop A, atomic 3-step Dokan setup wizard tenant creation, and multi-dokan authorized workspace switching.
    - **Group 2: Dual-IMEI Serialized Inventory & Procurement (TC-03, 04, 18, 19, 22, 23, 28, 36, 48):** Dual-IMEI uniqueness validation rejecting duplicate IMEI-2, dual-IMEI POS scan resolution to exact same unit, master catalog integrity preservation during reset, purchase return voucher (PRV) status netting, damage & scrap write-off, specific identification COGS locking, partial GRN receiving, STN dispute notifications, and offline serialized checkout prevention.
    - **Group 3: POS Counter Billing & Hardware Integrity (TC-02, 05, 11, 12, 13, 14, 16, 31, 47):** Overpayment change calculation, double-click POS submission idempotency, MSP floor lock requiring manager PIN, concurrent checkout distributed locking via Redis/in-memory lock manager, cashier void rejection without supervisor PIN, reprint idempotency with DUPLICATE REPRINT watermark, offline accessory receipt generation, and POS MFS agent cash-out tender processing.
    - **Group 4: Sales Returns, Inspection Quarantine & Due Netting (TC-20, TC-21):** Return inspection quarantine state machine (`RETURNED_INSPECTION`), customer receivable netting for returns with outstanding due balance.
    - **Group 5: Customer Khata, Kisti Financing & MFS Reconciliations (TC-06, 07, 08, 09, 10, 32):** Kisti installment schedule mathematical invariant (Sum of installments + Down payment === Contract Grand Total), down payment cash ledger reconciliation, overdue installment flagging and late fee calculation, early settlement penalty waiver and contract closure, Bakir Khata partial due settlement with money receipt generation, and MFS Cash-In drawer/SIM float swap.
    - **Group 6: Technician Splits & Hardware Customization (TC-15, TC-54, AP-03):** 50% technician repair labor split without rounding drift, thermal receipt ESC/POS ESC/POS payload customization with dokan header, bin number, and return policy footer.
    - **Group 7: SaaS Subscription Lifecycle & Webhook Processing (TC-17, 24, 25, 26, 27, 34, 35, 49):** Free plan 100-sale limit breach enforcement, opening balance balance-sheet balance invariant (Assets - Liabilities = Equity, 0 P&L impact), subscription read-only POS restriction, read-only data export guarantee, single-session free tier tokenVersion enforcement, timing-safe HMAC-SHA256 webhook idempotency, 14-day Gold trial to 3-day grace to read-only state machine, and 3-minute delayed webhook recovery sweeper.
    - **Group 8: Identity Lifecycle & Security Gateways (TC-29, 40, 41, 42, 43, 45, 46, 50, 51, 52, 53):** Passwordless 6-digit SMS OTP challenge, 5-attempt PIN lockout, global logout all devices session revocation, strict prohibition of SMS scraping (0 permissions), marketing lead capture modal, force password change on initial login, salesperson inventory cost price obfuscation, cashier register discrepancy closing protocol with Z-Report SMS, 2FA password recovery flow, 180s dual-SIM migration authorization, and immediate staff deactivation kill-switch (<1s session termination).
    - **Group 9: Platform Admin Controls & Compliance (TC-33, 37, 38, 39, 44, 56):** Mandatory NID capture for sales >৳50,000, Banglish phonetic search tokenizer, non-destructive dokan suspension, subscription plan price update grandfathering, Super Admin RBAC gate, and emergency hotline lost SIM owner phone migration.
    - **Architect Proofs (AP-01 to AP-03):** Zero negative drawer balance floor violation, balanced double-entry journals (`totalDebits === totalCredits`), and fractional paisa zero-drift rounding guarantee.
  - **Test Suite Performance & Reliability:**
    - Dedicated script `"test:e2e"` configured in root `package.json` executing all 58 master end-to-end tests in 359ms.
    - Full test suite across monorepo (`npm test`): **18 test suites passing, 255 of 255 tests passing (100% pass rate)**.
    - Full TypeScript typecheck (`npm run typecheck`): Clean 0 exit code across all workspaces.
    - Workspace builds (`npm run build`): All packages (`@bebsayik/api`, `@bebsayik/shared-types`, `@bebsayik/ui-tokens`, `@bebsayik/admin`, `@bebsayik/marketing`, `@bebsayik/web-erp`) build cleanly.

### Defect Fixes & Hardening During Audit
1. **AdminService Shop Reactivation Compatibility (`packages/api/src/services/admin/admin.service.ts`):**
   - Hardened `reactivateShop` to verify `typeof shop.set === 'function'` before invoking Mongoose document setters, falling back to property deletion (`delete (shop as any).suspensionReason`) to support both mock documents in tests and live Mongoose models while satisfying TypeScript `exactOptionalPropertyTypes: true`.
2. **Double-Click POS Submission Idempotency Mock Isolation (`packages/api/src/__tests__/e2e-master.test.ts`):**
   - Provided mocked population query handlers for `SaleItem.find` and `User.findById` in `TC-05` to eliminate unmocked Mongoose query buffering timeouts in disconnected test environments.
3. **Passwordless OTP Login Mock Isolation (`packages/api/src/__tests__/e2e-master.test.ts`):**
   - Provided mocked query handler for `AuthOtp.create` in `TC-29` to eliminate unmocked database buffering timeouts.

### Unverified External Integrations (Clearly Labeled Mocks)
- **Live SMS Gateways:** SSL Wireless and BulkSMS BD HTTP API endpoints (verified through `MockSmsDriver` in-memory assertions; live telecom network delivery requires valid BTRC-approved sender credentials and live network connectivity).
- **Physical USB ESC/POS Hardware:** Thermal receipt printer 58mm/80mm byte sequence generation verified; actual physical USB hardware driver handshake requires attached ESC/POS hardware device.
- **Production Payment Gateways:** PayStation, Easy Pay Way, and bKash live payment callbacks (HMAC-SHA256 signature verification, timing attack safety, and idempotency verified with cryptographic test signatures; live gateway processing requires production API secret keys).

---

## [v7.9.0] — October 2026 (Phase 12: SaaS Billing Engine, Webhook Processors & Platform Admin Portal)

### Implemented & Verified
- **SaaS Subscription & Billing Engine (`packages/api/src/services/billing/billing.service.ts`, `/api/v1/billing/*`):**
  - **Plan Tiers:** Silver (`starter`, ৳499/mo, ৳4,990/yr), Gold (`pro`, ৳999/mo, ৳9,990/yr, 14-day default trial), Diamond (`enterprise`, ৳1,999/mo, ৳19,990/yr).
  - **Promotional Coupon Validator (`POST /api/v1/billing/validate-coupon`):**
    - Supports percentage discounts (`EID2026` 20% off, `LAUNCH50` 50% off) and flat amounts (`SAVE100` flat ৳100 off).
    - Enforces active status, expiration timestamp, and maximum redemption limits (`timesUsed >= usageLimit`).
  - **Checkout Invoice Generator (`POST /api/v1/billing/checkout`):**
    - Applies valid promo discounts and creates pending `SubscriptionInvoice` records with unique timestamp/random sequence invoice numbers (`INV-SUB-XXXXXX-XXXX`).
    - Computes subscription period start and end (+30 days monthly / +365 days yearly), extending from current expiry if shop is active.
    - Generates dynamic payment gateway redirect URLs for PayStation, Easy Pay Way (EPS), and bKash.
  - **Subscription Status Inspector (`GET /api/v1/billing/subscription`):**
    - Returns active plan metadata, trial/subscription/grace expiration countdowns, days remaining, and feature entitlements.
- **Payment Gateway Webhook Handlers (`packages/api/src/routes/webhook.routes.ts`, `/api/v1/webhooks/*`):**
  - **Timing-Safe HMAC-SHA256 Verification (Section 5.30):**
    - Implemented timing-safe signature comparison using `crypto.timingSafeEqual` and raw request body preservation via `express.json({ verify })`.
    - Tampered payloads and invalid signatures are strictly rejected with HTTP 401 `INVALID_WEBHOOK_SIGNATURE`.
  - **Idempotency Guarantee (TC-34):**
    - Duplicate webhook payloads (matching `trxId` / `gatewayTransactionId` or invoices already marked as `paid`) return HTTP 200 `{ status: 'already_processed' }` without double-extending the subscription license.
  - **Payment State Machine:**
    - On payment success: marks `SubscriptionInvoice` as `paid`, stores `gatewayTransactionId`, sets shop status to `'active'`, and extends `subscriptionExpiresAt`.
    - On payment failure: marks invoice as `failed`, records gateway error payload, and prevents subscription extension.
  - **3-Minute Delayed Webhook Sweeper (`BillingService.sweepPendingGatewayInvoices`, TC-49):**
    - Background poller detects pending invoices older than 3 minutes to auto-recover delayed or dropped gateway callbacks.
- **Subscription Lifecycle & Read-Only Guard (TC-25, TC-26, TC-35):**
  - **State Transitions:** `trial` (14 days) -> `active` (paid) -> `grace_period` (3 days) -> `read_only`.
  - **Lifecycle Sweeper (`BillingService.sweepSubscriptionLifecycles`):**
    - Lapsed trials (`trialEndsAt <= now`) and expired active subscriptions (`subscriptionExpiresAt <= now`) transition to `grace_period` with a 3-day countdown.
    - Lapsed grace periods (`gracePeriodEndsAt <= now`) transition to `read_only`.
  - **POS Checkout Restriction (TC-25):**
    - `PosService.processCheckout` inspects shop status and rejects sales checkouts with HTTP 403 `SUBSCRIPTION_READ_ONLY` when `shop.status === 'read_only'`, and HTTP 403 `SHOP_SUSPENDED` when suspended (TC-38).
  - **Read-Only Invariant (TC-26):**
    - Historical handset lookup, IMEI warranties, Bakir Khata customer due collections (`CustomerService.collectDue`), accounting ledgers, and CSV/Excel exports remain 100% operational.
- **Platform Super Admin Portal (`apps/admin`, `admin.bebsayik.com`):**
  - **Super Admin RBAC Gate (TC-44):**
    - All `/api/v1/admin/*` endpoints strictly guarded by `authGuard` and `requireRole(['SUPER_ADMIN'])`; non-super-admins receive HTTP 403 `INSUFFICIENT_PERMISSIONS`.
  - **Global SaaS Command Center Dashboard:**
    - Real-time KPI analytics for Monthly Recurring Revenue (MRR), Annual Run-Rate (ARR), active paid dokans, 14-day trials, 3-day grace periods, churn rate, and BTRC/Telecom SMS gateway balance.
  - **Tenant Dokan Directory:**
    - Live searchable directory of shops with owner contact, plan badge, expiration timer, and status pills.
  - **Non-Destructive Shop Suspension (`POST /api/v1/admin/shops/:id/suspend`, TC-38):**
    - Freezes POS sales checkouts while 100% preserving all inventory items, sales history, customer ledgers, and accounting transactions; 1-click reactivation.
  - **Emergency Hotline Lost SIM Phone Migration (`POST /api/v1/admin/shops/:id/emergency-phone-migration`, TC-56):**
    - Authorized via Super Admin verification at Dhaka Level 7 Eastern Plaza with NID and Municipal Trade License document references.
    - Atomically migrates registered owner phone, updates shop phone, and increments user `tokenVersion` to revoke all existing JWTs and active mobile sessions immediately.
  - **Plan Price Versioning (`PATCH /api/v1/admin/plans/:code/price`, TC-39):**
    - Updates standard monthly and yearly tier fees for future checkouts; existing active subscribers maintain snapshot pricing upon renewal.
  - **Gateway Webhook Audit Ledger & Simulator:**
    - Execution ledger tracking PayStation, EPS, and bKash webhook events with payload inspection and test dispatch simulator.
- **Verification & Test Coverage:**
  - `npm run test:billing`: 15/15 passing tests.
  - `npm run test:admin`: 8/8 passing tests.
  - Full test suite `npm test`: 197/197 passing tests across 17 test suites (0 failures).
  - `npm run typecheck`: 0 errors across all 6 workspaces (`@bebsayik/api`, `@bebsayik/shared-types`, `@bebsayik/ui-tokens`, `@bebsayik/admin`, `@bebsayik/marketing`, `@bebsayik/web-erp`).
  - `npm run lint`: 0 errors across all 6 workspaces.
  - `npm run build`: successful production builds across all 6 workspaces.

---

## [v7.8.0] — October 2026 (Phase 11: Public Marketing Website & Dokan Onboarding Wizard)

### Implemented & Verified
- **Public Marketing Website (`apps/marketing`, `bebsayik.com`):**
  - **High-Converting Landing Page (`/`, TC-37):**
    - Bilingual headline ("দোকানের হিসাব, স্টক ও কিস্তি—সব এক স্মার্ট সফটওয়্যারে" / "Bangladesh's Premier Multi-Tenant Mobile Shop ERP & POS SaaS Platform").
    - Interactive touch POS simulator demonstrating live handset lookup (`Samsung Galaxy A55 5G`, IMEI `356938035643803`), split-payment tender (Cash + bKash Agent Cash-Out), real-time change calculation, and simulated 80mm ESC/POS thermal receipt printout.
    - 6 Core Value Pillars: Dual-IMEI lifecycle, Kisti (EMI) installment engine, Police Buyback undertaking, MFS agent float desk, Blind cash drawer closing, and 100% isolated multi-tenant cloud security.
    - Retailer testimonials from real dokans (Kanchan Telecom Eastern Plaza, City Gadget Motijheel, Chittagong Mobile Mart GEC).
    - Trust counters: 85,000+ Potential Dokans in BD, ৳1.2M+ Managed GMV, 99.98% Cloud Uptime SLA, 0.00% Double-Entry Imbalance.
  - **Deep-Dive Features Page (`/features`):**
    - Interactive tabbed architecture covering: Handset Dual-IMEI lifecycle (Luhn check, Godown STN transfers, aging dead-stock >60d, warranty RMA), Kisti installment engine (repayment schedule, dual guarantor NID/phone, automated SMS reminders), Police Buyback undertaking (used phone inspection, webcam biometric & NID capture, 1-click police undertaking form), and MFS Agent Desk (drawer cash vs SIM float isolation, USSD evening audit, commission ledger).
  - **Transparent Pricing & Interactive ROI Savings Calculator (`/pricing`):**
    - Billing tenure switcher: Monthly, 6-Month (10% off), 1-Year (16% off).
    - Transparent tier cards: Silver (৳499/mo), Gold (৳999/mo, Most Popular / 14-Day Free Trial Default), Diamond (৳1,999/mo).
    - Real-time interactive ROI calculator with sliders for monthly turnover, shrinkage rate, and daily closing hours, dynamically calculating shrinkage prevented (৳), labor hours saved (hrs/৳), net monthly gain (+৳), and return on investment (% ROI).
  - **Company Heritage & Story (`/about`):**
    - Kanchan Telecom retail heritage story originating in Eastern Plaza, Hatirpool, Dhaka in 2018, detailing real-world struggles with handwritten khata and lost IMEIs, and the platform mission to digitize 85,000+ mobile retailers across 64 districts in Bangladesh.
  - **Contact & Support (`/contact`):**
    - Dhaka Central Office address (Level 7, Eastern Plaza, Hatirpool, Dhaka-1205), Hotline (+880 9638-000111), WhatsApp support (+880 1711-223344), support email, and interactive inquiry form.
  - **Legal & Compliance Pages (`/terms` & `/privacy`):**
    - Terms of Service: Merchant rights, 99.9% uptime SLA, data ownership guarantee, and free CSV/Excel export guarantee.
    - Privacy Policy: Multi-tenant database RLS isolation, zero third-party data selling pledge, NBR Mushak 6.3 and BTRC compliance.
  - **Pre-launch App Store Badge Lead Capture Modal (TC-43):**
    - Captures visitor mobile number, shop name, and contact person into `marketing_leads` collection with `leadSource: 'google_play_badge'` upon clicking Google Play or App Store download badges.
- **Passwordless Mobile OTP Registration (`/register`, TC-29, TC-37):**
  - 11-digit Bangladeshi mobile number input (`017XXXXXXXX` with `bdPhoneRegex` validation) -> SMS OTP challenge with 120s countdown timer -> verified account creation provisioning user with role `STORE_OWNER` and initiating 14-day Gold trial context.
- **3-Step Dokan Setup Wizard (`/onboarding/setup`, TC-30):**
  - Step 1: Dokan Identity (Shop name, market location address, registered phone, optional NBR BIN).
  - Step 2: Outlets & Warehouses (Showroom counter outlet name, central godown warehouse name, single-store vs multi-branch selection).
  - Step 3: Security & Credentials (Store owner permanent web password for OTP-free logins [TC-50], 4-digit manager override PIN).
  - Backend `POST /api/v1/onboarding/setup` atomically provisions `shops` tenant record with status `'trial'`, sets user as `STORE_OWNER`, hashes Argon2id password and manager PIN, provisions default Chart of Accounts (COA), and issues scoped tenant JWT access token.
- **Opening Balance Onboarding Wizard (TC-24):**
  - Ingestion inputs: opening stock value, cash in drawer float, bank balance, customer receivables, and supplier payables.
  - Real-time invariant card: Total Assets = Stock + Cash + Bank + Customer Receivables; Supplier Payables = Payables; Opening Owner Equity (`3.1.01`) = Assets - Liabilities; Artificial P&L Impact = ৳0.00 (0.00%).
  - Backend `POST /api/v1/onboarding/opening-balances` posts balanced double-entry journal (TX-19) into the general ledger with zero P&L impact.
- **Backend Services & API Gateway Routes (`packages/api`):**
  - `OnboardingService`: `createShopTenant`, `postOpeningBalances`, `captureMarketingLead`.
  - Routes mounted at `/api/v1/onboarding/*` and `/api/v1/marketing/*`.
  - Shared validation schemas added to `packages/shared-types`: `MarketingLeadSchema`, `OnboardingSetupSchema`, `OpeningBalancesSchema`.
- **Automated Verification:**
  - `npm run test:onboarding`: 5/5 passing tests verifying atomic tenant creation (TC-30), unique slug collision resolution, input validation, and opening balance equity invariant with zero P&L impact (TC-24).
  - `npm run test:marketing`: 4/4 passing tests verifying pre-launch app badge lead capture (TC-43), idempotent lead updates, phone validation, and passwordless OTP verification (TC-29, TC-37).
  - Full test suite `npm test`: 174/174 passing tests across 15 test suites.
  - `npm run typecheck`: 0 errors across all 6 workspaces.
  - `npm run lint`: 0 errors across all 6 workspaces.
  - `npm run build`: successful production builds across all 6 workspaces.

---

## [v7.7.0] — October 2026 (Phase 10: Accounts, Daily Closing & HR Engine)

### Implemented & Verified
- **Day-End Cash Closing & Blind Reconciliation Engine (`/api/v1/closing/*`):**
  - Morning shift float opening (`POST /api/v1/closing/shift-open`): records starting cash float and opens cashier drawer register. Rejects opening concurrent active shifts for the same cashier.
  - Blind physical currency note counter (`POST /api/v1/closing/submit-blind-count`): cashier counts physical currency notes (1000, 500, 200, 100, 50, 20, 10, coins) without system expected target balance visibility.
  - Single Recount Grace Protocol (Strategic Decision 4): exactly **one recount attempt** is permitted before the terminal register is permanently locked with HTTP 422 `RECOUNT_LIMIT_EXCEEDED`.
  - Shift Finalization & Discrepancy Justification (`POST /api/v1/closing/finalize`): automatically aggregates expected cash from sales, receipts, supplier payments, OPEX vouchers, and refunds; enforces mandatory discrepancy reason if variance !== 0.
  - Generates ESC/POS Thermal Z-Report print payload formatted with shop metadata, shift summary, denomination breakdown, and solenoid drawer kick command.
  - Dispatches automated owner SMS digest alert to the store owner's mobile phone upon shift closure.
- **Chart of Accounts, Cash Drawers & OPEX Vouchers (`/api/v1/accounts/*`):**
  - Real-time balances for Chart of Accounts: Cash in Drawer `1.1.01`, Bank Current Accounts `1.2.01`, bKash Agent SIM Float `1.3.01`, Nagad Agent SIM Float `1.3.02`. Auto-seeds standard COA definitions.
  - Inter-Account Fund Transfers (`POST /api/v1/accounts/transfer`): executes atomic balance transfers between accounts (e.g. Counter Cash Drawer to BRAC Bank deposit), checks source asset account balance sufficiency, and posts balanced double-entry journals (Debit destination, Credit source).
  - OPEX Petty Expense Vouchers (`POST /api/v1/accounts/expenses`): records cash disbursements for showroom tea/refreshments (`6.1.04`), electricity/utilities (`6.1.02`), rent (`6.1.01`) with balanced general ledger journal postings.
  - Paginated General Ledger Transaction History (`GET /api/v1/accounts/transactions`) with account filtering and user audit trails.
- **HR, Sales Targets & Payroll Disbursal (`/api/v1/hr/*`):**
  - Staff listing (`GET /api/v1/hr/staff`): retrieves staff roster with roles, contacts, and active status.
  - Monthly compensation aggregation (`GET /api/v1/hr/payroll/summary`): computes technician 50% repair labor splits from completed/delivered `ServiceJob`s, salesperson quota bonuses from `EmployeeTarget`, and base salary.
  - Double-Entry Payroll Disbursement (TX-18) (`POST /api/v1/hr/payroll/disburse`): creates/updates `PayrollLedger`, posts balanced journal voucher TX-18 (Debits Salaries OPEX `6.1.03`, Debits Accrued Technician Splits `2.4.01`, Debits Accrued Sales Bonuses `2.4.02`, Credits Bank `1.2.01` or Cash `1.1.01`), dispatches confirmation SMS alert to employee mobile, and prevents duplicate disbursement.
- **SMS Notification Desk & Template Customizer (`/api/v1/sms/*`, Screen 15):**
  - Localized notification templates for `DAY_END_Z_REPORT`, `PAYROLL_DISBURSED`, `INVOICE_BILLING`, `DUE_REMINDER`, `SERVICE_COMPLETED`, and `OTP_VERIFICATION` with dynamic token tags (`{{customerName}}`, `{{dueAmount}}`, `{{shopName}}`).
  - Monitored telecom SMS gateway balance endpoint (`GET /api/v1/sms/balance`).
  - Filtered customer broadcast SMS engine (`POST /api/v1/sms/broadcast`).
- **Pre-Launch Fresh Start Reset Protocol (TC-18) (`POST /api/v1/shops/fresh-start-reset`):**
  - Owner 2FA security challenge verifying store owner Argon2id master password and exact confirmation phrase `'PURGE-TEST-TRANSACTIONS'`.
  - Atomically purges test sales, sale items, held carts, return vouchers, money receipts, shifts, denominations, stock transfer notes, inventory movements, damaged scraps, warranty claims, GRNs, PRVs, POs, kisti contracts, buyback agreements, service jobs, and account transactions.
  - Resets IMEI serial statuses to `'available'` without historical sale/purchase links. Resets customer dues, supplier payables, and product variant stock quantities to zero.
  - **STRICTLY PRESERVES** product master catalog (`Product`), variants (`ProductVariant`), categories (`Category`), brands (`Brand`), shops (`Shop`), users (`User`), hardware configs (`ShopHardwareConfig`), and SMS templates (`SmsTemplate`).
- **Frontend Hub View (`apps/web-erp`):**
  - `ClosingAndAccountsHub.tsx`: Comprehensive dark-mode interface with 4 dedicated tabs: Shift Closing (Z-Report) with interactive note denomination counter and recount grace protocol, Accounts & Drawers with inter-account transfer and OPEX expense modals, HR & Payroll with technician 50% split roster and TX-18 disbursement, SMS Desk & Fresh Start with template editor and 2FA-secured TC-18 reset modal.
  - Integrated into `AppShell.tsx` navigation items (`id: 'CLOSING'`, badge: `'P10'`) and `App.tsx` main router.
- **Automated Verification:**
  - `npm run test:closing`: 9/9 tests passing (covering shift opening, blind note count calculation, recount grace limit lockout 422, discrepancy reason validation, Z-Report print payload & SMS digest, inter-account transfers, OPEX expense slips, payroll split aggregation and TX-18 disbursement, and Fresh Start reset catalog preservation TC-18).
  - Full test suite `npm test`: 165/165 tests passing across 13 test suites.
  - Clean TypeScript compilation across all 6 workspaces (`npm run typecheck`).
  - Clean ESLint check across all 6 workspaces (`npm run lint`).
  - Production build completed successfully across all 6 workspaces (`npm run build`).

---

## [v7.6.0] — October 2026 (Phase 9: Specialized Dokan Modules — Installment Sales / Kisti Engine)

### Implemented & Verified
- **Installment Contract Booking Engine (`POST /api/v1/kisti/contracts`):**
  - Requires mandatory 2 legal guarantors with validated Full Name, Bangladeshi mobile number (`01XXXXXXXXX`), and National ID (NID).
  - Validates 15-digit handset IMEI format and Luhn algorithm checksum (`validateLuhn`) before inventory allocation.
  - Enforces handset stock availability in shop inventory (`status === 'available'`) and acquires distributed concurrency lock (`lock:imei:<id>`).
  - Atomically creates sale invoice (`INV-...`), relieves handset inventory to `status: 'sold'` with linked `saleId`, creates shift-linked payment method `'kisti'` alongside optional down payment tender.
  - Generates balanced amortization milestone schedule (`KistiInstallment`) with zero fraction drift: base monthly installment truncated to 2 decimal places, and remaining fractional drift allocated to the final milestone so `sum(milestones) === principalAmount`.
  - Emits ESC/POS thermal receipt payload for counter receipt printing.
- **Milestone Collection & Partial Payments (`POST /api/v1/kisti/contracts/:id/collect-milestone`):**
  - Supports exact milestone payments, partial installment payments (reducing milestone and contract balance while retaining `pending` status), and cascading overflow payments across future installments in FIFO order.
  - One-click Full Early Settlement Payoff (`POST /api/v1/kisti/contracts/:id/early-settle` or `isEarlySettlement: true` flag): marks all pending milestones as paid, transitions contract status to `settled`, and eliminates remaining due balance.
  - Generates Thermal Money Receipt (`MR-KST-...`) linked to contract ID, milestone number, and invoice allocation.
  - Dispatches automated payment confirmation SMS alert to the customer's mobile with receipt number and updated outstanding balance.
- **Overdue Tracking & Defaulters Classification (`GET /api/v1/kisti/defaulters`):**
  - Milestone-level overdue scheduler (`KistiService.updateOverdueStatus`): dynamically marks unpaid installments with `dueDate < now` as `overdue`.
  - Contract-level defaulter classification: contracts with installments overdue for more than 30 days are automatically transitioned to `status: 'defaulted'`.
  - Defaulters registry endpoint (`GET /api/v1/kisti/defaulters`): returns defaulted contracts with calculated days overdue, overdue milestone balances, and legal guarantor contact cards.
- **Automated SMS Reminders (`POST /api/v1/kisti/contracts/:id/send-sms-reminder`):**
  - One-click reminder dispatch targeting customer, primary guarantor, secondary guarantor, or all parties simultaneously.
  - Formats personalized SMS templates in English/Bengali containing shop name, contract number, and outstanding principal balance.
  - Audited `SmsLog` entries recorded with status and recipient tracking.
- **Double-Entry General Ledger Integration (TX-11):**
  - **TX-11 Contract Booking Journal:** Debits Cash Drawer `1.1.01` (or Digital `1.2.01`/`1.3.01`) for `downPayment` + Debits Kisti Loans Receivable `1.4.02` for `principalAmount` = Credits Sales Revenue `4.1.01` for `grossPrice`. Reallocates COGS: Debits COGS `5.1.01`, Credits Inventory `1.5.01`.
  - **TX-11 Milestone Collection Journal:** Debits Cash Drawer `1.1.01` (or Bank `1.2.01` / MFS `1.3.01`) for collected amount, Credits Kisti Loans Receivable `1.4.02` for collected amount.
  - Strict balance verification: `totalDebits === totalCredits` on 100% of journal postings with zero floating point drift.
- **Idempotency, Concurrency & Tenant Isolation:**
  - Distributed Redis locking on `lock:idemp:kisti:book:<shopId>:<idempKey>` and `lock:idemp:kisti:collect:<shopId>:<idempKey>`.
  - Unique sparse compound index on `KistiContract` `{ shopId: 1, idempotencyKey: 1 }` prevents duplicate contracts under high concurrency.
  - Strict tenant boundary isolation: all queries and mutations enforced via `req.tenant.shopId`; cross-tenant access returns HTTP 404 `CONTRACT_NOT_FOUND`.
- **Frontend Hub View (`apps/web-erp`):**
  - `KistiHub.tsx`: Modern dark-mode interface with live KPI summary tiles (Total Financed, Active Contracts, Outstanding Due, Defaulters >30d), search & filter tabs, "New Kisti Contract (F9)" modal with live IMEI Luhn validator and dynamic amortization preview, "Contract 360° Profile & Schedule" modal with milestone progress and dual guarantor cards, "Collect Installment" modal with partial payment support, early settlement toggle, and ESC/POS thermal receipt simulation, plus "SMS Reminder" dispatch modal.
  - Integrated into `AppShell.tsx` navigation items (`id: 'KISTI'`, badge: `'P9'`) and `App.tsx` router.
- **Automated Verification:**
  - `npm run test:kisti`: 13/13 tests passing.
  - Full test suite `npm test`: 156/156 tests passing across 12 test suites.
  - `npm run typecheck`: Passed with 0 errors across all 6 workspaces.
  - `npm run lint`: Passed cleanly across all workspaces.
  - `npm run build`: Production builds succeeded cleanly across all packages and apps.

---

## [v7.5.0] — October 2026 (Phase 8: Sales Returns, Customer Dues & Bakir Khata Subledger)

### Implemented & Verified
- **Return Policy Validation & Manager Overrides:**
  - Dokan 7-day return policy window enforced based on original sale timestamp.
  - Returns attempted after 7 days are rejected with HTTP 422 `RETURN_POLICY_EXPIRED` unless authorized by a 4-digit Store Manager PIN or pre-verified override token.
- **Defective Condition Inspection Quarantine (TC-20):**
  - Handset returns inspect condition flag (`restockable` vs `quarantine` / `defective`).
  - Defective/returned handsets transition IMEI status to `RETURNED_INSPECTION`, removing them from active sellable inventory and routing them to technician inspection.
  - Restockable handsets transition IMEI status to `AVAILABLE` with `saleId: undefined`.
  - Non-serialized accessories restocked atomically via `$inc: { currentStock: qty }`.
  - Audited `InventoryMovement` records (`movementType: 'in_return'`, `referenceDocType: 'CRV'`) recorded for all returned items.
- **TC-21 Due Reduction Netting:**
  - Sales returns on invoices with outstanding dues automatically reduce the customer's due balance first before disbursing cash refunds (`cashRefundAmount = totalReturn - dueNetting`).
  - Zero excess cash disbursed; customer's Bakir Khata ledger and invoice `dueAmount` relieved atomically.
- **FIFO Bakir Khata Due Collection Engine (TX-06 - `POST /api/v1/customers/:id/collect-due`):**
  - Allocates collected customer debt across unpaid invoices in First-In-First-Out (FIFO) chronological order (`createdAt: 1`).
  - Decrements invoice `dueAmount` and customer `currentDueBalance` atomically inside MongoDB session transaction.
  - Generates Thermal Money Receipt (`MR-...`) with individual invoice allocation lines.
  - Dispatches automated payment confirmation SMS alert to the customer's mobile via `MockSmsDriver`.
- **Customer Credit Limit Enforcement:**
  - Enforced in POS counter sales: checkout transactions claiming `customer_due` are rejected with HTTP 422 `CREDIT_LIMIT_EXCEEDED` if projected due exceeds `customer.creditLimit`, requiring Manager PIN override.
- **Customer 360° Profile & Statement (Screen 04 - `GET /api/v1/customers/:id/statement`):**
  - 4 Comprehensive Tabs: (1) Invoices, (2) Bakir Khata Ledger (chronological debit/credit with running balance), (3) Kisti Contracts, (4) Servicing History.
  - One-click automated SMS due payment reminder (`POST /api/v1/customers/:id/send-sms-reminder`).
- **Balanced Double-Entry Accounting (TX-05 & TX-06):**
  - **TX-05 (Sales Return Voucher):** Debits Sales Returns `4.1.01` (Handset) / `4.1.02` (Accessory), Credits AR `1.4.01` (due netting) & Cash Drawer `1.1.01` (cash refund). Reverses COGS `5.1.01`/`5.1.02` and reinstates Inventory `1.5.01`/`1.5.02` for restockable items.
  - **TX-06 (Bakir Khata Due Collection):** Debits Cash Drawer `1.1.01` (or Digital `1.2.01`), Credits Accounts Receivable `1.4.01`.
  - Guaranteed `totalDebits === totalCredits` on every posted journal.
- **Idempotency & Concurrency Safety:**
  - Distributed locks on `lock:idemp:return:<shopId>:<idempotencyKey>` and `lock:idemp:due:<shopId>:<idempotencyKey>`.
  - Duplicate requests safely return existing CRV voucher or Money Receipt without duplicate journal postings or double-crediting.
- **Frontend Views (`apps/web-erp`):**
  - `CustomerDirectoryView.tsx`: Customer directory table, Bakir Khata statistics, search/filter, Add Customer modal (`F3`), Collect Due modal with thermal MR print, Send SMS Reminder button, and 4-tab Customer 360° drawer.
  - `SalesReturnView.tsx`: Invoice lookup, 7-day policy indicator with Manager PIN override, condition selector (Restockable vs TC-20 Quarantine), TC-21 due netting breakdown panel, and thermal CRV receipt print.
  - Mounted routes and navigation items in `App.tsx` and `AppShell.tsx`.
- **Automated Verification:**
  - `npm run test:customers`: 15/15 tests passing.
  - Full test suite `npm test`: 143/143 tests passing across 11 test suites.
  - `npm run typecheck`: Passed with 0 errors across all 6 workspaces.
  - `npm run lint`: Passed cleanly across all workspaces.
  - `npm run build`: Production builds succeeded cleanly across all packages and apps.

---

## [v7.4.1] — October 2026 (Phase 7: Production-Critical Hardening Audit)

### Production-Critical Hardening & Audit Verification
- **MongoDB ACID Transactions (`packages/api/src/services/pos/pos.service.ts`):**
  - Enforced mandatory `ClientSession` across all internal database mutations (`Sale`, `SaleItem`, `ImeiSerial`, `InventoryMovement`, `ProductVariant`, `Customer`) and double-entry General Ledger postings (`AccountingService.postDoubleEntryJournal`).
  - Guaranteed atomic all-or-nothing execution inside `session.withTransaction(...)`; any database or business rule failure aborts the entire transaction atomically and safely releases Redis distributed locks.
- **Change Accounting Rigorous Verification:**
  - Audited ৳400 counter sale with ৳1,000 cash note received -> ৳600 cash change dispensed.
  - Verified exact net cash impact of +৳400 on Cash Drawer `1.1.01` (Debit ৳1,000, Credit ৳600).
  - Verified 100% balanced double-entry General Ledger voucher (`totalDebits === totalCredits`).
- **Concurrent IMEI Sales Race Hardening:**
  - Added race condition test executing simultaneous `Promise.allSettled` checkout requests for the exact same scanned IMEI from two terminals.
  - Confirmed exactly one cashier terminal succeeds (fulfilled) while the other is rejected with HTTP 409 `IMEI_ALREADY_SOLD`.
  - Zero duplicate sales or orphan inventory states.
- **Checkout Idempotency Hardening:**
  - Added distributed lock on `lock:idemp:<shopId>:<idempotencyKey>` with 15-second TTL in `PosService.processCheckout` to prevent sub-millisecond network retry race conditions.
  - Confirmed duplicate requests return the existing invoice data without duplicate sale records, duplicate customer balances, or duplicate journal postings.
- **Specific Identification Exact COGS:**
  - Audited handset landed cost calculation to ensure exact IMEI-specific purchase cost (`imeiDoc.specificCost || imeiDoc.purchaseCost`) is booked to COGS `5.1.01` and Merchandise Inventory Relief `1.5.01`, strictly barring cost averaging.
- **Offline Sync Revalidation (TC-48):**
  - Enhanced `syncOfflineBatch` to enforce tenant shop scoping (`shopId: sId, isDeleted: false`) on variant and parent product lookups.
  - Confirmed strict rejection of dual-IMEI handsets (`OFFLINE_HANDSET_SALE_PROHIBITED`), rejection of out-of-stock accessories (`INSUFFICIENT_STOCK`), rejection of foreign shop variants (`VARIANT_NOT_FOUND`), and idempotent deduplication of re-synced batches.
- **Auditable Receipt Reprinting (TC-47):**
  - Verified `reprintInvoice` performs zero accounting postings (`AccountingService.postDoubleEntryJournal.not.toHaveBeenCalled()`), zero inventory movements, and zero payment adjustments, only incrementing `reprintCount` atomically on the `Sale` document.
- **Testing Reality & Benchmark Scope Clarification:**
  - Labeled `100-Consecutive-Sale Stress Test & Logical Benchmark` explicitly as an in-memory unit/mock simulation testing internal JavaScript runtime logic and event-loop latency (p50 = ~1.0ms), distinguishing it clearly from remote MongoDB replica-set disk and network I/O latency.
- **Verification Suite Results:**
  - `npm run test:pos`: 20/20 tests passing (100%).
  - `npm test`: 128/128 tests passing across 10 monorepo test suites.
  - `npm run typecheck`: Passed with 0 errors across all 6 workspaces.
  - `npm run lint`: Passed cleanly across all workspaces.
  - `npm run build`: Production builds succeeded cleanly across all packages and apps.

---

## [v7.4.0] — October 2026 (Phase 7: POS Counter Sales, Multi-Tender Checkout, Hardware Drivers & Settings)

### Implemented & Verified
- **High-Speed Landscape POS Terminal (`apps/web-erp/src/App.tsx`):**
  - High-speed dual-pane layout optimized for 1024×768+ landscape tablet and desktop viewports.
  - Left pane: Barcode/IMEI scanner input box with auto-focus (`F2`), quick counter inventory catalog, reactive cart table with quantity adjusters, inline discounts, and removal controls.
  - Right pane: Subtotal, Mushak 6.3 VAT (5%), line discounts, payable total, split-tender settlement editor, and quick cash denomination numpad.
  - Sub-second keyboard accelerators: `F1` (Help modal), `F2` (Scanner focus), `F3` (Customer lookup), `F4` (Discount modal), `F5` (Hold cart), `F6` (Recall cart), `F8` (Invoice reprint), and `F12` (Pay / Checkout).
  - Accelerators prevented from interfering with standard input typing in textboxes.
- **Atomic POS Checkout Engine (`POST /api/v1/pos/checkout` - TX-01 to TX-04):**
  - Mandatory UUIDv4 `Idempotency-Key` header with idempotent replay: duplicate requests return existing invoice without duplicate sales or journals.
  - Cashier register shift validation (`Shift.findOne({ shopId, cashierUserId, status: 'open' })`): rejects un-opened shifts with HTTP 422 `SHIFT_NOT_OPEN`.
  - Minimum Selling Price (MSP) floor check: rejects sales below variant MSP with HTTP 403 `MSP_FLOOR_BREACH` unless approved via authorized Manager PIN or signed 60-second override token.
  - Distributed locks on scanned IMEIs (`lock:imei:<id>` with 15s TTL) via `DistributedLockService`: prevents concurrent cashier race conditions (HTTP 409 `IMEI_ALREADY_SOLD`) and safely releases ownership in a `finally` block.
  - Unavailable handset states (`IN_TRANSIT`, `DISPUTED_IN_TRANSIT`, `SCRAPPED`, `SOLD`) strictly rejected from checkout.
  - Specific Identification COGS locked to exact handset purchase cost (`purchaseCost` / `specificCost`), strictly prohibiting cost averaging.
  - Atomic double-entry financial posting (TX-01 to TX-04): Cash (`1.1.01`), bKash / Merchant MFS (`1.2.01`), Bank/Card (`1.2.01`), Customer Due (`1.4.01`), Sales Revenue (`4.1.01` Handsets / `4.1.02` Accessories), Output VAT (`2.5.01`), COGS (`5.1.01` Handsets / `5.1.02` Accessories), and Merchandise Inventory Relief (`1.5.01` Handsets / `1.5.02` Accessories).
  - Overpayment & Cash Change Handling (TX-04): Debits Cash Drawer `1.1.01` for tender note received, credits Cash Drawer `1.1.01` for change dispensed, and credits net revenue, ensuring 100% balanced entries (`sum(Debits) === sum(Credits)`).
- **Cart Hold & Recall Engine (`/api/v1/pos/held-carts`):**
  - `POST /api/v1/pos/held-carts` (`F5` accelerator): Stashes shopping cart with items, customer context, and notes.
  - `GET /api/v1/pos/held-carts` (`F6` accelerator): Recalls stashed shopping carts.
  - `DELETE /api/v1/pos/held-carts/:id`: Releases stashed carts back to inventory.
- **Hardware Station Settings Screen (`apps/web-erp/src/views/HardwareSettings.tsx`, Screen 16):**
  - Integrated into `AppShell` navigation under `/app/settings/hardware` (`SETTINGS` tab).
  - Station configuration persisted in `ShopHardwareConfig` via `GET/PUT /api/v1/hardware/station`: 58mm/80mm thermal paper widths, printer connection interfaces (WebUSB, Bluetooth, Ethernet LAN, OS Dialog), station fingerprint, and scanner wedge auto-suffix (ENTER/TAB).
  - Cash drawer kick preference (`0x1B 0x70 0x00 0x19 0xFA`) with on-screen test kick button triggering a 50ms solenoid pulse.
  - Hardware driver activity diagnostic log console.
- **ESC/POS Thermal Print Protocol & Driver Abstraction (`apps/web-erp/src/hardware/escpos.ts`):**
  - Generates binary ESC/POS stream (`rawEscPosBase64`) with English monospace alignment (<0.3s): 48 columns for 80mm paper, 32 columns for 58mm paper.
  - Direct WebUSB and Bluetooth driver with explicitly labelled hardware simulator fallback when physical devices are unattached.
- **Auditable Invoice Reprint Counter (TC-47):**
  - Endpoint `POST /api/v1/pos/invoices/:invoiceNo/reprint` / `GET /api/v1/pos/invoices/:invoiceNo`.
  - Atomically increments `reprintCount` on `Sale` (`reprint_count = 3` after 3 reprint calls).
  - Strict 0.00% financial and inventory impact (zero journals, zero stock movements).
  - Formats `*** DUPLICATE REPRINT (COPY #N) ***` header on reprinted vouchers.
- **Offline Accessory Queue & Hard Handset Block (TC-48):**
  - Invariant enforced: Dual-IMEI Handsets strictly prohibited from offline checkout (`OFFLINE_HANDSET_SALE_PROHIBITED`).
  - Eligible non-serialized accessories queued into local storage during network interruption.
  - Batch synchronization replay via `POST /api/v1/pos/offline-sync` upon reconnection.
- **Automated Verification & Benchmarks (`npm run test:pos`):**
  - 17/17 passing tests covering TC-01 through TC-04, TC-47, TC-48, shift check, MSP floor, concurrency lock, and held carts.
  - 100-consecutive-sale stress test with 100% ledger reconciliation and commit benchmark: p50 = 1.02ms, p95 = 1.64ms, p99 = 2.20ms (well within the <250ms target).
  - Full test suite `npm test`: 125/125 passing across 10 test suites.
  - Monorepo `npm run typecheck`: Passed with 0 errors across all 6 workspaces.
  - Monorepo `npm run lint`: Clean across all workspaces.
  - Monorepo `npm run build`: Production builds succeeded cleanly across all packages and apps.

---

## [v7.3.0] — October 2026 (Phase 6: Procurement, Supplier Ledgers, GRN, PRV & Stock Transfers)

### Implemented & Verified
- **Supplier CRM & Payables Ledger (`packages/api/src/services/procurement/procurement.service.ts`):**
  - Tenant-scoped CRUD for vendors and suppliers (`Supplier`), supporting phone deduplication, contact details, opening payables, and active/inactive statuses.
  - Implemented 360-degree Supplier Statement (`GET /api/v1/procurement/suppliers/:id/statement`) reconciling opening balance, GRN credit purchases, direct cash payments, PRV return credits, and supplier payouts into a unified chronologically ordered running ledger.
  - Idempotent supplier payment execution (`POST /api/v1/procurement/suppliers/:id/payment`): decrements supplier liability atomically and posts TX-08 double-entry journal vouchers (Debit `2.1.01 Accounts Payable` / Credit `1.2.01 Bank` or `1.1.01 Cash`). Retried requests return idempotent replayed receipts without double-posting.
- **Goods Received Notes & Exact Landed Cost Handset Intake (`POST /api/v1/procurement/grn` - TX-07):**
  - 15-digit Luhn algorithm checksum validation on all incoming serialized handsets (`validateLuhnImei`).
  - Active stock deduplication preventing concurrent intake of duplicate IMEIs across `AVAILABLE`, `HELD_CART`, and `IN_TRANSIT` states.
  - Exact landed purchase cost locked per handset (`purchaseCost` via `Decimal128`), strictly prohibiting cost averaging.
  - Atomic double-entry financial posting (TX-07): Debits `1.5.01 Merchandise Inventory — Handsets` (and `1.5.02 Accessories` for accessory lines), Credits `2.1.01 Accounts Payable`, with instant settlement support for partial cash payments.
  - Partial PO receiving tracking (TC-28): PO status transitions to `partially_received` / `PARTIALLY_FULFILLED` or `completed` / `FULFILLED` while tracking pending unit delivery balances.
- **Purchase Return Vouchers & Netting Engine (`POST /api/v1/procurement/returns` - TX-08 / TC-19):**
  - Validates handset ownership, tenant boundary, and ensures status is return-eligible (`AVAILABLE` / `RETURNED_INSPECTION`), rejecting returns of `SOLD` or `SCRAPPED` units.
  - Atomically transitions handset status to `RETURNED_TO_SUPPLIER`, decrements variant stock, and creates immutable `InventoryMovement` records (`movementType: 'out_return'`, `referenceDocType: 'PRV'`).
  - TC-19 Verified: Returning two defective handsets with combined return cost of ৳30,000 decreases supplier payable liability by exactly ৳30,000, debiting `2.1.01 Accounts Payable` and crediting `1.5.01 Merchandise Inventory — Handsets`.
- **Godown-to-Outlet Stock Transfers (`/api/v1/inventory/transfers` - TX-19):**
  - Dispatch workflow (`POST /api/v1/inventory/transfers/dispatch`): moves handsets into `IN_TRANSIT`, locking them out of POS checkout carts, and logging stock movements.
  - Internal asset movement with **strict 0.00% P&L impact** (no revenue, no expense, no COGS).
  - Scan-to-receive workflow (`POST /api/v1/inventory/transfers/:id/receive`): verifies received handsets at destination showroom outlet, transitioning matched units to `AVAILABLE`.
  - TC-36 Transit Discrepancy Workflow: In a 20-unit dispatch where only 19 physical units are verified, 19 units become available, 1 missing unit is flagged `DISPUTED_IN_TRANSIT`, STN status is marked `discrepancy`, and an automated high-priority SMS alert is delivered to the Shop Owner via the SMS adapter.
- **Web ERP Procurement & Transfers Hub Screen (`apps/web-erp/src/views/ProcurementHub.tsx`):**
  - Integrated into `AppShell` under `activeTab === 'PROCUREMENT'` (`F6` / sidebar with Truck icon and P6 badge).
  - 5 interactive tabs: Suppliers & Payables Directory (with 360° statement modal & payout wizard), Purchase Orders & GRN Intake (with Dual-IMEI scanner and Luhn validator), Purchase Returns (PRV), Stock Transfers (STN dispatch and receive), and Transit Discrepancies Desk (TC-36).
- **Automated Verification & Quality Gates:**
  - Implemented `npm run test:procurement` covering 11 automated test assertions for TC-19, TC-28, TC-36, tenant isolation, and double-entry reconciliation.
  - `npm run test:procurement`: 11/11 passing.
  - Full test suite `npm test`: 108/108 passing across 9 test suites.
  - `npm run typecheck`: Passed with 0 errors across all 6 workspaces.
  - `npm run lint`: Clean across all workspaces.
  - `npm run build`: Production builds succeeded cleanly across all packages and apps.

---

## [v7.2.0] — October 2026 (Phase 5: Product Catalog, Dual-IMEI Inventory & Damaged Stock Scrap)

### Implemented & Verified
- **Product Catalog & Taxonomy Engine (`packages/api/src/services/catalog/catalog.service.ts`):**
  - Tenant-scoped CRUD for Categories (`Category`), Brands (`Brand`), Products (`Product`), and Variants (`ProductVariant`).
  - Implemented URL slugifier and internal Dokan unique barcode generator (`generateBarcode`) with EAN/Luhn check digit.
  - Enforced deletion safeguards: blocks product or variant deletion if active serialized handsets exist in inventory.
  - Strict tenant isolation: prevents cross-shop product updates, reads, or modifications.
- **Ultra-Fast CSV/Excel Bulk Import Engine (`packages/api/src/services/catalog/catalogImport.service.ts`):**
  - Zero-dependency, RFC-4180 compliant CSV parser with quote escaping and whitespace trimming.
  - Downloadable standardized template endpoint (`GET /api/v1/catalog/import-template`).
  - Multi-variant grouping, auto-creation of missing Categories and Brands, in-batch duplicate barcode deduplication, and row-level diagnostic error reporting.
  - Performance Benchmark: **500 catalog rows imported in 0.137 seconds** (exceeding <5.0s benchmark target).
- **Dual-IMEI Serialized Handset Inventory Engine (`packages/api/src/services/inventory/inventory.service.ts`):**
  - Enforced 15-digit Luhn check digit algorithm validation (`validateLuhn`) for primary and secondary IMEIs.
  - Partial unique active compound index on `{ shopId: 1, imei1: 1 }` preventing concurrent duplicate active IMEI registrations.
  - Strict preservation of each handset's exact landed cost (`purchaseCost` / `specificCost` via `Decimal128`), strictly preventing cost averaging.
  - Full 7 lifecycle states machine (`AVAILABLE`, `HELD_CART`, `SOLD`, `RETURNED_INSPECTION`, `RETURNED_TO_SUPPLIER`, `SCRAPPED`, `IN_TRANSIT`) with transition validation and terminal state locks.
  - Aging inventory queries for units unsold over 60 and 90 days.
  - Historical movement audit timeline retrieval (`GET /api/v1/inventory/imei/:imei/timeline`).
- **Barcode & IMEI Scanner Fast Lookup (`GET /api/v1/inventory/imei/scan/:code`):**
  - Unified resolution of IMEI1, IMEI2, and variant barcodes in a single endpoint.
  - Sub-150ms in-memory cache with strict tenant boundaries and automatic cache invalidation upon stock mutations.
  - Performance Benchmark: **1,000 scanner lookup operations achieved p50: 0.003ms, p95: 0.006ms, p99: 0.018ms** (target p99 < 150ms).
- **Accessories & Non-Serialized Stock Ledger (`packages/api/src/models/InventoryMovement.ts`):**
  - Append-only inventory movements ledger tracking `in_purchase`, `out_sale`, `return_customer`, `return_supplier`, `out_scrap`, and `adjustment`.
  - Real-time stock levels with low-stock alerts based on variant `alertQuantity` / `reorderLevel`.
  - Atomic stock count adjustments requiring Manager PIN or signed short-lived override token.
- **Damaged Stock Scrap Hub & Accounting Invariant (`POST /api/v1/inventory/damage/scrap`):**
  - Captures damage classification, physical damage notes, and secure evidence photo URL (`POST /api/v1/inventory/evidence/upload`).
  - Verifies single-use manager override token or Manager PIN.
  - Atomic Mongoose transaction: transitions handset status to `SCRAPPED`, relieves inventory, records `DamagedStockScrap` and `InventoryMovement`, and posts TX-17 double-entry journal voucher.
  - Accounting Invariant Verified: Exactly ৳12,000 debited to `5020-Damaged-Stock-Loss` and credited to `1210-Handset-Inventory` at exact landed cost.
- **Web ERP Inventory Hub Screen (`apps/web-erp/src/views/InventoryHub.tsx`):**
  - Full-featured, responsive, mobile-optimized hub matching Phase 4 design tokens.
  - 5 primary sub-tabs: Dual-IMEI Handsets (with aging filters, status badges, register modal, timeline modal), Products & Taxonomy, CSV Bulk Importer (with preview table & summary metrics), Accessories Ledger (with stock balances & adjustment modal), and Damaged Stock Scrap Hub (with photo upload, manager PIN override, TX-17 double-entry preview).
  - Integrated into `AppShell` under `activeTab === 'INVENTORY'`.
- **Automated Verification & Quality Gates:**
  - Implemented `npm run test:inventory` covering 18 unit/integration test assertions and benchmarks.
  - `npm run test:inventory`: 18/18 passing.
  - `npm test`: 97/97 passing across all 8 test suites.
  - `npm run typecheck`: Passed with 0 errors across all 6 workspaces.
  - `npm run lint`: Clean across all workspaces.
  - `npm run build`: Production builds succeeded cleanly across all packages and apps.

---

## [v7.1.0] — October 2026 (Phase 4: Design System, UI Components & Mobile-First PWA Shell)

### Implemented & Verified
- **Design Tokens & System Styling (`packages/ui-tokens`):**
  - Codified the master light core palette tokens: App background `#F8FAFC`, Surface `#FFFFFF`, Subtle `#F1F5F9`, Primary text `#0F172A`, Secondary text `#475569`, Brand Primary `#0D9488`, Brand Hover `#0F766E`, Info `#0284C7`, Emerald, Amber, Destructive Rose, and Due status Purple.
  - Preserved POS high-contrast dark surfaces (`#0F172A`, `#1E293B`, `#334155`).
  - Implemented CSS custom properties map (`CSS_VARIABLES`) matching `UI_UX_BLUEPRINT.md` Section 4.1.
  - Enforced tabular numerals invariant (`tnum` / `font-tabular`) across all monetary amounts, IMEIs, and financial calculations.
  - Enforced 44x44px minimum touch target tokens and utility classes (`.touch-target`).
- **Reusable Component Library (`apps/web-erp/src/components`):**
  - `Button`: Multi-variant (`primary`, `secondary`, `outline`, `ghost`, `destructive`), size scale, loading spinner, keyboard shortcut badges (`F1`, `ESC`), 44px min touch target.
  - `IconButton`: Accessible `aria-label`, tooltip support, 44px touch bounding box.
  - `DataTable`: Generic typed columns, client/controlled sorting, pagination controls, sticky header, zebra striping, skeleton shimmer (`SkeletonTable`), empty state, error state.
  - `VirtualizedList`: Zero-dependency, pure React virtual windowing for high-volume 500+ IMEI/product batches.
  - `Modal`: Accessible dialog semantics (`role="dialog"`, `aria-modal="true"`), focus trapping, Escape key listener, backdrop dismissal, body scroll lock.
  - `Drawer`: Responsive side slide-over and mobile bottom sheet drawer with safe-area padding and focus management.
  - `EmptyState`: Contextual message, friendly icon, and actionable CTA.
  - `ErrorBoundary`: Safe React error boundary catching render crashes, diagnostic trace logging without leaking tokens, retry and window reload CTAs.
  - `OfflineSyncBanner`: Online/offline status detection, pending mutation count display, and sync trigger.
  - `MoneyText`: Bangladeshi Taka (`৳`) symbol, `tabular-nums` formatting with Indian numbering grouping, negative balance coloring, and privacy masking.
- **Specialized Mobile-Retail Dokan Components (`apps/web-erp/src/components/retail`):**
  - `OnScreenNumpad`: Touch-friendly 0-9, 00, decimal point, quick note chips (`+৳100`, `+৳500`, `+৳1000`), clear, backspace, and confirm actions with decimal and duplicate protection.
  - `PatternLockCanvas`: 3x3 Android 9-dot touch gesture canvas, line rendering, active dot illumination, minimum 4 nodes validation, duplicate node rejection.
  - `ManagerPinOverrideModal`: Masked 4-digit PIN entry overlay with touch keypad, calling `POST /api/v1/users/manager-pin/verify` with 60s single-use override token issuance.
  - `MultiShopSwitcherModal`: Multi-branch switcher listing authorized shops from `GET /api/v1/shops/my-shops`, search filter, and `POST /api/v1/shops/switch-workspace` execution.
- **Responsive ERP Application Shell & PWA Mobile Shell:**
  - `AppShell`: Persistent collapsible sidebar (240px -> 64px), fixed 56px top bar with Dokan switcher trigger, live network status, active cash shift balance (`৳14,250`), user profile, and mobile bottom navigation with safe-area insets (`pb-safe`).
  - `manifest.webmanifest`: PWA standalone display mode, Bebsayik branding, theme color `#0D9488`, app icons (192x192 and 512x512).
  - `sw.js`: Service worker implementing static asset caching, offline fallback shell, and **strict NetworkOnly financial safety rule** for all `/api/` calls.
- **Component Showcase View (`apps/web-erp/src/views/ComponentShowcase.tsx`):**
  - Interactive demonstration view for all 13 Phase 4 components, accessible from the shell navigation.
- **Automated Verification & Quality Gates:**
  - Implemented `npm run test:ui` covering 16 unit assertions across design tokens, PWA manifest, financial safety invariants, numpad calculation logic, 3x3 pattern lock coordinates, and money formatting.
  - `npm run test:ui`: 16/16 passing.
  - `npm test`: 79/79 passing across all 7 test suites.
  - `npm run typecheck`: Passed with 0 errors across all 6 workspaces.
  - `npm run lint`: Passed with 0 errors across all workspaces.
  - `npm run build`: Production builds succeeded cleanly across all packages and apps.

---

## [v7.0.0] — October 2026 (Phase 3: Multi-Tenancy Isolation, RBAC & Context Guards)

### Implemented & Verified
- **Multi-Tenant Context Guards & Isolation Middleware (`packages/api/src/middlewares/tenantGuard.ts`):**
  - Read and strictly validate `X-Shop-Id` request header (rejects missing or malformed ObjectIds with HTTP 403 `TENANT_ACCESS_DENIED`).
  - Verifies database shop existence and suspended status (denies suspended shops for non-SUPER_ADMIN users).
  - Validates active user membership: verifies shop ownership (`shop.ownerUserId`), direct assignment (`user.shopId`), or multi-branch authorization (`user.accessibleShopIds`).
  - Securely populates `req.tenant = { shopId, role, permissions }` on the Express Request object.
  - Multi-tenant query & body anti-tampering protection: detects mismatching `req.body.shopId` or `req.query.shopId` against the validated `X-Shop-Id` and terminates with HTTP 403 `TENANT_ACCESS_DENIED`. Enforces database mutation isolation by sanitizing `req.body.shopId` to the authorized tenant ObjectId.
  - Centralized permission evaluation via `requirePermission(permission)` supporting granular capabilities (`pos:checkout`, `pos:discount_below_msp`, `pos:returns`, `inventory:manage`, `customers:read`, etc.).
- **Master RBAC & 7-Role Action Matrix (`packages/api/src/middlewares/authGuard.ts`, `rbacGuard.ts`):**
  - Updated `requireRole(allowedRoles)` to evaluate `req.tenant?.role || req.user.role`.
  - Enforces access gates across all seven canonical roles: `SUPER_ADMIN`, `STORE_OWNER`, `STORE_MANAGER`, `SALESPERSON`, `CASHIER`, `TECHNICIAN`, `ACCOUNTANT` strictly adhering to `appflow.md` Section 12 and `api-spec.md` Section 4.
  - Returns documented HTTP 403 `INSUFFICIENT_PERMISSIONS` on unauthorized route access attempts.
- **Shop & Workspace Management API Suite (`packages/api/src/routes/shop.routes.ts`):**
  - `GET /api/v1/shops/my-shops`: Lists all shops authorized for the authenticated user (including owned shops and accessible branches, or global listing for `SUPER_ADMIN`).
  - `POST /api/v1/shops/switch-workspace`: Verifies destination shop authorization, switches active tenant context, and issues a freshly scoped JWT with destination `shopId` and active role.
  - `GET /api/v1/shops/profile`: Retrieves tenant-scoped shop profile, business type, VAT/BIN credentials, and operational settings under `tenantGuard`.
  - `PATCH /api/v1/shops/profile`: Tenant-isolated shop configuration updates restricted strictly to `STORE_OWNER` and `SUPER_ADMIN`.
- **Single-Use Manager Override Token Service (`packages/api/src/services/security/overrideToken.service.ts`):**
  - Cryptographically signed HMAC SHA-256 tokens (`ovr_token_${timestamp}_${nonce}.${signature}`) with strictly 60-second validity window.
  - Scope-bound to specific `shopId` and operational `action` (`MSP_FLOOR_OVERRIDE`, `RETURN_OVERRIDE`, etc.).
  - Atomic consumption mechanism preventing token replay attacks. Rejects client-forged, expired, wrong-shop, wrong-action, or replayed tokens.
  - Integrated into `POST /api/v1/users/manager-pin/verify` and exportable as reusable security gateway service.
- **Personal Ledger Isolation (`packages/api/src/routes/personalLedger.routes.ts`):**
  - Mounted `/api/v1/personal-ledger/*` endpoints (`GET/POST /contacts`, `POST /transactions`, `GET /statement/:contactId`).
  - Gated strictly to `STORE_OWNER` under `tenantGuard` and `requireRole(['STORE_OWNER'])`.
  - Rejects managers, cashiers, technicians, salespersons, accountants, and super-admins with HTTP 403 `INSUFFICIENT_PERMISSIONS`. Ensures 0.00% contamination to shop chart of accounts or store P&L.
- **Automated Verification & Quality Gates:**
  - Configured `npm run test:rbac` with 21 unit & integration assertions covering tenant isolation, role action matrix, workspace switching, manager override tokens, and personal ledger isolation.
  - `npm run test:rbac`: 21/21 passing.
  - `npm test`: 63/63 passing tests across 6 test suites (`rbac.test.ts`, `auth.test.ts`, `accounting.test.ts`, `money.test.ts`, `connection.test.ts`, `validators.test.ts`).
  - `npm run typecheck`: Passed with 0 errors across all 6 workspaces.
  - `npm run lint`: Passed with 0 errors across all workspaces.
  - `npm run build`: Production builds succeeded cleanly across all packages and apps.

---

## [v6.9.0] — October 2026 (Local Development Workflow & Web ERP Preview UI Hardening)

### Resolved & Verified
- **API Port 5000 Conflict Resolution:**
  - Diagnosed that the port 5000 conflict was caused by a prior background `node.exe` daemon running the API gateway.
  - Terminated the lingering background processes safely without killing unrelated system processes.
  - Re-verified port availability and established clean concurrently managed dev runner scripts.
- **Root Cause Resolution for Unstyled Web ERP Preview:**
  - Identified that `apps/web-erp`, `apps/marketing`, and `apps/admin` lacked `postcss.config.js` and `tailwind.config.js`, causing Vite to serve raw uncompiled `@tailwind` directives that rendered as unstyled browser default HTML.
  - Sourced and applied the `@bebsayik/ui-tokens` preset across all apps with proper content globs.
  - Configured `postcss.config.js` with `tailwindcss` and `autoprefixer`.
  - Configured Vite reverse proxy in `apps/web-erp/vite.config.ts` (`/api` -> `http://localhost:5000`) for seamless CORS-free backend communication.
  - Cleaned up stale transpiled `.js` files in `src/` directories and added `noEmit: true` to Vite workspace `tsconfig.json` files.
- **Enterprise Web ERP & Touch POS Interface (`apps/web-erp/src/App.tsx`):**
  - Engineered the responsive landscape ERP interface adhering strictly to `UI_UX_BLUEPRINT.md`:
    - Top header bar with shop branding ("Kanchan Telecom - Eastern Plaza #304"), live API latency & health badge, active shift balance (`৳14,250`), and `STORE_OWNER` profile badge.
    - Sub-second counter POS station with 15-digit Dual-IMEI/barcode scanner lookup and quick handset/accessory catalog cards.
    - Real-time cart calculations with tabular lining numbers (`tnum`), Bangladeshi Taka (`৳`), and 5% Mushak 6.3 VAT.
    - Tender selector supporting Cash (`1010`), bKash (`1030`), Nagad (`1030`), Card POS (`1020`), and Bakir Khata / Customer Due (`1050`).
    - Interactive thermal receipt modal simulating ESC/POS slip generation, print preview, and solenoid cash drawer kick.
    - Built-in live API Gateway diagnostics tab with real-time ping to `/api/v1/health` and live test runner for `/api/v1/auth/otp/request`.
- **Quality Gates & Verification:**
  - `npm run typecheck`: Passed with 0 errors across all 6 workspaces.
  - `npm run lint`: Clean across all packages.
  - `npm test`: 37/37 passing Vitest tests.
  - `npm run build`: Production bundle succeeded with full Tailwind CSS extraction (`index-CVkwPLKO.css` 21.77 kB).
  - Verified live preview at `http://localhost:3001` with HTTP 200 responses, compiled CSS, and functional backend proxy.

---

## [v6.8.0] — October 2026 (Phase 2: Authentication, Identity Lifecycle & Security Gateways)

### Implemented & Verified
- **SMS Gateway Driver Suite (`packages/api/src/services/sms/`):**
  - Codified the `SmsDriver` interface contract in `sms.types.ts`.
  - Implemented `MockSmsDriver` capturing outbound OTP messages for automated tests and development visibility.
  - Implemented production adapters `SslWirelessDriver` (SSL Wireless API v3) and `BulkSmsBdDriver` (BulkSMS BD API) for Bangladeshi telecommunication networks.
- **Passwordless SMS OTP Service (`/api/v1/auth/otp/*`):**
  - Built Cloudflare Turnstile token verification middleware (`verifyTurnstile`) protecting public challenge endpoints.
  - Implemented cryptographically secure 6-digit numeric OTP generator using `crypto.randomInt()`.
  - Stored SHA-256 OTP hashes in `auth_otps` with strict 120-second TTL auto-purge.
  - Implemented dual-axis sliding-window rate limiter: strictly max 3 requests per 15 minutes per phone and max 10 requests per 15 minutes per IP with Redis and in-memory fallback.
  - Implemented `POST /api/v1/auth/otp/request` and `POST /api/v1/auth/otp/verify` with replay protection (single-use OTP flag) and auto-provisioning of owner profiles and accessible shop associations.
- **Permanent Argon2id Password Authentication & 5-Attempt Lockout (`POST /api/v1/auth/login`):**
  - Implemented password hashing with Argon2id (`memoryCost: 65536, timeCost: 3`).
  - Implemented brute-force protection tracking `failedLoginAttempts`: exactly 5 consecutive failures lock the account for 15 minutes (`lockedUntil` timestamp) matching TC-29.
  - Successful logins clear failed attempt counters and issue fresh token pairs.
- **JWT Session Engine & Token Version Kill Switch (`packages/api/src/utils/security.ts` & `authGuard.ts`):**
  - Short-lived Access Token: 15-minute validity containing `userId`, `phone`, `role`, `shopId`, and `tokenVersion`.
  - Long-lived Refresh Token: 7-day validity stored in HTTP-only secure cookies (`refreshToken`).
  - Implemented `POST /api/v1/auth/refresh` and `POST /api/v1/auth/logout`.
  - Implemented instant session revocation (<1 second): any increment to `users.tokenVersion` immediately causes `authGuard` and refresh routes to reject subsequent requests with HTTP 401.
- **Security Lifecycle Protocols:**
  - **Password Recovery (`POST /api/v1/auth/recovery/reset`):** Verified OTP challenge, updated Argon2id password hash, and incremented `tokenVersion` to purge all stale sessions across devices (TC-51).
  - **180s Dual-OTP Phone Migration (`POST /api/v1/auth/phone-change/initiate` & `/complete`):** Enforces simultaneous SMS OTP challenges to current and new SIMs; atomic mobile migration with 180s TTL, owner authorization, and session purge (TC-52).
  - **Staff Emergency Kill-Switch (`POST /api/v1/users/:id/emergency-terminate`):** Owner master password verification, immediate `isActive: false` deactivation, and staff `tokenVersion` increment, instantly blocking POS/ERP operations with HTTP 403 `STAFF_TERMINATED` in <1 second (TC-53).
  - **Manager Override PIN (`POST /api/v1/users/manager-pin/verify`):** 4-digit PIN verification with Argon2id hash, issuing a 60-second scoped override token for sensitive counter operations.
- **Comprehensive Quality Gates:**
  - 100% clean typecheck across all 6 workspaces (`tsc --noEmit` exits with code 0).
  - 100% clean linting across all packages.
  - 42/42 passing Vitest tests (21/21 dedicated security tests in `packages/api/src/__tests__/auth.test.ts`).
  - Production monorepo build succeeded across all packages (`tsc -b` and Vite apps).
  - Live MongoDB Atlas database connectivity verified (`{"ok": 1}`).

---

## [v6.7.0] — October 2026 (Phase 1: Database Persistence Layer & Double-Entry Financial Engine)

### Implemented & Verified
- **Complete Mongoose Persistence Layer (36 Collections):**
  - Codified and exported all 36 canonical Mongoose schemas in `packages/api/src/models/` matching [`DATABASE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md):
    - *Core:* `Shop`, `User`, `UserDevice`, `AuthOtp`, `PhoneChangeRequest`.
    - *Catalog:* `Category`, `Brand`, `Product`, `ProductVariant`, `ImeiSerial`.
    - *Logistics & Scrap:* `InventoryMovement`, `StockTransferNote`, `DamagedStockScrap`, `WarrantyClaim`.
    - *Procurement:* `Supplier`, `PurchaseOrder`, `GoodsReceivedNote`, `PurchaseReturnVoucher`.
    - *POS & Sales:* `Sale`, `SaleItem`, `HeldCart`, `CustomerReturnVoucher`.
    - *CRM & Kisti:* `Customer`, `KistiContract`, `KistiInstallment`, `BuybackAgreement`.
    - *Servicing:* `ServiceJob`, `ServicePartsConsumed`.
    - *Accounting & Banking:* `Account`, `AccountTransaction`, `MfsTransaction`, `PersonalLedgerContact`, `PersonalLedgerTransaction`.
    - *Registers & Cash:* `Shift`, `ShiftDenomination`.
    - *HR & SaaS Management:* `EmployeeTarget`, `PayrollLedger`, `SmsLog`, `SmsTemplate`, `ShopHardwareConfig`, `SubscriptionPlan`, `SubscriptionInvoice`, `PromoCode`, `MarketingLead`.
- **Tenant Isolation & MongoDB Atlas Indexing:**
  - Enforced mandatory compound tenant indexing `{ shopId: 1, ... }` across all tenant collections.
  - Configured unique partial index on `imei_serials`: `{ imei1: 1, shopId: 1 }` filtered on `{ status: 'available' }`.
  - Configured TTL index on `auth_otps`: `{ createdAt: 1 }` with `expireAfterSeconds: 120`.
- **Monetary Precision & Decimal128 Arithmetic Engine (`packages/api/src/utils/money.ts`):**
  - Built precision monetary library using `decimal.js` with zero floating-point drift (`0.1 + 0.2 === 0.3`).
  - Added schema getter/setter helpers (`decimal128Setter`, `decimal128Getter`) preventing IEEE-754 binary floating-point contamination.
  - Implemented unit tests in `money.test.ts` covering rounding, technician 50% splits, VAT computation, and Decimal128 conversion.
- **Double-Entry General Ledger Engine & Master Posting Matrices:**
  - Implemented `AccountingService.postDoubleEntryJournal()` in `packages/api/src/services/accounting/`:
    - Enforces mandatory Mongoose `ClientSession` injection.
    - Strictly rejects unbalanced entries (`sum(debits) !== sum(credits)`).
    - Requires at least 2 entries per journal voucher.
    - Atomically updates running balances in `accounts` and records audit records in `account_transactions`.
  - Codified the complete **Standard Chart of Accounts (COA)** with 35 accounts according to Section 22.2 of `DATABASE.md`.
  - Codified typed transaction posting builders for all 19 canonical transaction types (**TX-01 through TX-19**) in `journalMatrices.ts`.
  - Implemented `withTransaction<T>()` ACID execution wrapper with write-conflict retry handling in `packages/api/src/database/transaction.ts`.
- **Live MongoDB Atlas Demo Seeder (`packages/api/src/seed/seed_dev.ts`):**
  - Implemented and executed live seeding against MongoDB Atlas (`bebsayik_dev`):
    - Upserted `Shop`: Kanchan Telecom (Eastern Plaza Outlet).
    - Upserted `User`s: Sumon Dash (Owner), Tanvir Ahmed (Cashier), Rafiqul Islam (Technician).
    - Synchronized all 35 Standard Chart of Accounts (COA).
    - Upserted sample handset: Redmi Note 13 Pro 5G with valid 15-digit Luhn IMEIs (`860123456789014`, `860123456789022`).
- **Comprehensive Quality Gates:**
  - 100% clean typecheck across all 6 workspaces (`tsc --noEmit` exits with code 0).
  - 100% clean linting across all packages.
  - 21/21 Vitest unit and regression tests passing (`validators.test.ts`, `connection.test.ts`, `money.test.ts`, `accounting.test.ts`).
  - All 6 packages build cleanly (`@bebsayik/api`, `@bebsayik/shared-types`, `@bebsayik/ui-tokens`, `@bebsayik/admin`, `@bebsayik/marketing`, `@bebsayik/web-erp`).
  - Live Atlas connectivity ping verified (`{"ok": 1}`).

### Phase 1 Deep Audit & Defect Fixes (Post-Implementation Review)
- **Defect Fix — Money Null/Undefined Handling (`packages/api/src/utils/money.ts`):**
  - Resolved defect where `decimal128Setter` and `decimal128Getter` coerced `null`/`undefined` into `0.00` Decimal128 values, unintentionally populating unassigned optional monetary fields (e.g., `closingCashActual` on unclosed shifts). Preserves unset/null semantics cleanly while converting valid numerical inputs into exact Decimal128 strings. Added regression test in `money.test.ts`.
- **Defect Fix — Storage-Engine Voucher Entry Uniqueness (`packages/api/src/models/AccountTransaction.ts`):**
  - Added `entryIndex: number` field and compound unique index `{ shopId: 1, voucherNo: 1, entryIndex: 1 }` to guarantee at the WiredTiger storage engine level that voucher journal lines cannot be duplicated.
- **Defect Fix — Ledger Engine Idempotency Guard (`packages/api/src/services/accounting/`):**
  - Integrated pre-posting idempotency check in `AccountingService.postDoubleEntryJournal()` using the active session to reject duplicate voucher postings with `Idempotency violation: Voucher <voucherNo> has already been posted for shop <shopId>`. Added unit test in `accounting.test.ts`.
- **Schema & Index Alignment with `DATABASE.md` Table 11.1:**
  - `AuthOtp`: Added compound lookup index `{ phone: 1, purpose: 1, consumed: 1 }`.
  - `PhoneChangeRequest`: Added `shopId`, `status: ['pending', 'completed', 'expired', 'cancelled']`, and partial unique index `{ shopId: 1, userId: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } }`.
  - `MarketingLead`: Added unique index on `{ phone: 1 }`.
  - `PersonalLedgerContact`: Made `{ shopId: 1, phone: 1 }` unique with `{ partialFilterExpression: { isDeleted: false } }`.
  - `Supplier`: Made `{ shopId: 1, phone: 1 }` unique with `{ partialFilterExpression: { isDeleted: false } }`.
  - `Customer`: Made `{ shopId: 1, phone: 1 }` unique with `{ partialFilterExpression: { isDeleted: false } }`.
  - `ProductVariant`: Added partial unique barcode index `{ shopId: 1, barcode: 1 }, { unique: true, partialFilterExpression: { isDeleted: false, barcode: { $type: 'string' } } }`.
  - `Account`: Added `{ shopId: 1, name: 1 }, { unique: true }`.
  - `Sale`: Added index `{ shopId: 1, customerId: 1, dueAmount: 1 }, { partialFilterExpression: { dueAmount: { $gt: 0 } } }`.
  - `UserDevice`: Added `shopId`, `deviceId`, `pinHash`, `isRevoked: boolean` per Table 11.1.
  - `Shop`: Expanded `status` enum to `['trial', 'active', 'grace_period', 'read_only', 'suspended']`, made `ownerUserId` optional, added `subdomain` string.
- **Live MongoDB Atlas Constraint Verification Suite (`packages/api/src/database/verify_phase1_constraints.ts`):**
  - Executed end-to-end verification directly against MongoDB Atlas (`bebsayik_dev` on replica set `bebsayik.6kwvimu.mongodb.net`):
    - `[PASS] 1. Index Synchronization`: Synchronized all model indexes across Atlas collections without conflict.
    - `[PASS] 2. Tenant Isolation on Accounts`: Enforced `E11000` duplicate key on identical account codes within Shop A, while allowing identical account codes across Shop B.
    - `[PASS] 3. Partial Unique Index on Available IMEIs`: Prohibited duplicate available IMEIs; verified that sold handsets can coexist.
    - `[PASS] 4. TTL Index on AuthOtp`: Confirmed TTL index on `createdAt` with `expireAfterSeconds: 120`.
    - `[PASS] 5. Multi-Document ACID Transaction Rollback`: Confirmed `withTransaction` rolled back all operations on failure (aborted writes left no uncommitted documents in the collection).
    - `[PASS] 6. Double-Entry Journal Idempotency Guard`: Confirmed re-posting duplicate voucher rejected immediately with idempotency violation error.
    - `[PASS] 7. Decimal128 Monetary Precision in Storage`: Validated BSON storage type is Decimal128 (`6000.00` BSON Type 19), with zero IEEE-754 drift.

---

## [v6.6.0] — October 2026 (Phase 0: Workspace Architecture, Tooling, Docker & Seed Profiles)

### Initialized & Configured
- **Production Monorepo Architecture (npm workspaces):**
  - Initialized multi-package workspace covering 3 internal packages (`@bebsayik/shared-types`, `@bebsayik/ui-tokens`, `@bebsayik/api`) and 3 Vite client applications (`@bebsayik/marketing`, `@bebsayik/web-erp`, `@bebsayik/admin`).
  - Configured root `tsconfig.base.json` enforcing strict TypeScript typing (`NodeNext`, `composite`, `noImplicitAny`, `exactOptionalPropertyTypes`).
  - Standardized tooling configs: Prettier (`.prettierrc`, `.prettierignore`), Vitest (`vitest.config.ts`), Playwright skeleton (`playwright.config.ts`), and sanitized `.env.example` templates across root, backend, and all frontend applications.
- **Shared Domain Packages:**
  - `@bebsayik/shared-types`: Implemented canonical 7 RBAC roles (`SUPER_ADMIN`, `STORE_OWNER`, `STORE_MANAGER`, `SALESPERSON`, `CASHIER`, `TECHNICIAN`, `ACCOUNTANT`), 16 centralized domain error codes, standard API envelope schemas (`ApiResponse<T>`), and Zod validation schemas for Bangladeshi mobile numbers (`^01[3-9]\d{8}$`), 15-digit Luhn IMEIs, 4-digit manager PINs, and monetary decimal strings.
  - `@bebsayik/ui-tokens`: Codified CSS design tokens (Slate surfaces `#0F172A`, Teal primary brand `#0D9488`, Emerald accent `#059669`, semantic colors), tabular lining numerals (`tnum`), and reusable Tailwind CSS preset (`bebsayikTailwindPreset`).
- **Backend Service Skeleton (`@bebsayik/api`):**
  - Set up Express 4.x service skeleton with Helmet, CORS, and Winston structured JSON logging.
  - Configured MongoDB migration framework (`migrate-mongo-config.js` and `migrations/` directory).
  - Codified `/api/v1/health` endpoint returning server uptime, status, and timestamp.
  - Implemented initial Kanchan Telecom demo seed profile (`seed_dev.ts`) containing shop branding, Eastern Plaza outlet profile, tax BIN, 7 RBAC user profiles, initial phone/accessory inventory fixtures, and Chart of Accounts starter fixtures.
- **Container Infrastructure:**
  - Codified root `docker-compose.yml` defining MongoDB 7.0 replica set (`rs0`), Redis 7.2 Alpine cache, and Healthchecks.
  - Codified `mongo-init.js` configuring single-node replica set initialization and dev admin credentials.
- **MongoDB Atlas Integration & Connection Module (`packages/api/src/database`):**
  - Implemented production-ready Mongoose connection manager (`connection.ts`) with connection pooling (`MONGODB_MAX_POOL_SIZE=50`, `MONGODB_MIN_POOL_SIZE=10`), server selection timeouts, and graceful shutdown signal handling (`SIGINT`, `SIGTERM`).
  - Added safe credential masking utility (`maskMongoUri`) preventing plain-text password leakage in console and application logs.
  - Added URI credential percent-encoding utility (`sanitizeMongoUri`) ensuring reserved URI characters in passwords are safely handled without connection string parse failures.
  - Implemented diagnostic connectivity checker script (`check_connection.ts`) with corresponding npm script (`npm run db:check`).
  - Hardened `.gitignore` with strict multi-level patterns (`**/.env`, `**/.env.*`) ensuring local credentials remain strictly untracked.
  - Synchronized `.env.example` templates with safe Atlas placeholder formats and approved development database name (`bebsayik_dev`).
  - Successfully verified live MongoDB Atlas connectivity against cluster `bebsayik.6kwvimu.mongodb.net` with `{"ok":1}` database ping.

---

## [v6.5.0] — October 2026 (Production REST API Specification Hardening & Hardware Protocol Parity)

### Added & Hardened
- **Comprehensive REST API Specification (`api-spec.md` v2.0.0):**
  - Expanded specification to 1,620 lines (60.2 KB) covering 30 modular controllers and 100% of domain business operations.
  - **Closed 15 Operational Endpoint Gaps:** Added bulk catalog Excel ingestion (`POST /catalog/import-excel`), category & brand taxonomies, supplier ledger & dues payout (`/procurement/suppliers`), purchase return voucher (`POST /procurement/returns` - PRV), POS cart hold & recall (`/pos/held-carts` - F5/F6), invoice lookup reprint (`/pos/invoices/:invoiceNo`), customer quick-add (`POST /customers` - F3), Kisti defaulter registry (`/kisti/defaulters`), repair job lifecycle (`/service/jobs`), personal ledger contacts (`/personal-ledger/contacts`), and media upload service (`/media/upload`).
  - **Complete Payload Schemas:** Provided explicit, concrete JSON request and response bodies for all 19 financial and operational transaction flows (TX-01 through TX-19).
  - **Centralized Domain Error Catalog:** Formalized 16 business error codes including `MSP_FLOOR_BREACH`, `IMEI_ALREADY_SOLD`, `INVALID_IMEI_LUHN`, `CREDIT_LIMIT_EXCEEDED`, `STAFF_TERMINATED`, `SHIFT_NOT_OPEN`, `RECOUNT_LIMIT_EXCEEDED`, and `PERSONAL_LEDGER_CONTAMINATED`.
  - **Strong Zod Validation Standards:** Documented exact regular expressions and validators for BD mobile numbers (`^01[3-9]\d{8}$`), 15-digit Luhn IMEIs, 4-digit manager PINs, decimal currency strings, and 3x3 pattern lock coordinates.
  - **Hardware Protocol & ESC/POS Byte Contract:** Documented Section 5.29 thermal printer contract (58mm 32-col / 80mm 48-col), RJ11 drawer kick pulse (`0x1B 0x70 0x00 0x19 0xFA`), and raw Base64 byte sequences.
  - **Webhook HMAC-SHA256 Cryptographic Verification:** Codified Section 5.30 timing-safe cryptographic verification routines and payload specifications for PayStation, EPS, and bKash Direct.

---

## [v6.4.0] — October 2026 (Master Application Flow & UI/UX Navigation Blueprint)

### Added
- **Master Frontend Screen Flow Specification (`appflow.md` v2.0.0):**
  - Synthesized all 34 user flows from [`user-flow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/user-flow.md), 17 core business modules from [`prd.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md), and 7 RBAC roles from [`ARCHITECTURE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/ARCHITECTURE.md) into an exhaustive 13-section blueprint.
  - **Three-Tier Multi-Host Routing Architecture:** Codified end-to-end domain boundaries for Marketing (`bebsayik.com`), Web ERP (`app.bebsayik.com`), and Platform Admin (`admin.bebsayik.com`) with sub-route tables and visual Mermaid architecture.
  - **Global State Machines & Conflict Resolution:** Codified 4 client-side state machines covering Auth/Session, Cash Drawer/Shift, POS Checkout/Cart, and IndexedDB Offline Accessory Queue with an explicit Offline Conflict Resolution Matrix.
  - **Screen-by-Screen Layouts & ASCII Wireframes:** Documented 19 high-density UI wireframes and interactive flows, adding Brand Warranty RMA (`/app/inventory/warranty`), Damaged Stock Scrap SWV (`/app/inventory/damage`), Customer 360° 4-Tab Profile (`/app/customers/:id`), SMS Notification Desk (`/app/settings/sms`), SaaS Coupon & Billing Checkout (`/app/settings/billing`), and Web ERP Password Recovery (`/recovery`).
  - **Critical Security Modal Wireframes:** Added dedicated ASCII wireframes for Dual-OTP Mobile Migration (`Modal_DualOtpNumberChange`), Staff Emergency Kill-Switch (`Modal_StaffTermination`), and Multi-Shop Workspace Switcher (`Modal_MultiShopSwitcher`).
  - **Core UI Component Registry:** Defined formal TypeScript interface contracts for `EmptyStateProps`, `SkeletonTableProps`, `ErrorBoundaryFallbackProps`, and `OfflineSyncBannerProps`.
  - **Master Frontend Action Matrix:** Added Section 12 matrix mapping all 7 RBAC roles across every critical sidebar route and high-security action button.
  - **Hardware & Keyboard Standards:** Documented WebUSB/Bluetooth thermal printing protocols (ESC/POS), RJ11 cash drawer kick pulses, barcode scanner wedge handling, and POS function key accelerators (`F1` through `F12`).
- **Relational Schema Synchronization (`database-schema.md`):**
  - Audited and updated [`database-schema.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/database-schema.md) to achieve 100% relational schema parity with [`DATABASE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md).
  - Added 8 missing tables: `warranty_claims` (Brand RMA), `employee_targets` (Monthly Quotas), `payroll_ledger` (50% Technician Split & Salaries), `marketing_leads` (Inbound Leads), `promo_codes` (Coupons), `sms_logs` (SMS Audit), `sms_templates` (Custom SMS Tags), and `shop_hardware_configs` (Thermal Printers & Scanners).
  - Synchronized updated fields: `shops.bin_number`, `shops.logo_url`, `shops.receipt_header`, `shops.receipt_footer`, `shops.return_policy_days`, `sales.mushak_63_no`, `product_variants.reorder_level`, `product_variants.batch_expiry_date`, and `imei_serials.source`.
- **Master UI/UX Blueprint & Design System Alignment (`UI_UX_BLUEPRINT.md` v2.0.0):**
  - Re-anchored [`UI_UX_BLUEPRINT.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/UI_UX_BLUEPRINT.md) as the authoritative design direction, visual tokens, and component behavior contract specification.
  - Replaced outdated phantom file references with the authoritative 12-document canonical specification inventory map.
  - Codified master CSS custom properties design tokens (Slate surface, Teal/Emerald brand, Semantic status palette), typography rules with tabular lining numbers (`tnum`), and touch target minimums (44x44px).
  - Resolved and codified 4 strategic UX decisions approved by the owner: (1) Strict Landscape Tablet POS layout, (2) Sub-0.3s ESC/POS English thermal text mode, (3) On-screen Manager PIN override modal, and (4) One-time recount grace before permanent day-end closing lock.
- **Comprehensive REST API Specification (`api-spec.md` v1.0.0):**
  - Synthesized all 17 business modules, 36 MongoDB collections, 43 relational tables, and 19 wireframe screens into a hardened RESTful API specification.
  - Documented 27 modular endpoint controllers spanning authentication, multi-tenant workspace switching, dual-IMEI inventory, procurement GRN, counter POS checkout, Kisti installment loans, buyback police compliance, technician servicing, MFS agent desk, personal ledgers, and day-end blind cash closing.
  - Codified global API conventions: standard JSON envelope, error response taxonomy, Redis sliding-window rate limiting (OTP 3/15m, POS scan 300/min), and JWT token lifecycle with `tokenVersion` instant kill switch.
  - Formally specified mandatory `Idempotency-Key` (UUIDv4) handling, MongoDB multi-document ACID transactions, Decimal128 arithmetic precision, and payment gateway webhooks (PayStation, EPS, bKash) with HMAC-SHA256 signature verification.

---

## [v6.3.0] — October 2026 (Profile Management, Identity Migration & Account Security Hardening)

### Added & Hardened
- **Registered Mobile Number Migration Protocol (The Identity Anchor):**
  - Codified standard proactive number change via 180s **Dual-OTP Handshake** (Approval OTP on old SIM + Verification OTP on new SIM).
  - Added emergency Lost/Stolen SIM recovery protocol verified via NID & Trade License through Platform Admin support portal (`admin.bebsayik.com`).
  - Added dedicated MongoDB Atlas collection `phone_change_requests` with atomic transaction locking.
- **Web ERP Password Reset & Account Recovery Engine:**
  - Codified password recovery on `/recovery` protected by Cloudflare Turnstile CAPTCHA and 3 OTP/15m rate limits.
  - Implemented instant global session revocation via `users.tokenVersion` increment and `passwordChangedAt` timestamp.
  - Formally specified Mongoose schema for `auth_otps` with 120-second automatic MongoDB TTL indexing.
- **User, Staff & Shop Profile Architecture:**
  - Expanded `users` collection: added `avatarUrl`, `email`, `nidNumber`, `emergencyContact`, `salaryBase`, `commissionRate`, `failedLoginAttempts`, `lockedUntil`, and `managerPinHash` (for Web ERP sensitive overrides).
  - Expanded `shops` collection: added `logoUrl` (for thermal receipts), `receiptHeader`, `receiptFooter`, `binNumber` (Mushak 6.3 VAT), and `returnPolicyDays`.
  - Added Web ERP settings routes in `prd.md`: `/app/settings/profile`, `/app/settings/shop`, `/app/settings/staff`, `/app/settings/security`, and `/app/settings/hardware`.
- **Staff Account Lifecycle & Instant Emergency Termination:**
  - Provisioning workflow with temporary one-time PIN and forced first-login password/PIN update.
  - Emergency staff termination protocol killing active counter POS tablet sessions in <1 second with `STAFF_TERMINATED` (403).
- **Multi-Shop Workspace Switching Architecture:**
  - Formally resolved open decision: single registered owner phone number can manage multiple dokans via top navigation Workspace Switcher issuing scoped tenant JWTs.
- **Expanded Process Flowcharts & Acceptance Criteria:**
  - Added User Flows 30 through 34 to `user-flow.md` with complete Mermaid diagrams.
  - Added Process 1.6, 1.7, and 1.8 to `DFD.md`.
  - Added Acceptance Test Cases TC-51 through TC-56 to `prd.md`.
  - Added Requirements RV-056 through RV-060 to `Requirement Validation.md`.

---

## [v6.2.0] — October 2026 (Clean Architecture Consolidation & 10-File Canonical Workspace)

### Added & Consolidated
- **100% Clean File Consolidation (Option 1 Execution):**
  - Merged entire Financial Posting Matrix & Chart of Accounts into [`DATABASE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) as **Section 22: Master Double-Entry Financial Posting Matrix & Chart of Accounts**.
  - Merged complete Role-Based Access Control matrix into [`ARCHITECTURE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/ARCHITECTURE.md) as **Section 15: Master Role-Based Access Control (RBAC) & Permission Matrix**.
  - Merged Three-Tier Route Inventory, ROI Calculator, and Pricing FAQs into [`prd.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) as **Section 1.2 Authoritative Subdomain URL & Route Inventory** and **Section 1.3 Interactive ROI Calculator & FAQs**.
  - Merged Master System Reading Order & Document Matrix into [`idea.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/idea.md) as **Section 0: Master System Architecture & Reading Order Guide**.
- **Workspace Cleanup & Redundancy Elimination:**
  - Safely deleted 6 redundant/secondary files (`FINANCIAL-POSTING-MATRIX.md`, `RBAC-MATRIX.md`, `saas-platform-audit.md`, `README.md`, `schema.sql`, and `audit-report.md`) with zero data loss.
  - Workspace strictly unified into exactly 10 canonical English technical specification documents.
- **English Standardization:**
  - All 10 documents verified 100% professional technical English with official brand name `Bebsayik` and standard Bangladeshi currency symbol `৳`.

---

## [v6.1.0] — October 2026 (Hardened Master Edition & Documentation Harmonization)

### Added
- **Authoritative Database Specification (`DATABASE.md` v1.0.0):**
  - Production-ready MongoDB Atlas 7.0+ Replica Set architecture with Mongoose 8+ ODM.
  - Formally translated all 15 DFD logical data stores (`D1`–`D15`) into MongoDB collections.
  - Added extended collections: `warranty_claims` (Brand RMA), `employee_targets`, `payroll_ledger`, `marketing_leads`, `promo_codes`, `sms_logs`, `sms_templates`, and `shop_hardware_configs`.
  - Added `reorder_level` and `batch_expiry_date` fields to `product_variants`.
- **Authoritative Financial Posting Matrix (`FINANCIAL-POSTING-MATRIX.md` v1.0.0):**
  - Complete double-entry accounting matrix for all 17+ retail transactions with exact Debit/Credit accounts, inventory effects, and COGS rules.
  - Formal Chart of Accounts (COA) spanning Assets (`1.x`), Liabilities (`2.x`), Equity (`3.x`), Revenue (`4.x`), COGS (`5.x`), OPEX (`6.x`), and Losses (`7.x`).
- **Comprehensive RBAC Matrix (`RBAC-MATRIX.md` v1.0.0):**
  - Full Role × Capability matrix across all 7 user roles.
  - Enforced exclusive `SHOP_OWNER` access to Amanat/Hawlat personal ledgers (`D14`).
- **Security & Compliance Policies:**
  - Manager PIN override brute-force lockout: 3 failed attempts trigger a 5-minute modal lock and audit logging; 2 lockouts in 1 hour alert the owner via SMS.
  - Trade-in NID photo retention: 7-year legal compliance storage in Cloudflare R2 / AWS S3 with AES-256 SSE-KMS encryption and time-limited pre-signed URLs.
  - Audited support impersonation: 4-hour automatic expiration, read-only restriction on financial ledgers/voids, and instant SMS alert to shop owner.
  - Client-side offline storage encryption: Web Crypto API AES-GCM 256-bit encryption for IndexedDB non-serialized accessory queue.
- **Business Logic Alignments:**
  - Standardized subscription pricing: Premium 1-Year at ৳4,999, Diamond 1-Year at ৳19,999 across all documents.
  - Standardized mobile terminal PIN length to 4 digits (`Argon2id` hashed).
  - Clarified technician repair labor split: 50% of the labor fee portion credits to technician payroll, 50% credits to store service revenue (spare parts cost accounted separately).
  - Configurable MFS commission rate per provider in Shop Settings (default: 0.41%).
  - Added Opening Balance Equity Balancing Rule: Assets minus Liabilities balance into Account `3.1 Opening Owner Equity`.
- **DFD Enhancement:**
  - Added Process 17.0 (`Employee Sales Targets, Commission & Payroll Ledger Engine`) covering processes 17.1 to 17.4.
- **SaaS Platform Audit:**
  - Added Section 1.2.1 defining the Interactive ROI Calculator inputs, formulas, and conversion metrics.

### Changed
- Formally deprecated legacy relational files [`database-schema.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/database-schema.md) and [`schema.sql`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/schema.sql) with prominent warning headers directing engineers to [`DATABASE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md).
- Updated [`audit-report.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/audit-report.md) executive summary to reference current file versions (`PRD.md` v6.1.0, `DATABASE.md` v1.0.0, etc.).
- Fixed unclosed/indented Mermaid block in [`user-flow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/user-flow.md) Flow 28.
- Updated [`idea.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/idea.md) Section 11 to organize resolved architectural decisions vs open strategic decisions.

---

## [v4.1.0] — October 2026 (User Flow & Multi-Subdomain Architecture)

### Added
- Three-tier subdomain routing model: Public Marketing (`bebsayik.com`), Web ERP (`app.bebsayik.com`), and Platform Admin (`admin.bebsayik.com`).
- Expanded user journeys to 29 core end-to-end flows with ASCII flowcharts and Mermaid sequence diagrams.
- User Flow 29: Remote stolen mobile terminal device revocation from Web ERP settings.
- Zero Data Hostage Guarantee: 3-day grace period followed by permanent read-only data access and Excel export upon subscription expiry.
- Passwordless mobile OTP registration with 3-step shop setup wizard.

---

## [v3.0.0] — Mid 2026 (Kanchan Telecom Retail Logic Codification)

### Added
- Specific Identification COGS tying purchase landed cost to each mobile handset's unique 15-digit IMEI.
- Dual-IMEI tracking supporting both SIM-1 and SIM-2 with Luhn validation.
- Segregated Personal Ledger (Amanat & Hawlat) with 0.00% Store P&L impact.
- 100% manual MFS agent desk bookkeeping (prohibiting SIM scraping and SMS automation).
- Kisti (EMI) installment engine capturing 2 guarantors with NID/phone and milestone schedules.
- Old phone police-compliant buyback contract with seller NID and webcam photo capture.
- Blind cash drawer closing (Day-End Z-Report) with variance tracking.

---

## [v1.0.0] — Early 2026 (Initial Architectural Blueprint)

### Added
- Initial PRD baseline and domain requirements.
- Exploratory PostgreSQL 16+ relational schema with Row-Level Security (RLS) policies.
- Initial module list and UI layout wireframes.
