// scratch/build_prompt_v2.js
const fs = require('fs');
const path = require('path');

const targetPath = 'c:/Users/conta/OneDrive/Documents/Dokan Management Software/prompt.md';

const content = `# Bebsayik.com — Master Project Execution Roadmap & AI Agent Prompt Catalog (\`prompt.md\`)

**Document File:** \`prompt.md\`  
**System Name:** Bebsayik.com — Multi-tenant SaaS ERP Platform  
**Official Product Name:** Bebsayik  
**English Product Name:** Bebsayik.com  
**Brand:** Bebsayik | **Brand Attribution:** Powered by Bebsayik  
**Canonical Domain:** \`bebsayik.com\` (\`app.bebsayik.com\` | \`admin.bebsayik.com\` | \`api.bebsayik.com\`)  
**Heritage Context:** Initial ERP requirements and retail workflows originated from the retail operations of **Kanchan Telecom**; the SaaS platform is independently branded and operated as Bebsayik.com.  
**Version:** 2.0.0 (Master Production Execution Roadmap & AI Agent Prompt Catalog)  
**Authoritative Role:** This document is the **single source of truth execution plan and prompt directory** for engineering, testing, and deploying the Bebsayik ERP + POS SaaS platform. Future AI coding agents and human engineers must execute work strictly phase-by-phase according to this roadmap and utilize the included copy-pasteable execution prompts without skipping prerequisites or inventing undocumented requirements.

---

## 0. Project Baseline Audit & Documentation Matrix

Before executing any phase, every agent must review this inventory of project documentation.

### 0.1 Canonical Workspace Documentation Inventory:
The workspace contains **13 authoritative specifications**. All requirements, data structures, UI flows, and API contracts must be sourced exclusively from these files:

| # | Document File | Authoritative Role & Content Scope |
|---|---|---|
| 1 | [\`idea.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/idea.md) | **Product Vision & Domain Concepts:** Business foundation, mobile shop domain ontology, terminology, and resolved architectural decisions. |
| 2 | [\`prd.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) | **Hardened PRD (v6.1.0):** 17 core business modules, 3-tier routing architecture, SaaS pricing, and master test cases **TC-01 through TC-56**. |
| 3 | [\`prd-analysis.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd-analysis.md) | **Functional Gap & Edge-Case Analysis:** Edge cases, failure recovery, offline sync conflicts, and operational risks. |
| 4 | [\`Requirement Validation.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/Requirement%20Validation.md) | **Requirement Traceability & Compliance:** Regulatory compliance, Mushak 6.3 VAT, police buyback undertaking, and validation matrix. |
| 5 | [\`UI_UX_BLUEPRINT.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/UI_UX_BLUEPRINT.md) | **Design System & Visual Tokens (v2.0.0):** Slate surfaces, Teal brand, semantic colors, typography with \`tnum\`, 44x44px touch targets, and 4 resolved UX decisions. |
| 6 | [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) | **Master Application Flow (v2.0.0):** 19 ASCII wireframes, 23 modals, 4 global client state machines, Section 12 Master RBAC Action Matrix, and hardware drivers. |
| 7 | [\`user-flow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/user-flow.md) | **End-to-End User Journeys:** 34 complete step-by-step user operational flowcharts with visual Mermaid state progressions. |
| 8 | [\`DFD.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DFD.md) | **Data Flow Diagrams & Process Logic:** Context Level-0, Level-1, Level-2 (Processes 1.0 to 17.0), and comprehensive Data Dictionary. |
| 9 | [\`DATABASE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) | **Production Database Specification:** 36 MongoDB collections, compound indexes, Decimal128 money fields, and **Section 22 Master Financial Posting Matrix (TX-01 to TX-19)**. |
| 10 | [\`database-schema.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/database-schema.md) | **Historical Relational Schema Reference:** 43 PostgreSQL tables (RLS baseline maintained for relational parity; \`DATABASE.md\` is the active runtime database). |
| 11 | [\`ARCHITECTURE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/ARCHITECTURE.md) | **System Architecture Blueprint:** Modular Monolith architecture, Cloudflare Edge, React 18+ / Vite frontend, Node/Express backend, and Section 15 RBAC matrix. |
| 12 | [\`api-spec.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md) | **Comprehensive REST API Specification (v2.0.0):** 30 modular controllers, request/response JSON schemas, Zod validators, ESC/POS hardware contracts, and webhook HMAC verification. |
| 13 | [\`CHANGELOG.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/CHANGELOG.md) | **Revision History & Milestone Audit:** Complete change audit trail up to v6.5.0. |

### 0.2 Audit Findings on Expected External Files:
The following 5 documents mentioned in earlier conceptual discussions **do not exist as standalone files** in the repository because their content was deliberately synthesized into the canonical files above:
- \`UI_UX_DESIGN_SYSTEM.md\` -> Subsumed into [\`UI_UX_BLUEPRINT.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/UI_UX_BLUEPRINT.md) Section 3 and [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) Section 6.
- \`SCREEN_INVENTORY.md\` -> Subsumed into [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) Section 2 (Routes) and Section 5 (Wireframes).
- \`USER_FLOWS.md\` -> Subsumed into [\`user-flow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/user-flow.md) (34 complete flows) and [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md).
- \`COMPONENT_SPEC.md\` -> Subsumed into [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) Section 6 (TypeScript interfaces) and [\`UI_UX_BLUEPRINT.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/UI_UX_BLUEPRINT.md) Section 4.
- \`IMPLEMENTATION_GUIDE.md\` -> Formalized and codified directly into this master roadmap ([\`prompt.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prompt.md)).

### 0.3 Resolved Strategic Decisions (Immutable Architectural Invariants):
The following 4 decisions have been approved by the product owner and must be strictly respected across all phases:
1. **POS Tablet Viewport Standard:** Counter POS tablet layout is locked to **Strict Landscape Mode** (minimum 1024×768 resolution) featuring a fixed two-column layout (cart & scanner on the left, tenders, keypad & summary on the right).
2. **Thermal Receipt Printing Standard:** Receipts default to **Ultra-fast ESC/POS English text mode** (<0.3s execution via WebUSB/Bluetooth). Web/PDF bilingual previews remain accessible for sharing.
3. **Manager PIN Override:** Discount floors below MSP and Bakir Khata credit limit waivers trigger a synchronous on-screen modal overlay (\`Modal_ManagerPinOverride\`) verifying against the manager's 4-digit PIN hash.
4. **Day-End Shift Closing Recount:** Cashiers submitting blind cash note counts are granted **exactly one recount grace attempt** before the register is permanently locked and an SMS digest is dispatched to the store owner.

---

## 1. Master Phase Execution Roadmap

\`\`\`
├── Phase 0: Workspace Architecture, Tooling, Docker & Seed Profiles
├── Phase 1: Database Persistence Layer & Double-Entry Financial Engine (MongoDB Atlas)
├── Phase 2: Authentication, Identity Lifecycle & Security Gateways
├── Phase 3: Multi-Tenancy Isolation, RBAC & Context Guards
├── Phase 4: Frontend Design System, Design Tokens, UI Components & PWA Mobile Shell
├── Phase 5: Product Catalog, Taxonomy, Dual-IMEI Inventory & Damaged Stock Scrap
├── Phase 6: Procurement, Supplier Ledgers & Stock Transfers (GRN, PRV, STN)
├── Phase 7: POS Counter Sales, Multi-Tender Checkout, Hardware Drivers & Settings
├── Phase 8: Sales Returns, Customer Dues & Bakir Khata Subledger
├── Phase 9: Specialized Dokan Modules (Kisti EMI, Buyback, Service Lab, Brand RMA, MFS, Personal)
├── Phase 10: Accounts, Drawers, Shift Closing, SMS Desk & HR Payroll
├── Phase 11: Public Marketing Website (bebsayik.com) & Dokan Onboarding Wizard
├── Phase 12: SaaS Billing Engine, Webhook Processors & Platform Admin Portal (admin.bebsayik.com)
├── Phase 13: End-to-End Test Suite Execution (TC-01 through TC-56 & Aggregations AP-01 to AP-03)
└── Phase 14: Production Containerization, CI/CD Pipeline & Deployment Runbook
\`\`\`

---

### Phase 0: Workspace Architecture, Tooling, Docker & Seed Profiles

#### 1. Objectives & Expected Outcomes:
- Initialize the monorepo workspace for Bebsayik.com supporting three frontend applications and a modular backend API.
- Establish strict TypeScript configurations, linting, code formatting, and local developer environment virtualization (Docker Compose).
- Establish database migration tooling (\`migrate-mongo\`) and standard development seed profile ("Kanchan Telecom Demo Store").

#### 2. Tasks & Subtasks in Order of Execution:
1. **Monorepo Directory Initialization:**
   - Configure npm workspaces or pnpm monorepo structure:
     - \`apps/marketing\` — Public showcase (\`bebsayik.com\`) built with React 18+ / Vite / Tailwind CSS.
     - \`apps/web-erp\` — Main ERP and tablet POS (\`app.bebsayik.com\`) built with React 18+ / Vite / Tailwind CSS.
     - \`apps/admin\` — Platform Super Admin portal (\`admin.bebsayik.com\`) built with React 18+ / Vite / Tailwind CSS.
     - \`packages/api\` — Node.js / Express.js Modular Monolith backend.
     - \`packages/shared-types\` — Shared TypeScript models, Zod validation schemas, and API request/response types.
     - \`packages/ui-tokens\` — Shared Tailwind CSS configuration, CSS variables, and design tokens.
2. **Tooling & Code Quality Pipelines:**
   - Configure root \`tsconfig.base.json\` with \`"strict": true\`, \`"noImplicitAny": true\`, and \`"exactOptionalPropertyTypes": true\`.
   - Setup ESLint 9+ and Prettier with import sorting and strict rules.
   - Setup Vitest for unit testing and Playwright for browser end-to-end automation.
3. **Local Container Virtualization:**
   - Create \`docker-compose.yml\` spinning up:
     - \`mongo\`: MongoDB 7.0+ configured with a single-node Replica Set (mandatory for multi-document ACID transactions).
     - \`redis\`: Redis 7+ for rate-limiting, session revocation, and distributed locks.
4. **Environment Variables Configuration:**
   - Create comprehensive \`.env.example\` files in root and each app/package.
5. **Database Migration & Seeder Architecture:**
   - Configure \`migrate-mongo\` in \`packages/api\` with migrations directory \`packages/api/migrations\`.
   - Define seed profile: \`Kanchan Telecom Demo Store\` with sample products, categories, brands, 15-digit Luhn IMEIs, accounts, and test staff accounts (Owner, Manager, Cashier PIN \`1234\`).

#### 3. Relevant Modules & Dependencies:
- Root repository setup, Docker Compose, TypeScript, Node.js v20+ LTS, Express 4.19+, React 18+, Vite 5+, migrate-mongo.

#### 4. Required Documentation to Consult:
- [\`ARCHITECTURE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/ARCHITECTURE.md) — Section 1 (Technology Stack), Section 4 (Deployment Topology), Section 5 (Monorepo Directory Structure).
- [\`prd.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) — Section 1.2 (Three-Tier Domain Routing Architecture).

#### 5. Expected Deliverables:
- Initialized monorepo with all 3 app directories and 3 shared packages.
- Fully compiling TypeScript base build (\`npm run build\` passes with zero errors).
- Running local MongoDB replica set and Redis via \`docker compose up -d\`.
- Operational migration script runner (\`npm run migrate:up\`) and seed script (\`npm run seed:demo\`).

#### 6. Testing & Verification Requirements:
- Execute \`npm run lint\` and \`npm run typecheck\` across all workspaces.
- Verify MongoDB replica set status using \`mongosh --eval "rs.status()"\` confirming replica set initialization.
- Verify Redis ping (\`redis-cli ping\` returns \`PONG\`).

#### 7. Acceptance Criteria:
- Zero linting, formatting, or TypeScript compilation errors.
- Monorepo packages import cleanly across apps without cyclic dependencies.

#### 8. Dependencies, Risks & Unresolved Decisions:
- **Dependency:** Docker Desktop or Docker Engine installed on host machine.
- **Risk:** MongoDB standalone mode fails Mongoose \`startSession()\` ACID transactions. Single-node replica set is mandatory.

#### 9. Phase Exit Conditions:
- All workspace scripts (\`dev\`, \`build\`, \`lint\`, \`test\`) execute successfully across all monorepo packages.

---

### Phase 1: Database Persistence Layer & Double-Entry Financial Engine (MongoDB Atlas)

#### 1. Objectives & Expected Outcomes:
- Implement all 36 Mongoose schemas defined in [\`DATABASE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md).
- Enforce compound indexes scoped to \`shopId\`, Decimal128 monetary precision, and transaction session helpers.
- Implement the core Double-Entry Financial Posting Engine supporting transactions TX-01 through TX-19.

#### 2. Tasks & Subtasks in Order of Execution:
1. **Mongoose Schema Implementation (All 36 Collections):**
   - Core: \`shops\`, \`users\`, \`user_devices\`, \`auth_otps\`, \`phone_change_requests\`.
   - Catalog: \`categories\`, \`brands\`, \`products\`, \`product_variants\`, \`imei_serials\`.
   - Logistics & Scrap: \`inventory_movements\`, \`stock_transfer_notes\`, \`damaged_stock_scraps\`, \`warranty_claims\`.
   - Procurement: \`suppliers\`, \`purchase_orders\`, \`goods_received_notes\`, \`purchase_return_vouchers\`.
   - POS & Sales: \`sales\`, \`sale_items\`, \`held_carts\`, \`customer_return_vouchers\`.
   - CRM & Kisti: \`customers\`, \`kisti_contracts\`, \`kisti_installments\`, \`buyback_agreements\`.
   - Servicing: \`service_jobs\`, \`service_parts_consumed\`.
   - Accounting & Banking: \`accounts\`, \`account_transactions\`, \`mfs_transactions\`, \`personal_ledger_contacts\`, \`personal_ledger_transactions\`.
   - Registers: \`shifts\`, \`shift_denominations\`.
   - HR & SaaS: \`employee_targets\`, \`payroll_ledger\`, \`sms_logs\`, \`sms_templates\`, \`shop_hardware_configs\`, \`subscription_plans\`, \`subscription_invoices\`, \`promo_codes\`, \`marketing_leads\`.
2. **Monetary Precision & BigNumber Helpers:**
   - Implement \`Decimal128\` getters/setters ensuring monetary numbers are never parsed as IEEE-754 floats.
   - Build utility library \`money.ts\` using \`decimal.js\` for all math (addition, subtraction, division, percentages).
3. **Compound Tenant Index Creation:**
   - Establish mandatory indexes: \`{ shopId: 1, ... }\` on all tenant collections.
   - Setup unique partial index on \`imei_serials\`: \`{ imei1: 1, shopId: 1 }\` where \`status: "available"\`.
   - Setup TTL index on \`auth_otps\`: \`{ createdAt: 1 }\` with \`expireAfterSeconds: 120\`.
4. **Master Double-Entry Journal Engine (TX-01 to TX-19):**
   - Create \`AccountingService.postDoubleEntryJournal()\`:
     - Mandatory session injection.
     - Validate \`sum(debits) === sum(credits)\` to 2 decimal places.
     - Insert transaction records in \`account_transactions\` and update running balances in \`accounts\`.
   - Code explicit posting definitions for all 19 transactions according to Section 22 of [\`DATABASE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md).
5. **ACID Session Execution Wrapper:**
   - Implement \`withTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T>\` with retry logic for write conflicts.

#### 3. Relevant Modules & Dependencies:
- \`packages/api/src/database\`, \`packages/api/src/models\`, \`packages/api/src/services/accounting\`, Mongoose 8+, Decimal.js.

#### 4. Required Documentation to Consult:
- [\`DATABASE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) — Sections 1 to 21 (Schemas), Section 22 (Master Financial Posting Matrix TX-01 to TX-19).
- [\`api-spec.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md) — Section 6.2 (Monetary Precision), Section 6.3 (Session Safeguards), Section 6.4 (Journal Matrix).

#### 5. Expected Deliverables:
- 36 fully typed Mongoose model files with schema validation rules.
- Operational double-entry ledger posting service.
- Database seeder script (\`seed_dev.ts\`) populating default accounts (1010-Cash-Drawer, 1020-MFS-Floats, 4010-Sales-Revenue, etc.).

#### 6. Testing & Verification Requirements:
- Write unit tests for \`money.ts\` verifying zero floating-point drift (\`0.1 + 0.2 === 0.3\`).
- Write integration tests for \`AccountingService.postDoubleEntryJournal()\`:
  - Assert transaction commits when debits equal credits.
  - Assert transaction throws and rolls back if \`sum(debit) !== sum(credit)\`.
- Verify TTL index expiration on \`auth_otps\` after 120 seconds.

#### 7. Acceptance Criteria:
- All 36 collections initialize with correct indexes in MongoDB.
- All financial balances update atomically with double-entry integrity.

#### 8. Dependencies, Risks & Unresolved Decisions:
- **Risk:** Failure to pass the Mongoose \`ClientSession\` to every query in a multi-document mutation leads to partial commits. The \`withTransaction\` wrapper must enforce session propagation.

#### 9. Phase Exit Conditions:
- Database test suite passes with 100% coverage on schema validations and double-entry invariants.

---

### Phase 2: Authentication, Identity Lifecycle & Security Gateways

#### 1. Objectives & Expected Outcomes:
- Implement dual-authentication engine (Passwordless SMS OTP & Argon2id Password).
- Implement JWT access/refresh token lifecycle, Redis rate-limiting, and instant session revocation.
- Implement critical account migration protocols: 180s Dual-OTP phone migration, staff emergency kill-switch, and password recovery.

#### 2. Tasks & Subtasks in Order of Execution:
1. **SMS Gateway Driver & Mock Interface:**
   - Build SMS service adapter interface: SSL Wireless / BulkSMS BD driver.
   - Implement \`MockSmsDriver\` for development and test environments logging OTPs to console/Redis.
2. **Passwordless SMS OTP Service (\`/api/v1/auth/otp/*\`):**
   - Cloudflare Turnstile token verification middleware.
   - Generate cryptographically secure 6-digit numeric OTP.
   - Hash OTP using SHA-256 before persisting in \`auth_otps\` with 120s TTL.
   - Implement Redis sliding-window rate limiter: strictly 3 OTP requests per 15 minutes per phone/IP.
3. **Argon2id Password Authentication (\`/api/v1/auth/login\`):**
   - Password hashing with Argon2id (memoryCost: 65536, timeCost: 3).
   - Track \`failedLoginAttempts\`: 5 consecutive failures lock account for 15 minutes (\`lockedUntil\`).
4. **JWT Lifecycle & Token Version Kill Switch:**
   - Access Token: Short-lived JWT (15 minutes) signed with RS256/HS256 containing \`userId\`, \`role\`, \`tokenVersion\`.
   - Refresh Token: Long-lived HTTP-only secure cookie (7 days) stored with family hash in Redis.
   - Implement \`POST /api/v1/auth/refresh\` and \`POST /api/v1/auth/logout\`.
   - Implement instant session revocation: incrementing \`users.tokenVersion\` invalidates all active sessions in <1s.
5. **Security Protocols Implementation:**
   - **Password Reset (\`/api/v1/auth/recovery/reset\`):** OTP validation -> password hash update -> session purge (TC-51).
   - **Dual-OTP Phone Number Migration (\`/auth/phone-change/*\`):** 180-second window, dual SMS to old and new SIM, atomic phone update (TC-52).
   - **Staff Emergency Kill-Switch (\`/users/:id/emergency-terminate\`):** Owner master password check -> set \`isActive: false\` -> increment staff \`tokenVersion\` -> instant POS tablet 403 boot (TC-53).

#### 3. Relevant Modules & Dependencies:
- \`packages/api/src/modules/auth\`, \`packages/api/src/modules/users\`, Argon2, jsonwebtoken, ioredis.

#### 4. Required Documentation to Consult:
- [\`api-spec.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md) — Section 3 (Auth Engine), Section 5.1 (Auth Routes), Section 5.3 (User Routes).
- [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) — Section 3 (Auth State Machine), Section 8 (\`Modal_DualOtpNumberChange\`, \`Modal_StaffTermination\`).
- [\`prd.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) — TC-29, TC-40, TC-41, TC-50, TC-51, TC-52, TC-53.

#### 5. Expected Deliverables:
- Working authentication API endpoints for OTP request, verification, password login, token refresh, and logout.
- Functioning security endpoints for Dual-OTP phone migration, staff termination, and password reset.

#### 6. Testing & Verification Requirements:
- Unit test rate-limiter: 4th OTP request within 15 minutes returns HTTP 429 (\`RATE_LIMIT_EXCEEDED\`).
- Test lockout: 5 wrong passwords lock the user account for 15 minutes.
- Test kill-switch: Incrementing \`tokenVersion\` immediately rejects subsequent requests with HTTP 401/403.
- Test Dual-OTP migration: Ensure phone number cannot migrate if only 1 OTP is provided or TTL expires.

#### 7. Acceptance Criteria:
- All authentication endpoints pass Zod input validation.
- All auth tokens securely pass tenant and role context.

#### 8. Dependencies, Risks & Unresolved Decisions:
- **Prerequisite:** Redis must be operational for sliding window rate-limiting and token storage.

#### 9. Phase Exit Conditions:
- All auth test cases pass, verified with automated Vitest suites.

---

### Phase 3: Multi-Tenancy Isolation, RBAC & Context Guards

#### 1. Objectives & Expected Outcomes:
- Implement multi-tenant scoping middleware ensuring complete data isolation by \`shopId\`.
- Enforce the Master Role-Based Access Control (RBAC) matrix for all 7 canonical user roles.
- Implement Shop Workspace Switcher and Manager PIN Override verification.

#### 2. Tasks & Subtasks in Order of Execution:
1. **Tenant Isolation Middleware (\`tenantGuard\`):**
   - Extract \`X-Shop-Id\` header from incoming requests.
   - Validate that authenticated \`req.user\` has active membership and assignment in the targeted shop.
   - Inject \`req.tenant = { shopId, role, permissions }\` into Express request context.
   - Automatically inject \`shopId\` filter into all Mongoose queries and mutations.
2. **Master RBAC Guard Middleware (\`requireRole\`):**
   - Implement role hierarchy and permission checking for all 7 canonical roles:
     1. \`SUPER_ADMIN\`, 2. \`STORE_OWNER\`, 3. \`STORE_MANAGER\`, 4. \`SALESPERSON\`, 5. \`CASHIER\`, 6. \`TECHNICIAN\`, 7. \`ACCOUNTANT\`.
   - Return HTTP 403 \`TENANT_ACCESS_DENIED\` or \`INSUFFICIENT_PERMISSIONS\` on unauthorized route attempts.
3. **Workspace Switching Engine (\`/api/v1/shops/*\`):**
   - \`GET /shops/my-shops\` — List authorized shops for current user.
   - \`POST /shops/switch-workspace\` — Generate scoped JWT for switched shop context (TC-55).
   - \`GET/PATCH /shops/profile\` — Manage shop metadata, BIN number, logo, and receipt settings.
4. **Manager 4-Digit PIN Override Verification Engine:**
   - \`POST /api/v1/users/manager-pin/verify\` — Verify 4-digit PIN hash for discount overrides (MSP floor breach) or credit waivers.
   - Return short-lived signed override token (60-second validity) required in subsequent mutating request payloads.

#### 3. Relevant Modules & Dependencies:
- \`packages/api/src/middlewares/tenantGuard.ts\`, \`packages/api/src/middlewares/rbacGuard.ts\`, \`packages/api/src/modules/shops\`.

#### 4. Required Documentation to Consult:
- [\`ARCHITECTURE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/ARCHITECTURE.md) — Section 3 (Multi-Tenancy & Tenant Context Isolation), Section 15 (Master RBAC Matrix).
- [\`api-spec.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md) — Section 4 (Master RBAC Matrix), Section 5.2 (Shop Management), Section 5.3 (User Management).
- [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) — Section 12 (Master Role-Based Action Matrix).

#### 5. Expected Deliverables:
- Working Express middlewares enforcing tenant isolation and RBAC.
- Working multi-shop switcher and manager override verification APIs.

#### 6. Testing & Verification Requirements:
- Cross-tenant penetration test: User of Shop A attempting to read or mutate Shop B data receives HTTP 403 / 404.
- RBAC test: Cashier attempting to access \`/personal-ledger\` or \`/admin\` receives HTTP 403 Forbidden.
- Manager PIN test: Incorrect PIN returns HTTP 401; valid PIN returns single-use 60s override token.

#### 7. Acceptance Criteria:
- Zero data leakage between shops under concurrent multi-tenant requests.
- All 7 roles conform strictly to the Section 12 Action Matrix.

#### 8. Dependencies, Risks & Unresolved Decisions:
- **Decision Codified:** Personal Ledger is strictly restricted to \`STORE_OWNER\` only. Managers and accountants have zero read or write access.

#### 9. Phase Exit Conditions:
- RBAC test suite passes 100% of negative authorization scenarios.

---

### Phase 4: Frontend Design System, Design Tokens, UI Components & PWA Mobile Shell

#### 1. Objectives & Expected Outcomes:
- Implement master design tokens, color palette, typography, and responsive CSS variables in \`packages/ui-tokens\`.
- Build the core component library in \`apps/web-erp\` following [\`UI_UX_BLUEPRINT.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/UI_UX_BLUEPRINT.md).
- Implement standard component contracts (tables, modals, empty states, error boundaries, numpad, pattern lock).
- Configure PWA Web App Manifest, Service Worker, and mobile viewport responsive shell.

#### 2. Tasks & Subtasks in Order of Execution:
1. **Design Tokens & Tailwind Configuration:**
   - Configure Slate surface palette (\`--color-surface-bg: #0F172A\`, \`--color-surface-card: #1E293B\`, etc.).
   - Configure Teal/Emerald brand accents (\`--color-brand-primary: #0D9488\`, \`--color-brand-hover: #0F766E\`).
   - Configure semantic colors (Success Emerald, Warning Amber, Destructive Crimson, Due Purple).
   - Configure typography tokens: Google Font \`Inter\` / \`Outfit\` with mandatory \`font-variant-numeric: tabular-nums\` (\`tnum\`) for all monetary amounts and IMEI displays.
   - Enforce 44x44px minimum touch targets for all interactive buttons.
2. **Core Reusable UI Component Library:**
   - **Button & IconButton:** Touch-optimized, loading state spinners, keyboard shortcut visual badges (\`F1\`, \`ESC\`).
   - **DataTable & VirtualizedList:** High-density table with sticky headers, column sorting, pagination, and \`SkeletonTableProps\`.
   - **Modal & Drawer Frame:** Accessible overlay dialogs with Escape key trapping, autofocus, and close transitions.
   - **EmptyState:** Clean SVG illustrations, contextual help message, and call-to-action button (\`EmptyStateProps\`).
   - **ErrorBoundary:** Graceful crash recovery with diagnostic error details and reload CTA (\`ErrorBoundaryFallbackProps\`).
   - **OfflineSyncBanner:** Persistent warning bar showing pending IndexedDB mutations and online/offline status (\`OfflineSyncBannerProps\`).
3. **Specialized Mobile Retail Dokan Widgets:**
   - **On-Screen Numpad:** Rapid touch calculation widget for cash tenders and physical note counting.
   - **3x3 Pattern Lock Canvas:** Touch-friendly Android 9-dot pattern lock recording and rendering widget for repair tickets.
   - **ManagerPinOverrideModal:** Secure on-screen 4-digit PIN entry overlay.
   - **MultiShopSwitcherModal:** Dropdown and modal to switch dokan contexts seamlessly.
4. **PWA Mobile Shell & Responsive Viewports:**
   - Configure \`manifest.webmanifest\` (App Name: Bebsayik, standalone display mode, Dokan brand icons).
   - Configure Workbox / Service Worker for static asset caching.
   - Add responsive mobile shell allowing phone browsers to scale layouts cleanly while preserving 1024×768 landscape for tablet counter POS.

#### 3. Relevant Modules & Dependencies:
- \`packages/ui-tokens\`, \`apps/web-erp/src/components\`, Lucide React, Tailwind CSS 3.4+, vite-plugin-pwa.

#### 4. Required Documentation to Consult:
- [\`UI_UX_BLUEPRINT.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/UI_UX_BLUEPRINT.md) — Section 3 (Design Tokens), Section 4 (Component Standards), Section 5 (Approved UX Decisions).
- [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) — Section 6 (Core UI Component Contract Registry), Section 8 (Security & Operational Modals).

#### 5. Expected Deliverables:
- Working UI component library storybook or interactive showcase.
- Tailwind tokens compiled and imported into all three apps.
- PWA manifest and service worker configuration.

#### 6. Testing & Verification Requirements:
- Visual audit: Ensure all monetary values display Bangladeshi Taka (\`৳\`) with tabular lining figures (\`tnum\`).
- Accessibility check: All buttons have minimum 44px height and width.
- Keyboard navigation: Modal traps focus; \`ESC\` closes modal; \`Enter\` submits primary form.

#### 7. Acceptance Criteria:
- Zero raw un-tokenized ad-hoc colors or inline styles in components.
- Components cleanly re-render under theme changes and error conditions.

#### 8. Dependencies, Risks & Unresolved Decisions:
- **Decision Codified:** Thermal receipts are English ESC/POS text mode; web UI is full English with Bengali domain terminology examples in tooltips where appropriate.

#### 9. Phase Exit Conditions:
- All core components pass unit tests and render without layout shifts.

---

### Phase 5: Product Catalog, Taxonomy, Dual-IMEI Inventory & Damaged Stock Scrap

#### 1. Objectives & Expected Outcomes:
- Build product catalog management with categories, brands, variants, and bulk Excel/CSV import.
- Implement serialized Dual-IMEI inventory tracking with sub-150ms scanner lookups and 7-stage lifecycle state machine.
- Implement non-serialized accessory stock movements, low stock alerts, and manual inventory adjustments.
- Implement Damaged Stock Scrap Hub (SWV - TX-17) writing off broken/shattered handsets to P&L with photo proof.

#### 2. Tasks & Subtasks in Order of Execution:
1. **Catalog & Taxonomy API & UI:**
   - Implement CRUD endpoints and screens for Categories and Brands (\`/api/v1/catalog/categories\`, \`/brands\`).
   - Implement Product & Variant creation with barcode generator (\`POST /api/v1/catalog/products\`).
   - Implement bulk Excel/CSV ingestion engine (\`POST /api/v1/catalog/import-excel\`) with template download, column mapping, and row-level error reporting.
2. **Dual-IMEI Serialized Handset Engine:**
   - Implement \`imei_serials\` collection manager tracking: \`imei1\`, \`imei2\`, \`status\`, \`specificCost\`, \`purchaseDate\`.
   - Implement 7 lifecycle states: \`AVAILABLE\`, \`HELD_CART\`, \`SOLD\`, \`RETURNED_INSPECTION\`, \`RETURNED_TO_SUPPLIER\`, \`SCRAPPED\`, \`IN_TRANSIT\`.
   - Implement scanner lookup endpoint \`GET /api/v1/inventory/imei/scan/:code\` optimized with Redis cache and compound indexes to respond in **<150ms**.
   - Implement aging inventory filtering: identify handsets sitting unsold for >60 or >90 days (AP-02).
3. **Non-Serialized Stock Ledger & Adjustments:**
   - Append-only inventory movements ledger (\`inventory_movements\`) for chargers, cables, cases, and tempered glass.
   - Low stock threshold indicators and reorder alerts.
   - Stock count audit and adjustment workflow requiring Manager PIN authorization.
4. **Damaged Stock Scrap Hub (SWV - TX-17):**
   - Record shattered/dropped device write-off (\`POST /api/v1/inventory/damage/scrap\`).
   - Upload evidence photo via webcam or file upload (\`/media/upload\`).
   - Require 4-digit Manager PIN authorization.
   - Post atomic accounting: Debit \`5020-Damaged-Stock-Loss\`, Credit \`1210-Handset-Inventory\` (TC-22).
   - Scrapped IMEI status transitions to \`SCRAPPED\` and is permanently removed from active stock.

#### 3. Relevant Modules & Dependencies:
- Backend: \`packages/api/src/modules/catalog\`, \`packages/api/src/modules/inventory\`, \`packages/api/src/modules/damage\`.
- Frontend: \`apps/web-erp/src/pages/inventory\`, \`apps/web-erp/src/pages/catalog\`, \`apps/web-erp/src/pages/damage\`.
- Libraries: xlsx, papaparse.

#### 4. Required Documentation to Consult:
- [\`prd.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) — Section 4 (Inventory & Dual-IMEI), TC-22, TC-23.
- [\`DATABASE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) — Section 22 (TX-17 Scrap Loss Voucher).
- [\`api-spec.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md) — Section 5.4 (Catalog), Section 5.5 (Dual-IMEI Inventory), Section 5.8 (Damage Scrap Hub).
- [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) — Section 5.3 (Wireframe Screen 03: Inventory Master), Section 5.14 (Screen 14: Damaged Stock Hub).

#### 5. Expected Deliverables:
- Working Product & Variant catalog with Excel import capability.
- Working serialized Dual-IMEI tracking ledger with barcode/IMEI scanner search.
- Working Damaged Stock Scrap Hub with webcam photo evidence and P&L write-off.

#### 6. Testing & Verification Requirements:
- Scan speed benchmark: Execute 1,000 barcode/IMEI lookups; 99th percentile response time must be <150ms.
- Luhn check test: 15-digit IMEI with incorrect Luhn check digit is rejected by Zod validation.
- Specific cost test: Verify Phone A (Cost ৳18,000) and Phone B (Cost ৳19,000) retain exact landed purchase costs independently (TC-23).
- Damage scrap test: Write off handset costing ৳12,000; verify stock decrements and P&L debits ৳12,000 under Loss on Damaged Stock (TC-22).

#### 7. Acceptance Criteria:
- Duplicate active IMEI creation is strictly blocked by database unique index.
- Excel import of 500 rows processes in <5 seconds without server timeout.

#### 8. Dependencies, Risks & Unresolved Decisions:
- **Risk:** High-frequency scanner wedge inputs could trigger race conditions. Resolved by Redis scan locks.

#### 9. Phase Exit Conditions:
- Catalog, inventory, and damage scrap modules pass integration test suites.

---

### Phase 6: Procurement, Supplier Ledgers & Stock Transfers (GRN, PRV, STN)

#### 1. Objectives & Expected Outcomes:
- Build supplier management, purchase orders, and Goods Received Notes (GRN) with landed cost freezing.
- Implement Purchase Return Vouchers (PRV) returning handsets/accessories to suppliers with payable deductions.
- Implement Godown-to-Outlet Stock Transfer Notes (STN) with transit dispute tracking.

#### 2. Tasks & Subtasks in Order of Execution:
1. **Supplier CRM & Payables Ledger:**
   - Supplier directory and 360° statement (\`GET /api/v1/procurement/suppliers/:id/statement\`).
   - Record payments against supplier dues (\`POST /api/v1/procurement/suppliers/:id/payment\`).
2. **Goods Received Note (GRN - TX-07):**
   - Ingest PO or direct shipment, scan and validate dual IMEIs, and freeze landed purchase cost per unit.
   - Atomic database transaction: increment stock, update supplier payable balance, post double-entry journals (\`Debit 1210 Handset Inventory, Credit 2010 Accounts Payable\`).
   - Support partial shipments and tracking pending delivery balance (TC-28).
3. **Purchase Return Voucher (PRV - TX-08):**
   - Return defective or dead-on-arrival (DOA) stock back to vendor.
   - Transition IMEI status to \`RETURNED_TO_SUPPLIER\`.
   - Atomic ledger entry: debit \`2010 Accounts Payable\`, credit \`1210 Handset Inventory\` (TC-19).
4. **Godown ↔ Outlet Stock Transfers (STN - TX-19):**
   - Dispatch STN: scan IMEIs out of godown warehouse -> status transitions to \`IN_TRANSIT\`.
   - Receive STN: outlet manager scans physical units to confirm receipt -> status transitions to \`AVAILABLE\` at outlet.
   - Handle transit disputes: missing units flagged as \`DISPUTED_IN_TRANSIT\` with automated owner SMS alert (TC-36).

#### 3. Relevant Modules & Dependencies:
- Backend: \`packages/api/src/modules/procurement\`, \`packages/api/src/modules/transfers\`.
- Frontend: \`apps/web-erp/src/pages/procurement\`, \`apps/web-erp/src/pages/transfers\`.

#### 4. Required Documentation to Consult:
- [\`DATABASE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) — Section 22 (TX-07 GRN, TX-08 PRV, TX-19 STN).
- [\`api-spec.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md) — Section 5.7 (Transfers), Section 5.10 (Procurement).
- [\`prd.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) — TC-19, TC-28, TC-36.

#### 5. Expected Deliverables:
- Procurement screens and APIs for suppliers, GRN receiving, and PRV returns.
- Stock transfer screens with dispatch and scan-to-receive verification workflows.

#### 6. Testing & Verification Requirements:
- Test PRV balance: Returning 2 phones (Cost ৳30,000) reduces supplier balance by exactly ৳30,000 (TC-19).
- Test STN discrepancy: Dispatching 20 units and receiving 19 marks 1 unit as disputed and notifies owner (TC-36).

#### 7. Acceptance Criteria:
- All inventory quantities and financial liabilities balance to 2 decimal places.
- Handsets in transit cannot be added to POS sales carts.

#### 8. Dependencies, Risks & Unresolved Decisions:
- **Decision Codified:** Stock transfers between godown and outlet are asset transfers with 0.00% P&L impact.

#### 9. Phase Exit Conditions:
- Complete procurement lifecycle passes automated end-to-end integration tests.

---

### Phase 7: POS Counter Sales, Multi-Tender Checkout, Hardware Drivers & Settings

#### 1. Objectives & Expected Outcomes:
- Build high-speed landscape tablet POS interface (1024×768+) with sub-second keyboard accelerators (\`F1\` to \`F12\`).
- Implement split-tender checkout (Cash, bKash Merchant, Bank/Card, Customer Due) with atomic double-entry posting.
- Implement POS cart stashing/recalling (\`F5\`/\`F6\`) and high-speed ESC/POS thermal printing (<0.3s) with cash drawer kick pulse.
- Implement Hardware Station Settings Screen (\`/app/settings/hardware\`, \`Screen 16\`) storing station fingerprints and printer preferences.
- Implement IndexedDB offline queue for non-serialized accessories.

#### 2. Tasks & Subtasks in Order of Execution:
1. **Landscape Tablet & Desktop POS Layout:**
   - Implement fixed dual-column interface:
     - Left pane: Barcode/IMEI scanner input box, customer search (\`F3\`), reactive cart table with quantity adjusters and inline discounts.
     - Right pane: Tender summary, split payment selector, quick cash denominations numpad, and checkout action (\`F12\`).
   - Implement keyboard accelerators: \`F1\` (Help), \`F2\` (Scan focus), \`F3\` (Customer), \`F4\` (Discount), \`F5\` (Hold cart), \`F6\` (Recall cart), \`F12\` (Pay).
2. **Atomic Checkout Engine (\`POST /api/v1/pos/checkout\`):**
   - Enforce mandatory \`Idempotency-Key\` header (UUIDv4).
   - Redis distributed lock on scanned IMEIs (\`SET lock:imei:<id> <token> EX 15 NX\`).
   - Verify selling price against Minimum Selling Price (MSP) floor: trigger Manager PIN override if breached.
   - Verify shift opening: block sale if morning float was not recorded (\`SHIFT_NOT_OPEN\`).
   - Post atomic double-entry journals:
     - Debit \`1010-Cash-Drawer\` (Cash tender)
     - Debit \`1020-MFS-Floats\` (bKash/Nagad tender)
     - Debit \`1030-Bank-Accounts\` (Card tender)
     - Debit \`1110-Accounts-Receivable\` (Customer due balance)
     - Credit \`4010-Sales-Revenue\` (Total invoice amount)
     - Cost of Goods Sold: Debit \`5010-COGS\`, Credit \`1210-Handset-Inventory\` (Specific cost per IMEI).
3. **Cart Stashing & Recall (\`POST/GET/DELETE /api/v1/pos/held-carts\`):**
   - Stash active cart (\`F5\`) saving customer context and selected items.
   - Recall held carts modal (\`F6\`) to restore cart in 1 click.
4. **Hardware Driver Integration & Settings Desk:**
   - Implement Hardware Station Settings Screen (\`/app/settings/hardware\`, \`Screen 16\`) saving station preferences in \`shop_hardware_configs\`:
     - Paper width (58mm / 80mm).
     - Cash drawer kick on checkout boolean.
     - Barcode scanner wedge suffix (ENTER / TAB).
     - Direct WebUSB / Bluetooth communication toggle.
   - WebUSB / WebBluetooth thermal printer direct driver without browser print dialog.
   - Format ESC/POS raw byte sequence: English text mode, bold headers, itemized tabular columns, shop logo bitmap, and return policy footer.
   - Emit RJ11 cash drawer kick pulse (\`0x1B 0x70 0x00 0x19 0xFA\`) before receipt printing.
   - Handle invoice reprint counter: reprint prints \`*** DUPLICATE REPRINT (COPY #N) ***\` without mutating ledgers (TC-47).
5. **IndexedDB Offline Accessory Queue & Sync:**
   - Service Worker & IndexedDB caching for non-serialized items (chargers, tempered glass).
   - Strictly block offline checkout of serialized Dual-IMEI handsets (TC-48).
   - Automatic batch sync replay (\`POST /api/v1/pos/offline-sync\`) upon reconnection.

#### 3. Relevant Modules & Dependencies:
- Backend: \`packages/api/src/modules/pos\`, \`packages/api/src/modules/hardware\`.
- Frontend: \`apps/web-erp/src/pages/pos\`, \`apps/web-erp/src/pages/settings/hardware\`, \`apps/web-erp/src/hardware/escpos\`.
- IndexedDB wrapper: idb / dexie.

#### 4. Required Documentation to Consult:
- [\`UI_UX_BLUEPRINT.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/UI_UX_BLUEPRINT.md) — Section 5.1 (Decision 1: Landscape POS Layout), Section 5.2 (Decision 2: ESC/POS Thermal Mode).
- [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) — Section 5.1 (Wireframe Screen 01: Landscape Counter POS), Section 5.16 (Screen 16: Hardware Settings), Section 11 (Hardware & Drivers).
- [\`api-spec.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md) — Section 5.11 (POS Endpoints), Section 5.23 (Hardware Station Configs), Section 5.29 (ESC/POS Byte Contract).
- [\`prd.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) — TC-01, TC-02, TC-03, TC-04, TC-47, TC-48, TC-54.

#### 5. Expected Deliverables:
- Complete high-speed landscape POS interface with keyboard shortcut integration.
- Hardware configuration desk in settings managing terminal printer profiles.
- Atomic POS checkout API with multi-tender support and thermal receipt generator.
- WebUSB/Bluetooth thermal printing engine with drawer kick support.

#### 6. Testing & Verification Requirements:
- Checkout latency benchmark: Complete sale transaction commit in <250ms.
- Test offline handset block: Disconnect network; verify UI displays warning and prevents handset sale (TC-48).
- Test reprint idempotency: Click reprint 3 times; verify \`reprint_count\` increments to 3 with zero accounting mutations (TC-47).
- Test concurrent IMEI scan: Two cashiers scanning same IMEI concurrently; one succeeds, other receives \`IMEI_ALREADY_SOLD\` (409).

#### 7. Acceptance Criteria:
- Cash drawer opens cleanly on cash tender checkout.
- Receipts print with crisp monospace alignment under 0.3s.

#### 8. Dependencies, Risks & Unresolved Decisions:
- **Decision Codified:** Handsets are never sold offline to protect Specific Identification COGS and avoid double-selling across terminals.

#### 9. Phase Exit Conditions:
- POS counter sales pass simulated 100-consecutive-sale stress test with balanced ledgers.

---

### Phase 8: Sales Returns, Customer Dues & Bakir Khata Subledger

#### 1. Objectives & Expected Outcomes:
- Build Customer Return Voucher (CRV) engine with 7-day policy validation and restock condition inspection.
- Build Customer 360° profile, Bakir Khata ledger, and FIFO due collection receipt workflows.
- Implement automated SMS due payment reminders.

#### 2. Tasks & Subtasks in Order of Execution:
1. **Sales Return & Exchange Engine (CRV - TX-05):**
   - Look up original sale invoice by number or barcode scan.
   - Verify return window against shop policy (\`returnPolicyDays\`, default: 7 days).
   - Evaluate returned device condition:
     - \`RESTOCKABLE\` — Re-enter active inventory (\`AVAILABLE\`).
     - \`DEFECTIVE_NEEDS_INSPECTION\` — Route to Quarantine or Supplier Return.
   - Adjust customer balances: if sale had outstanding due, reduce due balance first before issuing cash refund (TC-21).
   - Reverse revenue: Debit \`4020-Sales-Returns\`, Credit \`1010-Cash-Drawer\` or \`1110-Accounts-Receivable\`.
2. **Customer CRM & 360° Profile:**
   - 4-tab customer view: (1) Invoices History, (2) Bakir Khata Due Ledger, (3) Active Kisti Contracts, (4) Servicing History.
   - Set and enforce individual customer \`creditLimit\`.
3. **Bakir Khata Due Collection (TX-06):**
   - Record cash/MFS payment against customer's outstanding balance (\`POST /api/v1/customers/:id/collect-due\`).
   - Post double-entry journal: Debit \`1010-Cash-Drawer\`, Credit \`1110-Accounts-Receivable\`.
   - Generate thermal Due Collection Money Receipt with remaining balance display.
4. **Automated SMS Reminders:**
   - One-click or scheduled automated SMS due reminder dispatch with customer name, dokan name, and due balance tags.

#### 3. Relevant Modules & Dependencies:
- Backend: \`packages/api/src/modules/returns\`, \`packages/api/src/modules/customers\`.
- Frontend: \`apps/web-erp/src/pages/customers\`, \`apps/web-erp/src/pages/returns\`.

#### 4. Required Documentation to Consult:
- [\`prd.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) — TC-20, TC-21.
- [\`DATABASE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) — Section 22 (TX-05 CRV, TX-06 Due Collection).
- [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) — Section 5.4 (Wireframe Screen 04: Customer 360° Profile).
- [\`api-spec.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md) — Section 5.12 (Returns), Section 5.13 (Customers).

#### 5. Expected Deliverables:
- Sales return wizard with condition inspection quarantine and refund allocation.
- Customer directory and 360° profile with Bakir Khata payment collection.

#### 6. Testing & Verification Requirements:
- Test due netting: Customer buys ৳20,000 phone with ৳5,000 due; returns phone. Customer due decreases by ৳5,000; cash refund issued for ৳15,000; zero excess cash disbursed (TC-21).
- Test credit limit breach: Customer with ৳10,000 credit limit attempting to take ৳12,000 credit sale is blocked with \`CREDIT_LIMIT_EXCEEDED\` unless approved by Manager PIN.

#### 7. Acceptance Criteria:
- All returned IMEIs are quarantined until inspected.
- Customer due balances accurately reflect FIFO allocation.

#### 8. Dependencies, Risks & Unresolved Decisions:
- **Rule Enforced:** Cash refunds are strictly disallowed on damaged/scratched returns without Owner override.

#### 9. Phase Exit Conditions:
- Returns and customer due collection modules pass automated verification test suites.

---

### Phase 9: Specialized Dokan Modules (Kisti EMI, Buyback, Service Lab, Brand RMA, MFS, Personal)

#### 1. Objectives & Expected Outcomes:
- Build the 6 specialized retail modules that distinguish Bebsayik from generic ERPs:
  1. Installment (Kisti / EMI) loan engine with dual guarantors.
  2. Used phone buyback with webcam KYC and Bangladesh Police Legal Undertaking deed.
  3. Technician servicing lab with 3x3 pattern lock coordinates and 50% labor split.
  4. Brand Warranty (RMA) Tracking Hub managing official manufacturer warranty claims.
  5. 100% manual MFS agent desk with physical SIM float reconciliation.
  6. Isolated Personal Ledger (Amanat & Hawlat) with strict 0.00% Store P&L invariant.

#### 2. Tasks & Subtasks in Order of Execution:
1. **Kisti / EMI Installment Engine (TX-11):**
   - Book installment contract: cash price, down payment, tenure months, interest rate, monthly milestone schedule.
   - Dual guarantor profile capture: names, NIDs, phones, and relationship to customer.
   - Milestone collection modal: update amortization schedule and issue thermal installment receipt.
   - Defaulter registry: query customers with overdue milestones (>30 days) and trigger SMS follow-ups.
2. **Used Phone Buyback & Police Compliance (TX-10):**
   - Ingest used handset: capture seller details, NID number, phone, device condition grade, and IMEI.
   - Webcam capture integration: capture live seller webcam photo and NID front/back images.
   - Post payout voucher: Debit \`1220-Used-Inventory\`, Credit \`1010-Cash-Drawer\`.
   - Generate and stream printable **Bangladesh Police Legal Undertaking Form PDF** with seller photo and signature boxes.
3. **Technician Servicing Lab (TX-09):**
   - Repair intake ticket: customer details, brand, model, issue description, estimated cost, advance payment.
   - Render 3x3 interactive pattern lock widget to record and display device unlock sequence (\`[0,1,2,4,7]\`).
   - Spare parts dispensing: deduct parts from godown inventory (\`service_parts_consumed\`).
   - Job completion: calculate labor fee; automatically credit 50% labor split to technician's monthly payroll ledger; return defective parts to godown inventory with zero technician loss.
4. **Brand Warranty (RMA) Tracking Hub (\`warranty_claims\`):**
   - Customer intake for official manufacturer warranty (\`POST /api/v1/inventory/warranty/intake\`).
   - Log customer details, faulty handset IMEI, brand name, issue description, parcel tracking reference.
   - Status updates: \`received_from_customer\` -> \`sent_to_brand\` -> \`received_from_brand\` -> \`delivered_to_customer\`.
   - Trigger automated SMS notification to customer upon device return from brand care center.
5. **100% Manual MFS Agent Desk (TX-12, TX-13):**
   - **Cash-In (TX-12):** Customer gives cash -> Debit \`1010-Cash-Drawer\`, Credit \`1020-MFS-Floats\`, Credit \`4040-MFS-Commission\` (+৳4.10 per ৳1,000) (TC-33).
   - **Cash-Out (TX-13):** Customer sends float to agent SIM -> Debit \`1020-MFS-Floats\`, Credit \`1010-Cash-Drawer\`, Credit \`4040-MFS-Commission\` (TC-31).
   - Evening USSD audit: compare dialed SIM balance with system ledger; log variance.
   - **Strict Rule:** Zero background SMS scraping or Accessibility permission abuse (TC-42).
6. **Segregated Personal Ledger (Amanat & Hawlat - TX-14, TX-15, TX-16):**
   - Isolated contact directory (\`personal_ledger_contacts\`) completely separated from store customers (TC-32).
   - Record Amanat (deposit/return) and Hawlat (loan given/taken) transactions.
   - **Accounting Guard:** Assert strict 0.00% Store P&L invariant; transactions affect only owner personal liability/receivable accounts; completely restricted to \`STORE_OWNER\` role.

#### 3. Relevant Modules & Dependencies:
- Backend: \`packages/api/src/modules/kisti\`, \`buyback\`, \`service\`, \`warranty\`, \`mfs\`, \`personal-ledger\`.
- Frontend: \`apps/web-erp/src/pages/kisti\`, \`buyback\`, \`service\`, \`warranty\`, \`mfs\`, \`personal-ledger\`.
- Libraries: pdfmake / react-pdf for Police Undertaking document generation.

#### 4. Required Documentation to Consult:
- [\`DATABASE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) — Section 22 (TX-09 to TX-16).
- [\`api-spec.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md) — Section 5.9 (Warranty RMA), Section 5.14 to 5.18.
- [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) — Section 5.13 (Screen 13: Brand Warranty RMA Desk).
- [\`prd.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) — TC-31, TC-32, TC-33, TC-42.
- [\`Requirement Validation.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/Requirement%20Validation.md) — Section 3 (Compliance & Legal Standards).

#### 5. Expected Deliverables:
- Working Kisti module with guarantor profiles and milestone tracking.
- Working Buyback module with webcam photo capture and Police Undertaking PDF generator.
- Working Servicing Lab with 3x3 pattern lock canvas and 50% labor split accounting.
- Working Brand Warranty RMA Hub with parcel tracking and customer SMS alert.
- Working manual MFS desk with USSD balance reconciliation.
- Working isolated Personal Ledger visible solely to Store Owner.

#### 6. Testing & Verification Requirements:
- Test MFS Cash-In: ৳2,000 cash in increments drawer by ৳2,000, decrements agent SIM float by ৳2,000, credits commission +৳8.20 (TC-33).
- Test Personal Ledger isolation: Personal contact created in Amanat does not appear in customer tables and causes zero changes to store revenue or P&L (TC-32).
- Test Police PDF stream: Verify generated PDF contains valid seller photo, NID number, IMEI, and legal undertaking text.
- Test RMA lifecycle: Ingest device -> transition to delivered -> verify customer SMS log is created in \`sms_logs\`.

#### 7. Acceptance Criteria:
- Zero cross-contamination between personal ledger transactions and shop P&L statements.
- Repair tickets accurately display the 9-dot pattern sequence.

#### 8. Dependencies, Risks & Unresolved Decisions:
- **Decision Codified:** Google Play policy forbids SMS scraping; 100% manual entry is mandatory and compliant.

#### 9. Phase Exit Conditions:
- All 6 specialized Dokan modules pass end-to-end user journey tests.

---

### Phase 10: Accounts, Drawers, Shift Closing, SMS Desk & HR Payroll

#### 1. Objectives & Expected Outcomes:
- Build chart of accounts, cash drawers, bank deposits, and OPEX expense slips.
- Implement Day-End Blind Cash Closing (Z-Report) with one recount grace attempt and shift lock.
- Implement SMS Notification Desk & Template Customizer (\`Screen 15\`).
- Implement Pre-Launch Fresh Start Reset Protocol (TC-18) allowing owners to purge test transactions before grand opening.
- Implement automated HR payroll aggregating salesperson commissions and technician 50% splits.

#### 2. Tasks & Subtasks in Order of Execution:
1. **Accounts & Drawers Management:**
   - View cash drawers, bank accounts, and digital floats with real-time balances.
   - Inter-account fund transfers (e.g. Counter Cash Drawer to BRAC Bank deposit).
   - OPEX petty expense vouchers (\`cash_out\`) for shop tea, electricity, entertainment, and rent.
2. **Day-End Shift Closing & Z-Report Engine:**
   - Morning shift opening: record starting cash float (\`POST /api/v1/closing/shift-open\`).
   - Blind note count submission: cashier submits physical note breakdown (1000, 500, 200, 100, 50, 20, 10) without seeing system target balance.
   - **Single Recount Grace Protocol:** Cashier is granted exactly **one recount grace attempt** before register is permanently locked.
   - Finalize shift (\`POST /api/v1/closing/finalize\`): calculate shortage/excess variance, require reason input if variance !== 0, print Z-Report thermal receipt, and send SMS digest to store owner.
3. **SMS Notification Desk & Template Editor (\`Screen 15\`):**
   - Manage SMS templates (\`sms_templates\`) with dynamic variable tags: \`{{customerName}}\`, \`{{invoiceNo}}\`, \`{{dueAmount}}\`, \`{{shopName}}\`.
   - Monitor remaining telecom SMS gateway credit balance.
   - Custom SMS broadcast engine to filtered customer segments.
4. **Pre-Launch Fresh Start Reset Protocol (TC-18):**
   - Build 2FA-secured Fresh Start Reset tool in Settings (\`POST /api/v1/shops/fresh-start-reset\`).
   - Verify Store Owner master password + 6-digit SMS OTP challenge.
   - Purge test sales, stock movements, shifts, and vouchers while strictly preserving product master catalog, categories, brands, outlets, and shop settings (TC-18).
5. **HR, Sales Targets & Payroll Disbursal (TX-18):**
   - Aggregate monthly salesperson commissions based on quotas and targets.
   - Aggregate technician 50% repair labor splits from \`payroll_ledger\`.
   - Disburse monthly payroll: Debit \`5010-Salary-OPEX\`, Credit \`1010-Cash-Drawer\` or \`1030-Bank-Accounts\`.

#### 3. Relevant Modules & Dependencies:
- Backend: \`packages/api/src/modules/accounts\`, \`closing\`, \`sms\`, \`hr\`, \`shops\`.
- Frontend: \`apps/web-erp/src/pages/accounts\`, \`closing\`, \`settings/sms\`, \`hr\`.

#### 4. Required Documentation to Consult:
- [\`UI_UX_BLUEPRINT.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/UI_UX_BLUEPRINT.md) — Section 5.4 (Decision 4: Closing Recount Protocol).
- [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) — Section 5.2 (Wireframe Screen 02: Shift Closing), Section 5.15 (Screen 15: SMS Notification Desk).
- [\`api-spec.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md) — Section 5.19 (Accounts), Section 5.20 (Closing), Section 5.21 (HR), Section 5.22 (SMS).
- [\`prd.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) — TC-18 (Fresh Start Reset), TC-40.
- [\`DATABASE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) — Section 22 (TX-18 Payroll Disburse).

#### 5. Expected Deliverables:
- Working Accounts & Expense manager.
- Working Blind Cash Closing workflow with note calculator and Z-Report generator.
- Working SMS notification template desk.
- Working Fresh Start Reset tool in settings.
- Working HR Payroll accrual and disbursement engine.

#### 6. Testing & Verification Requirements:
- Test recount limit: Second submission on recount attempt disables recount button and locks register with \`RECOUNT_LIMIT_EXCEEDED\` (422).
- Test Fresh Start reset: Execute reset with valid 2FA; verify test sales and stock transactions are purged while product master catalog remains intact (TC-18).
- Test payroll split: Completed repair with ৳1,000 labor fee accurately accrues ৳500 to technician's pending payroll balance.

#### 7. Acceptance Criteria:
- Shift closing locks terminal and blocks subsequent sales until morning opening float is recorded.
- Z-Report accurately summarizes cash, MFS, card, dues, expenses, and note breakdown.

#### 8. Dependencies, Risks & Unresolved Decisions:
- **Rule Enforced:** Negative cash balance is strictly prevented in drawers and bank accounts.

#### 9. Phase Exit Conditions:
- Accounting, shift closing, and SMS desk modules pass financial consistency audits.

---

### Phase 11: Public Marketing Website (\`bebsayik.com\`) & Dokan Setup Wizard

#### 1. Objectives & Expected Outcomes:
- Build high-converting public marketing website on \`bebsayik.com\` showcasing Dokan features, transparent pricing, and ROI calculator.
- Implement 3-step Dokan Onboarding Setup Wizard creating new shop tenants atomically.
- Implement Opening Balance Wizard balancing opening inventory, cash, and receivables into Opening Equity with zero artificial P&L impact.

#### 2. Tasks & Subtasks in Order of Execution:
1. **Public Marketing Website (\`apps/marketing\`):**
   - Landing page (\`/\`): Hero value proposition, feature highlights, mobile touch POS previews, and 14-day free trial CTA (TC-37).
   - Features page (\`/features\`): Deep-dives into Dual-IMEI tracking, Kisti, Police Buyback, and MFS desk.
   - Pricing page (\`/pricing\`): Transparent tiers (Silver, Gold, Diamond), tenure toggle (Monthly, 6-Month 10% off, 1-Year 16% off), and ROI savings calculator.
   - Pre-launch App Store badge modal: Capture mobile number for launch alert into \`marketing_leads\` (TC-43).
   - Legal compliance pages: \`/terms\`, \`/privacy\`, \`/contact\`, and Kanchan Telecom heritage story on \`/about\`.
2. **Passwordless Onboarding Registration (\`/register\`):**
   - 11-digit Bangladeshi mobile number input -> SMS OTP challenge -> verified account creation.
3. **3-Step Dokan Setup Wizard (\`/onboarding/setup\`):**
   - **Step 1: Dokan Identity:** Shop name, market/building location, registered mobile, and optional NBR BIN.
   - **Step 2: Outlets & Warehouses:** Primary counter outlet name and godown warehouse selection.
   - **Step 3: Security & Staff:** Set Store Owner permanent password and 4-digit Manager Override PIN.
   - **Atomic Creation:** Create \`shops\` record, assign owner as \`STORE_OWNER\`, provision default chart of accounts (TC-30).
4. **Opening Balance Onboarding Wizard:**
   - Input opening stock value, cash in drawer, bank balance, customer receivables, and supplier payables.
   - Automatically balance into \`3010-Opening-Equity\` (\`Assets - Liabilities\`) with **0.00% P&L impact** (TC-24).

#### 3. Relevant Modules & Dependencies:
- Frontend: \`apps/marketing\`, \`apps/web-erp/src/pages/onboarding\`.
- Backend: \`packages/api/src/modules/shops\`, \`packages/api/src/modules/onboarding\`.

#### 4. Required Documentation to Consult:
- [\`prd.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) — Section 1.2 (Subdomain Inventory), TC-24, TC-30, TC-37, TC-43.
- [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) — Section 2.1 (Marketing Routes), Section 4 (Onboarding Wizard Wireframe).

#### 5. Expected Deliverables:
- Public marketing website deployed on \`bebsayik.com\`.
- 3-step Dokan setup wizard creating fully functional shop tenants in <60 seconds.
- Opening balance wizard balancing opening equity.

#### 6. Testing & Verification Requirements:
- Test opening balance invariant: Input ৳2,00,000 stock, ৳50,000 cash, ৳40,000 due, ৳30,000 payable. Verify Opening Equity is ৳2,60,000 with ৳0.00 P&L impact (TC-24).
- Test tenant provisioning: New registration atomically creates shop with RLS isolation and default chart of accounts (TC-30).

#### 7. Acceptance Criteria:
- Marketing website loads in <1.5s with optimized Lighthouse performance score (>90).
- New shop setup completes with zero manual database intervention.

#### 8. Dependencies, Risks & Unresolved Decisions:
- **Requirement:** Domain DNS must route \`bebsayik.com\` to marketing app and \`app.bebsayik.com\` to Web ERP.

#### 9. Phase Exit Conditions:
- Onboarding flow passes end-to-end registration tests from public landing page to active ERP dashboard.

---

### Phase 12: SaaS Billing Engine, Webhook Processors & Platform Admin Portal (\`admin.bebsayik.com\`)

#### 1. Objectives & Expected Outcomes:
- Build subscription billing engine with coupon discounts, PayStation/EPS/bKash checkout, and timing-safe HMAC webhooks.
- Implement subscription lifecycle state machine: 14-day trial -> active -> grace period -> read-only mode -> export guarantee.
- Build Central Platform Admin Portal (\`admin.bebsayik.com\`) for global MRR metrics, non-destructive shop suspension, and hotline emergency phone migration.

#### 2. Tasks & Subtasks in Order of Execution:
1. **Subscription & Billing Engine:**
   - Subscription plans management (Silver, Gold, Diamond).
   - Promo discount coupon validator (\`POST /api/v1/billing/validate-coupon\`) for campaigns like \`EID2026\`.
   - Checkout generator redirecting to PayStation, EPS, or bKash payment URLs.
2. **Payment Gateway Webhook Handlers (\`/api/v1/webhooks/*\`):**
   - Timing-safe HMAC-SHA256 signature verification middleware using \`crypto.timingSafeEqual\`.
   - Idempotent processing updating \`subscription_invoices\` and extending shop license (TC-34).
   - 3-minute background poller sweeper: recover delayed webhooks by querying gateway status API directly (TC-49).
3. **Subscription Lifecycle Guard:**
   - 14-day free Gold trial expiration -> 3-day grace period with reminder banner -> read-only mode (TC-25, TC-35).
   - Read-only mode: block new sales checkout; keep historical invoices, due collection, and full data export 100% accessible (TC-26).
4. **Central Platform Admin Portal (\`admin.bebsayik.com\`):**
   - SaaS KPI dashboard: Total active shops, MRR, churn rate, SMS gateway balance.
   - Non-destructive shop suspension: Set shop to \`suspended\` in 1 click without deleting any inventory or sales history (TC-38).
   - Emergency Lost SIM Phone Migration Hotline: Super Admin verifies owner NID & Trade License; migrates phone with audit ticket (TC-56).
   - Plan price versioning: Admin updates plan price; existing subscriber renewals maintain snapshot pricing (TC-39).
   - Platform RBAC gate: Restrict \`admin.bebsayik.com\` strictly to \`SUPER_ADMIN\` (TC-44).

#### 3. Relevant Modules & Dependencies:
- Backend: \`packages/api/src/modules/billing\`, \`webhooks\`, \`admin\`.
- Frontend: \`apps/admin\`, \`apps/web-erp/src/pages/settings/billing\`.

#### 4. Required Documentation to Consult:
- [\`prd.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) — Section 7 (SaaS Monetization), Section 8 (Platform Admin), TC-25, TC-26, TC-34, TC-35, TC-38, TC-39, TC-44, TC-49, TC-56.
- [\`api-spec.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md) — Section 5.24 (Billing), Section 5.26 (Admin), Section 5.27 (Webhooks), Section 5.30 (HMAC Verification Guide).
- [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) — Section 2.3 (Admin Routes).

#### 5. Expected Deliverables:
- Working subscription checkout and webhook processors with HMAC verification.
- Platform admin portal on \`admin.bebsayik.com\`.
- Automated subscription expiration cron workers.

#### 6. Testing & Verification Requirements:
- Webhook idempotency test: Fire identical PayStation webhook twice; license extends once without double billing (TC-34).
- Read-only test: Expired shop cannot create sale, but due collection and CSV export function normally (TC-25, TC-26).
- Hotline migration test: Super Admin migrates stolen phone number with NID audit ticket (TC-56).

#### 7. Acceptance Criteria:
- Webhooks reject forged signatures with HTTP 401.
- Suspended shops cannot log in; reactivation restores 100% of data instantly.

#### 8. Dependencies, Risks & Unresolved Decisions:
- **Sandbox Requirement:** Payment gateway sandbox credentials required for end-to-end automated testing.

#### 9. Phase Exit Conditions:
- Billing engine and admin portal pass all operational verification tests.

---

### Phase 13: End-to-End Test Suite Execution (TC-01 through TC-56 & Aggregations AP-01 to AP-03)

#### 1. Objectives & Expected Outcomes:
- Execute and pass automated end-to-end test suites covering all **56 test cases (TC-01 through TC-56)** specified in [\`prd.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md).
- Validate all financial report aggregations (AP-01 Sales/COGS/Gross Profit, AP-02 Aging Inventory, AP-03 Technician Splits, and NBR Mushak 6.3 VAT).
- Perform security, penetration, and concurrency load tests.

#### 2. Tasks & Subtasks in Order of Execution:
1. **Automated Master Test Suite (Vitest & Playwright):**
   - **Auth & Identity (TC-29, 40, 41, 45, 50, 51, 52, 53, 56):** Test OTP, password lockout, dual-OTP migration, staff termination.
   - **Inventory & IMEI (TC-18, 19, 22, 23, 28, 36, 48):** Test specific COGS, scrap loss, STN transit dispute, offline block.
   - **POS & Checkout (TC-01, 02, 03, 04, 31, 33, 47):** Test cash, MFS, card, due tenders, reprint idempotency.
   - **Returns & Exchanges (TC-20, 21):** Test return quarantine and due reduction netting.
   - **MFS & Personal Ledgers (TC-31, 32, 33, 42):** Test commission math, personal contact isolation, zero SMS scraping.
   - **SaaS Lifecycle (TC-17, 25, 26, 27, 34, 35, 38, 39, 43, 44, 49):** Test trial expiry, read-only mode, webhook idempotency, admin isolation.
   - **Hardware & Multi-Shop (TC-54, 55):** Test thermal print format and workspace switching.
2. **Financial Aggregation Pipeline Tests:**
   - **AP-01 (Sales, Landed COGS & Gross Profit):** Verify exact daily gross profit matches \`Sales Revenue - Landed Handset Cost - Accessory Cost\`.
   - **AP-02 (Inventory Aging):** Verify accurate categorization into 0-30, 31-60, 61-90, and >90 days aging buckets.
   - **AP-03 (Technician 50% Splits):** Verify completed repair labor splits match exactly 50% without rounding drift.
   - **Mushak 6.3 VAT Report:** Verify NBR tax summary accurately isolates VAT-applicable accessories and exempt items.
3. **Concurrency & Race Condition Stress Testing:**
   - Simulate 50 concurrent checkouts attempting to purchase the same 5 available IMEIs.
   - Assert exactly 5 checkouts succeed and 45 receive \`409 Conflict\` (\`IMEI_ALREADY_SOLD\`).

#### 3. Relevant Modules & Dependencies:
- \`packages/api/test\`, \`apps/web-erp/e2e\`, Playwright, Vitest, k6 for load testing.

#### 4. Required Documentation to Consult:
- [\`prd.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) — Section 8 (Test Cases TC-01 through TC-56).
- [\`DATABASE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) — Section 20 (Aggregation Pipelines AP-01, AP-02, AP-03).
- [\`Requirement Validation.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/Requirement%20Validation.md) — Traceability Matrix.

#### 5. Expected Deliverables:
- Comprehensive automated test reports with 100% green pass status across TC-01 to TC-56.
- Load test report demonstrating zero double-selling under concurrent scan loads.

#### 6. Testing & Verification Requirements:
- Execute \`npm run test:e2e\` and \`npm run test:unit\`.
- All 56 test scenarios must execute and pass without skips.

#### 7. Acceptance Criteria:
- 100% test pass rate.
- Financial ledgers balance with zero unallocated paisa.

#### 8. Dependencies, Risks & Unresolved Decisions:
- **Zero Compromise:** Any failing test case in the TC-01 to TC-56 suite blocks production deployment.

#### 9. Phase Exit Conditions:
- All automated test suites green and verified.

---

### Phase 14: Production Containerization, CI/CD Pipeline & Deployment Runbook

#### 1. Objectives & Expected Outcomes:
- Containerize Node.js Express backend and three React Vite frontends with multi-stage production Dockerfiles.
- Configure Cloudflare Edge CDN (TLS 1.3, HSTS, WAF, domain routing for the 3 subdomains).
- Establish CI/CD automated deployment pipelines with zero-downtime rolling updates and disaster recovery procedures.

#### 2. Tasks & Subtasks in Order of Execution:
1. **Multi-Stage Docker Containerization:**
   - \`Dockerfile.api\`: Multi-stage build for Node.js Express TypeScript API (Node 20 Alpine, non-root user \`node\`, health check \`/api/v1/health\`).
   - \`Dockerfile.web\`: Multi-stage build compiling React Vite apps into static assets served via hardened Nginx Alpine with gzip/brotli compression and security headers (CSP, X-Frame-Options, HSTS).
2. **Cloudflare Edge CDN & DNS Configuration:**
   - Configure DNS routing:
     - \`bebsayik.com\` -> Marketing static edge host
     - \`app.bebsayik.com\` -> Web ERP & POS SPA edge host
     - \`admin.bebsayik.com\` -> Super Admin SPA edge host
     - \`api.bebsayik.com\` -> Cloudflare Load Balancer -> Node.js API cluster
   - Enforce TLS 1.3, HSTS (max-age: 31536000), and Turnstile CAPTCHA endpoints.
3. **CI/CD Automation (GitHub Actions / GitLab CI):**
   - Pipeline stages: \`Lint & Typecheck\` -> \`Unit Tests\` -> \`E2E Tests\` -> \`Docker Build & Push\` -> \`Zero-Downtime Rolling Deploy\`.
4. **Production Monitoring & Backup Operations:**
   - Winston structured JSON logger piping to Datadog / Grafana Loki.
   - Sentry error tracking integrated in backend and frontend apps.
   - MongoDB Atlas continuous automated backups with 35-day Point-In-Time Recovery (PITR).
   - Redis cluster persistence (AOF + RDB snapshots).
5. **Post-Deployment Smoke Verification Runbook:**
   - Automated post-deploy smoke test verifying:
     1. \`api.bebsayik.com/api/v1/health\` returns HTTP 200 with DB & Redis ping.
     2. Marketing site renders with CTA button active.
     3. Web ERP login screen loads and accepts SMS OTP.
     4. POS scanner lookup responds in <150ms.

#### 3. Relevant Modules & Dependencies:
- \`.github/workflows\`, \`docker/\`, Docker, Nginx, Cloudflare, Sentry.

#### 4. Required Documentation to Consult:
- [\`ARCHITECTURE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/ARCHITECTURE.md) — Section 4 (Deployment Topology), Section 12 (CI/CD Pipelines), Section 13 (Disaster Recovery).
- [\`api-spec.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md) — Section 2.1 (Base URLs & Protocol).

#### 5. Expected Deliverables:
- Production Dockerfiles and Docker Compose production profiles.
- Working CI/CD pipeline scripts.
- Post-deployment smoke verification test script.

#### 6. Testing & Verification Requirements:
- Execute staging deployment; verify all three subdomains route to their respective application bundles.
- Execute simulated database failover; verify application reconnects without data corruption.

#### 7. Acceptance Criteria:
- Automated rolling update completes with zero dropped HTTP requests.
- Health check endpoints report healthy statuses across all infrastructure nodes.

#### 8. Dependencies, Risks & Unresolved Decisions:
- **Prerequisite:** Production domain names, Cloudflare account, and MongoDB Atlas dedicated cluster.

#### 9. Phase Exit Conditions:
- Bebsayik.com is live in production, passing all health checks and processing live merchant transactions.

---

## 2. Master Execution Dependency Graph

\`\`\`mermaid
graph TD
    P0[Phase 0: Workspace & Tooling] --> P1[Phase 1: Database & Double-Entry Engine]
    P1 --> P2[Phase 2: Auth & Session Engine]
    P2 --> P3[Phase 3: Multi-Tenancy & RBAC Guards]
    P0 --> P4[Phase 4: Design Tokens & UI Components]
    P3 --> P5[Phase 5: Catalog, IMEI & Scrap Hub]
    P4 --> P5
    P5 --> P6[Phase 6: Procurement & Transfers]
    P5 --> P7[Phase 7: POS Counter & Hardware Settings]
    P7 --> P8[Phase 8: Returns & Customer Dues]
    P8 --> P9[Phase 9: Specialized Dokan Modules & RMA]
    P9 --> P10[Phase 10: Accounts, Shift Closing & SMS]
    P3 --> P11[Phase 11: Marketing & Dokan Onboarding]
    P4 --> P11
    P10 --> P12[Phase 12: Billing & Platform Admin]
    P11 --> P12
    P6 --> P13[Phase 13: E2E Test Suite TC-01 to TC-56]
    P7 --> P13
    P8 --> P13
    P9 --> P13
    P10 --> P13
    P12 --> P13
    P13 --> P14[Phase 14: Containerization & Deployment]

    classDef phase fill:#1E293B,stroke:#0D9488,stroke-width:2px,color:#F8FAFC;
    classDef gate fill:#0F766E,stroke:#38BDF8,stroke-width:2px,color:#FFFFFF;
    class P0,P1,P2,P3,P4,P5,P6,P7,P8,P9,P10,P11,P12 phase;
    class P13,P14 gate;
\`\`\`

---

## 3. Strict Pre-Development Guardrails

Future coding agents and software engineers must adhere to the following rules:

1. **Sequential Execution:** Never jump to frontend UI implementation (Phase 7 or 9) before the database (Phase 1) and authorization guards (Phase 3) are complete and tested.
2. **Zero Code Invention:** Never invent new database fields or endpoints not defined in [\`DATABASE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) or [\`api-spec.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md).
3. **Double-Entry Invariant:** Every mutation modifying money balances must post balanced debits and credits via \`AccountingService.postDoubleEntryJournal()\`. Floating-point numbers are strictly forbidden.
4. **Multi-Tenant Protection:** Every query must filter by \`shopId\`. Global queries are permitted only in Platform Admin routes verified by \`SUPER_ADMIN\` role.
5. **No SMS Scraping:** MFS transactions are entered 100% manually. Android background SMS scraping permissions are strictly banned.
6. **Owner Decision Invariants:** Preserve the 4 owner-approved decisions: Landscape tablet POS, ESC/POS English thermal receipts (<0.3s), Manager PIN override modal, and 1 recount grace attempt before shift lock.

---

## 4. Master AI Agent Execution Prompt Catalog

This section provides **verbatim, ready-to-execute copy-paste prompts** for orchestrating autonomous AI coding agents across each individual phase. When initiating a phase, supply the corresponding prompt below to the agent.

---

### 4.0 Prompt for Phase 0: Workspace Architecture, Tooling, Docker & Seed Profiles
\`\`\`markdown
You are an expert Principal Systems Architect and DevOps Engineer. Your task is to execute **Phase 0** of the Bebsayik.com SaaS platform according to the master specification.

**Context & Baseline Specifications:**
- Review ARCHITECTURE.md (Sections 1, 4, 5) and prd.md (Section 1.2).
- System Name: Bebsayik.com (Multi-tenant SaaS ERP + POS).

**Your Objectives:**
1. Initialize a clean TypeScript monorepo workspace (npm workspaces or pnpm):
   - \`apps/marketing\` (React 18+, Vite, Tailwind CSS)
   - \`apps/web-erp\` (React 18+, Vite, Tailwind CSS)
   - \`apps/admin\` (React 18+, Vite, Tailwind CSS)
   - \`packages/api\` (Node.js 20+, Express, TypeScript)
   - \`packages/shared-types\` (TypeScript types, Zod schemas)
   - \`packages/ui-tokens\` (Tailwind config, shared design tokens)
2. Setup root tooling: \`tsconfig.base.json\` (strict mode enabled), ESLint 9+, Prettier, Vitest, and Playwright.
3. Configure \`docker-compose.yml\` with:
   - MongoDB 7.0+ initialized as a single-node replica set (\`rs0\`) to support Mongoose ACID multi-document transactions.
   - Redis 7+ for rate-limiting, session revocation, and distributed locks.
4. Setup \`migrate-mongo\` configuration in \`packages/api\` and create \`seed_dev.ts\` seeding the "Kanchan Telecom Demo Store" profile.
5. Generate comprehensive \`.env.example\` files across all apps and packages.

**Verification Commands to Run:**
- \`npm run build\` must compile all packages with zero TypeScript errors.
- \`npm run lint\` must pass with zero warnings or errors.
- Verify MongoDB replica set: \`mongosh --eval "rs.status().ok"\` returns 1.

Do not write application business logic or schemas belonging to subsequent phases. When all deliverables are verified, report completion against Phase 0 exit criteria.
\`\`\`

---

### 4.1 Prompt for Phase 1: Database Persistence Layer & Double-Entry Financial Engine
\`\`\`markdown
You are a Senior Database Engineer and Financial Software Specialist. Your task is to execute **Phase 1** of Bebsayik.com according to DATABASE.md and api-spec.md.

**Context & Baseline Specifications:**
- Authoritative source: DATABASE.md (Sections 1 to 21 for Schemas, Section 22 for Financial Matrix TX-01 to TX-19).
- Monetary standards: api-spec.md Section 6.2 (Decimal128 & decimal.js precision).

**Your Objectives:**
1. In \`packages/api/src/models\`, implement all 36 Mongoose 8+ schemas defined in DATABASE.md:
   - shops, users, user_devices, auth_otps, phone_change_requests
   - categories, brands, products, product_variants, imei_serials
   - inventory_movements, stock_transfer_notes, damaged_stock_scraps, warranty_claims
   - suppliers, purchase_orders, goods_received_notes, purchase_return_vouchers
   - sales, sale_items, held_carts, customer_return_vouchers
   - customers, kisti_contracts, kisti_installments, buyback_agreements
   - service_jobs, service_parts_consumed
   - accounts, account_transactions, mfs_transactions, personal_ledger_contacts, personal_ledger_transactions
   - shifts, shift_denominations
   - employee_targets, payroll_ledger, sms_logs, sms_templates, shop_hardware_configs, subscription_plans, subscription_invoices, promo_codes, marketing_leads.
2. Enforce compound indexes: \`{ shopId: 1, ... }\` across all tenant collections. Setup TTL index (120s) on \`auth_otps\`.
3. Create \`money.ts\` using \`decimal.js\` ensuring all monetary operations avoid IEEE 754 float drift.
4. Implement \`withTransaction<T>()\` ACID session execution wrapper.
5. Implement \`AccountingService.postDoubleEntryJournal()\` with strict double-entry balance validation (\`sum(debits) === sum(credits)\`) and codify posting definitions for TX-01 through TX-19.
6. Create database seeder script populating default chart of accounts (1010-Cash-Drawer, 1020-MFS-Floats, 2010-Accounts-Payable, 4010-Sales-Revenue, etc.).

**Verification Commands to Run:**
- \`npm run test:unit\` running tests for \`money.ts\` and \`AccountingService\`.
- Assert transaction rollback occurs when debits do not equal credits.
- Assert MongoDB indexes match specification.

Do not implement REST routes yet. When verified, report completion against Phase 1 exit criteria.
\`\`\`

---

### 4.2 Prompt for Phase 2: Authentication, Identity Lifecycle & Security Gateways
\`\`\`markdown
You are a Principal Security and Authentication Engineer. Your task is to execute **Phase 2** of Bebsayik.com according to api-spec.md and appflow.md.

**Context & Baseline Specifications:**
- Consult: api-spec.md (Sections 3, 5.1, 5.3), appflow.md (Sections 3, 8), prd.md (TC-29, 40, 41, 50, 51, 52, 53).

**Your Objectives:**
1. Implement SMS adapter interface and development \`MockSmsDriver\`.
2. Implement Passwordless SMS OTP endpoints (\`/api/v1/auth/otp/*\`):
   - Cloudflare Turnstile token verification.
   - 6-digit numeric OTP generation, SHA-256 hash storage in \`auth_otps\` with 120s TTL.
   - Redis sliding window rate limiter: strictly 3 requests per 15 minutes per phone.
3. Implement permanent login (\`/api/v1/auth/login\`) with Argon2id and 5-attempt / 15-minute lockout (\`lockedUntil\`).
4. Implement JWT session engine: 15-minute Access Token, 7-day HTTP-only Refresh Cookie, and instant \`users.tokenVersion\` session kill-switch.
5. Implement Password Recovery on \`/recovery\` (\`POST /api/v1/auth/recovery/reset\`).
6. Implement 180s Dual-OTP Mobile Migration (\`/auth/phone-change/initiate\` & \`/complete\`).
7. Implement Staff Emergency Kill-Switch (\`POST /users/:id/emergency-terminate\`) killing staff sessions in <1s with 403 STAFF_TERMINATED.

**Verification Commands to Run:**
- \`npm run test:auth\` verifying rate limiting, 5-attempt lockout, token version kill-switch, and dual-OTP verification.

Report completion against Phase 2 exit criteria upon passing tests.
\`\`\`

---

### 4.3 Prompt for Phase 3: Multi-Tenancy Isolation, RBAC & Context Guards
\`\`\`markdown
You are a Senior Backend Architect specializing in Multi-Tenancy and Authorization. Your task is to execute **Phase 3** of Bebsayik.com.

**Context & Baseline Specifications:**
- Consult: ARCHITECTURE.md (Sections 3, 15), api-spec.md (Sections 4, 5.2, 5.3), appflow.md (Section 12).

**Your Objectives:**
1. Build \`tenantGuard\` Express middleware:
   - Extract and validate \`X-Shop-Id\` header against user's authorized shops.
   - Inject \`req.tenant = { shopId, role, permissions }\` into request context.
   - Enforce database-level \`shopId\` filtering on all queries and mutations.
2. Build \`requireRole\` RBAC middleware enforcing permissions for all 7 roles:
   SUPER_ADMIN, STORE_OWNER, STORE_MANAGER, SALESPERSON, CASHIER, TECHNICIAN, ACCOUNTANT.
3. Implement Workspace Switching APIs (\`/api/v1/shops/*\`):
   - \`GET /shops/my-shops\`, \`POST /shops/switch-workspace\`, \`GET/PATCH /shops/profile\`.
4. Implement Manager 4-Digit Override PIN verification (\`POST /api/v1/users/manager-pin/verify\`) issuing a 60-second signed override token.
5. Strict Invariant: Personal Ledger routes (\`/personal-ledger/*\`) are permanently restricted to STORE_OWNER only.

**Verification Commands to Run:**
- \`npm run test:rbac\` executing cross-tenant penetration tests and negative authorization matrix tests.

Report completion against Phase 3 exit criteria upon passing all tests.
\`\`\`

---

### 4.4 Prompt for Phase 4: Design Tokens, UI Components & PWA Mobile Shell
\`\`\`markdown
You are a Principal Frontend UI/UX Engineer. Your task is to execute **Phase 4** of Bebsayik.com according to UI_UX_BLUEPRINT.md and appflow.md.

**Context & Baseline Specifications:**
- Consult: UI_UX_BLUEPRINT.md (Sections 3, 4, 5), appflow.md (Sections 6, 8).

**Your Objectives:**
1. In \`packages/ui-tokens\`, configure master CSS variables and Tailwind tokens:
   - Slate surface palette (Dark/Elevated Slate surfaces).
   - Teal/Emerald brand colors (#0D9488, #0F766E).
   - Semantic status palette (Emerald, Amber, Crimson, Purple).
   - Typography: Inter/Outfit with mandatory \`font-variant-numeric: tabular-nums\` (\`tnum\`).
   - 44x44px minimum touch targets.
2. In \`apps/web-erp/src/components\`, implement reusable UI component contracts:
   - Button, IconButton, DataTable, VirtualizedList, Modal, Drawer, EmptyState, ErrorBoundary, OfflineSyncBanner.
3. Build specialized retail Dokan widgets:
   - Touch-screen Numpad for cash and note calculation.
   - 3x3 Pattern Lock Canvas for technician device unlock recording.
   - ManagerPinOverrideModal overlay.
   - MultiShopSwitcherModal.
4. Configure PWA Web App Manifest (\`manifest.webmanifest\`) and Service Worker for mobile caching.

**Verification Commands to Run:**
- \`npm run test:ui\` verifying component contracts, touch target sizes, and tabular numbers formatting.

Report completion against Phase 4 exit criteria upon passing tests.
\`\`\`

---

### 4.5 Prompt for Phase 5: Catalog, Dual-IMEI Inventory & Damaged Stock Scrap
\`\`\`markdown
You are a Full-Stack Engineer. Your task is to execute **Phase 5** of Bebsayik.com according to prd.md, DATABASE.md, and api-spec.md.

**Context & Baseline Specifications:**
- Consult: prd.md (Section 4, TC-22, 23), DATABASE.md (TX-17), api-spec.md (Sections 5.4, 5.5, 5.8), appflow.md (Screen 03, Screen 14).

**Your Objectives:**
1. Implement Catalog CRUD: Categories, Brands, Products, and Variants (\`/api/v1/catalog/*\`).
2. Implement bulk Excel/CSV ingestion engine (\`POST /api/v1/catalog/import-excel\`) with template download.
3. Implement Dual-IMEI serialized inventory engine (\`/api/v1/inventory/imei/*\`):
   - Track imei1, imei2, specific landed purchase cost, and 7-stage lifecycle state machine.
   - Sub-150ms scanner lookup endpoint (\`GET /inventory/imei/scan/:code\`) with Redis cache.
   - Aging inventory report (>60/90 days).
4. Implement non-serialized accessory movements ledger and manual stock adjustments with Manager PIN.
5. Implement Damaged Stock Scrap Hub (\`POST /api/v1/inventory/damage/scrap\` - TX-17):
   - Record damaged phone write-off with webcam photo and Manager PIN.
   - Debit 5020-Damaged-Stock-Loss, Credit 1210-Handset-Inventory.
6. Build frontend UI pages in \`apps/web-erp\` for Inventory, Catalog, and Damaged Stock Scrap.

**Verification Commands to Run:**
- \`npm run test:inventory\` verifying scan latency (<150ms), Luhn check rejection, specific cost integrity, and scrap loss write-off.

Report completion against Phase 5 exit criteria upon passing tests.
\`\`\`

---

### 4.6 Prompt for Phase 6: Procurement, Supplier Ledgers & Stock Transfers
\`\`\`markdown
You are a Full-Stack Engineer. Your task is to execute **Phase 6** of Bebsayik.com.

**Context & Baseline Specifications:**
- Consult: DATABASE.md (TX-07 GRN, TX-08 PRV, TX-19 STN), api-spec.md (Sections 5.7, 5.10), prd.md (TC-19, 28, 36).

**Your Objectives:**
1. Implement Supplier CRM & Payables Ledger (\`/api/v1/procurement/suppliers/*\`).
2. Implement Goods Received Note (GRN - TX-07):
   - Ingest PO, scan dual-IMEIs, freeze specific unit purchase cost.
   - Debit 1210-Handset-Inventory, Credit 2010-Accounts-Payable. Support partial GRN (TC-28).
3. Implement Purchase Return Voucher (PRV - TX-08):
   - Return defective phones to supplier. Debit 2010-Accounts-Payable, Credit 1210-Handset-Inventory (TC-19).
4. Implement Godown ↔ Outlet Stock Transfers (STN - TX-19):
   - Dispatch STN (IN_TRANSIT) and scan-to-receive at outlet. Handle transit disputes with owner SMS (TC-36).
5. Build frontend UI pages in \`apps/web-erp\` for Procurement and Stock Transfers.

**Verification Commands to Run:**
- \`npm run test:procurement\` verifying GRN cost freeze, PRV liability netting, and STN dispute alerts.

Report completion against Phase 6 exit criteria upon passing tests.
\`\`\`

---

### 4.7 Prompt for Phase 7: POS Counter Sales, Multi-Tender Checkout, Hardware Drivers & Settings
\`\`\`markdown
You are a Principal POS & Hardware Integration Engineer. Your task is to execute **Phase 7** of Bebsayik.com.

**Context & Baseline Specifications:**
- Consult: UI_UX_BLUEPRINT.md (Decisions 1, 2), appflow.md (Screen 01, Screen 16, Section 11), api-spec.md (Sections 5.11, 5.23, 5.29), prd.md (TC-01 to 04, 47, 48, 54).

**Your Objectives:**
1. Build Landscape Tablet POS Interface (1024×768+ fixed dual-column layout):
   - Left: Scanner input, customer lookup (F3), reactive cart. Right: Summary, split tenders, numpad, pay (F12).
   - Accelerators: F1 through F12.
2. Implement Atomic POS Checkout API (\`POST /api/v1/pos/checkout\`):
   - Mandatory UUIDv4 Idempotency-Key. Redis distributed lock on IMEIs.
   - Minimum Selling Price (MSP) floor check with Manager PIN override.
   - Double-entry journals for Cash, MFS, Bank/Card, Customer Due, Sales Revenue, and Specific COGS.
3. Implement Cart Hold & Recall (F5/F6) via \`/api/v1/pos/held-carts\`.
4. Implement Hardware Station Settings Screen (\`/app/settings/hardware\`, Screen 16) saving 58mm/80mm, cash drawer kick, and scanner wedge preferences in \`shop_hardware_configs\`.
5. Implement WebUSB/Bluetooth thermal printing engine (<0.3s ESC/POS English text mode) and RJ11 drawer kick pulse (\`0x1B 0x70 0x00 0x19 0xFA\`).
6. Implement invoice reprint counter idempotency (TC-47).
7. Implement IndexedDB offline queue strictly blocking serialized handset checkouts (TC-48).

**Verification Commands to Run:**
- \`npm run test:pos\` verifying sub-250ms checkout, concurrent scan locks, reprint counters, and offline handset blocking.

Report completion against Phase 7 exit criteria upon passing tests.
\`\`\`

---

### 4.8 Prompt for Phase 8: Sales Returns, Customer Dues & Bakir Khata Subledger
\`\`\`markdown
You are a Full-Stack Engineer. Your task is to execute **Phase 8** of Bebsayik.com.

**Context & Baseline Specifications:**
- Consult: DATABASE.md (TX-05 CRV, TX-06 Due Collection), api-spec.md (Sections 5.12, 5.13), appflow.md (Screen 04), prd.md (TC-20, 21).

**Your Objectives:**
1. Implement Sales Return & Exchange Engine (CRV - TX-05):
   - 7-day policy validation and restock condition inspection.
   - Due reduction netting: reduce customer due balance first before issuing cash refund (TC-21).
   - Reverse revenue: Debit 4020-Sales-Returns, Credit 1010-Cash-Drawer or 1110-Accounts-Receivable.
2. Implement Customer CRM & 360° Profile (Screen 04):
   - 4 tabs: Invoices, Bakir Khata Ledger, Kisti Contracts, Servicing History. Enforce customer \`creditLimit\`.
3. Implement Bakir Khata Due Collection (\`POST /api/v1/customers/:id/collect-due\` - TX-06) with thermal money receipt.
4. Implement automated due SMS alert dispatch.
5. Build frontend UI pages in \`apps/web-erp\` for Customers and Sales Returns.

**Verification Commands to Run:**
- \`npm run test:customers\` verifying return condition quarantine, due reduction netting, and credit limit enforcement.

Report completion against Phase 8 exit criteria upon passing tests.
\`\`\`

---

### 4.9 Prompt for Phase 9: Specialized Dokan Modules (Kisti, Buyback, Service Lab, Brand RMA, MFS, Personal)
\`\`\`markdown
You are a Senior Full-Stack Engineer. Your task is to execute **Phase 9** of Bebsayik.com implementing the 6 specialized Dokan modules.

**Context & Baseline Specifications:**
- Consult: DATABASE.md (TX-09 to TX-16), api-spec.md (Sections 5.9, 5.14 to 5.18), appflow.md (Screen 13), prd.md (TC-31, 32, 33, 42), Requirement Validation.md (Section 3).

**Your Objectives:**
1. Implement Kisti / EMI Installment Engine (TX-11):
   - Booking, down payment, dual guarantors, amortization schedule, milestone collections, defaulters list.
2. Implement Used Phone Buyback & Police Compliance (TX-10):
   - Webcam live photo capture of seller, NID cards, payout voucher, printable Bangladesh Police Legal Undertaking PDF.
3. Implement Technician Servicing Lab (TX-09):
   - Repair intake sheet, 3x3 pattern lock coordinates, spare parts consumption, 50% labor split accrual, defective part return loop.
4. Implement Brand Warranty (RMA) Tracking Hub (\`warranty_claims\`):
   - Intake faulty handset for official brand warranty, track parcel tracking number, update status, trigger customer SMS alert.
5. Implement 100% Manual MFS Agent Desk (TX-12, TX-13):
   - Manual Cash-In and Cash-Out from physical SIM with commission accrual and evening USSD balance audit. Zero SMS scraping.
6. Implement Segregated Personal Ledger (TX-14, 15, 16):
   - Amanat & Hawlat contacts isolated from store customers. Strict 0.00% Store P&L invariant. STORE_OWNER access only.
7. Build frontend UI pages in \`apps/web-erp\` for all 6 modules.

**Verification Commands to Run:**
- \`npm run test:specialized\` verifying MFS math, personal ledger P&L isolation, pattern lock coordinates, and police PDF stream.

Report completion against Phase 9 exit criteria upon passing tests.
\`\`\`

---

### 4.10 Prompt for Phase 10: Accounts, Shift Closing, SMS Desk & HR Payroll
\`\`\`markdown
You are a Full-Stack Engineer. Your task is to execute **Phase 10** of Bebsayik.com.

**Context & Baseline Specifications:**
- Consult: UI_UX_BLUEPRINT.md (Decision 4), appflow.md (Screen 02, Screen 15), api-spec.md (Sections 5.19, 5.20, 5.21, 5.22), prd.md (TC-18, 40), DATABASE.md (TX-18).

**Your Objectives:**
1. Implement Accounts & Expense Manager: Cash drawers, bank accounts, inter-account transfers, OPEX petty expense vouchers.
2. Implement Day-End Blind Cash Closing & Z-Report:
   - Morning float, physical note denomination count, exactly 1 recount grace attempt, shift lock, variance logging, Z-Report receipt, owner SMS digest.
3. Implement SMS Notification Desk & Template Customizer (\`/app/settings/sms\`, Screen 15):
   - Dynamic SMS template editor (\`{{customerName}}\`, \`{{dueAmount}}\`), balance monitor, custom customer broadcast.
4. Implement Pre-Launch Fresh Start Reset Protocol (TC-18):
   - Owner 2FA-secured purge of test sales/stock while preserving master catalog and settings.
5. Implement HR, Sales Targets & Payroll Disbursal (TX-18):
   - Aggregate salesperson commissions and technician 50% repair splits; generate monthly salary disbursement vouchers.
6. Build frontend UI pages in \`apps/web-erp\` for Accounts, Closing, SMS, and HR Payroll.

**Verification Commands to Run:**
- \`npm run test:closing\` verifying recount grace lockout, Fresh Start reset preservation, and payroll splits.

Report completion against Phase 10 exit criteria upon passing tests.
\`\`\`

---

### 4.11 Prompt for Phase 11: Public Marketing Website & Dokan Onboarding Wizard
\`\`\`markdown
You are a Senior Frontend Engineer. Your task is to execute **Phase 11** of Bebsayik.com.

**Context & Baseline Specifications:**
- Consult: prd.md (Section 1.2, TC-24, 30, 37, 43), appflow.md (Section 2.1, Section 4).

**Your Objectives:**
1. In \`apps/marketing\`, build the public marketing website (\`bebsayik.com\`):
   - Landing page (\`/\`), Features (\`/features\`), Pricing & ROI calculator (\`/pricing\`), About, Contact, Terms, Privacy.
   - Pre-launch App Store badge lead capture modal saving to \`marketing_leads\` (TC-43).
2. Implement Passwordless Mobile OTP Registration (\`/register\`).
3. Implement 3-Step Dokan Setup Wizard (\`/onboarding/setup\`):
   - Dokan Profile, Outlets & Godown, Security Password & Manager PIN. Atomically create shop tenant (TC-30).
4. Implement Opening Balance Onboarding Wizard:
   - Input opening stock, cash, due, and payables; balance into Opening Equity with 0.00% P&L impact (TC-24).

**Verification Commands to Run:**
- \`npm run test:marketing\` and \`npm run test:onboarding\` verifying tenant creation and opening equity balance.

Report completion against Phase 11 exit criteria upon passing tests.
\`\`\`

---

### 4.12 Prompt for Phase 12: SaaS Billing Engine, Webhooks & Platform Admin Portal
\`\`\`markdown
You are a Principal Backend & Platform Engineer. Your task is to execute **Phase 12** of Bebsayik.com.

**Context & Baseline Specifications:**
- Consult: prd.md (Sections 7, 8, TC-25, 26, 34, 35, 38, 39, 44, 49, 56), api-spec.md (Sections 5.24, 5.26, 5.27, 5.30), appflow.md (Section 2.3).

**Your Objectives:**
1. Implement SaaS Subscription & Billing Engine:
   - Plan tiers (Silver, Gold, Diamond), promo coupons (\`EID2026\`), checkout redirect to PayStation, EPS, bKash.
2. Implement Payment Webhook Processors (\`/api/v1/webhooks/*\`):
   - Timing-safe HMAC-SHA256 signature verification (\`crypto.timingSafeEqual\`).
   - Idempotent subscription activation (TC-34) and 3-minute background poller sweeper (TC-49).
3. Implement Subscription Lifecycle Guard:
   - 14-day trial expiry -> 3-day grace -> read-only mode with data export guarantee (TC-25, 26, 35).
4. In \`apps/admin\`, build the Central Platform Admin Portal (\`admin.bebsayik.com\`):
   - Global MRR analytics, non-destructive shop suspension (TC-38), emergency hotline phone migration with NID proof (TC-56), plan price versioning (TC-39), restricted to SUPER_ADMIN (TC-44).

**Verification Commands to Run:**
- \`npm run test:billing\` and \`npm run test:admin\` verifying HMAC validation, read-only mode, and hotline migration.

Report completion against Phase 12 exit criteria upon passing tests.
\`\`\`

---

### 4.13 Prompt for Phase 13: Automated End-to-End Test Suite (TC-01 to TC-56)
\`\`\`markdown
You are a Principal QA & Test Automation Specialist. Your task is to execute **Phase 13** of Bebsayik.com.

**Context & Baseline Specifications:**
- Consult: prd.md (Section 8 for TC-01 to TC-56), DATABASE.md (Section 20 for AP-01, AP-02, AP-03), Requirement Validation.md.

**Your Objectives:**
1. In \`packages/api/test\` and \`apps/web-erp/e2e\`, write and execute automated end-to-end test suites (Vitest & Playwright) covering all 56 test cases (TC-01 through TC-56).
2. Validate financial report aggregations:
   - AP-01: Daily sales, landed specific COGS, and exact gross profit.
   - AP-02: Inventory aging brackets (0-30, 31-60, 61-90, >90 days).
   - AP-03: Completed repair technician 50% labor splits.
   - NBR Mushak 6.3 VAT tax breakdown report.
3. Execute concurrency load tests simulating 50 concurrent checkouts on the same 5 IMEIs; assert exactly 5 succeed and 45 receive 409 Conflict.
4. Ensure 100% test pass rate with zero skips.

**Verification Commands to Run:**
- \`npm run test:e2e\` and \`npm run test:unit\`.

Report completion with full test execution summary against Phase 13 exit criteria.
\`\`\`

---

### 4.14 Prompt for Phase 14: Containerization, Cloudflare CDN & Production Deployment
\`\`\`markdown
You are a Principal Cloud Architect and Site Reliability Engineer. Your task is to execute **Phase 14** of Bebsayik.com.

**Context & Baseline Specifications:**
- Consult: ARCHITECTURE.md (Sections 4, 12, 13), api-spec.md (Section 2.1).

**Your Objectives:**
1. Multi-stage Docker containerization:
   - \`Dockerfile.api\` for Node.js Express API (Node 20 Alpine, non-root user).
   - \`Dockerfile.web\` for React Vite frontends compiled into hardened Nginx Alpine with gzip/brotli.
2. Configure Cloudflare Edge CDN:
   - DNS routing: \`bebsayik.com\` (Marketing), \`app.bebsayik.com\` (Web ERP & POS), \`admin.bebsayik.com\` (Admin), \`api.bebsayik.com\` (API Gateway).
   - Enforce TLS 1.3, HSTS (max-age 31536000), and Turnstile endpoints.
3. Configure CI/CD automated pipeline (GitHub Actions):
   - Lint & Typecheck -> Unit Tests -> E2E Tests -> Docker Build -> Zero-Downtime Deploy.
4. Setup production monitoring: Winston structured JSON logging, Sentry error tracking, MongoDB Atlas PITR backups, Redis persistence.
5. Create and run post-deployment smoke test script verifying health check (\`/api/v1/health\`), marketing landing, Web ERP login, and POS scan response (<150ms).

**Verification Commands to Run:**
- Run post-deploy smoke verification script against production endpoints.

Report completion against Phase 14 exit criteria.
\`\`\`
`;

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully updated prompt.md v2.0.0. Bytes:', fs.statSync(targetPath).size);
