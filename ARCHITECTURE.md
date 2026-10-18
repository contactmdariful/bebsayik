# Bebsayik.com — Multi-tenant SaaS ERP Platform Blueprint
**System Name:** Bebsayik.com — Multi-tenant SaaS ERP Platform  
**Official Product Name:** Bebsayik  
**English Product Name:** Bebsayik.com  
**Brand:** Bebsayik  
**Brand Attribution:** Powered by Bebsayik  
**Official Website:** `https://bebsayik.com` (Intended canonical URL; pending domain verification)  
**Legacy Business Context:** The initial ERP requirements and workflows originated from the Kanchan Telecom retail operation. The SaaS product is independently branded and operated as Bebsayik.com.  
**Document File:** `ARCHITECTURE.md`  
**Version:** 1.0.0 (Master Architecture Blueprint)  
**Lead Architect:** Principal Systems Architect & Senior Cloud/Database Specialist  
**Date:** October 2026  
**Associated Baseline Specifications:**
- [`PRD.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) (v6.1.0 Hardened Enterprise SaaS Master)
- [`user-flow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/user-flow.md) (v4.1.0 Master All-in-One Blueprint — 29 Flows & 23 Epics)
- [`Requirement Validation.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/Requirement%20Validation.md) (v1.0.0 Validation Baseline & Gap Matrix)
- [`database-schema.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/database-schema.md) & [`schema.sql`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/schema.sql)
- [`idea.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/idea.md) & [`saas-platform-audit.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/saas-platform-audit.md)

---

## Executive Architecture Summary

The Bebsayik ERP/SaaS platform is an enterprise-grade, high-performance, multi-tenant cloud retail operating system. Unlike generic inventory trackers, it codifies the 17+ mission-critical retail workflows originating from the practical operations of **Kanchan Telecom** (Dual-IMEI specific cost tracking, Kisti installment ledgers, second-hand buybacks with police undertaking deeds, 50% maker labor split servicing, 100% manual MFS agent bookkeeping, and completely isolated Amanat/Hawlat personal ledgers with zero P&L contamination).

This technical blueprint follows a modern **Modular Monolith** architectural pattern. It employs **React + TypeScript + Vite + Tailwind CSS** on the frontend, **Node.js + Express.js + TypeScript REST API** on the backend, and **MongoDB Atlas (Mongoose ODM)** for high-reliability data persistence.

```
                                      ┌─────────────────────────────────┐
                                      │        Cloudflare Edge CDN      │
                                      │     DNS, DDoS, SSL, WAF Cache   │
                                      └────────────────┬────────────────┘
                                                       │
                 ┌─────────────────────────────────────┼─────────────────────────────────────┐
                 ▼                                     ▼                                     ▼
   ┌───────────────────────────┐         ┌───────────────────────────┐         ┌───────────────────────────┐
   │    bebsayik.com           │         │    app.bebsayik.com       │         │    admin.bebsayik.com     │
   │  Public Marketing Website │         │  Tenant Web ERP & Mobile  │         │   Central Platform Admin  │
   │  (Static/SSR Edge CDN)    │         │  (React 18+ / Vite / PWA) │         │    (Vite / React SPA)     │
   └─────────────┬─────────────┘         └─────────────┬─────────────┘         └─────────────┬─────────────┘
                 │                                     │                                     │
                 │ JSON API Requests                   │ REST API with JWT Bearer            │ Super-Admin JWT
                 └─────────────────────────────────┐   │   (Tenant Context in Header)        │   (RBAC Scope)
                                                   ▼   ▼                                     ▼
                                       ┌───────────────────────────────────────────────────────────┐
                                       │        Node.js / Express.js Modular Monolith API          │
                                       │    (TypeScript, Zod Validation, Winston Logging)          │
                                       │                                                           │
                                       │ ┌───────────────────────────────────────────────────────┐ │
                                       │ │       Multi-Tenant Middleware & Context Guard         │ │
                                       │ │  req.tenant = { shopId, userRole, permissions }       │ │
                                       │ └───────────────────────────────────────────────────────┘ │
                                       └─────────────────────────────┬─────────────────────────────┘
                                                                     │
                         ┌───────────────────────────────────────────┼───────────────────────────────────────────┐
                         ▼                                           ▼                                           ▼
          ┌─────────────────────────────┐             ┌─────────────────────────────┐             ┌─────────────────────────────┐
          │   MongoDB Atlas Cluster     │             │    Cloudflare R2 / AWS S3   │             │   External Integrations     │
          │  (v7.0+ Replica Set / ACID) │             │  Private Encrypted Storage  │             │ - SMS: SSL Wireless / Green │
          │  - Mongoose ODM Models      │             │  - Customer Photos, NIDs    │             │ - Payments: PayStation, EPS │
          │  - Tenant shopId Filter     │             │  - Police Undertaking PDFs  │             │   bKash Direct API          │
          │  - Decimal128 Money Fields  │             │  - Signed Pre-Signed URLs   │             │ - Background Polling Cron   │
          └─────────────────────────────┘             └─────────────────────────────┘             └─────────────────────────────┘
```

---

## 1. Technology Stack

### 1.1 Frontend Stack
| Component | Technology | Role & Architectural Justification |
|---|---|---|
| **Core Framework** | React 18+ (TypeScript) | Component-driven UI, strict compile-time type safety, and optimized re-rendering. |
| **Build Tool** | Vite | Sub-second Hot Module Replacement (HMR) and optimized production bundle compilation. |
| **Styling Engine** | Tailwind CSS | Utility-first CSS, cohesive design tokens, and zero runtime performance overhead. |
| **UI Components** | shadcn/ui + Radix UI | Accessible, unstyled primitives (Dialogs, Popovers, Dropdowns, Sheets). |
| **Client Routing** | React Router v6 | Subdomain routing, protected route guards, layout wrappers, and lazy code-splitting. |
| **Server State** | TanStack Query v5 | Automatic background refetching, query caching, optimistic mutations, and debouncing. |
| **Forms & Validation**| React Hook Form + Zod | Uncontrolled performant forms, zero re-render lag, and declarative schema validation. |
| **Client State** | Zustand | Transient POS cart buffers, active keyboard shortcut modes, and modal states. |
| **Offline Engine** | PWA (Workbox / IndexedDB) | Service worker caching and offline queuing for non-serialized accessories during internet outages. |

### 1.2 Backend Stack
| Component | Technology | Role & Architectural Justification |
|---|---|---|
| **Runtime & Language**| Node.js 20+ LTS (TypeScript)| Non-blocking asynchronous I/O and end-to-end type sharing across stack layers. |
| **HTTP Framework** | Express.js | Mature, predictable middleware pipeline with battle-tested ecosystem stability. |
| **Validation Engine**| Zod | Strict runtime validation for request bodies, query params, and environment variables. |
| **Error Handling** | Centralized AppError Class | Unified error schema (RFC 7807 Problem Details) with zero internal stack trace leakage. |
| **Structured Logger**| Winston + Morgan | Leveled JSON logging (Debug, Info, Warn, Error) with correlation ID request tracing. |

### 1.3 Database & Storage Stack
| Component | Technology | Role & Architectural Justification |
|---|---|---|
| **Primary Database** | MongoDB Atlas (v7.0+ Replica Set)| Document-based horizontal scaling, flexible variant attributes, and multi-document ACID transactions. |
| **Object Data Mapper**| Mongoose 8+ ODM | Schema enforcement, pre/post middleware hooks, tenant indexing, and virtual getters. |
| **Financial Money Type**| `Decimal128` | IEEE 754-2008 128-bit decimal representation preventing all floating-point rounding errors. |
| **File Object Storage**| Cloudflare R2 / AWS S3 | Encrypted storage for trade-in customer photos, NID scans, and police undertaking PDFs via pre-signed URLs. |

### 1.4 Authentication & Security Stack
- **Passwordless Mobile OTP:** 6-digit cryptographic OTP, 120-second TTL, 60-second request cooldown.
- **Mobile PIN Encryption:** Memory-hard `Argon2id` algorithm resistant to GPU-accelerated brute-force attacks.
- **Hardware Device Binding:** Cryptographic session key stored in Android Keystore / iOS Keychain bound to unique `deviceInstanceId`.
- **Web Token Model:** Short-lived JWT Access Token (15 minutes) + HttpOnly, SameSite=Lax, Secure Refresh Token (30 days).
- **Tenant Context Guard:** Server-side verified `shopId` middleware enforcement on every authenticated API endpoint.

---

## 2. Layered Architecture (Clean Architecture / Modular Monolith)

The system enforces a **Clean Layered Architecture** adhering to the Dependency Inversion Principle, where inner business logic layers remain completely decoupled from outer transport mechanisms:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     1. Presentation / API Layer                                  │
│  - Express Route Handlers (pos.routes.ts, auth.routes.ts)                       │
│  - Controllers (pos.controller.ts)                                              │
│  - Request DTO Validation via Zod (pos.validators.ts)                           │
│  - Middlewares: authenticate, requireShopContext, requireCapability, rateLimit  │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ Calls Use-Cases / Services
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     2. Application / Service Layer                              │
│  - Business Use-Cases (CheckoutSaleUseCase, CollectKistiInstallmentService)     │
│  - ACID Transaction Orchestration (mongoSession.withTransaction)                │
│  - Subscription Plan Enforcement (SubscriptionGateService)                      │
│  - Cross-Module Orchestration (Inventory -> Sales -> Ledgers)                   │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ Enforces Domain Rules
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     3. Domain / Business Logic Layer                            │
│  - Pure Domain Entities & Calculations (ChangeArithmetic, SpecificIdCOGS)       │
│  - Business Rules: MinSellingPriceLock, NegativeBalanceGuard, LuhnIMEICheck     │
│  - Isolated Amanat Personal Ledger Logic (Zero P&L Contamination Rule)          │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ Queries / Persists Data
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     4. Data Access Layer (Mongoose)                             │
│  - Mongoose Models & Schemas (SaleModel, ImeiModel, AccountLedgerModel)         │
│  - Tenant Plugins (Pre-find auto injection of { shopId: context.shopId })       │
│  - Query Projections, Aggregation Pipelines & Compound Indexes                  │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ Uses External Providers
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     5. Infrastructure Layer                                     │
│  - MongoDB Atlas Connection Pool & Session Manager                              │
│  - Payment Gateway Adapters (PayStationAdapter, EpsAdapter, BkashAdapter)       │
│  - SMS Gateways (SslWirelessProvider, BulkSmsProvider)                          │
│  - Object Storage (S3 / Cloudflare R2 Client)                                   │
│  - Background Scheduler & BullMQ / Agenda Reconciler Jobs                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Rationale: Why Modular Monolith? (Microservices vs. Modular Monolith)
1. **Transactional Integrity across Retail Operations:** POS checkouts require atomic commits across multiple collections simultaneously: sale invoice generation, IMEI status mutation (`AVAILABLE` -> `SOLD`), cash drawer ledger increment, and technician labor commission allocation. Distributed transactions across microservices (Saga/2PC) introduce unacceptable latency and failure complexity.
2. **Sub-Second POS Latency (<250ms Requirement):** In-memory function execution within a modular monolith eliminates inter-service network hops, ensuring instant scanner response.
3. **Clean Module Boundaries:** Domain modules are strictly organized into encapsulated directories with explicit interface contracts, preserving the option to extract microservices if hyper-scale demands arise.

---

## 3. Frontend Architecture (React + Vite + Feature-Based)

### 3.1 Directory Structure
```
client/
├── src/
│   ├── app/                      # Global app initialization (QueryClient, Providers, Router)
│   ├── assets/                   # Logos, static icons, audio assets (barcode scan chimes)
│   ├── components/               # Shared global UI (shadcn/ui primitives, Modals, Tables)
│   ├── config/                   # Client configuration, API base endpoints, environment tokens
│   ├── hooks/                    # Shared hooks (useDebounce, useThermalPrinter, useKeyboardShortcuts)
│   ├── layouts/                  # Layout frameworks
│   │   ├── MarketingLayout.tsx   # For bebsayik.com public landing pages
│   │   ├── DashboardLayout.tsx   # For app.bebsayik.com (Collapsible Sidebar, Topbar)
│   │   ├── PosLayout.tsx         # Fullscreen ultra-fast terminal mode
│   │   └── AdminLayout.tsx       # admin.bebsayik.com Platform Command Center
│   ├── lib/                      # HTTP client (axios/ky), BDT currency formatters, utility functions
│   ├── modules/                  # Feature-based domain modules
│   │   ├── marketing/            # Landing page, feature highlights, pricing table, FAQs
│   │   ├── auth/                 # OTP authentication, password setup, PIN keypad, recovery
│   │   ├── onboarding/           # 3-step shop setup wizard (Profile, Outlets, Starting Float)
│   │   ├── pos/                  # Keyboard shortcuts (F1-F12), cart buffer, change arithmetic
│   │   ├── inventory/            # Dual-IMEI manager, products, variants, stock movement ledgers
│   │   ├── procurement/          # Purchase Orders, Partial GRNs, supplier ledgers, PRVs
│   │   ├── customers/            # Customer directories, receivables ledger, money receipts
│   │   ├── kisti/                # Installment schedules, dual guarantors, overdue alerts
│   │   ├── buyback/              # Second-hand trade-in, camera NID capture, legal contract printing
│   │   ├── service/              # Technician job sheets, 3x3 pattern locks, 50% labor split
│   │   ├── accounts/             # Cash drawers, bank ledgers, expenses, day-end Z-reports
│   │   ├── mfs/                  # 100% manual bKash/Nagad agent desk, float counters
│   │   ├── personal-ledger/      # Isolated Amanat/Hawlat ledger (including "Expense on Behalf")
│   │   ├── subscription/         # Billing dashboard, plan upgrades, PayStation/bKash checkout
│   │   └── platform-admin/       # Shop directory, non-destructive suspension, price snapshots
│   ├── stores/                   # Zustand global stores (authStore, cartStore, settingsStore)
│   └── types/                    # Shared TypeScript interfaces and inferred Zod types
```

### 3.2 Subdomain Routing & Access Boundaries
- **Host Detection Routing:** The root router inspects `window.location.hostname` to mount the corresponding application environment:
  - `bebsayik.com` → Mounts `MarketingLayout` and public conversion funnels.
  - `app.bebsayik.com` → Mounts the Shop ERP application (Guarded by shop session tokens).
  - `admin.bebsayik.com` → Mounts the Central Platform Admin Portal (Guarded by Platform Super Admin RBAC).

---

## 4. Backend Module Architecture (Express.js Modular API)

### 4.1 Directory Structure
```
server/
├── src/
│   ├── config/                   # Environment variables, database connection options, gateway keys
│   ├── core/                     # Core architectural components
│   │   ├── errors/               # AppError, BadRequestError, UnauthorizedError, TenantMismatchError
│   │   ├── middlewares/          # authGuard, tenantGuard, roleGuard, rateLimiter, errorHandler
│   │   └── utils/                # Winston logger, Decimal128 math helpers, crypto utilities
│   ├── database/                 # MongoDB Atlas connection manager and transaction orchestration
│   ├── integrations/             # External third-party service adapters
│   │   ├── sms/                  # SslWirelessAdapter, BulkSmsBdAdapter, FakeSmsAdapter (Dev)
│   │   ├── payments/             # PayStationAdapter, EpsAdapter, BkashAdapter, PaymentFactory
│   │   └── storage/              # S3StorageAdapter, CloudflareR2Adapter
│   ├── modules/                  # Domain-driven Express modules
│   │   ├── auth/                 # controllers, services, models, validators, routes
│   │   ├── tenant/               # Shop creation, settings, outlets, suspension handlers
│   │   ├── users/                # Staff profiles, role assignments, PIN & password hashing
│   │   ├── products/             # Product catalog, categories, brands, variant barcodes
│   │   ├── imei/                 # Dual-IMEI lifecycle, specific purchase cost snapshots, search
│   │   ├── inventory/            # Stock movements, ledger adjustments, damage & scrap
│   │   ├── procurement/          # Suppliers, POs, Partial GRNs, Purchase Returns (PRV)
│   │   ├── pos/                  # POS sales creation, split payments, change calculation, reprints
│   │   ├── customers/            # Customer directories, dues ledgers, collection receipts
│   │   ├── kisti/                # Installment contracts, 2 guarantor profiles, collection schedules
│   │   ├── buyback/              # Trade-in intake, NID verification, police compliance contracts
│   │   ├── repair/               # Service tickets, 50% maker commission splits, spare parts
│   │   ├── warranty/             # Brand warranty (RMA), distributor claim tracking
│   │   ├── payroll/              # Sales commission targets, performance bonuses, staff payroll
│   │   ├── accounts/             # Cash drawers, bank ledgers, operating expenses, cash transfers
│   │   ├── mfs/                  # 100% manual MFS bookkeeping, agent float vs cash counter
│   │   ├── personal-ledger/      # Amanat/Hawlat contacts, non-P&L personal transaction records
│   │   ├── reports/              # Sales summaries, profit & loss, day-end Z-reports, cash variance
│   │   ├── subscription/         # Plan versioning, invoices, 3-min polling reconciler
│   │   └── platform-admin/       # Global shop directory, churn analytics, platform audit logs
│   ├── workers/                  # Background schedulers & cron jobs (3-min payment poller)
│   └── app.ts                    # Express application initialization and middleware pipeline
```

---

## 5. MongoDB Atlas Database Architecture

### 5.1 Collection Catalog & Schema Specification

The comprehensive collection design mapping all Kanchan Telecom retail requirements and multi-tenant SaaS operations:

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                  MONGODB ATLAS COLLECTION CATALOG                                 |
+──────────────────────────+─────────────────────────────────────────+──────────────────────────────+
| Collection Name          | Primary Function / Business Role        | Key Relationships & Indexes  |
+──────────────────────────+─────────────────────────────────────────+──────────────────────────────+
| `shops`                  | Primary SaaS Tenant Master              | slug (unique), status, phone |
| `subscription_plans`     | Global Subscription Tiers & Pricing     | slug (unique), version       |
| `subscription_invoices`  | Tenant Subscription Invoices & Snapshot | shopId, gateway_trx_id       |
| `users`                  | Shop Owners & Staff Profiles            | shopId + phone (unique)      |
| `user_devices`           | Mobile App Device-Bound Argon2id PINs   | userId + deviceId (unique)   |
| `auth_otps`              | 6-Digit SMS OTP Verifications (TTL 120s)| phone, expiresAt (TTL Index) |
| `phone_change_requests`  | Dual-OTP Mobile Phone Number Migration  | shopId, userId, status       |
| `products`               | Base Product Master (Has IMEI flag)     | shopId, categoryId, brandId  |
| `product_variants`       | SKU Variants (Color, Storage, Barcode)  | shopId + barcode (unique)    |
| `imei_serials`           | Dual-IMEI Specific Cost Identification  | shopId + imei_1 (unique)     |
| `inventory_movements`    | Immutable Stock Audit Trail (Append-Only| shopId, variantId, createdAt  |
| `suppliers`              | Vendor Master & Payable Balances        | shopId, phone                |
| `purchases`              | Purchase Orders & GRN Receiving Vouchers| shopId + purchaseNo (unique) |
| `customers`              | Customer Profiles & Receivable Dues     | shopId + phone               |
| `sales`                  | POS Sales (Received, Applied, Change)   | shopId + invoiceNo (unique)  |
| `sale_payments`          | Multi-Tender Splits (Cash, MFS Cash Out)| shopId, saleId, accountId    |
| `kisti_accounts`         | Installment Loans (2 Guarantors NID)     | shopId + accountNo (unique)  |
| `kisti_schedules`        | Weekly / Monthly Installment Milestones | kistiAccountId, dueDate      |
| `buyback_devices`        | Police Compliance Buyback Contracts     | shopId + agreementNo (unique)|
| `repair_jobs`            | Technician Job Sheets (50% Labor Split) | shopId + jobNo (unique)      |
| `accounts`               | Cash Drawers, Banks, Agent SIM Floats   | shopId + name (unique)       |
| `account_ledgers`        | Immutable Double-Leg Financial Entries  | shopId, accountId, createdAt |
| `cash_in_out`            | Internal Store Cash Infusion / Withdraw | shopId, accountId, category   |
| `mfs_transactions`       | 100% Manual MFS Bookkeeping Desk        | shopId, provider, createdAt  |
| `personal_ledger_contacts`| Isolated Amanat/Hawlat People (Zero P&L)| shopId + name + phone (uniq) |
| `personal_transactions`  | Personal Hawlat Ledger & Expense Behalf | shopId, contactId, createdAt |
| `daily_closings`         | Evening Day-End Z-Report & Blind Cash   | shopId + closingDate (unique)|
| `platform_audit_logs`    | Super-Admin Operations Audit Trail      | adminId, targetShopId        |
+──────────────────────────+─────────────────────────────────────────+──────────────────────────────+
```

### 5.2 Embedding vs. Referencing Strategy
1. **Invoice Line Items (`sales.items`):**
   - *Strategy:* **Embedded Array**.
   - *Rationale:* Sales line items require an immutable, frozen snapshot of the product name, variant title, unit selling price, and specific unit purchase cost (COGS). Preserving this snapshot directly in the invoice document ensures that subsequent changes to product catalog pricing never corrupt historical financial reporting.
2. **Dual-IMEI Units (`imei_serials`):**
   - *Strategy:* **Referenced Collection**.
   - *Rationale:* Handsets have complex independent lifecycles (`AVAILABLE` -> `SOLD` -> `RETURNED_INSPECTION` -> `IN_REPAIR` -> `SCRAPPED`). Individual units must be referenced across purchase GRNs, sales invoices, warranty RMA tickets, and supplier return vouchers.
3. **Personal Ledgers (`personal_ledger_contacts`):**
   - *Strategy:* **Strictly Isolated Collection**.
   - *Rationale:* Amanat and Hawlat contacts must be physically separated from store customers and suppliers. This structural isolation guarantees that queries aggregating shop revenue, receivables, or owner equity never inadvertently include personal balances.

### 5.3 Financial Accuracy & Monetary Data Type (`Decimal128` Strategy)
Native JavaScript `Number` instances use IEEE 754 double-precision binary floating-point representation, causing rounding artifacts (e.g., `0.1 + 0.2 = 0.30000000000000004`). To maintain audit-grade precision:
- All monetary schema fields are defined using Mongoose `mongoose.Schema.Types.Decimal128`.
- All monetary operations in business services utilize exact decimal arithmetic libraries (`decimal.js` or `bignumber.js`), with results persisted as `Decimal128`.

### 5.4 Multi-Document ACID Transactions
Using MongoDB 4.0+ replica set transaction sessions, POS checkouts, installment collections, and counter transfers execute with atomic guarantees:

```typescript
// Sample Transaction Execution in Service Layer
const session = await mongoose.startSession();
session.startTransaction();
try {
  // 1. Create Sale Record with Decimal128 values
  // 2. Decrement Product Stock and update IMEI status to 'sold'
  // 3. Increment Cash Drawer Account Ledger (amount_received)
  // 4. Decrement Cash Drawer Account Ledger for Change Given (change_returned)
  // 5. If Due exists, increment Customer Receivable Balance
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

---

## 6. Multi-Tenant Shop Architecture (Strict Shop Isolation)

### 6.1 Tenant Boundary Model
The platform eliminates superfluous organizational hierarchies: **The Shop is the Primary and Self-Contained SaaS Tenant Boundary**.

```
Platform Super Admin (Global Platform Oversight)
       │
       ▼
   Subscription (Plan, Limits, Expiry)
       │
       ▼
     Shop (Primary Tenant: shopId)
       ├── Cash Drawers & Ledgers
       ├── Product Catalog & IMEIs
       ├── Customers, Dues & Kisti
       ├── Suppliers & Purchases
       ├── Isolated Personal Ledger
       └── Users / Staff (Role-Based Capabilities)
```

### 6.2 Server-Side Tenant Enforcement Middleware (Tenant Context Guard)
Client-supplied `shopId` route or query parameters are never implicitly trusted. Middleware decodes the authenticated user's cryptographically signed JWT and binds the verified `shopId` into the request context:

```typescript
export const tenantGuard = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user; // Set by authGuard
  if (!user || !user.shopId) {
    return next(new UnauthorizedError('No valid shop tenant session found.'));
  }
  req.tenantId = user.shopId;
  next();
};
```

### 6.3 Mongoose Tenant Plugin (Automated Query Isolation)
Every tenant-scoped Mongoose schema registers a custom plugin that automatically injects `{ shopId: req.tenantId }` into all `find`, `findOne`, `countDocuments`, and `update` queries, rendering cross-tenant data leakage impossible even if a developer omits a manual filter.

---

## 7. Authentication, Device Binding & PIN Security Architecture

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                    AUTHENTICATION FLOW ARCHITECTURE                               |
+───────────────────────────────────+───────────────────────────────────────────────────────────────+
| Platform                          | Security Mechanism & Authentication Boundary                  |
+───────────────────────────────────+───────────────────────────────────────────────────────────────+
| **Mobile App (Android / iOS)**    | 1. Initial Setup: 11-digit mobile number + 6-digit SMS OTP.   |
|                                   | 2. 4-digit PIN setup -> Hashed securely via Argon2id.         |
|                                   | 3. Hardware device ID binding (logged in user_devices).       |
|                                   | 4. Subsequent logins: Biometrics or 4-digit PIN (<500ms).     |
|                                   | 5. 5 consecutive incorrect PIN attempts -> 5-min lockout + SMS|
+───────────────────────────────────+───────────────────────────────────────────────────────────────+
| **Web ERP (Desktop / Laptop)**    | 1. Initial signup and onboarding via SMS OTP.                 |
|                                   | 2. Permanent password setup option (reduces SMS OTP costs).   |
|                                   | 3. Subsequent logins: Mobile + Password or SMS OTP.           |
|                                   | 4. Session: Secure, HttpOnly, SameSite cookies + 15m timeout. |
|                                   | 5. One-click remote device revocation for lost/stolen phones. |
+───────────────────────────────────+───────────────────────────────────────────────────────────────+
```

### 7.1 Remote Stolen Device Revocation Architecture
If an employee's shop phone is lost or stolen, the shop owner can revoke its credentials immediately from the Web ERP settings (`app.bebsayik.com/settings/devices`):
1. The backend atomically flags `user_devices.isActive = false` and records `user_devices.revokedAt = new Date()`.
2. All active refresh tokens bound to that hardware device are immediately invalidated.
3. When the thief opens the application, active sessions are killed and the app reverts to the initial authentication screen.

---

## 8. Payment Gateway Adapter Pattern & Financial Architecture

### 8.1 Payment Gateway Adapter Interface
Because payment providers (PayStation, EPS, bKash) expose differing request shapes and callback formats, the platform normalizes integrations through an adapter interface:

```typescript
export interface IPaymentGatewayAdapter {
  initiatePayment(params: PaymentInitParams): Promise<PaymentInitResult>;
  verifyPayment(trxId: string, payload: any): Promise<PaymentVerificationResult>;
  handleWebhook(rawBody: any, signature: string): Promise<WebhookProcessResult>;
  queryTransactionStatus(gatewayTrxId: string): Promise<GatewayStatusResult>;
}
```

```
                        ┌───────────────────────────────┐
                        │   Subscription Payment Service │
                        └──────────────┬────────────────┘
                                       │ Uses Factory Pattern
                        ┌──────────────▼────────────────┐
                        │    Payment Gateway Factory    │
                        └──────────────┬────────────────┘
                                       │ Resolves Adapter
              ┌─────────────────────────┼─────────────────────────┐
              ▼                         ▼                         ▼
    ┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
    │ PayStationAdapter │     │    EpsAdapter     │     │   BkashAdapter    │
    │ (Aggregator BD)   │     │ (Bank & Internet) │     │ (Direct Merchant) │
    └───────────────────┘     └───────────────────┘     └───────────────────┘
```

### 8.2 3-Minute Background Polling Reconciler
If a merchant completes payment on a gateway checkout screen but closes their browser before redirection, or if a webhook fails to deliver:
1. A background worker queries `subscription_invoices` every 3 minutes for `pending` records created between 3 minutes and 24 hours prior.
2. The poller invokes the adapter's `queryTransactionStatus` API to check real-time settlement status.
3. If confirmed, the subscription tier is unlocked automatically without requiring manual merchant support intervention, and an SMS confirmation is dispatched.

---

## 9. Subscription Architecture & Feature Gating

### 9.1 Tier Matrix & Pricing Model
| Plan Tier | Monthly Fee | 6-Month Fee (10% Off) | 1-Year Fee (16% Off) | Feature Boundaries & Quotas |
|---|:---:|:---:|:---:|---|
| **Free (Lifetime)** | ৳0 | ৳0 | ৳0 | 100 sales/mo, 1 counter, full Excel export, zero data hostage. |
| **Premium (Starter)**| ৳499 | ৳2,695 | ৳4,999 | Unlimited sales, 3 staff, Dual-IMEI tracking, customer dues. |
| **Gold (Best Choice)**| ৳999 | ৳5,395 | ৳9,999 | 5 staff, 2 outlets, Kisti (EMI), repair job sheets, trade-in buybacks. |
| **Diamond (Enterprise)**| ৳1,999| ৳10,795 | ৳19,999| Unlimited staff & godowns, STN transfers, damage & scrap write-offs. |

### 9.2 Zero Data Hostage Guarantee
- When a paid subscription expires, a 3-day **Grace Period** maintains full system access.
- On Day 4, the shop transitions to **Read-Only Mode**.
- **Inviolable Principle:** Collecting past customer dues, reprinting receipts, and exporting business records in Excel/CSV format remains accessible permanently; zero merchant data is ever deleted. Only new sales entries and stock intake are paused.

---

## 10. Validation, Security & Exception Handling

### 10.1 Request Validation Pipeline (Zod DTO Pipeline)
Every API endpoint validates incoming payloads against strict Zod schemas prior to controller execution:
- Bangladeshi Mobile Numbers: `/^01[3-9]\d{8}$/` (Exact 11 digits).
- Dual-IMEI: 15-digit numeric strings validated against the Luhn algorithm.
- Monetary Values: Zero or positive `Decimal128` values (negative amounts strictly rejected).

### 10.2 Centralized Error Handling (RFC 7807 Format)
In production environments, database errors, stack traces, and internal secrets are suppressed; responses follow standard RFC 7807 problem details:
```json
{
  "type": "https://bebsayik.com/errors/insufficient-stock",
  "title": "Insufficient Stock",
  "status": 400,
  "detail": "Selected handset stock is currently 0. Sale cannot be completed.",
  "instance": "/api/v1/pos/checkout",
  "code": "STOCK_DEFICIT"
}
```

### 10.3 Standard RFC 7807 Error Code Registry
The following centralized error codes govern client-server API interactions:

| Error Code | HTTP Status | Domain | Description & Remediation |
|---|:---:|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Auth | Invalid mobile number, password, or device PIN. |
| `AUTH_PIN_LOCKED` | 423 | Auth | Account temporarily locked after 5 failed PIN attempts (5 min cooldown). |
| `AUTH_DEVICE_REVOKED` | 403 | Auth | Hardware terminal binding has been revoked by shop owner. |
| `MANAGER_PIN_LOCKED` | 423 | POS Security | Supervisor override modal locked after 3 incorrect PIN attempts. |
| `STOCK_DEFICIT` | 400 | Inventory | Insufficient available stock to fulfill POS cart item. |
| `IMEI_NOT_FOUND` | 404 | Inventory | 15-digit IMEI not found in shop active inventory. |
| `IMEI_STATUS_INVALID` | 409 | Inventory | Handset IMEI is not in `AVAILABLE` state (e.g. `SOLD`, `RESERVED`). |
| `DUPLICATE_IMEI` | 409 | Inventory | IMEI already registered in this tenant database. |
| `FLOOR_PRICE_BREACH` | 400 | POS Billing | Discounted unit price is strictly below `minSellingPrice` without override. |
| `CREDIT_LIMIT_EXCEEDED` | 400 | POS Billing | Due amount exceeds customer approved credit limit. |
| `DRAWER_DEFICIT` | 400 | Cash/Accounts | Cash drawer has insufficient physical balance for cash-out/expense. |
| `SUBSCRIPTION_READ_ONLY` | 403 | Billing | Shop subscription expired beyond grace period; write operation rejected. |
| `TENANT_ACCESS_DENIED` | 403 | Security | Cross-tenant document access attempt blocked by tenant isolation filter. |
| `IDEMPOTENCY_CONFLICT` | 409 | Transactions | Request with duplicate idempotency key is already committed or processing. |
| `DUAL_OTP_MISMATCH` | 400 | Auth/Migration | Dual-OTP handshake failed; approval and verification codes did not match. |
| `PHONE_ALREADY_REGISTERED` | 409 | Auth/Migration | Target mobile number already belongs to another registered merchant/user. |
| `STAFF_TERMINATED` | 403 | Auth/RBAC | Staff account has been deactivated or terminated by the Shop Owner. |
| `ACCOUNT_LOCKED` | 423 | Auth | Account temporarily locked after 5 consecutive failed password attempts (15m). |

### 10.4 Manager PIN Override Security & Lockout Policy
Sensitive retail overrides—including below-MSP discounting, customer credit limit waivers, scrap write-off voucher (SWV) approvals, and invoice voids—require supervisor authorization:
1. **Modal Trigger:** Cashier interface presents a 4-digit PIN authentication modal.
2. **Brute-Force Guard:** 3 consecutive incorrect PIN entries lock the override modal for 5 minutes.
3. **Audit Trail:** Every attempt (success or failure) emits an immutable entry to `platform_audit_logs`.
4. **Owner Escalation:** If 2 lockout events occur within a 60-minute window, an automated SMS alert is dispatched to the Shop Owner's registered mobile phone.

### 10.5 Trade-In NID Photo Storage, Encryption & Legal Retention
To comply with Bangladesh law regarding second-hand electronics acquisition and police reporting:
1. **Storage Tier:** Customer NID card photos and webcam biometric selfies are stored in private Cloudflare R2 / AWS S3 buckets with server-side encryption (`SSE-KMS` / AES-256).
2. **Access Control:** Images are strictly accessible only via time-limited pre-signed URLs (maximum 15-minute validity) granted exclusively to authenticated `Shop Owner` and `Shop Manager` roles.
3. **Retention Period:** All NID documents, IMEI inspection checklists, and signed legal undertaking PDFs are retained for a minimum of 7 years in immutable compliance storage.
4. **Subscription Preservation:** Documents remain accessible in read-only export mode even if the merchant transitions to the free tier or suspends active billing.

### 10.6 Client-Side Offline Storage Security (IndexedDB Encryption)
1. **Scope:** Only non-serialized accessories are eligible for offline POS queueing. Serialized Dual-IMEI devices strictly require online connectivity.
2. **Cryptographic Protection:** Offline transactions stored in browser IndexedDB are encrypted at rest using the Web Crypto API (`AES-GCM` 256-bit) using an ephemeral encryption key derived during cashier PIN unlock.
3. **Queue Evacuation:** Upon internet restoration, the encrypted queue automatically decrypts in-memory, signs each transaction with the authenticated device token, and flushes to the backend with idempotency headers.

### 10.7 Audited Support Impersonation Protocol
1. **Time-Bound Sessions:** When Bebsayik technical support assists a merchant, support impersonation tokens auto-expire after a strict maximum duration of 4 hours.
2. **Read-Only Financial Boundary:** Support impersonation sessions are strictly prohibited from performing financial write operations, altering historical ledgers, or voiding committed transactions.
3. **Merchant Notification:** Upon session initiation, the Shop Owner receives an instant SMS notification indicating that authorized support has accessed the shop workspace with a mandatory support ticket ID.

### 10.8 SMS Gateway Integration & Failover Architecture
Bebsayik utilizes a dual-provider multi-gateway architecture to guarantee critical OTP delivery, variance alerts, and customer notifications:
1. **Primary Provider:** SSL Wireless (HTTPS REST API / HTTP SMPP) handling 90%+ traffic with high deliverability across Grameenphone, Robi, Banglalink, and Teletalk.
2. **Secondary Failover:** BulkSMS BD / Greenweb activated automatically if primary gateway response latency exceeds 3,500ms or returns an HTTP 5xx error.
3. **Rate Limits & Quota:** OTP requests are restricted to 3 per 10 minutes per mobile number. Daily transactional SMS limits are governed by the merchant's subscription tier.
4. **Message Registry:** All OTP messages, Day-End Z-Report digests, and Kisti collection slips are generated from pre-approved, localized Unicode templates with variable sanitization.

### 10.9 Registered Mobile Number Migration Protocol (Dual-OTP Handshake)
To prevent hostile account takeovers while preserving merchant continuity when phone numbers or SIM cards are updated:
1. **Dual-Challenge Handshake:** When an authenticated merchant initiates a phone change, the system dispatches two simultaneous OTPs:
   - **Approval OTP:** Sent to the active old SIM to verify merchant authorization.
   - **Verification OTP:** Sent to the target new SIM to confirm ownership and connectivity.
2. **Atomic Transition:** Both OTPs must be submitted within 180 seconds. The server updates `users.phone`, sets `shops.phone` (if owner), increments `tokenVersion`, invalidates previous device sessions, and logs an immutable audit event.
3. **Lost SIM Recovery Fallback:** If the old SIM is permanently lost or destroyed, phone migration requires National ID (NID) and trade license verification through the Platform Admin support portal (`admin.bebsayik.com`), logging legal indemnity documentation.

### 10.10 Web ERP Password Reset & Brute-Force Rate Limiting
1. **Turnstile Bot Guard:** All password recovery requests on `/recovery` require a Cloudflare Turnstile token to protect telecom SMS gateways from automated flooding.
2. **Rate Limits:** Maximum 3 OTP recovery dispatches per 15 minutes per IP/phone. Exceeding triggers HTTP 429 Too Many Requests.
3. **Argon2id Hashes & Session Kill:** New passwords enforce minimum 8 characters (uppercase, lowercase, number, symbol) hashed with Argon2id. Setting a new password increments `users.tokenVersion`, invalidating all active JWT tokens and desktop cookies globally.

### 10.11 Emergency Staff Termination & Instant Global Session Kill
1. **Immediate Revocation:** When an owner terminates a staff member, the server atomically updates `users.isActive = false`, marks all associated `user_devices.isRevoked = true`, and increments `users.tokenVersion`.
2. **Token Verification Invariant:** The authentication middleware validates `tokenVersion` against the database on every authenticated request. Active POS counters lock in <1 second upon termination.
3. **Audit Immutability:** Historical sales invoices, cash entries, and repair job sheets permanently retain the terminated employee's user ID for full accounting traceability.

### 10.12 Multi-Shop Workspace Switching Architecture
1. **Unified Identity:** A single registered owner phone number can maintain roles across multiple independent shops.
2. **Scoped Tenant JWTs:** Switching shops issues a short-lived access token scoped to the target `shopId`, hot-swapping client state without requiring re-login. Cross-tenant data leakage is strictly blocked by Mongoose `shopId` query filters.

---

## 11. Background Jobs & Worker Architecture

```
                                  ┌───────────────────────────────┐
                                  │   Agenda / BullMQ Worker      │
                                  │   (Node.js Background Daemon) │
                                  └──────────────┬────────────────┘
                                                 │
          ┌──────────────────────┬───────────────┴───────────────┬──────────────────────┐
          ▼                      ▼                               ▼                      ▼
┌──────────────────┐   ┌──────────────────┐            ┌──────────────────┐   ┌──────────────────┐
│ Payment Poller   │   │ Cloud Backup Job │            │ Trial Expiry Job │   │ Z-Report SMS     │
│ - Every 3 mins   │   │ - Weekly/Daily   │            │ - Daily 12:01 AM │   │ - Triggered on   │
│ - Queries gateway│   │ - JSON/Excel dump│            │ - Transitions to │   │   Register Close │
│   status API     │   │ - Emails owner   │            │   Grace/Read-Only│   │ - Variance alert │
└──────────────────┘   └──────────────────┘            └──────────────────┘   └──────────────────┘
```

---

## 12. Testing Strategy & Quality Assurance Matrix

```
                  ┌───────────────────────────────────────────────┐
                  │          End-to-End Tests (Playwright)        │
                  │   - Visitor to Trial -> POS Sale -> Z-Report  │
                  └───────────────────────┬───────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  │       API Integration Tests (Supertest)       │
                  │  - Express Endpoints + MongoMemoryServer      │
                  │  - Idempotency & Webhook HMAC Verification    │
                  └───────────────────────┬───────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  │      Multi-Tenant Isolation Tests (Mocha)     │
                  │  - Shop A vs Shop B Data Leak Prevention      │
                  └───────────────────────┬───────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  │       Unit Tests (Vitest)                     │
                  │  - Change Arithmetic, Specific Cost COGS,     │
                  │    Technician 50% Split, Luhn Validation      │
                  └───────────────────────────────────────────────┘
```

---

## 13. Deployment, Infrastructure & CI/CD Strategy

### 13.1 Environment Configurations
| Environment | Hosting Platform | Database Cluster | Objective |
|---|---|---|---|
| **Development** | Localhost (Vite: 5173, API: 5000) | MongoDB Local / Docker Replica Set | Rapid local feature development and TDD testing. |
| **Staging** | Vercel (Web) + Railway (API) | MongoDB Atlas (M0 / M10 Dedicated) | PRD verification, QA signoff, and stakeholder demos. |
| **Production** | Cloudflare Edge + AWS ECS (Docker) | MongoDB Atlas (M30+ Multi-AZ Dedicated)| Live merchant traffic delivering 99.9% uptime SLA. |

### 13.2 Secret Management
- Committing API keys, database credentials, or gateway secrets to Git repositories is strictly prohibited.
- Runtime secrets are injected via AWS Secrets Manager, Doppler, or encrypted container environment variables.

---

## 14. Architecture Decision Records (ADRs)

### ADR-01: Modular Monolith vs. Microservices
- **Decision:** **Modular Monolith** selected.
- **Rationale:** Retail operations require transactional atomicity spanning inventory, sales, and accounting. Microservices introduce inter-service latency and distributed transaction overhead (Sagas/2PC) that violates the <250ms sub-second POS checkout requirement.

### ADR-02: MongoDB Atlas + Mongoose vs. Relational Database
- **Decision:** **MongoDB Atlas (v7.0+)** selected as the primary data store.
- **Rationale:** The document model cleanly accommodates heterogeneous variant attributes (storage, RAM, official/unofficial warranty status), second-hand device test checklists, and immutable frozen invoice item snapshots. Replica set multi-document ACID transactions guarantee audit-grade financial integrity.

### ADR-03: Multi-Tenancy Enforcement via Mongoose Middleware
- **Decision:** Logical tenant isolation enforcing `shopId` filtering via custom Mongoose query plugins.
- **Rationale:** Logical multi-tenancy within a unified cluster delivers optimal resource efficiency, simpler backup automation, and predictable indexing compared to maintaining separate databases per tenant.

### ADR-04: Dual-Platform Authentication Model
- **Decision:** Device-bound `Argon2id` PIN + biometrics on mobile devices; password/OTP hybrid on desktop web.
- **Rationale:** Dispatching SMS OTPs on every daily web login generates substantial recurring telecom expenses. Configurable permanent passwords eliminate unnecessary SMS costs on desktop browsers while mobile PINs deliver instant touch-first POS access.

### ADR-05: Strict Prohibition of SIM/SMS Scraping (100% Manual Entry)
- **Decision:** Background SMS reading, notification parsing, and SIM automation are permanently prohibited.
- **Rationale:** Guarantees compliance with Google Play Store SMS permission policies, protects merchant customer privacy, and eliminates exposure to fabricated SMS fraud.

### ADR-06: Financial Arithmetic via `Decimal128`
- **Decision:** All monetary transactions utilize `Decimal128` and exact arithmetic libraries.
- **Rationale:** Eliminates floating-point rounding errors and discrepancy risks during daily drawer closings.

---

## 15. Master Role-Based Access Control (RBAC) & Permission Matrix

*(Integrated from authoritative security specification)*

### 15.1 Platform & Tenant User Roles
1. `PLATFORM_SUPER_ADMIN`: Global SaaS administration (isolated from tenant sales/drawers).
2. `SHOP_OWNER`: Full sovereign control of tenant shop, settings, staff, and exclusive access to Amanat personal ledger.
3. `SHOP_MANAGER`: Operational supervision, inventory adjustments, and 4-digit PIN override authorizations.
4. `CASHIER`: Fast POS checkout, cash drawer operations, due collection, and basic installment receipts.
5. `STOCK_KEEPER`: Procurement receiving (GRN), IMEI tracking, stock transfers (STN), and warehouse labeling.
6. `TECHNICIAN`: Repair intake diagnosis, spare parts requisition, servicing, and 50% maker split earnings.
7. `AUDITOR`: Read-only access to Chart of Accounts, trial balances, P&L, Mushak 6.3, and audit logs.

### 15.2 Master Role × Capability Permission Matrix

*Legend: `ALLOW` (Full permission), `DENY` (Strictly blocked 403), `PIN` (Requires 4-Digit Manager PIN), `READ` (View-only).*

| Functional Capability | Platform Admin | Shop Owner | Shop Manager | Cashier | Stock Keeper | Technician | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Authentication & Users** | | | | | | | |
| Access Public Web ERP (`app.bebsayik.com`) | DENY | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| Access Platform Admin (`admin.bebsayik.com`)| ALLOW | DENY | DENY | DENY | DENY | DENY | DENY |
| Mobile Terminal 4-Digit PIN Login | DENY | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | DENY |
| Revoke Stolen Mobile Terminal Device | DENY | ALLOW | PIN | DENY | DENY | DENY | DENY |
| Manage Staff Accounts & Assign Roles | DENY | ALLOW | READ | DENY | DENY | DENY | DENY |
| **POS Checkout & Sales Billing** | | | | | | | |
| Execute Standard POS Sale | DENY | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY |
| Apply Item/Cart Discount within MSP | DENY | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY |
| Override Below Minimum Selling Price (MSP)| DENY | ALLOW | ALLOW | **PIN** | DENY | DENY | DENY |
| Waive Customer Credit Limit on Due Sale | DENY | ALLOW | ALLOW | **PIN** | DENY | DENY | DENY |
| Manual Cash Drawer Kick (`F12`) | DENY | ALLOW | ALLOW | ALLOW (Audit)| DENY | DENY | DENY |
| Void Committed Sales Invoice | DENY | ALLOW | **PIN** | **PIN** | DENY | DENY | DENY |
| Process Sales Return & Cash Refund | DENY | ALLOW | ALLOW | **PIN** | DENY | DENY | DENY |
| **Catalog & Dual-IMEI Inventory** | | | | | | | |
| View Handset Purchase Landed Cost | DENY | ALLOW | ALLOW | DENY | ALLOW | DENY | READ |
| Create / Edit Products & Variants | DENY | ALLOW | ALLOW | DENY | ALLOW | DENY | DENY |
| Receive Procurement (GRN Entry) | DENY | ALLOW | ALLOW | DENY | ALLOW | DENY | DENY |
| Approve Scrap Write-Off Voucher (SWV) | DENY | ALLOW | **PIN** | DENY | DENY | DENY | DENY |
| Initiate & Receive Stock Transfers (STN)| DENY | ALLOW | ALLOW | DENY | ALLOW | DENY | DENY |
| **Customers, Installments & Buyback**| | | | | | | |
| Create & Search Customer Records | DENY | ALLOW | ALLOW | ALLOW | DENY | DENY | READ |
| Set / Modify Customer Credit Limit | DENY | ALLOW | ALLOW | DENY | DENY | DENY | DENY |
| Collect Monthly Kisti Installment | DENY | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY |
| Process Used Phone Buyback & Undertaking| DENY | ALLOW | ALLOW | ALLOW | DENY | DENY | READ |
| Access Customer NID Photos & Biometrics | DENY | ALLOW | ALLOW | DENY | DENY | DENY | DENY |
| **Mobile Servicing & Repair Lab** | | | | | | | |
| Create Repair Job Sheet & Pattern Lock | DENY | ALLOW | ALLOW | ALLOW | DENY | ALLOW | READ |
| Requisition / Return Spare Parts | DENY | ALLOW | ALLOW | DENY | ALLOW | ALLOW | DENY |
| Complete Repair & Deliver to Customer | DENY | ALLOW | ALLOW | ALLOW | DENY | ALLOW | DENY |
| View Technician 50% Split Commissions | DENY | ALLOW | ALLOW | DENY | DENY | Own Split | READ |
| **MFS Desk & Personal Ledger** | | | | | | | |
| Execute MFS Agent Cash In / Cash Out | DENY | ALLOW | ALLOW | ALLOW | DENY | DENY | READ |
| Perform Evening MFS Float Reconciliation| DENY | ALLOW | ALLOW | ALLOW | DENY | DENY | READ |
| Access Amanat / Hawlat Personal Ledger | DENY | **ALLOW (Sole)**| DENY | DENY | DENY | DENY | DENY |
| Process Personal Expense on Behalf | DENY | **ALLOW (Sole)**| DENY | DENY | DENY | DENY | DENY |
| **Accounts, Expenses & Day-End** | | | | | | | |
| Create Operating Expense (OPEX) Voucher| DENY | ALLOW | ALLOW | DENY | DENY | DENY | DENY |
| Submit Day-End Blind Cash Count | DENY | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY |
| View System Expected Cash & Variance | DENY | ALLOW | ALLOW | DENY | DENY | DENY | READ |
| Disburse Staff Monthly Salary / Bonus | DENY | ALLOW | DENY | DENY | DENY | DENY | DENY |
| **Reporting, Audits & SaaS Admin** | | | | | | | |
| View Profit & Loss (P&L) Statement | DENY | ALLOW | ALLOW | DENY | DENY | DENY | READ |
| View Balance Sheet & Trial Balance | DENY | ALLOW | DENY | DENY | DENY | DENY | READ |
| Export Complete Shop Data (Excel/CSV) | DENY | ALLOW | ALLOW | DENY | DENY | DENY | READ |
| Platform Tenant Suspension & Quotas | ALLOW | DENY | DENY | DENY | DENY | DENY | DENY |

### 15.3 Strict Personal Ledger Isolation (Owner-Only Access)
Only authenticated tokens with `role === 'shop_owner'` can query endpoints under `/api/v1/personal-ledger/*`. The module is entirely hidden from the UI of managers, cashiers, technicians, and accountants to preserve merchant personal privacy and guarantee zero store P&L impact.

---

## 16. Conclusion & Implementation Readiness

This `ARCHITECTURE.md` blueprint establishes the complete technical system design, technology stack, database architecture, security boundaries, and deployment topology for Bebsayik.com (Powered by Bebsayik). It adheres strictly to all business requirements and operational workflows codified in [`PRD.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) v6.1.0, [`DATABASE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) v1.0.0, and [`user-flow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/user-flow.md) v4.1.0.
