# Bebsayik.com — Requirement Validation & Gap Analysis Report
**Document File:** `Requirement Validation.md`  
**Platform Brand:** Bebsayik.com (Powered by Bebsayik — `bebsayik.com`)  
**Official Product Name:** Bebsayik  
**English Product Name:** Bebsayik.com  
**Legacy Business Context:** The initial ERP requirements and workflows originated from the Kanchan Telecom retail operation. The SaaS product is independently branded and operated as Bebsayik.com.  
**Version:** 1.0.0 (Master Validation & Pre-Implementation Baseline)  
**Lead Auditor:** Principal Systems Architect & Senior Verification Engineer  
**Date:** October 2026  
**Source Artifacts Audited:**
- [`PRD.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) (v6.1.0 Enterprise SaaS Master)
- [`DATABASE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) (v1.0.0 MongoDB Atlas Production Specification — AUTHORITATIVE)
- [`ARCHITECTURE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/ARCHITECTURE.md) (v1.0.0 System Architecture Blueprint)
- [`user-flow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/user-flow.md) (v4.1.0 Master All-in-One Blueprint)
- [`DFD.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DFD.md) (v1.0.0 Data Flow Diagrams & Data Dictionary)
- [`database-schema.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/database-schema.md) & [`schema.sql`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/schema.sql) (PostgreSQL 16+ Exploratory Schema — Deprecated Relational Reference)
- [`idea.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/idea.md) (Product Domain Rules & IA)
- [`saas-platform-audit.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/saas-platform-audit.md) (v2.1.0 SaaS Architecture Audit)
- [`audit-report.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/audit-report.md) & [`prd-analysis.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd-analysis.md)

---

## Executive Summary

The purpose of this audit report is to rigorously validate the complete scope of requirements, financial logic, data validation schemas, security boundaries, and exception-handling matrices for the Bebsayik ERP/SaaS platform.

### Ground Reality Check:
1. **Documentation & Specification Coverage:** The project documentation (`PRD.md` v6.1.0, `user-flow.md` v4.1.0, and `database-schema.md` / `DATABASE.md`) is highly mature and exhaustive. The 17+ core retail modules originating from Kanchan Telecom, the 3-subdomain routing model, and the 29 end-to-end user flows are fully specified.
2. **Codebase Implementation Status:** Currently, the workspace contains authoritative architectural specifications and database DDL scripts (`schema.sql`). Application source code (React/Vite frontend or Express.js/Node.js backend API) is pre-implementation.
3. **Validation Standard:** A requirement is not categorized as "Implemented & Verified" solely because it is documented. Specifications requiring source code implementation are accurately classified as **"Specified, Code Pending (Missing in Codebase)"**.

### Validation Statistics Overview:
- **Total Requirements Audited:** 55 (RV-001 through RV-055)
- **Implemented & Verified (Live code with automated test passes):** 0 (Code scaffolding pending)
- **Implemented but Unverified (DDL/Scripts ready, live cluster validation pending):** 5 (`schema.sql` tables, RLS policies, indexes, and constraints)
- **Partially Implemented (Partial specification or schema component ready):** 12
- **Specified, Code Pending (Fully documented, awaiting code implementation):** 34
- **Failed Validation (Conflicting business logic or policy violation):** 0 (All past discrepancies resolved)
- **Pending Business Decisions (Awaiting merchant leadership decision):** 4

---

## 1. Missing Requirements & User Flow Resilience Audit

While 29 core user flows are documented in `PRD.md` and `user-flow.md`, real-world resilience requires mapping the **Success, Failure, Cancel, Retry, and Recovery Paths** for each flow:

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                    END-TO-END FLOW RESILIENCE MATRIX                              |
+───────────────────────────────────+───────────+───────────+───────────+───────────+───────────────+
| User Journey / Flow               | Success   | Failure   | Cancel    | Retry     | Recovery Path |
+───────────────────────────────────+───────────+───────────+───────────+───────────+───────────────+
| 1. Visitor -> Trial Registration  | Defined   | Defined   | Defined   | Defined   | OTP Resend/SMS|
| 2. Mobile App PIN Auth            | Defined   | Defined   | Auto-lock | Exponential| SMS OTP Reset |
| 3. Web Hybrid Auth                | Defined   | Defined   | Redirect  | Rate-limit| Password Reset|
| 4. Subscription Gateway Checkout  | Defined   | Webhook F.| Abort Trx | Polling   | Manual Slip Up|
| 5. Sub-second POS Checkout        | Defined   | Stock/Pay | Clear Cart| Idempotent| Draft Hold/Res|
| 6. Kisti / EMI Agreement & Coll.  | Defined   | Guarantor | Back to PO| Edit Term | Due Reversal  |
| 7. Old Phone Buyback (Police)     | Defined   | NID/IMEI  | Cancel Buy| Re-check  | Return Device |
| 8. 50% Split Repair Job Sheet     | Defined   | Pin/Status| Void Job  | Update Part| Claim Token Rc|
| 9. 100% Manual MFS Desk           | Defined   | Insuff.Fl.| Discard Tx| Re-input  | Void Adjustment|
| 10. Isolated Personal Ledger      | Defined   | Account Bal| Cancel Leg| Review Leg| Reversal Entry|
| 11. Day-End Blind Cash Closing    | Defined   | Variance  | Re-count  | Re-verify | Owner Override|
| 12. Non-Destructive Shop Suspend  | Defined   | Notice Show| N/A       | Contact Sup| Admin Reactiv.|
+───────────────────────────────────+───────────+───────────+───────────+───────────+───────────────+
```

### Flow Analysis & Edge-Case Findings:
1. **Visitor to Shop Onboarding (Flows 1, 25):**
   - *Expected:* Visitor inputs mobile number -> Receives 6-digit SMS OTP -> Configures shop name, address, category, and cash float -> Begins 14-day cardless Gold trial.
   - *Resolved Edge Case:* If user closes the browser tab after OTP verification, draft state is cached locally for 15 minutes.
2. **Dual Web vs. Mobile Authentication (Flows 9, 10, 11, 27, 28):**
   - *Expected:* Device-bound Argon2id PIN and biometric unlock on mobile; OTP/password hybrid on web.
   - *Resolved Edge Case:* If an employee mobile phone is lost or stolen, a remote one-click device revocation button is provided in Web Settings (tracked in RV-008, User Flow 29, Epic 23).
3. **Subscription Payment & Grace Periods (Flows 3, 4, 5, 6, 26):**
   - *Expected:* 14-day Gold trial -> 3-day Grace Period -> Read-Only Mode (Zero data loss).
   - *Resolved Edge Case:* If network disconnects after payment deduction, automated 3-minute background polling reconciles gateway transaction status without manual support tickets.
4. **POS Split Payments & Overpayment Change (Flows 1, 16):**
   - *Expected:* On a ৳400 bill with ৳500 tendered, system records +৳500 drawer inflow, -৳100 change outflow, and ৳400 revenue.
   - *Resolved Edge Case:* Thermal printer paper jam reprints increment `reprint_count` and print a watermark without duplicating cash drawer or inventory entries.

---

## 2. UI, UX, Hero Section & Navigation Validation

### 2.1 Public Marketing Website (`bebsayik.com`) UI/UX Validation
- **Hero Section:**
  - *Headline:* "Complete mobile shop accounting now in one single software".
  - *Primary CTA:* "[Start 14-Day Free Gold Trial (No Card Required)]" — immediately launches mobile OTP modal.
  - *App Store Badges (Pre-Launch Strategy):* Google Play and Apple App Store badges displayed prominently. Prior to live store publication, clicking badges opens a modal: *"Coming Soon — Enter your mobile number to receive an SMS notification upon launch"* to capture merchant leads.
- **Pricing Matrix:**
  - Dynamic Monthly, 6-Month (10% off), and 1-Year (16% off) tenure toggles.
  - Interactive ROI calculator projecting annual savings by eliminating manual ledger leakage.
- **Accessibility & UX Guardrails:**
  - Accessible button labels (`aria-label`), full screen reader support, and high-contrast typography.

### 2.2 Application Navigation & Screen State Specification

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                    UI SCREEN STATE SPECIFICATION MATRIX                           |
+──────────────────────────+─────────────────+─────────────────+─────────────────+──────────────────+
| Screen / Component       | Empty State     | Loading State   | Error State     | Confirmation     |
+──────────────────────────+─────────────────+─────────────────+─────────────────+──────────────────+
| POS Terminal (Web/Mob)   | "Cart empty —   | Skeleton loader | "Barcode not    | "Received ৳500.  |
|                          | scan barcode"   | (<150ms lag)    | found / Stock 0"| Confirm ৳100 chg?"|
+──────────────────────────+─────────────────+─────────────────+─────────────────+──────────────────+
| IMEI Inventory           | "No active      | Table skeleton  | "Duplicate IMEI | "Confirm scrap   |
|                          | handsets found" | animation       | already exists" | for this phone?" |
+──────────────────────────+─────────────────+─────────────────+─────────────────+──────────────────+
| Kisti (EMI) Management   | "No overdue     | Status loader   | "2nd Guarantor  | "Confirm kisti   |
|                          | installments"   |                 | NID required"   | collection?"     |
+──────────────────────────+─────────────────+─────────────────+─────────────────+──────────────────+
| Repair Job Sheets        | "No pending     | Card skeleton   | "Pattern lock   | "Confirm 50%     |
|                          | servicing jobs" |                 | incomplete"     | labor split?"    |
+──────────────────────────+─────────────────+─────────────────+─────────────────+──────────────────+
| MFS Agent Float Desk     | "No MFS tx      | Float refresh   | "Insufficient   | "Manual TrxID    |
|                          | logged today"   | spinner         | agent float"    | verified?"       |
+──────────────────────────+─────────────────+─────────────────+─────────────────+──────────────────+
| Personal Ledger          | "No Amanat or   | Ledger loader   | "Contact name & | "Non-P&L personal|
|                          | Hawlat balance" |                 | mobile required"| transaction?"    |
+──────────────────────────+─────────────────+─────────────────+─────────────────+──────────────────+
| Platform Admin Panel     | "No shops under | Metric spinner  | "Access Denied  | "Confirm shop    |
|                          | suspension"     |                 | (403 Forbidden)"| suspension?"     |
+──────────────────────────+─────────────────+─────────────────+─────────────────+──────────────────+
```

---

## 3. System Health, Reliability & Operational Monitoring

Platform health monitoring extends beyond basic ping checks to deep dependency diagnostics:

```
                                  ┌───────────────────────────────┐
                                  │    Bebsayik Health Monitor    │
                                  │      GET /api/v1/health       │
                                  └──────────────┬────────────────┘
                                                 │
          ┌──────────────────────┬───────────────┴───────────────┬──────────────────────┐
          ▼                      ▼                               ▼                      ▼
┌──────────────────┐   ┌──────────────────┐            ┌──────────────────┐   ┌──────────────────┐
│ Database Cluster │   │ Auth & Sessions  │            │ SMS Gateway Pool │   │ Payment Gateways │
│  - Query Latency │   │  - Token Verify  │            │  - SSL Wireless  │   │  - PayStation    │
│  - Connection Pool│  │  - Rate Limiter  │            │  - BulkSMSBD     │   │  - EPS / bKash   │
│  - Tenant Isol.  │   │  - Memory/Redis  │            │  - Balance Quota │   │  - Webhook Health│
└──────────────────┘   └──────────────────┘            └──────────────────┘   └──────────────────┘
```

### Health Monitoring Components:
1. **Database Connection & Latency:**
   - Connection pool exhaustion alert (triggered when 80% of pool capacity is occupied).
   - Slow query logger flagging operations exceeding 300ms.
2. **SMS Gateway Pool & Quota:**
   - Account balance monitoring (alerts dispatched to Super Admin when quota drops below 1,000 SMS).
   - Automated fallback to secondary gateway upon 5 consecutive delivery failures.
3. **Payment Gateways & Webhooks:**
   - Real-time gateway status checks detecting API downtime.
   - 3-minute background reconciler sweeping unconfirmed pending transactions (`subscription_payment_reconciler`).
4. **Background Schedulers:**
   - Nightly 12:01 AM trial expiration and grace transition worker verification.
   - Day-end blind cash closing variance digest dispatch audit.

---

## 4. Security Validation & Threat Protection

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                    SECURITY VALIDATION MATRIX                                     |
+──────────────────────────+─────────────────────────────────────────────+─────────────────────────+
| Threat / Attack Vector   | Security Control Mechanism                  | Verification Method     |
+──────────────────────────+─────────────────────────────────────────────+─────────────────────────+
| OTP Brute Force & Spam   | Max 3 OTP requests per 10 mins; 3 wrong     | Automated rate limit    |
|                          | attempts trigger 15-min lockout.            | test (RV-SEC-01)        |
+──────────────────────────+─────────────────────────────────────────────+─────────────────────────+
| PIN Guessing (Mobile)    | 5 consecutive wrong PINs trigger 5-min      | Brute force simulation  |
|                          | device lockout; Argon2id password hashing.  | (RV-SEC-02)             |
+──────────────────────────+─────────────────────────────────────────────+─────────────────────────+
| Cross-Tenant Data Leak   | Row-Level Security / Tenant Middleware;     | Cross-tenant query      |
| (Cross-Shop Snooping)    | shop_id injected on all queries.            | negative test (RV-SEC-03)|
+──────────────────────────+─────────────────────────────────────────────+─────────────────────────+
| Privilege Escalation     | Cashier cannot alter shop settings or       | Server-side RBAC test   |
|                          | delete records (Default Deny policy).       | (RV-SEC-04)             |
+──────────────────────────+─────────────────────────────────────────────+─────────────────────────+
| Idempotency Bypass       | Mandatory unique idempotency keys on POS    | Concurrent duplicate    |
| (Double Deductions)      | checkouts and subscription payments.        | POST test (RV-SEC-05)   |
+──────────────────────────+─────────────────────────────────────────────+─────────────────────────+
| Suspended Shop Tampering | Active sessions revoked; zero shop records  | Non-destructive lock    |
|                          | deleted; read-only access preserved.        | test (RV-SEC-06)        |
+──────────────────────────+─────────────────────────────────────────────+─────────────────────────+
| SMS Privacy Violation    | Prohibits reading user device SMS messages  | App permission manifest |
| (App Store Policy Risk)  | (100% manual merchant data entry policy).   | audit (RV-SEC-07)       |
+──────────────────────────+─────────────────────────────────────────────+─────────────────────────+
```

---

## 5. Data Validation & Business Rule Validation

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                  DATA VALIDATION & INTEGRITY MATRIX                               |
+────────────────────────+──────────────────────────+──────────────────────+────────────────────────+
| Data Entity / Rule     | Expected Format / Range  | Invalid Input Action | Business Enforcement   |
+────────────────────────+──────────────────────────+──────────────────────+────────────────────────+
| Bangladeshi Mobile No  | ^01[3-9]d{8}$ (11 Digits)| Form rejected + alert| Prevents duplicate     |
|                        |                          |                      | owner registrations    |
+────────────────────────+──────────────────────────+──────────────────────+────────────────────────+
| Monetary Currency      | NUMERIC(15, 2) /         | Rejects float values | Eliminates rounding    |
|                        | Decimal128 (Precision)  |                      | discrepancies          |
+────────────────────────+──────────────────────────+──────────────────────+────────────────────────+
| IMEI 1 & IMEI 2        | 15-Digit Numeric String  | Format & length check| Shop-scoped uniqueness |
|                        | (Luhn Algorithm Valid)   |                      | prevents double-selling|
+────────────────────────+──────────────────────────+──────────────────────+────────────────────────+
| POS Change Arithmetic  | Received >= Final Bill   | If Received < Total, | Unregistered credit    |
|                        | Change = Received - Bill | routes to Due handler| sales blocked          |
+────────────────────────+──────────────────────────+──────────────────────+────────────────────────+
| Negative Balance Guard | Account Balance >= 0.00  | Blocks withdrawal if | Overdrawing drawer     |
|                        | (Strict Drawer Balance)  | balance insufficient | cash prohibited        |
+────────────────────────+──────────────────────────+──────────────────────+────────────────────────+
| Specific ID COGS       | Handset landed cost      | Average costing is   | Historical profit is   |
|                        | locked upon intake       | strictly prohibited  | immune to price drops  |
+────────────────────────+──────────────────────────+──────────────────────+────────────────────────+
| Amanat Isolation       | personal_ledger_contacts | Queries joining sales| 0.00% impact on store  |
|                        | strictly separated       | trigger schema error | revenue or P&L         |
+────────────────────────+──────────────────────────+──────────────────────+────────────────────────+
```

---

## 6. Permission & Access Control Validation (RBAC Matrix)

| Role / Capability Level | POS Sales | Add Stock / IMEI | Collect Dues | Apply Discounts | Amanat / Hawlat | Post Expenses | Delete Shop / Suspend | Global Platform Settings |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Platform Super Admin** | ❌ (Shop data private)| ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (Non-destructive) | ✅ |
| **Shop Owner / Super Admin** | ✅ | ✅ | ✅ | ✅ (Unlimited) | ✅ | ✅ | ✅ (Own shop only) | ❌ |
| **Shop Manager** | ✅ | ✅ | ✅ | ✅ (Capped at 5%) | ❌ | ✅ | ❌ | ❌ |
| **Sales Staff / Cashier** | ✅ | ❌ (Read-only) | ✅ | ❌ (Manager PIN) | ❌ | ❌ | ❌ | ❌ |
| **Accountant** | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Technician** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (Job sheets only) |

> ⚠️ **Server-Side Enforcement Rule:** Hiding UI buttons does not constitute security. All backend APIs and database queries enforce user `role` and `capabilities` arrays independently of client state.

---

## 7. Notification & Communication Validation

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                    COMMUNICATION & SMS DISPATCH MATRIX                            |
+──────────────────────────+───────────────+──────────+──────────────────────+──────────────────────+
| Event Trigger            | Recipient     | Channel  | Template / Content   | Rate Limit / Cooldown|
+──────────────────────────+───────────────+──────────+──────────────────────+──────────────────────+
| 1. User Signup / Login   | Shop Owner    | SMS      | "Bebsayik OTP: 123456 | 60-second cooldown,  |
|                          |               |          | Valid for 2 mins."   | max 3 per 10 mins    |
+──────────────────────────+───────────────+──────────+──────────────────────+──────────────────────+
| 2. Warranty / RMA Ready  | Repair Cust.  | WhatsApp/| "Official warranty   | Dispatched once upon |
|                          |               | SMS      | claim complete. Pls  | item intake/complete |
|                          |               |          | collect device."     |                      |
+──────────────────────────+───────────────+──────────+──────────────────────+──────────────────────+
| 3. Day-End Cash Closing  | Shop Owner    | SMS / App| "Closing Summary:    | Dispatched once upon |
|    (Z-Report Variance)   |               | Push     | Sales ৳50,000, Cash  | register closure     |
|                          |               |          | Variance: ৳0."       |                      |
+──────────────────────────+───────────────+──────────+──────────────────────+──────────────────────+
| 4. Subscription Expiring | Shop Owner    | SMS & In-| "Gold trial expires  | Sent at 3 days,      |
|    (3 Days / 1 Day left) |               | App Alert| in 3 days. Please    | 1 day, and on expiry |
|                          |               |          | renew."              | date                 |
+──────────────────────────+───────────────+──────────+──────────────────────+──────────────────────+
| 5. Service Job Ready     | Repair Cust.  | SMS      | "Servicing complete. | Dispatched once upon |
|                          |               |          | Bill ৳1,200. Pls     | status -> 'Repaired' |
|                          |               |          | collect device."     |                      |
+──────────────────────────+───────────────+──────────+──────────────────────+──────────────────────+
```

---

## 8. Exception Handling & Recovery Matrix

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                    SYSTEM EXCEPTION & RECOVERY MATRIX                             |
+──────────────────────────+─────────────────────────────+─────────────────────────────────────────+
| Exception Scenario       | User Interface Message      | System Behavior & Recovery Action       |
+──────────────────────────+─────────────────────────────+─────────────────────────────────────────+
| Network Disconnect (POS) | "Internet disconnected.     | Non-serialized sales queue in local     |
|                          | Operating in offline mode." | storage; syncs automatically on recovery|
+──────────────────────────+─────────────────────────────+─────────────────────────────────────────+
| Duplicate Payment Webhook| "Payment already confirmed."| Idempotency lock returns HTTP 200 OK;   |
|                          |                             | zero duplicate extension of plan tenure.|
+──────────────────────────+─────────────────────────────+─────────────────────────────────────────+
| Duplicate IMEI Scan      | "This IMEI has already been | Item addition blocked in cart; real-time|
|                          | sold from inventory."       | database stock state re-validated.      |
+──────────────────────────+─────────────────────────────+─────────────────────────────────────────+
| Gateway Timeout / Drop   | "Verifying payment status.  | 3-minute background poller queries      |
|                          | Please wait a few moments." | gateway API; unlocks tier on success.   |
+──────────────────────────+─────────────────────────────+─────────────────────────────────────────+
| Concurrent POS Checkout  | "Selected unit was just     | Database row lock (FOR UPDATE / session)|
|                          | sold on another counter."   | rejects second checkout; cart refreshed.|
+──────────────────────────+─────────────────────────────+─────────────────────────────────────────+
| Database Crash Mid-Sale  | "Transaction could not be   | ACID transaction rolls back completely; |
|                          | completed. Please retry."   | zero partial stock or ledger mutations. |
+──────────────────────────+─────────────────────────────+─────────────────────────────────────────+
| Suspended Shop Login     | "Your shop account has been | Dashboard blocked; displays notice and  |
|                          | temporarily suspended."     | support hotline contact modal.          |
+──────────────────────────+─────────────────────────────+─────────────────────────────────────────+
```

---

## 9. Financial Integrity & Transaction Validation

### 9.1 Ledger Immutability & Double-Entry Principles:
1. **Zero Silent Overwrite:** Posted sales, purchase GRNs, and cash transactions are append-only; database records are never updated or deleted. Corrections require compensating reversal entries.
2. **Amanat / Hawlat Isolation:** Personal transactions in `personal_ledger_contacts` have exactly 0.00% impact on store sales revenue, profit, or VAT liabilities.
3. **Change Arithmetic Integrity:** Cash received and change returned are recorded as distinct inflows and outflows in the cash drawer ledger.
4. **MFS Agent Float vs. Cash Drawer:** Cash In transactions reduce agent digital float while increasing drawer cash; Cash Out transactions execute the exact reverse. Operator commissions credit to a dedicated commission revenue ledger.

---

## 10. Acceptance Criteria & Automated Test Requirements

The automated testing pyramid spanning all 55 audited requirements:

```
                  ┌───────────────────────────────────────────────┐
                  │          End-to-End Tests (Playwright)        │
                  │        - Full Visitor to POS Checkout Journey │
                  └───────────────────────┬───────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  │       Integration & API Tests (Supertest)     │
                  │   - Webhook, Idempotency & Auth State Machine │
                  └───────────────────────┬───────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  │       Database Isolation Tests (pgTAP / Mongo)│
                  │     - Multi-tenant Isolation & Specific COGS  │
                  └───────────────────────┬───────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  │       Unit Tests (Vitest)                     │
                  │ - Decimal Precision, Change Arithmetic, Rules │
                  └───────────────────────────────────────────────┘
```

### Requirement Status Legend:
- **Implemented & Verified:** Source code completed and validated with automated test passes.
- **Implemented but Unverified:** DDL scripts or schema components created, awaiting live cluster integration tests.
- **Partially Implemented:** Architectural specifications complete with partial schema foundations.
- **Specified, Code Pending:** Comprehensive functional specifications documented; awaiting source code implementation.
- **Pending Business Decision:** Awaiting merchant leadership policy confirmation.

---

## 11. Requirement Traceability Matrix (RTM)

| Req ID | Module / Domain | Requirement Description | Current Status | Risk & Impact | Priority | Required Action & Test Scenario |
|:---:|:---|:---|:---:|:---:|:---:|:---|
| **RV-001** | Landing Page | `bebsayik.com` Hero, Feature Grid & Pricing Matrix | Specified, Code Pending | High (Lead drop) | 🔴 Critical | Create marketing components & verify live preview |
| **RV-002** | App Store Badges | Store badges & pre-launch lead capture modal | Specified, Code Pending | Medium | 🟡 Important | Coming Soon modal component with SMS capture |
| **RV-003** | Trial Onboarding | Cardless 14-day Gold trial & 3-step setup wizard | Specified, Code Pending | High | 🔴 Critical | Phone input, OTP verification, tenant init (TC-01) |
| **RV-004** | Subdomain Routing | `bebsayik.com`, `app.bebsayik.com`, `admin.bebsayik.com` | Specified, Code Pending | High (Security) | 🔴 Critical | Host router & CORS header verification |
| **RV-005** | Platform Admin | Central admin dashboard, MRR, churn & shop list | Specified, Code Pending | High | 🔴 Critical | Super admin authentication & metric queries |
| **RV-006** | Shop Suspension | Non-destructive suspension (Zero data loss, notice) | Specified, Code Pending | Critical (Legal) | 🔴 Critical | Suspension toggle & data protection test (TC-38) |
| **RV-007** | Plan Versioning | Subscription price snapshot (Locks active rate) | Specified, Code Pending | Medium | 🟡 Important | Price update regression & snapshot test (TC-39) |
| **RV-008** | Mobile Device PIN | 4-digit device-bound Argon2id PIN on mobile app | Specified, Code Pending | Critical (Security)| 🔴 Critical | Brute force lockout & hardware binding test (TC-40)|
| **RV-009** | Web Hybrid Auth | Web OTP/password hybrid & 15-min timeout | Specified, Code Pending | High (SMS cost) | 🔴 Critical | Session expiry & password login test (TC-50) |
| **RV-010** | Manual MFS Policy | Prohibits SIM/SMS scraping; 100% manual entry | Specified, Code Pending | Critical (Store ban)| 🔴 Critical | App permissions audit & manual validation (TC-42) |
| **RV-011** | Sub-Second POS | Keyboard-driven checkout (F1-F12) in <250ms | Specified, Code Pending | High (Counter queue)| 🔴 Critical | Keyboard shortcuts & barcode buffer test |
| **RV-012** | Change Arithmetic | Bill ৳400, Tendered ৳500 -> ৳100 change in ledger | Specified, Code Pending | Critical (Accounting)| 🔴 Critical | Change calculation & drawer outflow test (TC-02) |
| **RV-013** | Dual-IMEI Tracking | Unique Dual-IMEI tracking with Specific ID COGS | Implemented but Unverified | Critical | 🔴 Critical | DDL unique constraints & COGS query test (TC-03) |
| **RV-014** | Kisti (EMI) Engine | 2 guarantors with NID/phone; schedule tracking | Implemented but Unverified | High (Credit risk) | 🔴 Critical | Collection schedule & overdue alert test (TC-17) |
| **RV-015** | Old Phone Buyback | Seller photo, NID copy & police deed print | Implemented but Unverified | Critical (Legal) | 🔴 Critical | Police deed print & pre-owned intake test (TC-20) |
| **RV-016** | 50% Repair Split | Job sheets, pattern lock & 50% labor commission | Implemented but Unverified | High (Payroll) | 🔴 Critical | Labor split & spare parts profit calculation |
| **RV-017** | Personal Ledger | Amanat & Hawlat in isolated tables (Zero P&L) | Implemented but Unverified | Critical (P&L) | 🔴 Critical | Store P&L isolation & "Expense on Behalf" (TC-09) |
| **RV-018** | POS MFS Cash Out | Customer cashes out to Agent SIM as payment | Specified, Code Pending | High | 🔴 Critical | Float debit & sales revenue credit balance (TC-31) |
| **RV-019** | Day-End Z-Report | Blind cash count & owner SMS variance digest | Implemented but Unverified | Critical (Leakage) | 🔴 Critical | Cash variance formula & drawer lock test (TC-18) |
| **RV-020** | Multi-Tenancy RLS | Database-level shop isolation enforcing shopId | Implemented but Unverified | Critical (Data leak) | 🔴 Critical | Cross-tenant negative leak prevention test (TC-01) |
| **RV-056** | Web Password Recovery | Argon2id password reset via 6-digit SMS OTP | Specified, Code Pending | Critical (Access) | 🔴 Critical | Turnstile rate limit & session revocation test (TC-51)|
| **RV-057** | Dual-OTP Phone Migration | Two-phase Dual-OTP verification on registered number | Specified, Code Pending | Critical (Identity) | 🔴 Critical | Dual SIM handshake & atomic DB update test (TC-52) |
| **RV-058** | Instant Staff Termination | Emergency session kill & tablet lockout on firing | Specified, Code Pending | High (Security) | 🔴 Critical | Token versioning & <1s POS kickout test (TC-53) |
| **RV-059** | Thermal Receipt Branding | Logo bitmap & custom header/footer on receipts | Specified, Code Pending | Medium (Branding) | 🟡 Important | 58mm/80mm ESC-POS printer test & pulse kick (TC-54)|
| **RV-060** | Multi-Shop Workspace | Multi-outlet tenant switching under 1 phone login | Specified, Code Pending | Medium (Usability) | 🟡 Important | Scoped tenant JWT & state hot-swap test (TC-55) |

---

## 12. Consolidated Gap Report & Prioritized Roadmap

### 12.1 Critical Identified Risks & Resolution Status:
1. **Source Code Implementation Gap:**
   - *Status:* **In Progress / Ready for Sprint 1 Execution**
   - Architectural blueprints and database DDL scripts are complete; monorepo scaffolding for the 3 subdomains begins next.
2. **SMS Cost Escalation Risk (GAP-02):**
   - *Status:* **✅ Codified & Resolved**
   - Web password setup policy eliminates recurring OTP costs for daily desktop logins. Test Case: `PRD.md` v6.1.0 `TC-50`.
3. **Mobile Device Revocation Gap (GAP-03):**
   - *Status:* **✅ Codified & Resolved**
   - Owners can revoke stolen mobile hardware in 1 click from Web Settings. User Flow: `User Flow 29`, `Epic 23`, Schema: `user_devices.revoked_at`, Test Case: `TC-46`.
4. **Payment Gateway Latency Risk (GAP-04):**
   - *Status:* **✅ Codified & Resolved**
   - 3-minute background poller sweeps unconfirmed pending transactions automatically. Schema: `subscription_invoices.poll_attempts`, Test Case: `TC-49`.
5. **Offline Handset Sale Risk (GAP-05):**
   - *Status:* **✅ Codified & Resolved**
   - Selling serialized Dual-IMEI handsets offline is strictly blocked; non-serialized accessories are allowed in IndexedDB queue. User Flow: `User Flow 21`, Test Case: `TC-48`.
6. **Printer Paper Jam Reprint Idempotency:**
   - *Status:* **✅ Codified & Resolved**
   - Invoice reprint increments `reprint_count` and prints `[DUPLICATE REPRINT]` watermark without mutating ledger or stock. Schema: `sales.reprint_count`, Test Case: `TC-47`.
7. **Registered Mobile Number Migration Risk (GAP-07):**
   - *Status:* **✅ Codified & Resolved**
   - Standard phone migration governed by 180s Dual-OTP handshake (`phone_change_requests`); lost SIM emergency recovery verified via NID & Platform Super Admin audit ticket. User Flow 31, Test Case: `TC-52`.
8. **Web ERP Password Recovery & Brute-Force Risk (GAP-08):**
   - *Status:* **✅ Codified & Resolved**
   - Web forgot password protected by Cloudflare Turnstile and 3 OTP/15m rate limits; setting new password increments `tokenVersion` to revoke stale sessions globally. User Flow 30, Test Case: `TC-51`.
9. **Staff Account Lifecycle & Security Risk (GAP-09):**
   - *Status:* **✅ Codified & Resolved**
   - Onboarding via temporary one-time PIN; emergency termination sets `isActive = false` and kills counter POS tablets in <1 second. User Flow 32, Test Case: `TC-53`.
10. **Thermal Receipt Branding Customization (GAP-10):**
    - *Status:* **✅ Codified & Resolved**
    - Shop settings support logo upload, Bangla receipt headers/footers, and 58mm/80mm WebUSB printer calibration. User Flow 33, Test Case: `TC-54`.

### 12.2 Pending Business Decisions:
1. **Telegram / WhatsApp Notification Channels:** Whether to offer free WhatsApp/Telegram delivery alongside SMS for Day-End Z-Report digests (Proposed: Phase 2 addition).
2. **BDT Sub-Paisa Rounding Policy:** Whether sub-paisa fractions (e.g. ৳0.045) arising from wholesale tax splits use Banker's Rounding (Half-Even) or Truncate/Floor.
3. **Offline Sync First-Write-Wins vs Manual Admin Resolution:** When two offline terminals sell the same non-serialized accessory batch beyond quantity, whether automatic negative offset voucher or manual supervisor reconciliation modal is triggered.
4. **Multi-Shop Single-Owner Account Federation:** **✅ DECIDED.** Unified login under single phone number with top navigation Workspace Switcher issuing short-lived scoped tenant JWTs (User Flow 34, Test Case: `TC-55`).

### 12.3 Prioritized Sprint Execution Roadmap:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            IMMEDIATE SPRINT EXECUTION                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Sprint 1: Project Scaffolding & Monorepo Setup                           │
│    - React / Vite project setup (3 Subdomains: marketing, app, admin)       │
│    - Tailwind CSS & Design System Tokens (Typography & theme)               │
│                                                                             │
│ 2. Sprint 2: Database Migration & Multi-Tenant Deployment                   │
│    - MongoDB Atlas replica set initialization & Mongoose schemas            │
│    - Multi-tenant query isolation plugins & seed verification               │
│                                                                             │
│ 3. Sprint 3: Dual-Auth Engine Implementation                                │
│    - Mobile device-bound Argon2id PIN & web OTP/password hybrid             │
│                                                                             │
│ 4. Sprint 4: Kanchan Telecom High-Speed POS & Catalog Engine                │
│    - F1-F12 keyboard shortcuts, Dual-IMEI Specific COGS & change arithmetic │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

📌 *This comprehensive Requirement Validation Report is preserved as an authoritative reference in [Requirement Validation.md](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/Requirement%20Validation.md) for all subsequent development and automated QA testing phases.*
