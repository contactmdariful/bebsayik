// scratch/build_agent_v2.js
const fs = require('fs');
const path = require('path');

const targetPath = 'c:/Users/conta/OneDrive/Documents/Dokan Management Software/AGENT.md';

const content = `# Bebsayik.com — AI Coding Agent Operating System & Safety Directive (\`AGENT.md\`)

**Document File:** \`AGENT.md\`  
**Official System Name:** Bebsayik.com — Multi-tenant SaaS ERP Platform  
**Official Product Name:** Bebsayik  
**English Product Name:** Bebsayik.com  
**Brand:** Bebsayik | **Brand Attribution:** Powered by Bebsayik  
**Canonical Domain:** \`bebsayik.com\` (\`app.bebsayik.com\` | \`admin.bebsayik.com\` | \`api.bebsayik.com\`)  
**Heritage Context:** Initial ERP requirements and retail workflows originated from the retail operations of **Kanchan Telecom**; the SaaS platform is independently branded and operated as Bebsayik.com.  
**Version:** 2.0.0 (Hardened Master Production Agent Protocol)  
**Authoritative Role:** This document defines the **permanent working rules, architectural boundaries, safety constraints, financial invariants, and coding standards** that all AI coding agents (and human contributors) must strictly obey whenever working on any codebase, service, or configuration within the Bebsayik repository.

---

## 1. Project Context & Core Business Principles

### 1.1 Product Purpose & Target Market:
Bebsayik (Bebsayik.com, Powered by Bebsayik) is a mission-critical, multi-tenant cloud retail ERP and Point of Sale (POS) SaaS platform engineered specifically for **mobile phone, gadget, and electronics retailers** across Bangladesh and emerging markets. It is NOT a generic e-commerce or simple retail POS. It addresses the high-stakes, specific operational workflows of mobile shops:
1. **Dual-IMEI Serialized Inventory:** BTRC vs Global identity tracking, dual SIM identity (\`imei1\` & \`imei2\`), and sub-150ms scanner lookups.
2. **Specific Identification Landed Cost (COGS):** Handset cost is tracked by exact 15-digit IMEI. Average costing is strictly prohibited.
3. **Installment Loans (Kisti / EMI):** Hybrid cash down payment, tenure calculation, dual guarantor profiles, and milestone amortization tracking.
4. **Second-Hand Mobile Buybacks:** Webcam live photo capture of seller, NID front/back scans, and printable Bangladesh Police Legal Undertaking deed generation.
5. **Technician Servicing Lab:** Repair ticketing with 3x3 pattern lock coordinates, spare parts consumption, and automated 50% labor split accounting.
6. **Brand Warranty (RMA) Tracking Hub:** Ingest customer faulty devices, dispatch to manufacturer service centers with courier parcel tracking, and trigger automated customer SMS alerts on return.
7. **Damaged Stock Scrap Hub (SWV - TX-17):** Write off broken/shattered handsets with webcam photo proof and Manager PIN write-off to P&L loss.
8. **100% Manual MFS Agent Desk:** Physical SIM Cash-In and Cash-Out recording with evening USSD float reconciliation. **Automated Android background SMS scraping is strictly prohibited (TC-42)**.
9. **Segregated Personal Ledger (Amanat & Hawlat):** Separate non-customer directory with **strict 0.00% Store P&L invariant** restricted solely to \`STORE_OWNER\`.
10. **Day-End Blind Cash Closing:** Cashiers enter note breakdowns without seeing system targets; granted **exactly one recount grace attempt** before shift lock and Z-Report digest SMS.

### 1.2 System Boundaries & Three-Tier Architecture:
Bebsayik enforces clean host boundaries across three distinct frontend targets served by a unified Express modular monolith backend:
1. **Public Marketing Showcase (\`bebsayik.com\`):** Public landing page, features showcase, ROI pricing calculator, pre-launch lead capture, and passwordless registration.
2. **Tenant Web ERP & Mobile Touch POS (\`app.bebsayik.com\`):** Counter sales, inventory, procurement, customers, servicing, accounting, and settings.
3. **Platform Super Admin Portal (\`admin.bebsayik.com\`):** Global SaaS control, tenant suspension, billing monitor, and hotline phone migration.

### 1.3 Immutable Architectural Principles:
1. **Shop-Centric Multi-Tenancy:** The artificial "Organization" layer is permanently eliminated. Every tenant entity belongs directly to a \`shopId\`.
2. **Sub-150ms Counter Response:** Scans and cart recalculations must respond in <150ms to sustain rapid retail throughput during rush hours.
3. **Bangladeshi Currency Standard:** All monetary figures display the Bangladeshi Taka symbol (\`৳\`) formatted with tabular lining numerals (\`tnum\`).
4. **Owner-Approved Invariants:**
   - **POS Counter Tablet Layout:** Strict Landscape orientation (1024×768+) with fixed dual-column layout.
   - **Thermal Receipt Printing:** High-speed ESC/POS English text mode (<0.3s) via WebUSB/Bluetooth.
   - **Manager PIN Override:** Synchronous on-screen modal overlay (\`Modal_ManagerPinOverride\`).
   - **Day-End Shift Closing Recount:** Exactly one recount grace attempt before register is permanently locked.

---

## 2. Documentation Authority & Reading Priority

Whenever an AI agent receives a task, it must consult documentation in the following strict hierarchical priority before proposing or modifying code:

\`\`\`
Level 1: Execution Roadmap & Prompts    --->  prompt.md
Level 2: Product Requirements & Scope   --->  prd.md & idea.md
Level 3: System Architecture & Security  --->  ARCHITECTURE.md
Level 4: Production Database Models     --->  DATABASE.md (Section 22 Financial Matrix)
Level 5: REST API Contracts & Protocols --->  api-spec.md
Level 6: UI/UX & Navigation Wireframes  --->  appflow.md & UI_UX_BLUEPRINT.md
Level 7: User Journeys & State Machines --->  user-flow.md & DFD.md
Level 8: Compliance & Validation Matrix --->  Requirement Validation.md & prd-analysis.md
Level 9: Audit Trail & Historical Rel   --->  CHANGELOG.md & database-schema.md
\`\`\`

### Rule on Database Specifications:
- [\`DATABASE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) is the **sole runtime authority** (MongoDB Atlas 7.0+ with Mongoose 8+ schemas).
- [\`database-schema.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/database-schema.md) contains historical PostgreSQL relational baseline for relational parity reference only. An agent must NEVER generate SQL migrations or Prisma schemas for runtime services unless explicitly instructed.

---

## 3. Autonomous Agent Development Workflow

Every AI agent working on Bebsayik must execute work through the **5-Step Rigorous Workflow**:

\`\`\`mermaid
flowchart TD
    S1[1. Inspect & Verify] --> S2[2. Plan & Map Dependencies]
    S2 --> S3[3. Authorize & Validate Scope]
    S3 --> S4[4. Implement with Invariants]
    S4 --> S5[5. Execute Automated Verification]
    S5 --> S6[6. Document & Report]
\`\`\`

1. **Inspect & Verify:** Always read active project files using dedicated file inspection tools before proposing edits. Never assume file contents or directory layout from memory.
2. **Plan & Map Dependencies:** Check [\`prompt.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prompt.md) to understand which phase the current task belongs to, what preceding phases must be satisfied, and what artifacts depend on the change.
3. **Authorize & Validate Scope:** Execute ONLY the authorized task. Never silently implement features from future phases.
4. **Implement with Invariants:** Write clean, modular, typed code adhering to Zod schemas, Decimal128 monetary precision, and multi-tenant \`shopId\` filters.
5. **Execute Automated Verification:** Run unit tests, type-checks, linting, and end-to-end tests. Never claim completion without active command execution.
6. **Document & Report:** Summarize files changed, tests run, and update [\`CHANGELOG.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/CHANGELOG.md).

---

## 4. Phase Control & Roadmap Compliance

AI agents must follow the phased implementation order defined in [\`prompt.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prompt.md):

| Phase | Phase Name & Focus | Pre-requisite Dependency |
|:---:|---|---|
| **Phase 0** | Workspace Architecture, Tooling, Docker & Seed Profiles | None (Starting Point) |
| **Phase 1** | Database Persistence & Double-Entry Engine (MongoDB Atlas) | Phase 0 |
| **Phase 2** | Authentication, Identity Lifecycle & Security Gateways | Phase 1 |
| **Phase 3** | Multi-Tenancy Isolation, RBAC & Context Guards | Phase 2 |
| **Phase 4** | Frontend Design System, Design Tokens & UI Components | Phase 0 |
| **Phase 5** | Catalog, Dual-IMEI Inventory & Damaged Stock Scrap | Phase 3, Phase 4 |
| **Phase 6** | Procurement, Supplier Ledgers & Stock Transfers | Phase 5 |
| **Phase 7** | POS Counter Sales, Multi-Tender Checkout & Hardware Drivers | Phase 5 |
| **Phase 8** | Sales Returns, Customer Dues & Bakir Khata Subledger | Phase 7 |
| **Phase 9** | Specialized Dokan Modules (Kisti, Buyback, Service, RMA, MFS, Personal) | Phase 8 |
| **Phase 10** | Accounts, Drawers, Shift Closing, SMS Desk & HR Payroll | Phase 9 |
| **Phase 11** | Public Marketing Website (bebsayik.com) & Dokan Onboarding | Phase 3, Phase 4 |
| **Phase 12** | SaaS Billing Engine, Webhooks & Platform Admin Portal | Phase 10, Phase 11 |
| **Phase 13** | End-to-End Test Suite Execution (TC-01 to TC-56 & AP-01 to AP-03) | All prior phases |
| **Phase 14** | Production Containerization, CI/CD Pipeline & Deployment | Phase 13 |

### Strict Phase Rules:
- **No Premature Jumping:** An agent must NEVER implement UI screens (Phase 7/9) before the database models (Phase 1) and authorization guards (Phase 3) exist and pass unit tests.
- **Single-Phase Confinement:** Each agent prompt in Section 4 of \`prompt.md\` must be executed completely before moving to the next.

---

## 5. Technology Stack & Architecture Protection

The technology stack is formally locked. An agent must **NEVER** swap, replace, or add alternative architectural libraries without explicit user confirmation:

### 5.1 Approved Technology Matrix:
- **Backend Runtime:** Node.js v20+ LTS with TypeScript (Strict Mode).
- **Backend Framework:** Express.js 4.19+ (Modular Monolith pattern).
- **Primary Database:** MongoDB Atlas 7.0+ Replica Set using Mongoose ODM 8+.
- **In-Memory Cache / Rate-Limiter:** Redis 7+ via \`ioredis\`.
- **Validation Engine:** Zod (Strict schema validation on every controller payload).
- **Frontend Framework:** React 18+ with TypeScript and Vite.
- **Styling Engine:** Tailwind CSS 3.4+ using custom tokens defined in \`packages/ui-tokens\`. (Ad-hoc Tailwind utility classes that contradict \`UI_UX_BLUEPRINT.md\` are prohibited).
- **Monetary Math:** \`decimal.js\` or \`bignumber.js\` (IEEE 754 floating-point operations are banned for money).
- **Database Migrations:** \`migrate-mongo\` in \`packages/api\`.
- **Unit & Integration Testing:** Vitest.
- **End-to-End Testing:** Playwright.
- **Edge CDN & DDoS:** Cloudflare Edge CDN (TLS 1.3, HSTS, WAF).

---

## 6. Business Logic Preservation & Invariants

An agent must **NEVER** simplify, bypass, or rewrite business logic to make coding easier. The following business invariants are non-negotiable:

1. **Specific Identification COGS:** Handset cost is tracked by specific 15-digit IMEI. Selling Phone B (Cost ৳19,000) records COGS of exactly ৳19,000, even if Phone A was bought at ৳18,000 (TC-23).
2. **Dual-IMEI Scanning:** Handsets with dual SIM slots store both \`imei1\` and \`imei2\`. POS scan matches either, but locks the specific device record.
3. **Minimum Selling Price (MSP) Floor:** A cashier cannot sell an item below its MSP floor unless an authorized Manager PIN override token is supplied in the request.
4. **Sales Returns Netting (TC-21):** Customer returning a phone with outstanding due balance reduces their due first before receiving cash refunds.
5. **Technician 50% Labor Split (TX-09):** Labor revenue is split 50/50 between store and technician. Defective spare parts returned by technician re-enter stock with zero technician financial loss.
6. **MFS Agent 100% Manual Entry:** Cash-In and Cash-Out are recorded manually from physical SIMs. **Automated Android background SMS scraping is strictly prohibited (TC-42)**.
7. **Personal Ledger Segregation (TX-14, 15, 16):** Amanat and Hawlat contacts are segregated from store customers. Transactions have **strictly 0.00% P&L impact** on the store (TC-32).
8. **Day-End Blind Cash Closing:** Cashiers enter note breakdowns without seeing system targets. Only **one recount grace attempt** is permitted before shift lock.
9. **Pre-Launch Fresh Start Reset Protocol (TC-18):** Owner 2FA purge clears test transactions and stock while preserving master catalog and settings.

---

## 7. Database & API Standards

### 7.1 Mongoose Schemas & Tenant Indexing:
- Every tenant collection MUST include \`shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true }\`.
- Compound indexes MUST prioritize \`shopId\`: \`{ shopId: 1, createdAt: -1 }\`, \`{ shopId: 1, status: 1 }\`.
- Monetary fields MUST be stored as \`Decimal128\`.
- All mutating financial operations MUST use \`withTransaction\` passing the Mongoose \`ClientSession\` to every query.

### 7.2 REST API Standards:
- Standard response envelope:
  \`\`\`json
  {
    "success": true,
    "data": { ... },
    "meta": { "timestamp": "...", "requestId": "..." }
  }
  \`\`\`
- Standard error envelope:
  \`\`\`json
  {
    "success": false,
    "error": {
      "code": "MSP_FLOOR_BREACH",
      "message": "Human readable explanation",
      "details": [ ... ]
    }
  }
  \`\`\`
- **Centralized Domain Error Catalog:** Error codes must be sourced exclusively from Section 2.6 of [\`api-spec.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md):
  \`MSP_FLOOR_BREACH\`, \`IMEI_ALREADY_SOLD\`, \`INVALID_IMEI_LUHN\`, \`CREDIT_LIMIT_EXCEEDED\`, \`STAFF_TERMINATED\`, \`SHIFT_NOT_OPEN\`, \`RECOUNT_LIMIT_EXCEEDED\`, \`PERSONAL_LEDGER_CONTAMINATED\`, \`IDEMPOTENCY_CONFLICT\`, \`SUPPLIER_DUES_EXCEEDED\`, \`INSUFFICIENT_STOCK\`, \`PATTERN_LOCK_INVALID\`, \`INVALID_MANAGER_PIN\`, \`TENANT_ACCESS_DENIED\`, \`RATE_LIMIT_EXCEEDED\`, \`OTP_EXPIRED\`.
- Mandatory Headers on financial endpoints: \`Idempotency-Key\` (UUIDv4) and \`X-Shop-Id\`.
- Rate Limiting: OTP endpoints strictly 3 requests / 15 minutes; scanner endpoints 300 requests / minute.

---

## 8. Authentication & Authorization Security Standards

1. **Server-Side Authorization:** Never rely on frontend UI hiding of buttons. Every API route must be guarded by \`tenantGuard\` and \`requireRole\`.
2. **The 7 Canonical Roles:**
   - \`SUPER_ADMIN\`, \`STORE_OWNER\`, \`STORE_MANAGER\`, \`SALESPERSON\`, \`CASHIER\`, \`TECHNICIAN\`, \`ACCOUNTANT\`.
3. **Session Revocation Kill Switch:**
   - Any sensitive security action (password change, staff termination, mobile change) must increment \`users.tokenVersion\` to immediately invalidate active JWTs in <1s.
4. **Staff Emergency Termination (TC-53):**
   - Setting \`isActive: false\` kicks the staff member's POS terminal in <1 second with \`403 STAFF_TERMINATED\`.
5. **180s Dual-OTP Number Migration (TC-52):**
   - Registered mobile cannot migrate without simultaneous validation of OTP on old SIM and new SIM within 180 seconds.

---

## 9. Financial Integrity & Double-Entry Invariants

All monetary arithmetic and ledger postings must comply with Section 22 of [\`DATABASE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md):

1. **Zero Floating-Point Arithmetic:**
   - Never use standard JavaScript \`+\`, \`-\`, \`*\`, \`/\` on currency.
   - Always use \`Decimal\` from \`decimal.js\` for addition, subtraction, markup, and discount calculations.
2. **Balanced Journals (Debits === Credits):**
   - Every financial mutation must post through \`AccountingService.postDoubleEntryJournal()\`.
   - The service must assert \`sum(debits).equals(sum(credits))\` before writing to \`account_transactions\`.
3. **Idempotency Protection:**
   - Mutating financial routes must check Redis: \`SET idempotency:<shopId>:<key> <resp> EX 86400 NX\`.
   - In-flight requests return \`409 IDEMPOTENCY_CONFLICT\`. Completed requests return cached response without re-executing.
4. **Payment Gateway Webhook Verification:**
   - PayStation, EPS, and bKash Direct webhooks must use \`crypto.timingSafeEqual\` against raw request body to prevent timing attacks.

---

## 10. UI/UX Consistency, Design Tokens & Hardware Drivers

Frontend implementations must strictly obey [\`UI_UX_BLUEPRINT.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/UI_UX_BLUEPRINT.md) and [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md):

1. **Color Palette:**
   - Background surfaces: Slate (\`#0F172A\`, \`#1E293B\`, \`#334155\`).
   - Primary Brand Accent: Teal / Emerald (\`#0D9488\`, \`#0F766E\`).
   - Status indicators: Emerald (Success), Amber (Warning), Crimson (Destructive), Purple (Due).
2. **Typography & Tabular Numbers:**
   - Font: \`Inter\` or \`Outfit\`.
   - All price displays, monetary inputs, balances, and IMEIs MUST use CSS \`font-variant-numeric: tabular-nums\` (\`tnum\`) to prevent visual jitter.
3. **Touch Targets & Accelerators:**
   - Minimum 44x44px touch targets on all interactive buttons.
   - Keyboard accelerators (\`F1\` to \`F12\`) must be visually displayed with badge shortcuts on POS action buttons.
4. **Hardware ESC/POS Thermal Printing Protocols:**
   - Output binary ESC/POS byte buffers directly via WebUSB/Bluetooth.
   - Cash drawer kick pulse: \`0x1B 0x70 0x00 0x19 0xFA\` (\`ESC p 0 25 250\`).
   - Monospace line widths: 58mm (32 chars) vs 80mm (48 chars).
   - Never trigger blocking browser \`window.print()\` dialog on counter POS checkout.

---

## 11. Security, Privacy & Compliance Guidelines

1. **Zero Hardcoded Secrets:**
   - Never commit API keys, database credentials, JWT secrets, or SMS gateway tokens. All secrets must read from \`process.env\`.
2. **Input Sanitization with Zod:**
   - Every route parameter, query, and body must parse through Zod schemas before reaching service logic.
   - Enforce exact regexes: BD Mobile \`^01[3-9]\\d{8}$\`, 15-digit Luhn IMEI \`^\\d{15}$\`, Manager PIN \`^\\d{4}$\`.
3. **KYC Document Privacy:**
   - Customer webcam photos, NID scans, and Police Undertaking forms must be stored in private encrypted Cloudflare R2 / S3 buckets and accessed via temporary pre-signed URLs (15-minute TTL).
4. **Zero SMS Permissions:**
   - Mobile and web code must NEVER declare or request \`READ_SMS\`, \`RECEIVE_SMS\`, or Accessibility permissions to ensure 100% compliance with Google Play Store policies (TC-42).

---

## 12. Testing, Verification & Quality Standards

An agent must **NEVER** claim a task is completed without providing verifiable test output:

1. **Typecheck & Lint:**
   - Code must pass \`npm run typecheck\` and \`npm run lint\` with zero errors and zero warnings.
2. **Unit & Integration Tests:**
   - Write Vitest tests for every service, controller, and accounting flow.
   - Ensure \`npm run test:unit\` executes cleanly.
3. **End-to-End Test Verification Matrix (TC-01 to TC-56):**
   Agents must execute the specific test cases matching their assigned business module:
   - **Auth & Identity:** TC-29, TC-40, TC-41, TC-45, TC-50, TC-51, TC-52, TC-53, TC-56
   - **Inventory & Dual-IMEI:** TC-18, TC-19, TC-22, TC-23, TC-28, TC-36, TC-48
   - **POS & Checkout:** TC-01, TC-02, TC-03, TC-04, TC-31, TC-33, TC-47
   - **Returns & Exchanges:** TC-20, TC-21
   - **Dokan Special Modules:** TC-31, TC-32, TC-33, TC-42
   - **SaaS Billing & Admin:** TC-17, TC-25, TC-26, TC-27, TC-34, TC-35, TC-38, TC-39, TC-43, TC-44, TC-49
   - **Hardware & Multi-Shop:** TC-54, TC-55
4. **Falsification Ban:**
   - Never fake test output, mock away critical database constraints, or claim a test passed when it was skipped.

---

## 13. Development Seed Data Profiles ("Kanchan Telecom Demo Store")

To ensure deterministic testing across agents and development environments, agents must utilize the standard seed profile:

- **Shop Name:** \`Kanchan Telecom (Eastern Plaza Outlet)\`
- **Shop ID:** \`6709a12b3c4d5e6f7a8b9c00\`
- **Store Owner:** Sumon Dash (\`01712345678\`, Password: \`Owner1234#\`, Manager PIN: \`9812\`)
- **Cashier:** Tanvir Ahmed (\`01711223344\`, Temporary PIN: \`4819\`, Permanent PIN: \`1234\`)
- **Technician:** Rafiqul Islam (\`01722334455\`, Permanent PIN: \`1234\`)
- **Sample Serialized Handsets (15-digit Luhn compliant):**
  - IMEI 1: \`860123456789012\` / IMEI 2: \`860123456789013\` (Redmi Note 13 Pro 5G, Landed Cost: ৳24,200.00, MRP: ৳27,500.00, MSP: ৳24,500.00)
- **Standard Default Accounts:**
  - \`1010-Cash-Drawer\` (৳5,000.00 Opening Float)
  - \`1020-MFS-Floats\` (bKash Agent Float: ৳25,000.00)
  - \`1030-Bank-Accounts\` (BRAC Bank Current: ৳150,000.00)

---

## 14. Change Management, Failure Handling & Completion Reports

1. **Minimal Surface Area:**
   - Modify only the files directly related to the current phase or authorized task. Avoid touching unrelated files or reformatting working code.
2. **Root-Cause Debugging:**
   - When encountering a failure or bug, investigate the fundamental cause (e.g., transaction session propagation, Redis lock timeout) rather than patching around it with temporary hacks.
3. **CHANGELOG Updates:**
   - Whenever completing a milestone, update [\`CHANGELOG.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/CHANGELOG.md) recording the changes under the appropriate version heading.
4. **Standard Completion Report Format:**
   Every agent completing a task must return a structured completion summary:
   - **Phase & Task ID:** (e.g. Phase 5, Task 2: Dual-IMEI Serialized Handset Engine).
   - **Files Created / Modified:** Clickable links to all touched files.
   - **Verification Executed:** Exact command run (e.g. \`npm run test:inventory\`) with actual pass/fail metrics.
   - **Invariants Verified:** Specific COGS check, double-entry balance check, multi-tenant isolation check.
   - **Outstanding Issues / Next Phase Prerequisite:** Clear notice of what is ready for the subsequent agent.

---

## 15. Absolute Prohibitions (Zero Tolerance)

An agent will be considered in immediate violation of protocol if it commits any of the following actions:

1. **NO Code Invention:** Inventing endpoints, collections, or fields not specified in [\`DATABASE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) or [\`api-spec.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md).
2. **NO Fake Payment Success:** Mocking payment success without verifying gateway webhook signatures.
3. **NO Floating-Point Currency Arithmetic:** Using JavaScript \`number\` floats for monetary values.
4. **NO Cross-Tenant Data Leaks:** Omitting \`shopId\` from any database query.
5. **NO Personal Ledger Contamination:** Mixing personal Amanat/Hawlat transactions with store sales or expense ledgers.
6. **NO SMS Scraping:** Introducing any background SMS reader service.
7. **NO Unverified Completion Claims:** Stating a task is "Done" or "Passed" without running automated verification.
8. **NO Premature Phase Execution:** Starting a subsequent phase without satisfying and verifying preceding phase exit conditions.

---

## 16. Conflict & Uncertainty Resolution Protocol

If two documents appear to contradict each other, the agent must follow this decision procedure:

\`\`\`mermaid
flowchart TD
    A[Conflict Detected Between Documents] --> B{Is one document higher priority?}
    B -- Yes --> C[Follow Higher Priority Doc (Section 2 Hierarchy)]
    B -- No --> D{Is issue covered in 4 Resolved Decisions?}
    D -- Yes --> E[Apply Resolved Strategic Decision (Section 1.3)]
    D -- No --> F[Do NOT Guess or Invent Rule]
    F --> G[Record Exact Discrepancy & Request Owner Clarification]
\`\`\`

1. **Reference Priority:** Check Section 2 Hierarchy (e.g., \`DATABASE.md\` overrides \`database-schema.md\`; \`prompt.md\` overrides PRD roadmaps).
2. **Owner Strategic Decisions:** The 4 codified decisions (Landscape tablet POS, ESC/POS English receipts, Manager PIN modal, 1 recount shift grace) override any older preliminary notes.
3. **Unresolved Decisions:** If a conflict remains genuinely ambiguous, **STOP, do not guess, record the conflict with exact line numbers, and ask the project owner for clarification.**
`;

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully updated AGENT.md v2.0.0. Bytes:', fs.statSync(targetPath).size);
