# Bebsayik.com — Multi-tenant SaaS ERP Platform
**Document File:** `DFD.md`  
**System Name:** Bebsayik.com — Multi-tenant SaaS ERP Platform  
**Official Product Name:** Bebsayik  
**English Product Name:** Bebsayik.com  
**Brand:** Bebsayik  
**Official Website:** `https://bebsayik.com` (Intended canonical URL, subject to domain verification)  
**Brand Attribution:** Powered by Bebsayik  
**Legacy Business Context:** The initial ERP requirements and workflows originated from the Kanchan Telecom retail operation. The SaaS product is independently branded and operated as Bebsayik.com.  
**Document Version:** 1.0.0 (Baseline Architecture Specification)  
**Document Status:** Authoritative Logical Data Flow Specification  

---

## 1. Executive Summary, System Scope, and Boundaries

### 1.1 Project Purpose and Background
**Bebsayik** is a high-performance, multi-tenant SaaS retail and distribution ERP platform engineered specifically to digitize the complex, real-world operational workflows of mobile handset, gadget, accessories retail shops, and consumer electronics businesses in Bangladesh.

Rather than acting as a standard generic point-of-sale (POS) tool, Bebsayik manages 17+ specialized retail business domains originated from the extensive retail experience of Kanchan Telecom—such as Dual-IMEI specific cost tracking, installment (Kisti) and EMI ledgers, pre-owned phone buybacks with legal police undertaking agreements, technician 50% labor split repair jobs, 100% manual MFS agent bookkeeping, and the strictly isolated "Amanat-Hawlat" personal ledger—with rigorous data integrity.

### 1.2 System Boundaries
The Bebsayik platform boundaries are partitioned across three distinct architectural tiers:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 BEBSAYIK SYSTEM BOUNDARIES                                       │
├────────────────────────────────┬────────────────────────────────┬────────────────────────────────┤
│ 1. Public Marketing Subsystem  │ 2. Platform Admin Subsystem    │ 3. Tenant Shop ERP Subsystem   │
│    (bebsayik.com)              │    (admin.bebsayik.com)        │    (app.bebsayik.com)          │
├────────────────────────────────┼────────────────────────────────┼────────────────────────────────┤
│ - Public Product Showcase      │ - Global Tenant Directory      │ - Sub-second Keyboard POS      │
│ - Transparent Plan Pricing     │ - Subscription & Plan Version  │ - Dual-IMEI Inventory & STN    │
│ - Passwordless OTP Onboarding  │ - Suspension & Read-Only Logic │ - Supplier Procurement & PRV   │
│ - Cardless 14-Day Gold Trial   │ - Global Audit Trail & Logs    │ - 100% Manual MFS Agent Desk   │
│ - Store Badges & Pre-launch    │ - Multi-Gateway Reconciliation │ - Isolated Personal Ledger     │
│ - Contact & Lead Management    │ - Cross-Shop Security Guard    │ - Repair Sheets & RMA Warranty │
└────────────────────────────────┴────────────────────────────────┴────────────────────────────────┘
                                                 │
                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    EXTERNAL SYSTEM ACTORS                                        │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Dokandar (Shop Owner / Tenant Admin)        • Shop Staff (Cashier, Manager, Technician)        │
│ • Retail Customer (Buyer / Borrower)           • Supplier / Wholesaler (Vendor)                  │
│ • Platform Super-Admin (SaaS Operator)         • External SMS Gateway (SSL Wireless / BulkSMS)   │
│ • Multi-Gateway (PayStation, EPS, bKash API)   • WhatsApp Cloud API (Receipts & Notifications)   │
│ • Secure Cloud Object Storage (S3 / R2)        • Brand Service Center / Distributor (RMA)        │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### A. Public Marketing Website (`bebsayik.com`):
- Introduces new merchants to the platform and displays transparent subscription tiers.
- Enables passwordless onboarding using 11-digit Bangladeshi mobile numbers and 6-digit SMS OTP challenges.
- Instantly provisions a 14-day free Gold trial without requiring credit card details.

#### B. Central Platform Admin Portal (`admin.bebsayik.com`):
- Monitors and governs all registered shop tenants across the SaaS platform.
- Manages subscription pricing snapshots and tier feature versioning.
- Enforces non-destructive shop suspension (suspended shops retain all historical data; database records remain completely intact).
- Reconciles payment gateway transactions and audits global security event logs.

#### C. Shop-Level ERP and POS Application (`app.bebsayik.com`):
- Enforces strict tenant isolation for every individual shop.
- Manages high-speed counter sales, inventory, purchasing, customer accounts receivable, and day-end blind cash closings.
- Houses specialized retail modules: Amanat-Hawlat personal ledger, manual MFS agent desk, technician repair job sheets, and brand warranty RMA tracking.

---

## 2. Core Assumptions, Architectural Harmonization, and Pending Decisions

### 2.1 Requirement Status Classification
Based on a comprehensive review of all project specifications (`PRD.md`, `user-flow.md`, `ARCHITECTURE.md`, `database-schema.md`), the operational rules are classified into the following authoritative tiers:

1. **Confirmed & Authoritative Requirements:**
   - **Shop-Centric Multi-Tenancy:** No organizational parent hierarchy; `shop_id` is the primary tenant isolation key across all operational domains.
   - **Strict Entity Isolation of Personal Ledger:** Amanat-Hawlat records (`personal_ledger_contacts` and `personal_transactions`) must never merge with customer, supplier, or store P&L tables. "Expense on Behalf" transactions reduce cash drawer balance and contact liability simultaneously, with **exactly 0.00% P&L cost impact** on the store.
   - **100% Manual MFS Entry Policy:** Background SMS scraping, automated SIM reading, and device scraping are strictly prohibited. All Cash In and Cash Out transactions must be typed manually by the merchant.
   - **Specific Identification COGS:** Each mobile handset preserves its exact landed cost locked to its unique IMEI. Non-serialized accessory items follow standard FIFO valuation.
   - **Non-Destructive Subscription Lifecycle:** 14-Day Free Trial → 3-Day Grace Period → Read-Only Mode. Merchants retain continuous access to view data and export full backups for 12+ months post-expiry; no merchant data is dropped.
   - **Kisti Financial-Only Scope:** Software maintains installment schedules and payment ledgers exclusively. Automated reminder SMS messages and remote device locking features are deliberately excluded (managed independently via external third-party tools).

2. **Architectural Harmonization:**
   - *Database Engine Alignment:* `database-schema.md` and `schema.sql` documented a relational PostgreSQL 16+ RLS schema, whereas `ARCHITECTURE.md` established MongoDB Atlas 7.0+ (Mongoose ODM). In this DFD specification, all data stores are defined as **Logical Data Stores**. Logical entities, tenant partition keys (`shop_id`), and numeric precision (`Decimal128` / `NUMERIC(15,2)`) behave identically across both storage models.
   - *Hardware Bridges:* Thermal receipt printers (ESC/POS) and cash drawer kickers communicate via the browser `WebUSB API` or local desktop print spoolers.

3. **Pending Business Decisions (Tracked Explicitly):**
   - *BDT Currency Sub-Paisa Rounding Policy:* Formalization of sub-paisa rounding rules (2 decimal places standard model).
   - *Offline-to-Online Sync Conflict Window:* When two offline POS terminals sell the identical unique IMEI during an internet outage, the first transaction received by the server commits, while the second terminal automatically issues an administrative reversal voucher.

---

## 3. DFD Notation and Visual Conventions

This document strictly adheres to the **Gane & Sarson / Yourdon & Coad** standard logical DFD notation rendered using modern, standard **Mermaid Flowchart** syntax:

```
┌─────────────────────────┐         ┌─────────────────────────┐
│     [External Entity]   │         │    ( Process Number )   │
│   Rectangle / Solid Box │         │       Rounded Box       │
└────────────┬────────────┘         └────────────▲────────────┘
             │                                   │
             │           Data Flow Label         │
             └───────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  D1 | Data Store    │
                    │  Open-ended / Strip │
                    └─────────────────────┘
```

- **External Entity:** People, external organizations, or third-party API gateways outside the system boundary (Syntax: `[Entity Name]`).
- **Process:** Any logical transformation, calculation, or data manipulation (Syntax: `((Process ID: Process Name))` or `([Process ID: Process Name])`).
- **Data Store:** A repository where data is permanently or temporarily persisted (Syntax: `[(DS-ID: Store Name)]`).
- **Data Flow:** Directed arrow depicting structured data in transit between entities, processes, and data stores (`── DF-XXX: Data ──►`).

---

## 4. Level 0 — Context Diagram

### 4.1 Context Diagram Narrative
The Context Diagram depicts the entire Bebsayik SaaS platform as a single centralized logical process (`Process 0.0`). It isolates the platform boundary and displays all external data inputs and outputs crossing system borders without exposing internal subprocess logic.

### 4.2 Mermaid Context Diagram
```mermaid
flowchart TB
    %% External Entities
    Visitor["👤 Visitor / Prospective Merchant"]
    Owner["👔 Shop Owner (Tenant Admin)"]
    Staff["👨‍💼 Shop Staff (Cashier / Technician)"]
    Customer["🛒 Retail Customer / Borrower"]
    Supplier["🏢 Supplier / Wholesaler"]
    Admin["🛡️ Platform Super-Admin"]
    SMS["📱 SMS Gateway (SSL Wireless / BulkSMS)"]
    PGW["💳 Payment Gateways (PayStation, EPS, bKash)"]
    Storage["☁️ Object Storage (AWS S3 / Cloudflare R2)"]
    WhatsApp["💬 WhatsApp Cloud API"]
    BrandRMA["🔧 Brand Service Center / Distributor"]

    %% Central System Process
    System(("0.0<br/><b>Bebsayik.com SaaS Engine</b><br/>(Powered by Bebsayik)"))

    %% Data Flows: Visitor
    Visitor -->|"DF-001: Mobile No, Registration Details, Selected Plan"| System
    System -->|"DF-002: OTP Challenge, Trial Confirmation, Public Catalog"| Visitor

    %% Data Flows: Shop Owner
    Owner -->|"DF-003: Login Credentials, Shop Config, PIN, Business Inputs"| System
    System -->|"DF-004: Auth Tokens, P&L Reports, Day-End Z-Report, Audit Alerts"| Owner

    %% Data Flows: Shop Staff
    Staff -->|"DF-005: Staff PIN, Sales Entry, Job Sheets, Cash Drawer Count"| System
    System -->|"DF-006: Shift Clearance, POS Receipts, Job Tokens, Commission Slip"| Staff

    %% Data Flows: Retail Customer
    Customer -->|"DF-007: Cash/MFS Payment, Buyback Device, Repair Request"| System
    System -->|"DF-008: Printed Invoice, Money Receipt, Legal Agreement, Claim Token"| Customer

    %% Data Flows: Supplier
    Supplier -->|"DF-009: Invoiced IMEI Devices, Delivery Challan, Bank Info"| System
    System -->|"DF-010: Purchase Order (PO), Payment Voucher, PRV Return Note"| Supplier

    %% Data Flows: Platform Super Admin
    Admin -->|"DF-011: Plan Configurations, Suspension Trigger, System Audit Query"| System
    System -->|"DF-012: Tenant Directory, Subscription Analytics, Platform Logs"| Admin

    %% Data Flows: External Services
    System -->|"DF-013: Dispatch OTP SMS, Emergency Security Alerts"| SMS
    SMS -->|"DF-014: Delivery Receipts, SMS Balance Status"| System

    System -->|"DF-015: Subscription Checkout Payload, Redirect URL"| PGW
    PGW -->|"DF-016: Webhook Callback, HMAC Signature, Settlement Status"| System

    System -->|"DF-017: Store Encrypted Police Undertaking PDFs, NID Photos"| Storage
    Storage -->|"DF-018: Pre-signed Time-Limited Secure Download URLs"| System

    System -->|"DF-019: Digital Invoice PDF Link, RMA Status Update Message"| WhatsApp
    WhatsApp -->|"DF-020: Message Delivery & Read Receipts"| System

    System -->|"DF-021: Warranty RMA Claim Device Details & Fault Description"| BrandRMA
    BrandRMA -->|"DF-022: Repaired/Replaced Device & Inspection Report"| System

    %% Node Styling
    style System fill:#1e293b,stroke:#0ea5e9,stroke-width:3px,color:#ffffff
    style Visitor fill:#f8fafc,stroke:#64748b,stroke-width:2px,color:#0f172a
    style Owner fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#0f172a
    style Staff fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#0f172a
    style Customer fill:#fdf4ff,stroke:#c026d3,stroke-width:2px,color:#0f172a
    style Supplier fill:#fff7ed,stroke:#ea580c,stroke-width:2px,color:#0f172a
    style Admin fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#0f172a
    style SMS fill:#f5f3ff,stroke:#7c3aed,stroke-width:2px,color:#0f172a
    style PGW fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#0f172a
    style Storage fill:#f0f9ff,stroke:#0284c7,stroke-width:2px,color:#0f172a
    style WhatsApp fill:#f0fdf4,stroke:#22c55e,stroke-width:2px,color:#0f172a
    style BrandRMA fill:#fffbeb,stroke:#d97706,stroke-width:2px,color:#0f172a
```

---

## 5. Level 1 — System-Wide Data Flow Diagram

### 5.1 Level 1 Process Decomposition
The end-to-end operational workflows of Bebsayik are decomposed into 16 primary logical processes:

- **1.0 — Authentication & Session Management:** Passwordless mobile OTP, Argon2id PIN binding, session revocation.
- **2.0 — Shop Tenant & Subscription Billing:** Merchant onboarding, 14-day Gold trial, gateway checkout, grace mode enforcer.
- **3.0 — Platform Administration & Governance:** Plan tier versioning, non-destructive shop suspension, global audit logs.
- **4.0 — Product Catalog & Dual-IMEI Management:** Product master, specific cost locks, dead stock, barcode label generation.
- **5.0 — Procurement & Supplier Management:** Purchase orders, GRN receiving, dual-IMEI bulk intake, purchase return vouchers (PRV).
- **6.0 — Point of Sale (POS) & Fast Checkout:** Keyboard-first billing, multi-tender split payment, change arithmetic, Mushak 6.3 invoices.
- **7.0 — Returns, Exchanges & Trade-In (Buyback):** Sales return quarantine, used phone diagnostics, 300-Tk police legal agreement.
- **8.0 — Customer Dues & Kisti Financial Ledger:** Due collection money receipts, installment loan accounts, milestone schedules.
- **9.0 — Service, Repair & Brand Warranty (RMA):** 3x3 pattern locks, job sheets, 50% maker labor split, distributor RMA tickets.
- **10.0 — Accounts, Cash Drawers & Internal Transfers:** Multi-counter cash drawers, bank accounts, OPEX expense vouchers.
- **11.0 — MFS Agent Desk (100% Manual Bookkeeping):** bKash/Nagad manual Cash In and Cash Out, digital float ledger, telco commissions.
- **12.0 — Isolated Personal Ledger (Amanat / Hawlat):** Strictly isolated personal contacts, "Expense on Behalf" (0.00% Store P&L).
- **13.0 — Staff, Payroll & Salesman Commission:** Employee monthly attendance, sales target tiers, technician labor commission slips.
- **14.0 — Reports, Day-End Z-Report & Analytics:** Real-time P&L, blind cash count reconciliation, cash variance SMS alerts.
- **15.0 — Notification & Communication Dispatch:** SMS gateway failover dispatch, WhatsApp digital invoice dispatcher.
- **16.0 — Data Portability, Backup & System Audit:** Non-blocking read-only cursor exports, weekly encrypted cloud snapshots.

### 5.2 Mermaid Level 1 DFD
```mermaid
flowchart TB
    %% External Entities
    Owner["👔 Shop Owner"]
    Staff["👨‍💼 Shop Staff"]
    Customer["🛒 Customer"]
    Supplier["🏢 Supplier"]
    Admin["🛡️ Platform Admin"]
    PGW["💳 Payment Gateways"]
    SMS["📱 SMS Gateway"]
    WhatsApp["💬 WhatsApp API"]
    Storage["☁️ Object Storage"]
    Brand["🔧 Brand Center"]

    %% Core Data Stores
    D1[("D1: Auth & User Devices")]
    D2[("D2: Shops & Subscription")]
    D3[("D3: Catalog & Variants")]
    D4[("D4: Dual-IMEI & Stock Ledger")]
    D5[("D5: Suppliers & Purchases")]
    D6[("D6: Customers & Receivables")]
    D7[("D7: Sales & Invoice Items")]
    D8[("D8: Accounts & Cash Drawers")]
    D9[("D9: Financial & Double Ledgers")]
    D10[("D10: Kisti Financial Schedules")]
    D11[("D11: Buyback & Police Docs")]
    D12[("D12: Repair Jobs & RMA")]
    D13[("D13: MFS Agent Balances")]
    D14[("D14: Isolated Personal Ledger")]
    D15[("D15: Daily Closings & Audits")]

    %% Level 1 Processes
    P1(["1.0<br/>Authentication & Access Management"])
    P2(["2.0<br/>Tenant & Subscription Billing"])
    P3(["3.0<br/>Platform Governance & Admin"])
    P4(["4.0<br/>Catalog & Dual-IMEI Tracking"])
    P5(["5.0<br/>Procurement & Supplier Payable"])
    P6(["6.0<br/>POS & High-Speed Checkout"])
    P7(["7.0<br/>Returns, Exchanges & Buyback"])
    P8(["8.0<br/>Customer Dues & Kisti Ledger"])
    P9(["9.0<br/>Repair Service & Brand RMA"])
    P10(["10.0<br/>Accounts & Cash Movement"])
    P11(["11.0<br/>100% Manual MFS Agent Desk"])
    P12(["12.0<br/>Isolated Personal Ledger"])
    P13(["13.0<br/>Payroll & Staff Commission"])
    P14(["14.0<br/>Day-End Z-Report & Reports"])
    P15(["15.0<br/>Notification Dispatcher"])
    P16(["16.0<br/>Data Portability & Audit"])

    %% Process Connections & Store Flows
    Owner -->|"Phone, OTP, PIN"| P1
    Staff -->|"Staff PIN"| P1
    P1 <-->|"Read/Write Device & OTP"| D1
    P1 -->|"Dispatch SMS OTP"| P15
    P15 --> SMS

    Owner -->|"Plan Selection, Checkout"| P2
    PGW -->|"Webhook Payload"| P2
    P2 <-->|"Subscription Status"| D2
    P2 -->|"Subscription Invoice"| D9

    Admin -->|"Plan Version, Suspend Shop"| P3
    P3 <-->|"Update Shop Status"| D2
    P3 -->|"Audit Entry"| D15

    Staff -->|"Product Master, IMEI Ingest"| P4
    P4 <-->|"Catalog & IMEI Status"| D3
    P4 <-->|"Stock Audit Movements"| D4

    Staff -->|"PO, Delivery Challan"| P5
    Supplier <-->|"PO & Payment Voucher"| P5
    P5 -->|"Ingest IMEI Units"| D4
    P5 <-->|"Supplier Ledger"| D5
    P5 -->|"Payment Outflow"| D8
    P5 -->|"Double-Leg Entry"| D9

    Customer -->|"Buy Phone/Items"| P6
    Staff -->|"Barcode, Cash/MFS Split"| P6
    P6 <-->|"Validate Stock & IMEI"| D4
    P6 -->|"Post Sale & Snapshot"| D7
    P6 -->|"Drawer Inflow & Change"| D8
    P6 -->|"Sales Revenue Ledger"| D9
    P6 -->|"Due Amount"| D6
    P6 -->|"Invoice WhatsApp"| P15
    P15 --> WhatsApp

    Customer -->|"Return Old/Broken Phone"| P7
    P7 <-->|"Inspect IMEI"| D4
    P7 -->|"Store Buyback PDF"| Storage
    P7 -->|"Pre-owned Stock Inflow"| D4
    P7 -->|"Buyback Agreement"| D11
    P7 -->|"Refund/Trade-in Outflow"| D8

    Customer -->|"Pay Installment / Due"| P8
    P8 <-->|"Due Balances"| D6
    P8 <-->|"Installment Schedule"| D10
    P8 -->|"Receipt Inflow"| D8
    P8 -->|"Credit Due Ledger"| D9

    Customer -->|"Service Handset / RMA"| P9
    Brand <-->|"RMA Handover / Delivery"| P9
    P9 <-->|"Parts Decrement"| D4
    P9 <-->|"Job Sheet Details"| D12
    P9 -->|"Service Fee Inflow"| D8
    P9 -->|"50% Labor Split Ledger"| D9

    Staff -->|"Internal Transfer, Expense"| P10
    P10 <-->|"Account Balances"| D8
    P10 -->|"Expense / Transfer Journal"| D9

    Staff -->|"Manual Cash In / Cash Out"| P11
    P11 <-->|"Float Ledger"| D13
    P11 <-->|"Physical Drawer Impact"| D8
    P11 -->|"Commission Income Ledger"| D9

    Owner -->|"Personal Hawlat Entry"| P12
    P12 <-->|"Isolated Personal Records"| D14
    P12 <-->|"Physical Drawer Sync"| D8

    Owner -->|"Calculate Salary & Bonus"| P13
    P13 <-->|"Fetch Sales & Repair Splits"| D7
    P13 -->|"Payroll Expense"| D8
    P13 -->|"Payroll Journal"| D9

    Staff -->|"Blind Cash Count"| P14
    P14 <-->|"Aggregate Ledgers"| D7
    P14 <-->|"Aggregate Drawer"| D8
    P14 -->|"Write Z-Report Closing"| D15
    P14 -->|"Z-Report Summary SMS"| P15

    Owner -->|"Export All CSV/JSON"| P16
    P16 <-->|"Full Shop Data Dump"| D2
    P16 <-->|"Full Catalog & Sales Dump"| D7
    P16 -->|"Secure ZIP / Cloud Dump"| Storage

    %% Style definitions
    style P1 fill:#0284c7,stroke:#0369a1,color:#fff
    style P2 fill:#0284c7,stroke:#0369a1,color:#fff
    style P6 fill:#059669,stroke:#047857,color:#fff
    style P11 fill:#d97706,stroke:#b45309,color:#fff
    style P12 fill:#dc2626,stroke:#b91c1c,color:#fff
    style D14 fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#991b1b
```

---

## 6. Level 2 — Detailed Subprocess Decompositions

### 6.1 Process 1.0 — Authentication & Access Management
Process 1.0 governs platform security and terminal access. It enables fast OTP onboarding for dokandars while enforcing hardware device PIN binding and emergency session revocation for shop staff.

```mermaid
flowchart TB
    User["👔 Merchant / Staff"]
    Owner["👔 Shop Owner"]
    SMS["📱 SMS Gateway"]
    D1A[("D1.1: Auth OTPs (TTL 120s)")]
    D1B[("D1.2: Users & Profiles")]
    D1C[("D1.3: User Devices (Argon2id)")]
    D1D[("D1.4: Phone Change Requests (Dual-OTP)")]

    P11(["1.1 Request & Issue SMS OTP"])
    P12(["1.2 Verify OTP & Issue Token"])
    P13(["1.3 Mobile App Device PIN Binding"])
    P14(["1.4 Web Hybrid Session Authenticator"])
    P15(["1.5 Emergency Device Revocation"])
    P16(["1.6 Web Password Recovery & Profile Management Engine"])
    P17(["1.7 Registered Mobile Number Migration Engine (Dual-OTP)"])
    P18(["1.8 Staff Account Lifecycle & Emergency Termination Engine"])

    User -->|"Mobile Number"| P11
    P11 -->|"Store OTP & Expiry (120s)"| D1A
    P11 -->|"SMS Payload"| SMS
    SMS -->|"Deliver 6-Digit OTP"| User

    User -->|"Submit OTP"| P12
    P12 <-->|"Validate OTP Record"| D1A
    P12 <-->|"Fetch/Create User Record"| D1B
    P12 -->|"Issue JWT / Refresh Cookie"| User

    User -->|"Set/Enter 4-Digit Mobile PIN"| P13
    P13 <-->|"Validate Device Fingerprint & Argon2id"| D1C
    P13 -->|"Unlock Local PWA Terminal"| User

    User -->|"Web Password / OTP Login"| P14
    P14 <-->|"Verify Password Hash & Role"| D1B
    P14 -->|"Issue 15-Min Access Token"| User

    User -->|"Revoke Stolen Phone"| P15
    P15 -->|"Invalidate Device ID & Wipe Session"| D1C
    P15 -->|"Revocation Audit Confirmed"| User

    User -->|"Forgot Web Password Request"| P16
    P16 <-->|"Validate Recovery OTP"| D1A
    P16 -->|"Update PasswordHash & Invalidate JWT"| D1B
    P16 -->|"Password Reset Confirmation"| SMS

    User -->|"Initiate Mobile Number Migration"| P17
    P17 <-->|"Dual-OTP Handshake (Old & New SIMs)"| D1D
    P17 -->|"Atomic Update users.phone & shops.phone"| D1B
    P17 -->|"Migration Complete Alert"| SMS

    Owner -->|"Provision / Terminate Staff"| P18
    P18 -->|"Create Staff Record & Send Temp PIN"| D1B
    P18 -->|"Instant Session Kill & Device Lockout"| D1C
```

---

### 6.2 Process 2.0 — Subscription & Billing Management
Process 2.0 governs multi-tenant subscriptions, trial lifecycles, payment gateway webhooks, and grace mode enforcement.

```mermaid
flowchart TB
    Owner["👔 Shop Owner"]
    PGW["💳 Payment Gateways (PayStation/EPS/bKash)"]
    D2A[("D2.1: Subscription Plans")]
    D2B[("D2.2: Shops & Tenants")]
    D2C[("D2.3: Subscription Invoices")]
    D9[("D9: Double-Leg Financial Ledger")]

    P21(["2.1 Plan Selection & Invoice Generation"])
    P22(["2.2 Gateway Request & Secure Redirect"])
    P23(["2.3 Idempotent Webhook Processor"])
    P24(["2.4 Lifecycle & Grace Mode Enforcer"])

    Owner -->|"Select Tier (Monthly/6-Mo/1-Yr)"| P21
    P21 <-->|"Read Plan Snapshot"| D2A
    P21 -->|"Generate Pending Invoice"| D2C

    P21 -->|"Initiate Payment Flow"| P22
    P22 -->|"Checkout Payload"| PGW
    PGW -->|"Payment URL Redirect"| Owner

    PGW -->|"Webhook Callback + HMAC Sig"| P23
    P23 <-->|"Verify Gateway Transaction ID"| D2C
    P23 -->|"Mark Invoice PAID"| D2C
    P23 -->|"Activate/Extend Subscription"| D2B
    P23 -->|"Post Platform Revenue"| D9

    P24 <-->|"Daily Cron: Check Expiry"| D2B
    P24 -->|"Enforce 3-Day Grace Period"| D2B
    P24 -->|"Trigger Read-Only Mode (Zero Data Loss)"| D2B
```

---

### 6.3 Process 3.0 — Platform Administration & Governance
Process 3.0 allows the central Platform Super-Admin to monitor tenant lifecycles, configure tier pricing versioning, and inspect global audit trails.

```mermaid
flowchart TB
    Admin["🛡️ Platform Super-Admin"]
    PGW["💳 Payment Gateways"]
    D2A[("D2.1: Subscription Plans")]
    D2B[("D2.2: Shops & Tenants")]
    D15[("D15: Platform Audit Logs")]

    P31(["3.1 Subscription Plan Versioning"])
    P32(["3.2 Non-Destructive Shop Suspension"])
    P33(["3.3 Multi-Gateway Settlement Audit"])

    Admin -->|"Create/Update Plan Pricing & Limits"| P31
    P31 -->|"Version Plan Snapshot (Preserve Active)"| D2A

    Admin -->|"Trigger Suspension Directive"| P32
    P32 -->|"Set Shop Status: SUSPENDED (Zero Data Loss)"| D2B
    P32 -->|"Append Security Audit Log"| D15

    Admin -->|"Query Gateway Discrepancies"| P33
    PGW <-->|"Reconcile Gateway Settlements"| P33
    P33 -->|"Record Platform Audit Reconciliation"| D15
```

---

### 6.4 Process 4.0 — Product Catalog & Dual-IMEI Management
Process 4.0 establishes the product catalog, variant barcodes, dual-IMEI tracking, and floor price (minimum selling price) locks.

```mermaid
flowchart TB
    Staff["👨‍💼 Inventory Staff / Owner"]
    D3[("D3: Catalog & Variants")]
    D4[("D4: Dual-IMEI & Stock Movements")]

    P41(["4.1 Product Master & Variant Barcode Entry"])
    P42(["4.2 Minimum Selling Price Rule Lock"])
    P43(["4.3 Dual-IMEI State Transition Engine"])
    P44(["4.4 Stock Audit & Barcode Label Print"])

    Staff -->|"Product Title, Brand, Category, Barcode"| P41
    P41 -->|"Persist Variant & SKU Record"| D3

    Staff -->|"Set Floor Price Lock (min_selling_price)"| P42
    P42 -->|"Lock Floor Price >= purchase_cost"| D3

    Staff -->|"Track Status Transition"| P43
    P43 <-->|"Validate Current IMEI State"| D4
    P43 -->|"State: AVAILABLE -> SOLD -> RETURNED -> SCRAPPED"| D4
    P43 -->|"Append Immutable Stock Movement Ledger"| D4

    Staff -->|"Physical Shelf Audit Request"| P44
    P44 <-->|"Verify System Stock Count"| D4
    P44 -->|"Generate Barcode Thermal Label Slip"| Staff
```

---

### 6.5 Process 5.0 — Procurement & Supplier Management
Process 5.0 manages wholesale handset and accessory procurement, bulk dual-IMEI scanning, landed cost calculation, and purchase return vouchers (PRV).

```mermaid
flowchart TB
    Manager["👨‍💼 Procurement Manager"]
    Supplier["🏢 Wholesaler / Distributor"]
    D4[("D4: Dual-IMEI & Stock")]
    D5[("D5: Suppliers & Purchases")]
    D8[("D8: Accounts & Drawers")]
    D9[("D9: Financial Ledgers")]

    P51(["5.1 Purchase Order Creation"])
    P52(["5.2 GRN Receiving & Dual-IMEI Ingestion"])
    P53(["5.3 Landed Cost & Supplier Payable Recording"])
    P54(["5.4 Purchase Return Voucher (PRV)"])

    Manager -->|"Create PO Details"| P51
    P51 -->|"Issue PO Document"| Supplier
    P51 -->|"Store Draft PO"| D5

    Supplier -->|"Challan + Physical Goods"| P52
    Manager -->|"Bulk Scan IMEI 1 & IMEI 2"| P52
    P52 -->|"Register IMEI Units with Landed Cost"| D4
    P52 -->|"Append Stock Inflow (+Qty)"| D4

    P52 -->|"Finalize Received Bill"| P53
    P53 -->|"Update Supplier Payable Balance"| D5
    P53 -->|"Pay Initial Cash/Bank Outflow"| D8
    P53 -->|"Debit Inventory Asset, Credit Payable"| D9

    Manager -->|"Defective Stock Return"| P54
    P54 <-->|"Verify Original Purchase IMEI"| D4
    P54 -->|"Mark IMEI: RETURNED_SUPPLIER"| D4
    P54 -->|"Reduce Supplier Payable Balance"| D5
    P54 -->|"Issue PRV Debit Note"| Supplier
```

---

### 6.6 Process 6.0 — Point of Sale (POS) & Fast Checkout
Process 6.0 is the operational core of the retail shop. It executes sub-250ms keyboard-first billing, dual-IMEI verification, split payments, and change arithmetic.

```mermaid
flowchart TB
    Cashier["👨‍💼 Cashier / Salesman"]
    Customer["🛒 Customer"]
    D3[("D3: Catalog & Variants")]
    D4[("D4: Dual-IMEI & Stock Movements")]
    D6[("D6: Customers & Dues")]
    D7[("D7: Sales & Invoices (Embedded Snapshot)")]
    D8[("D8: Cash Drawers & Accounts")]
    D9[("D9: Financial Ledger (Revenue & COGS)")]

    P61(["6.1 Cart Buffer & Barcode/IMEI Scan"])
    P62(["6.2 Price Rule & Min-Selling Lock"])
    P63(["6.3 Multi-Tender Payment Allocation"])
    P64(["6.4 Change Arithmetic & Cash Drawer Inflow"])
    P65(["6.5 Atomic Commit & Specific COGS Snapshot"])
    P66(["6.6 Receipt / Mushak 6.3 Thermal Print"])

    Cashier -->|"Scan Barcode / Dual-IMEI (F1)"| P61
    P61 <-->|"Validate Variant Barcode"| D3
    P61 <-->|"Verify IMEI Status: AVAILABLE"| D4
    P61 -->|"Add to Zustand Cart Buffer"| P62

    Cashier -->|"Apply Custom Discount / Price"| P62
    P62 <-->|"Check min_selling_price Lock"| D3
    P62 -->|"Approved Line Total"| P63

    Customer -->|"Pay: Cash ৳5,000 + bKash ৳2,000 + Due"| P63
    P63 -->|"Allocate Tender Splits"| P64
    P63 -->|"Post Remaining Customer Due"| D6

    P64 -->|"Bill ৳400, Tendered ৳500 -> Change ৳100"| D8
    P64 -->|"Net Cash Placed in Drawer"| D8

    P63 -->|"Trigger Atomic Database Transaction (ACID Commit)"| P65
    P65 -->|"Mark IMEI: SOLD + Specific Cost"| D4
    P65 -->|"Append Immutable Stock Movement"| D4
    P65 -->|"Persist Sale Document"| D7
    P65 -->|"Post Sales Revenue & Specific COGS"| D9

    P65 -->|"Print Job Trigger"| P66
    P66 -->|"Thermal ESC/POS Invoice / Mushak 6.3"| Customer
```

---

### 6.7 Process 7.0 — Returns, Exchanges & Trade-In (Buyback)
Process 7.0 manages warranty returns, pre-owned handset trade-ins, seller identity verification, and police legal documentation.

```mermaid
flowchart TB
    Customer["🛒 Customer / Seller"]
    Staff["👨‍💼 Staff / Manager"]
    Storage["☁️ Secure Cloud Storage (S3/R2)"]
    D4[("D4: Stock & IMEI")]
    D7[("D7: Sales Invoices")]
    D8[("D8: Cash Drawer")]
    D9[("D9: Financial Ledgers")]
    D11[("D11: Buyback Contracts")]

    P71(["7.1 Sales Return & Quarantine"])
    P72(["7.2 Old Phone Diagnostic & Valuation"])
    P73(["7.3 Legal Undertaking & Contract Generation"])
    P74(["7.4 Pre-Owned Stock Ingestion / Trade-in Voucher"])

    Customer -->|"Returns Phone within Warranty"| P71
    P71 <-->|"Validate Original Invoice & IMEI"| D7
    P71 -->|"Move IMEI to RETURNED_INSPECTION"| D4
    P71 -->|"Refund Amount / Restock Fee"| D8
    P71 -->|"Reverse Sale & Adjust COGS"| D9

    Customer -->|"Brings Used Phone to Sell"| P72
    Staff -->|"Physical & Hardware Inspection (Camera, Display)"| P72
    P72 -->|"Agreed Valuation: ৳12,000"| P73

    Staff -->|"Capture Seller Photo & NID via WebCam"| P73
    P73 -->|"Upload Encrypted NID & Photo"| Storage
    P73 -->|"Generate Police Undertaking PDF"| D11
    P73 -->|"Print 300-Taka Legal Undertaking Form"| Customer

    Customer -->|"Signs Legal Form with Biometric/Signature"| P74
    P74 -->|"Ingest IMEI as PRE_OWNED Stock"| D4
    P74 -->|"Payout Cash OR Issue Trade-In Voucher TV-XXX"| D8
    P74 -->|"Debit Used Inventory Asset"| D9
```

---

### 6.8 Process 8.0 — Customer Dues & Installment (Kisti) Financial Ledger
Process 8.0 governs customer accounts receivable and installment loan accounting.

> **Strict Boundary Constraint:** This process excludes automated reminder SMS messages and remote hardware locking capabilities (managed independently via external third-party tools).

```mermaid
flowchart TB
    Cashier["👨‍💼 Cashier"]
    Customer["🛒 Customer / Borrower"]
    D6[("D6: Customers & Dues")]
    D7[("D7: Sales Invoices")]
    D8[("D8: Cash Drawers")]
    D9[("D9: Financial Ledgers")]
    D10[("D10: Kisti Financial Schedules")]

    P81(["8.1 General Due Collection & Money Receipt"])
    P82(["8.2 Kisti Loan Account Creation"])
    P83(["8.3 Kisti Down Payment & Schedule Setup"])
    P84(["8.4 Installment Collection & Ledger Update"])

    Customer -->|"Pay Partial/Full General Due"| P81
    P81 <-->|"Fetch Outstanding Due"| D6
    P81 -->|"Update Customer Due Balance"| D6
    P81 -->|"Deposit Cash into Drawer"| D8
    P81 -->|"Credit Accounts Receivable"| D9
    P81 -->|"Issue Printed Money Receipt"| Customer

    Customer -->|"Apply for Kisti Purchase"| P82
    Cashier -->|"Record 2 Guarantors Name, Phone & NID"| P82
    P82 <-->|"Check Eligibility & Link Sale"| D7
    P82 -->|"Open Kisti Loan Account"| D10

    Cashier -->|"Set Markup & Tenure (e.g. 4 Months)"| P83
    Customer -->|"Pay Down Payment (Cash / Trade-in)"| P83
    P83 -->|"Deposit Down Payment in Drawer"| D8
    P83 -->|"Generate Equal Installment Milestones"| D10

    Customer -->|"Pay Monthly Installment Amount"| P84
    P84 <-->|"Match Milestone Schedule"| D10
    P84 -->|"Mark Milestone: PAID"| D10
    P84 -->|"Deposit Cash in Drawer"| D8
    P84 -->|"Credit Kisti Loan Receivable"| D9
    P84 -->|"Issue Installment Collection Receipt"| Customer
```

---

### 6.9 Process 9.0 — Service, Repair & Brand Warranty (RMA)
Process 9.0 governs technician repair job sheets, 3x3 pattern lock coordinates, 50% maker labor splits, and distributor warranty RMA tracking.

```mermaid
flowchart TB
    Technician["👨‍🔧 Service Technician"]
    Customer["🛒 Customer"]
    Brand["🔧 Brand Service Center"]
    D4[("D4: Spare Parts Stock")]
    D8[("D8: Cash Drawer")]
    D9[("D9: Financial Ledger")]
    D12[("D12: Repair Jobs & RMA Center")]

    P91(["9.1 Job Sheet Creation & 3x3 Pattern Lock"])
    P92(["9.2 Diagnostic, Spare Parts Ingestion & Work"])
    P93(["9.3 50% Maker Labor Split & Delivery"])
    P94(["9.4 Brand Warranty RMA Claim & Tracking"])

    Customer -->|"Faulty Device, Lock Pattern, Problem"| P91
    P91 -->|"Record 3x3 Pattern Code (e.g. 1-2-5-8)"| D12
    P91 -->|"Issue Repair Claim Slip"| Customer

    Technician -->|"Requisition Spare Parts (Display/Battery)"| P92
    P92 <-->|"Deduct Spare Part from Inventory"| D4
    P92 -->|"Update Job Sheet Part Cost"| D12

    Customer -->|"Pay Repair Charge & Collect Phone"| P93
    P93 -->|"Service Fee Inflow to Cash Drawer"| D8
    P93 -->|"Calculate 50% Maker Split on Labor Fee"| P93
    P93 -->|"Post 50% Maker Split to Technician Commission"| D9
    P93 -->|"Mark Job Sheet COMPLETED & DELIVERED"| D12

    Technician -->|"Send Official Handset to Brand Care"| P94
    P94 -->|"Generate RMA Ticket (RMA-2026-XXXX)"| D12
    P94 -->|"Dispatch RMA Handset with Fault Sheet"| Brand
    Brand <-->|"Inspection Report & Repaired Replacement"| P94
    P94 -->|"Update RMA Ticket: RESOLVED"| D12
```

---

### 6.10 Process 10.0 — Accounts, Cash Drawers & Internal Transfers
Process 10.0 oversees multi-counter cash drawers, bank deposits, and operating expense (OPEX) vouchers.

```mermaid
flowchart TB
    Owner["👔 Shop Owner"]
    Staff["👨‍💼 Cashier / Manager"]
    D8[("D8: Accounts & Cash Drawers")]
    D9[("D9: Double-Entry Financial Ledger")]

    P101(["10.1 Multi-Drawer Shift Balance Open/Close"])
    P102(["10.2 Internal Fund Transfer (Drawer <-> Bank)"])
    P103(["10.3 Operating Expense (OPEX) Voucher Entry"])

    Staff -->|"Opening Cash Drawer Float Count"| P101
    P101 -->|"Lock Opening Balance Snapshot"| D8

    Owner -->|"Transfer Excess Cash to Bank Account"| P102
    P102 -->|"Debit Bank Account, Credit Drawer Account"| D8
    P102 -->|"Append Contra Journal Voucher"| D9

    Staff -->|"Pay Shop Rent, Electricity, Tea/Snacks"| P103
    P103 -->|"Drawer Outflow (-Cash)"| D8
    P103 -->|"Debit OPEX Account, Credit Cash Account"| D9
```

---

### 6.11 Process 11.0 — MFS Agent Desk (100% Manual Bookkeeping)
Process 11.0 tracks mobile financial services (bKash, Nagad, Rocket) agent SIM balances manually without automated SMS scraping.

```mermaid
flowchart TB
    Agent["👨‍💼 Shopkeeper / MFS Agent"]
    Customer["🛒 Retail Customer"]
    D8[("D8: Cash Drawers & Physical Cash")]
    D9[("D9: Financial Ledgers (Commission)")]
    D13[("D13: MFS Agent Sim Float Ledger")]

    P111(["11.1 Manual Agent Cash In Processing"])
    P112(["11.2 Manual Agent Cash Out Processing"])
    P113(["11.3 Commission Accounting & Daily Reconciliation"])

    Customer -->|"Provides ৳1,000 Cash for Cash In"| P111
    Agent -->|"Manually Dials USSD & Enters TrxID"| P111
    P111 -->|"Physical Drawer Cash: +৳1,000"| D8
    P111 -->|"Agent SIM Digital Float: -৳1,000"| D13
    P111 -->|"Telco Commission Earned: +৳4.10"| D9

    Customer -->|"Sends ৳1,000 Digital Float to Agent SIM"| P112
    Agent -->|"Checks Physical Phone Screen & Types Amount"| P112
    P112 -->|"Agent SIM Digital Float: +৳1,000"| D13
    P112 -->|"Physical Drawer Cash Out: -৳1,000"| D8
    P112 -->|"Telco Commission Earned: +৳4.10"| D9
    P112 -->|"Handover Physical Cash"| Customer

    Agent -->|"Evening Float Audit: SIM Dial vs Software"| P113
    P113 <-->|"Compare Recorded Balance vs Physical Dial"| D13
    P113 -->|"Post Reconciled Float Audit Log"| D9
```

---

### 6.12 Process 12.0 — Isolated Personal Ledger (Amanat-Hawlat Khata)
Process 12.0 manages personal money deposits (Amanat) and temporary personal loans (Hawlat).

> **Immutable Invariant:** Contacts are strictly isolated from customers and suppliers. Personal transactions produce **exactly 0.00% P&L impact** on the store.

```mermaid
flowchart TB
    Owner["👔 Shop Owner"]
    Contact["👤 Personal Contact (Friend / Relative)"]
    D8[("D8: Store Cash Drawer")]
    D14A[("D14.1: Personal Ledger Contacts")]
    D14B[("D14.2: Personal Transactions (Append-Only)")]

    P121(["12.1 Personal Contact Registration"])
    P122(["12.2 Amanat Deposit & Return"])
    P123(["12.3 Hawlat Given & Repaid"])
    P124(["12.4 Expense on Behalf (Paid for Person)"])

    Owner -->|"Add Name, Phone (No Customer Entity)"| P121
    P121 -->|"Persist Isolated Entity"| D14A

    Contact -->|"Deposits Personal Money (Amanat Deposit)"| P122
    P122 -->|"Store Drawer Cash: +৳10,000"| D8
    P122 -->|"Person Balance: +৳10,000 (Liability)"| D14B
    P122 -.->|"P&L Impact: ৳0.00"| Owner

    Owner -->|"Returns Amanat Money (Amanat Return)"| P122
    P122 -->|"Store Drawer Cash: -৳10,000"| D8
    P122 -->|"Person Balance: ৳0.00"| D14B

    Contact -->|"Requests Emergency Loan (Hawlat Given)"| P123
    P123 -->|"Store Drawer Cash Out: -৳5,000"| D8
    P123 -->|"Person Balance: -৳5,000 (Receivable)"| D14B
    P123 -.->|"P&L Impact: ৳0.00"| Owner

    Owner -->|"Pays ৳2,000 for Person from Drawer (Expense on Behalf)"| P124
    P124 -->|"Store Drawer Cash: -৳2,000"| D8
    P124 -->|"Person Amanat Reduced: -৳2,000"| D14B
    P124 -.->|"Store P&L Cost: Exactly ৳0.00"| Owner
```

---

### 6.13 Process 13.0 — Staff, Payroll & Salesman Commission
Process 13.0 aggregates sales targets, technician labor splits, and monthly salary disbursements.

```mermaid
flowchart TB
    Owner["👔 Shop Owner"]
    Staff["👨‍💼 Salesman / Technician"]
    D7[("D7: Sales Invoices")]
    D8[("D8: Cash Drawer / Bank Account")]
    D9[("D9: Financial Ledger")]
    D12[("D12: Repair Jobs (50% Split)")]

    P131(["13.1 Sales Target & Commission Calculator"])
    P132(["13.2 Monthly Salary & Commission Disbursement"])

    P131 <-->|"Aggregate Sales Volume & Margin"| D7
    P131 <-->|"Aggregate Technician Labor Earned"| D12
    P131 -->|"Generate Commission Payslip"| Staff

    Owner -->|"Approve Monthly Payroll"| P132
    P132 -->|"Disburse Base Salary + Commission"| D8
    P132 -->|"Debit Payroll Expense, Credit Cash/Bank"| D9
```

---

### 6.14 Process 14.0 — Reports, Day-End Closing & Analytics
Process 14.0 executes day-end blind cash counting, financial P&L aggregation, and identifies dead stock (>60/90 days).

```mermaid
flowchart TB
    Cashier["👨‍💼 Cashier"]
    Owner["👔 Shop Owner"]
    SMS["📱 SMS Gateway"]
    D4[("D4: Stock & IMEI (Dead Stock)")]
    D7[("D7: Sales Records")]
    D8[("D8: Cash Drawers")]
    D9[("D9: Double-Leg Ledger")]
    D13[("D13: MFS Float")]
    D14[("D14: Personal Ledger")]
    D15[("D15: Daily Closings")]

    P141(["14.1 Financial Ledger Aggregator & P&L"])
    P142(["14.2 Blind Cash Count Submission"])
    P143(["14.3 Variance Audit & Day-End Z-Report"])
    P144(["14.4 Dead Stock & Inventory Aging Report"])

    P141 <-->|"Aggregate Sales & COGS"| D7
    P141 <-->|"Aggregate Operational Expenses"| D9
    P141 -->|"Generate Net P&L Statement"| Owner

    Cashier -->|"Types Counted Notes without seeing system total"| P142
    P142 -->|"Lock Drawer Terminal"| D8

    P142 -->|"Send Counted Cash"| P143
    P143 <-->|"Fetch System Expected Cash"| D8
    P143 <-->|"Fetch MFS Float Reconciliation"| D13
    P143 <-->|"Fetch Personal Hawlat Drawer Impact"| D14
    P143 -->|"Calculate Cash Variance (Counted vs Expected)"| D15
    P143 -->|"Save Z-Report Document"| D15
    P143 -->|"Send Variance SMS Digest to Owner"| SMS

    P144 <-->|"Scan IMEI Units Unsold > 60/90 Days"| D4
    P144 -->|"Generate Capital Tied-up & Clearance Alert"| Owner
```

---

### 6.15 Process 15.0 — Notification & Communication Dispatcher
Process 15.0 manages SMS gateway failover and dispatches WhatsApp Cloud API digital receipts.

```mermaid
flowchart TB
    SystemProc["⚙️ System Processes"]
    Customer["🛒 Customer"]
    Owner["👔 Shop Owner"]
    SMS["📱 SMS Gateway"]
    WhatsApp["💬 WhatsApp API"]

    P151(["15.1 SMS Gateway Dispatch & Failover"])
    P152(["15.2 WhatsApp Cloud Receipt Dispatcher"])

    SystemProc -->|"Dispatch OTP / Variance Alert"| P151
    P151 -->|"Send SMS via Primary Gateway (SSL Wireless)"| SMS
    P151 -.->|"Failover to Secondary Gateway if Timeout"| SMS
    SMS -->|"Delivery to Handset"| Owner

    SystemProc -->|"Invoice PDF URL & Summary"| P152
    P152 -->|"Send WhatsApp Template Message"| WhatsApp
    WhatsApp -->|"Deliver Digital Bill to Phone"| Customer
```

---

### 6.16 Process 16.0 — Data Portability, Backup & System Audit
Process 16.0 provides non-blocking cursor data exports upholding the Zero Data Hostage guarantee.

```mermaid
flowchart TB
    Owner["👔 Shop Owner"]
    Storage["☁️ Object Storage (AWS S3 / Cloudflare R2)"]
    D2[("D2: Shop Profile")]
    D3[("D3: Catalog")]
    D4[("D4: Stock & IMEIs")]
    D7[("D7: Sales & Invoices")]
    D9[("D9: Financial Ledgers")]

    P161(["16.1 Streaming Data Export (CSV / JSON)"])
    P162(["16.2 Automated Weekly Cloud Snapshot"])

    Owner -->|"Request Complete Data Dump"| P161
    P161 <-->|"Read Non-Blocking Cursor Stream"| D2
    P161 <-->|"Read Products & Ledger Snapshots"| D3
    P161 <-->|"Read Stock & Sales History"| D4
    P161 <-->|"Read Financial Ledgers"| D9
    P161 -->|"Deliver Encrypted ZIP Backup (Zero Hostage)"| Owner

    P162 <-->|"Automated Nightly Backup Cron"| D7
    P162 -->|"Store Encrypted Archive in R2"| Storage
```

---

### 6.17 Process 17.0 — Employee Sales Targets, Commission & Payroll Ledger Engine
Process 17.0 establishes sales targets, evaluates monthly quota achievements, records technician labor splits, and posts double-entry salary disbursements.

```mermaid
flowchart TB
    Owner["👔 Shop Owner"]
    Staff["👨‍💼 Sales Staff / Technician"]
    D7[("D7: Sales Invoices")]
    D8[("D8: Cash Drawers & Bank Accounts")]
    D9[("D9: Double-Entry Financial Ledgers")]
    D12[("D12: Repair Jobs (50% Labor Split)")]

    P171(["17.1 Monthly Sales Target Configuration"])
    P172(["17.2 Real-Time Quota & Commission Evaluation"])
    P173(["17.3 Technician 50% Split Accrual"])
    P174(["17.4 Month-End Payroll & Commission Disbursement"])

    Owner -->|"Set Staff Target (e.g. 50 Handsets, ৳100/unit)"| P171
    P171 -->|"Persist Quota Targets"| D9

    P172 <-->|"Aggregate Sold Units & Salesperson ID"| D7
    P172 -->|"Calculate Monthly Bonus / Commission"| Staff

    D12 -->|"Completed Job Sheet: Labor Fee Split (50%)"| P173
    P173 -->|"Credit Technician Payroll Accrual"| D9

    Owner -->|"Approve Monthly Payroll & Commission Summary"| P174
    P174 -->|"Disburse Funds (Cash Drawer / Bank Transfer)"| D8
    P174 -->|"Debit Payroll Expense (OPEX), Credit Cash/Bank"| D9
    P174 -->|"Deliver Itemized Payslip"| Staff
```

---

## 7. Master Data Dictionary

| Data ID | Data Name | Definition / Business Meaning | Data Type | Required | Source | Destination | Validation Rules | Sensitivity | Tenant Scope | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **DD-001** | `shop_id` | Primary tenant partition identifier | UUID / ObjectId | Yes | System Auth | All Domain Entities | Valid UUIDv4 / HexString | Internal | Platform | Confirmed |
| **DD-002** | `phone` | User or customer mobile phone number | String(11) | Yes | User Input | User/Customer Store | Regex: `^01[3-9]\d{8}$` | Confidential | Shop / Platform | Confirmed |
| **DD-003** | `otp_code` | 6-digit numeric login verification code | String(6) | Yes | SMS Provider | `auth_otps` Store | Exactly 6 numeric digits; TTL 120s | Confidential | Platform | Confirmed |
| **DD-004** | `pin_hash` | Mobile app terminal PIN hash | String(128) | Yes | Mobile Device | `user_devices` Store | Argon2id cryptographic hash | Confidential | User/Device | Confirmed |
| **DD-005** | `device_id` | Hardware fingerprint unique hash | String(64) | Yes | Mobile App | `user_devices` Store | Non-empty alphanumeric string | Internal | User/Device | Confirmed |
| **DD-006** | `subscription_tier` | Subscription package tier | Enum | Yes | Web Checkout | `shops` Store | `FREE`, `PREMIUM`, `GOLD`, `DIAMOND` | Internal | Platform | Confirmed |
| **DD-007** | `shop_status` | Current merchant account status | Enum | Yes | Billing Engine | `shops` Store | `TRIAL`, `ACTIVE`, `GRACE`, `READ_ONLY`, `SUSPENDED` | Internal | Platform | Confirmed |
| **DD-008** | `barcode` | Scannable product/accessory barcode | String(50) | Conditional | Barcode Scanner | `product_variants` | Unique per shop; non-empty | Internal | Shop-Level | Confirmed |
| **DD-009** | `imei_1` | Primary 15-digit handset IMEI | String(15) | Conditional | Barcode/OCR | `imei_serials` | Exactly 15 digits; Luhn Valid; Unique | Confidential | Shop-Level | Confirmed |
| **DD-010** | `imei_2` | Secondary 15-digit handset IMEI | String(15) | Optional | Barcode/OCR | `imei_serials` | Exactly 15 digits; Luhn Valid | Confidential | Shop-Level | Confirmed |
| **DD-011** | `purchase_cost` | Specific landed purchase cost of handset | NUMERIC(15,2) / Decimal128 | Yes | Procurement | `imei_serials` | Numeric(15,2) >= 0.00; Frozen at GRN | Financial | Shop-Level | Confirmed |
| **DD-012** | `selling_price` | Retail invoice selling price | NUMERIC(15,2) / Decimal128 | Yes | POS Terminal | `sales.items` | >= `min_selling_price` | Financial | Shop-Level | Confirmed |
| **DD-013** | `min_selling_price`| Floor price lock | NUMERIC(15,2) / Decimal128 | Yes | Product Master | `product_variants` | Numeric(15,2) >= purchase_cost | Financial | Shop-Level | Confirmed |
| **DD-014** | `payment_split` | Split payment tender allocation | Object Array / JSONB | Yes | POS Terminal | `sale_payments` | Sum of splits == total payable amount | Financial | Shop-Level | Confirmed |
| **DD-015** | `tender_change` | Change returned to customer | NUMERIC(15,2) / Decimal128 | Yes | POS Terminal | `sales` / `accounts` | Received Cash - Bill Amount >= 0.00 | Financial | Shop-Level | Confirmed |
| **DD-016** | `customer_due` | Customer outstanding due balance | NUMERIC(15,2) / Decimal128 | Yes | POS Terminal | `customers` Store | Customer Balance + Due <= Credit Limit | Financial | Shop-Level | Confirmed |
| **DD-017** | `kisti_markup` | Installment financing markup fee | NUMERIC(15,2) / Decimal128 | Yes | Kisti Engine | `kisti_accounts` | Numeric(15,2) >= 0.00 | Financial | Shop-Level | Confirmed |
| **DD-018** | `guarantor_nid` | Kisti co-signer National ID number | String(17) | Yes | Kisti Modal | `kisti_accounts` | 10, 13, or 17 numeric digits | Confidential | Shop-Level | Confirmed |
| **DD-019** | `police_form_pdf` | Police pre-owned device contract PDF | URL / Blob | Yes | Buyback Engine | Cloud Storage R2 | Encrypted Pre-Signed URL | Legal/Conf. | Shop-Level | Confirmed |
| **DD-020** | `repair_pattern` | 3x3 touch grid lock pattern code | String(9) | Optional | Touch Grid | `repair_jobs` | E.g., "1-2-5-8-9"; touch coordinates | Confidential | Shop-Level | Confirmed |
| **DD-021** | `maker_split_amt` | Technician 50% labor commission | NUMERIC(15,2) / Decimal128 | Yes | Repair Engine | `repair_jobs` / Payroll| 50% of (Service Charge - Parts Cost) | Financial | Shop-Level | Confirmed |
| **DD-022** | `mfs_trx_id` | bKash/Nagad unique transaction ID | String(20) | Yes | Manual Input | `mfs_transactions` | Alphanumeric; 100% manually typed | Financial | Shop-Level | Confirmed |
| **DD-023** | `telco_commission`| Telco operator commission earned | NUMERIC(15,2) / Decimal128 | Yes | MFS Desk | `mfs_transactions` / P&L | E.g., ৳4.10 per ৳1,000 cash in/out | Financial | Shop-Level | Confirmed |
| **DD-024** | `personal_contact`| Personal Amanat/Hawlat contact info | Object / JSONB | Yes | Personal Modal | `personal_ledger_contacts`| Strictly isolated from customer table | Confidential | Shop-Level | Confirmed |
| **DD-025** | `behalf_expense` | Expense paid on behalf from drawer | NUMERIC(15,2) / Decimal128 | Yes | Personal Ledger | `personal_transactions` | Drawer decreases; Contact due decreases; 0% P&L | Financial | Shop-Level | Confirmed |
| **DD-026** | `blind_cash_count`| Physical cash counted blindly by cashier| NUMERIC(15,2) / Decimal128 | Yes | Register Close | `daily_closings` | Cashier cannot see expected drawer total | Financial | Shop-Level | Confirmed |
| **DD-027** | `cash_variance` | Discrepancy between system & physical cash| NUMERIC(15,2) / Decimal128 | Yes | Day-End Engine | `daily_closings` | Blind Count - System Expected Balance | Financial | Shop-Level | Confirmed |
| **DD-028** | `mushak_6_3_no` | NBR standard VAT invoice serial | String(30) | Optional | Billing Engine | `sales` Store | Sequential Fiscal VAT Invoice format | Financial | Shop-Level | Confirmed |
| **DD-029** | `rma_ticket_no` | Brand warranty claim tracking serial | String(25) | Yes | Warranty Engine | `repair_jobs` (RMA) | E.g., "RMA-2026-0012"; Distributor link | Internal | Shop-Level | Confirmed |
| **DD-030** | `dead_stock_days` | Days elapsed without sale in store | Integer | Yes | Analytics | Inventory Analytics | Days elapsed since GRN intake > 60/90 | Internal | Shop-Level | Confirmed |

---

## 8. Master Data Flow Table

### 8.1 System Boundary External Data Flows (Context Level 0: DF-001 to DF-022)

| Flow ID | Flow Name | Source | Destination | Data Content | Direction | Diagram Reference | Trigger Event | Security & Validation | Status |
|---|---|---|---|---|---|---|---|---|---|
| **DF-001** | Visitor Signup Initiation | Visitor | Process 0.0 (1.1) | Phone No, Shop Name, Selected Plan | Inbound | Context, Level 1, draw.io Page 1 | Click "Start 14-Day Free Gold Trial" | BD Phone Regex: `^01[3-9]\d{8}$`; Rate-limit | Confirmed |
| **DF-002** | OTP Challenge & Trial Welcome | Process 0.0 (1.1) | Visitor | 6-Digit OTP Challenge, Trial Confirm | Outbound | Context, Level 1, draw.io Page 1 | Signup/Login request received | 60s cooldown; 120s TTL | Confirmed |
| **DF-003** | Shop Owner Auth & Config Inputs | Shop Owner | Process 0.0 (1.0) | Login Phone, OTP/PIN, Shop Settings | Inbound | Context, Level 1, draw.io Page 1 | Merchant logs into ERP Web App | Argon2id Hash; Role-based Authorization | Confirmed |
| **DF-004** | Operational Reports & Alerts | Process 0.0 (14.0) | Shop Owner | Auth Token, P&L Statement, Z-Report | Outbound | Context, Level 1, draw.io Page 1 | Session start or Day-end close event | HttpOnly Secure Cookie; Encrypted TLS 1.3 | Confirmed |
| **DF-005** | Staff Terminal Operations | Shop Staff | Process 0.0 (6.0) | Staff PIN, Sales Entry, Job Sheets | Inbound | Context, Level 1, draw.io Page 1 | Staff operates Counter POS / Service | Hardware Device Binding + 4-digit PIN | Confirmed |
| **DF-006** | Receipts, Job Tokens & Clearance | Process 0.0 (6.0) | Shop Staff | Shift Summary, Thermal Slip, Tokens | Outbound | Context, Level 1, draw.io Page 1 | POS Sale commit / Shift handoff | Thermal ESC/POS WebUSB Print stream | Confirmed |
| **DF-007** | Customer Payments & Trade-Ins | Customer | Process 0.0 (6.0, 7.0)| Cash/MFS Payment, Used Handset, NID | Inbound | Context, Level 1, draw.io Page 1 | Retail checkout or used device sale | Multi-tender sum check; Biometric/NID sign | Confirmed |
| **DF-008** | Invoices, Agreements & Vouchers | Process 0.0 (6.0, 7.0)| Customer | Printed Tax Invoice, Police Undertaking| Outbound | Context, Level 1, draw.io Page 1 | Checkout success / Buyback finalized | Mushak 6.3 VAT format; Legal Undertaking | Confirmed |
| **DF-009** | Supplier Shipment & Challan | Supplier | Process 0.0 (5.0) | Invoiced Handsets, Dual-IMEIs, Challan| Inbound | Context, Level 1, draw.io Page 1 | Physical consignment arrival at shop | 15-digit Luhn algorithm; Landed cost lock | Confirmed |
| **DF-010** | Purchase Orders & Debit Vouchers | Process 0.0 (5.0) | Supplier | Purchase Order (PO), PRV Debit Note | Outbound | Context, Level 1, draw.io Page 1 | PO dispatch / Defective goods return | Unique PO/PRV serial; Supplier ledger balance | Confirmed |
| **DF-011** | Platform Administration Directives | Platform Super-Admin| Process 0.0 (3.0)| Tier Pricing, Suspension Directive | Inbound | Context, Level 1, draw.io Page 1 | Super-Admin manages SaaS platform | Isolated VPC / Multi-Factor Admin Auth | Confirmed |
| **DF-012** | Global Analytics & Platform Logs | Process 0.0 (3.0) | Platform Super-Admin| Tenant Directory, Gateway Audit Logs | Outbound | Context, Level 1, draw.io Page 1 | Admin queries global SaaS health | Immutable append-only audit trail | Confirmed |
| **DF-013** | SMS Notification Dispatch | Process 0.0 (15.1) | SMS Gateway | OTP Code, Security Alerts, Z-Report | Outbound | Context, Level 1, draw.io Page 1 | User action triggering SMS | HTTPS REST Payload; Gateway Failover | Confirmed |
| **DF-014** | SMS Delivery Status & Balance | SMS Gateway | Process 0.0 (15.1) | DLR Status, Delivery Timestamp, Balance| Inbound | Context, Level 1 | SMS provider delivery callback | Gateway API token verification | Confirmed |
| **DF-015** | Subscription Checkout Request | Process 0.0 (2.2) | Payment Gateways | Order ID, Amount (BDT), Redirect URL | Outbound | Context, Level 1, draw.io Page 1 | Dokandar upgrades to Paid Tier | Encrypted SSL; Gateway signature hash | Confirmed |
| **DF-016** | Payment Webhook Callback & HMAC | Payment Gateways | Process 0.0 (2.3) | Gateway TrxID, Status, HMAC Signature | Inbound | Context, Level 1, draw.io Page 1 | Customer completes bKash/Card payment | HMAC-SHA256 signature verification | Confirmed |
| **DF-017** | Police Undertaking & NID Storage | Process 0.0 (7.3) | Cloud Object Storage| Encrypted PDF Blob, Seller NID Photo | Outbound | Context, Level 1, draw.io Page 1 | Used phone purchase finalized | Server-side AES-256 Cloudflare R2 / S3 | Confirmed |
| **DF-018** | Secure Pre-Signed Download Link | Cloud Object Storage| Process 0.0 (7.3) | 15-Minute Expiry Download URL | Inbound | Context, Level 1 | Shop Owner requests legal document | Time-limited signed HMAC URL | Confirmed |
| **DF-019** | WhatsApp Digital Invoice Dispatch | Process 0.0 (15.2) | WhatsApp Cloud API | Customer Phone, Digital Bill Link PDF | Outbound | Context, Level 1, draw.io Page 1 | POS checkout completes with WA enabled| Meta Graph API OAuth 2.0 Bearer Token | Confirmed |
| **DF-020** | WhatsApp Message Status Callback | WhatsApp Cloud API | Process 0.0 (15.2) | Message Delivered, Read Receipts | Inbound | Context, Level 1 | Customer receives WhatsApp receipt | Webhook verification token check | Confirmed |
| **DF-021** | Official Warranty Claim Handover | Process 0.0 (9.4) | Brand Service Center| IMEI, Brand Claim Sheet, Fault Details | Outbound | Context, Level 1 | Official warranty handset sent to brand | Official distributor tracking slip | Confirmed |
| **DF-022** | RMA Return / Replacement Handset | Brand Service Center| Process 0.0 (9.4) | Repaired Unit / Replacement IMEI, Note | Inbound | Context, Level 1 | Brand service center returns handset | Inward inspection; IMEI status transition | Confirmed |

---

### 8.2 Core Internal Domain Data Flows (Subprocess Flows: DF-101 to DF-130)

| Flow ID | Flow Name | Source | Destination | Data Content | Direction | Diagram Reference | Trigger Event | Security & Validation | Status |
|---|---|---|---|---|---|---|---|---|---|
| **DF-101** | Device PIN Setup & Fingerprint | Staff / Owner | Process 1.3 | 4-Digit PIN, Hardware Device ID | Inbound | Level 2 (1.0) | First login on Android/iOS PWA | Argon2id cryptographic hash; KeyStore lock | Confirmed |
| **DF-102** | Emergency Stolen Device Revocation| Shop Owner | Process 1.5 | Target Device ID, Revoke Directive | Inbound | Level 2 (1.0) | Phone stolen or staff termination | Immediate session purge; Invalidate JWT | Confirmed |
| **DF-103** | Subscription Invoice Generation | Process 2.1 | Store D2.3 | Shop ID, Plan Slug, Price Snapshot | Internal | Level 2 (2.0) | Checkout initiation | Plan price frozen; Never mutates active bill | Confirmed |
| **DF-104** | Subscription Activation Lock | Process 2.3 | Store D2.2 | Shop ID, New Expiry Date, Tier Status| Internal | Level 2 (2.0) | Verified Webhook receipt | Idempotency key lock; Prevents double credit | Confirmed |
| **DF-105** | Bulk IMEI Intake & Landed Cost | Process 5.2 | Store D4 | IMEI 1, IMEI 2, Landed Cost, GRN No | Internal | Level 2 (5.0) | Physical goods accepted | Specific cost frozen; Status = AVAILABLE | Confirmed |
| **DF-106** | Supplier Accounts Payable Post | Process 5.3 | Store D5, D9 | Supplier ID, Net Bill, Payable Journal| Internal | Level 2 (5.0) | GRN approved | Double-entry: Debit Asset, Credit Payable | Confirmed |
| **DF-107** | POS Barcode / IMEI Lookup | Cashier | Process 6.1 | Barcode String / 15-Digit IMEI | Inbound | Level 2 (6.0) | Scanned via Laser Scanner (F1) | Sub-250ms query; Status must be AVAILABLE | Confirmed |
| **DF-108** | Minimum Selling Price Lock Check| Process 6.1 | Process 6.2 | Variant ID, Applied Discount Price | Internal | Level 2 (6.0) | Line item discount typed | selling_price >= min_selling_price lock | Confirmed |
| **DF-109** | Multi-Tender Split Allocation | Customer / Cashier | Process 6.3 | Split Amounts: Cash, MFS, Due | Inbound | Level 2 (6.0) | Cashier presses F8 (Checkout) | Sum(Splits) == Total Net Invoice Amount | Confirmed |
| **DF-110** | Drawer Inflow & Change Arithmetic| Process 6.4 | Store D8 | Drawer ID, Cash In, Change Returned | Internal | Level 2 (6.0) | Cash tendered by customer | Change = Tendered - Net Bill (>= 0.00) | Confirmed |
| **DF-111** | Specific COGS Snapshot & Commit | Process 6.5 | Store D7, D9 | Sale ID, Sold IMEI, Specific Cost | Internal | Level 2 (6.0) | POS checkout commit | Atomic ACID transaction; Row lock | Confirmed |
| **DF-112** | Thermal ESC/POS Bill Stream | Process 6.6 | Customer | Thermal Receipt / Mushak 6.3 VAT Bill| Outbound | Level 2 (6.0) | Sale committed successfully | ESC/POS Raw command stream / WebUSB | Confirmed |
| **DF-113** | Pre-Owned Valuation Diagnostic | Staff | Process 7.2 | Brand, IMEI, Screen, Battery Health | Inbound | Level 2 (7.0) | Used handset inspection | 12-point hardware checklist | Confirmed |
| **DF-114** | Police 300-Tk Undertaking Form | Process 7.3 | Store D11, Storage | Seller NID, Photo, Agreement No | Internal/Out| Level 2 (7.0) | Seller signs undertaking | Strict Bangladesh Police format compliance | Confirmed |
| **DF-115** | Pre-Owned Stock Ingestion | Process 7.4 | Store D4, D9 | Sold IMEI, Valuation Cost, TV-No | Internal | Level 2 (7.0) | Agreement signed & payout made | Status = PRE_OWNED; Specific Cost locked | Confirmed |
| **DF-116** | Kisti Schedule & Guarantor Setup | Cashier | Process 8.2, Store D10| Sale ID, 2 Guarantors NID, Tenure | Inbound/Int | Level 2 (8.0) | Kisti sales approved | 2 Guarantors Name, Phone, NID mandatory | Confirmed |
| **DF-117** | Kisti Milestone Collection | Customer | Process 8.4 | Account No, Milestone ID, Amount | Inbound | Level 2 (8.0) | Customer pays installment | Milestone marked PAID; Drawer cash inflow | Confirmed |
| **DF-118** | Manual MFS Agent Cash In Entry | Cashier | Process 11.1 | Provider, Customer No, Amount, TrxID| Inbound | Level 2 (11.0) | Dokandar types manual input | 100% Manual; Drawer +Cash, Float -Balance | Confirmed |
| **DF-119** | Manual MFS Agent Cash Out Entry | Cashier | Process 11.2 | Provider, Customer No, Amount, TrxID| Inbound | Level 2 (11.0) | Dokandar types manual input | 100% Manual; Drawer -Cash, Float +Balance | Confirmed |
| **DF-120** | MFS Evening Float Reconciliation | Agent | Process 11.3 | SIM Dial Balance vs Software Float | Inbound/Int | Level 2 (11.3) | Evening closing USSD check | Variance log posted to Platform Audit | Confirmed |
| **DF-121** | Personal Amanat Deposit Entry | Owner / Contact | Process 12.2 | Contact ID, Amount, Purpose | Inbound | Level 2 (12.0) | Personal money deposited in drawer | Drawer +Cash, Contact +Liability, 0% P&L | Confirmed |
| **DF-122** | Expense on Behalf (Expense for Person)| Shop Owner | Process 12.4 | Contact ID, Amount, Third-Party Bill| Inbound | Level 2 (12.0) | Payment made from drawer for person| Drawer -Cash, Contact -Liability, 0% P&L | Confirmed |
| **DF-123** | Blind Cash Count Submission | Cashier | Process 14.2 | Counted Currency Note Breakdown | Inbound | Level 2 (14.0) | Cashier closes register | Expected cash hidden; Immutable count log | Confirmed |
| **DF-124** | Day-End Variance Alert Digest | Process 14.3 | Store D15, SMS | Expected Cash, Counted Cash, Variance| Internal/Out| Level 2 (14.0) | Day-End register lock committed | Immediate SMS digest to Owner; Drawer locked | Confirmed |
| **DF-125** | Dead Stock Aging Inventory Scan | Process 14.4 | Store D4 | Intake Date, Unsold IMEIs > 60/90 Days| Internal | Level 2 (14.0) | Aging report query | Status = AVAILABLE filter; D4 Stock Scan | Confirmed |
| **DF-126** | Repair 3x3 Pattern Lock Capture | Customer / Staff | Process 9.1 | Pattern Lock Coordinates, Problem | Inbound | Level 2 (9.0) | Customer drops off phone for repair | 3x3 Pattern sequence stored in D12 | Confirmed |
| **DF-127** | 50% Maker Labor Split Posting | Process 9.3 | Store D9, D12 | Job ID, Labor Net Amount, Split 50% | Internal | Level 2 (9.0) | Repair completed & delivered | 50% of (Labor - Parts) credited to tech | Confirmed |
| **DF-128** | RMA Warranty Dispatch to Brand | Staff | Process 9.4 | RMA Ticket, Handset IMEI, Fault | Inbound/Out | Level 2 (9.0) | Handset handed over to distributor | Status = SENT_TO_BRAND | Confirmed |
| **DF-129** | Non-Destructive Shop Suspension | Platform Admin | Process 3.2 | Shop ID, Suspension Reason | Inbound/Int | Level 2 (3.0) | Admin suspends violating shop | Status = SUSPENDED; Data 100% preserved | Confirmed |
| **DF-130** | Streaming Full Shop Data Backup | Shop Owner | Process 16.1 | Shop ID, Export Scope (JSON/CSV) | Inbound/Out | Level 2 (16.0) | Merchant clicks "Download All Data" | Non-blocking database cursor stream | Confirmed |

---

## 9. Master Process Table

| Process ID | Process Name | Purpose / Business Objective | Inputs | Outputs | Data Stores Read | Data Stores Written | Preconditions & Business Rules | Tenant Scope | Error Handling & Exceptions | Source Ref |
|---|---|---|---|---|---|---|---|---|---|---|
| **1.1** | Request & Issue SMS OTP | Mobile verification and 6-digit OTP delivery | Phone No, Device Info | OTP Payload to SMS Gateway | None | D1 (`auth_otps`) | BD 11-digit regex: `01[3-9]...`; 60s cooldown; 120s TTL | Platform-Level | SMS Gateway Down -> Failover Secondary | PRD 2.4, Flow 22 |
| **1.2** | Verify OTP & Establish Session | Verifies OTP code and issues JWT access token | OTP Code, Phone No | JWT Access, Refresh Cookie | D1 (`auth_otps`, `users`) | D1 (`auth_otps`, `users`) | 3 incorrect attempts locks account 30m | Platform-Level | Invalid OTP -> Error 401; Expired -> Error 410 | PRD 2.4, Flow 22 |
| **1.3** | Mobile App PIN Binding | Binds 4-digit terminal PIN with Argon2id hash | 4-Digit PIN, Device Fingerprint | Device Token, Local Session | D1 (`users`) | D1 (`user_devices`) | Hardware KeyStore encryption | User/Device | Device Mismatch -> Require SMS OTP Re-auth | Arch 1.4, Flow 27 |
| **1.4** | Web Hybrid Session Authenticator| Desktop browser hybrid password/OTP login | Mobile, Password/OTP, Captcha | 15-Minute Short-lived JWT | D1 (`users`, `auth_otps`) | D1 (`users`) | Auto-locks after 15 minutes of inactivity | User/Device | Invalid Password -> Count attempt; Lock at 5| PRD 2.4, Flow 22 |
| **1.5** | Emergency Device Revocation | Revokes terminal access for lost/stolen phones | Target Device ID, Owner Auth | Revocation Confirmation | D1 (`user_devices`) | D1 (`user_devices`) | Single-click immediate session purge | Shop-Level | Device Not Found -> Error 404 | RV-008, Flow 29 |
| **2.1** | Plan Selection & Invoice Prep | Selects tier and creates pending billing invoice | Plan Slug, Tenure Duration | Pending Invoice Record | D2 (`plans`, `shops`) | D2 (`invoices`) | Plan price snapshot locked | Shop-Level | Invalid Plan Slug -> Error 400 | PRD 3.2, Flow 24 |
| **2.2** | Gateway Request & Secure Redirect| Prepares encrypted payload for gateway redirect| Pending Invoice ID, Amount | Gateway Checkout URL | D2 (`invoices`) | D2 (`invoices`) | TLS 1.3 encryption; Nonce generation | Shop-Level | Gateway Unreachable -> Error 503 | PRD 3.1, Flow 24 |
| **2.3** | Idempotent Webhook Processor | Verifies HMAC signature and extends subscription| Webhook Payload, HMAC Signature | 200 OK, Tier Extension | D2 (`invoices`) | D2 (`shops`, `invoices`), D9 | Cryptographic HMAC check; Drops duplicate trx | Platform-Level | Signature Mismatch -> Error 403 & Security Log| PRD 3.1, Flow 24 |
| **2.4** | Lifecycle & Grace Enforcer | Daily scheduler enforcing 3-day grace & read-only| Daily Scheduler Cron Trigger | Status Updates, Warning Alerts | D2 (`shops`) | D2 (`shops`) | Zero data hostage; Export active in read-only | Platform-Level | Failed Cron -> Retry with Alert | PRD 3.3, Flow 26 |
| **3.1** | Subscription Plan Versioning | Configures new pricing tiers and limit matrices | Tier Pricing, Feature Matrix | Updated Plan Version Snapshot | D2 (`plans`) | D2 (`plans`) | Existing shops maintain locked historical rates| Platform-Level | Negative Pricing -> Validation Error | PRD 3.2, Flow 21 |
| **3.2** | Non-Destructive Shop Suspension | Suspends violating shops without data loss | Shop ID, Suspension Reason | Shop Status = SUSPENDED | D2 (`shops`) | D2 (`shops`), D15 (`logs`)| No records deleted; write operations locked | Platform-Level | Shop Not Found -> Error 404 | PRD 3.4, Flow 21 |
| **3.3** | Multi-Gateway Settlement Audit | Audits gateway transactions and detects mismatches| Gateway Statement, System Trx | Reconciliation Discrepancy Log | D2 (`invoices`) | D15 (`logs`) | Verifies daily bank settlement totals | Platform-Level | Balance Discrepancy -> Flag for Audit | PRD 3.1, Flow 21 |
| **4.1** | Catalog & Variant Master Entry | Creates brands, categories, products, barcodes | Product Details, SKU Attributes | Variant Record with Barcode | D3 (`products`, `variants`) | D3 (`products`, `variants`) | Unique barcode; sets IMEI required flag | Shop-Level | Duplicate Barcode -> Error 409 Conflict | PRD 6.1, Flow 1 |
| **4.2** | Minimum Selling Price Lock Check| Enforces floor price rule during line discounting| Variant ID, Entered Price | Approved / Blocked Status | D3 (`variants`) | None (Rule Enforcer) | `selling_price >= min_selling_price` | Shop-Level | Under-pricing -> Block Checkout with Alert | PRD 6.3, Flow 3 |
| **4.3** | Dual-IMEI State Transition Engine| Tracks handset IMEI state transitions | IMEI 1, IMEI 2, Transition Event | Updated IMEI Status & History | D4 (`imei_serials`) | D4 (`imei_serials`, `movements`) | AVAILABLE -> SOLD -> RETURNED -> SCRAPPED | Shop-Level | Invalid Transition -> Error 422 Unprocessable | PRD 6.2, Flow 3 |
| **4.4** | Stock Audit & Barcode Label Print| Physical inventory audit and sticker generation | Variant ID / Barcode, Print Qty | ESC/POS 50mm Barcode Label Slip | D3 (`variants`), D4 (`imeis`)| None (Print Stream) | Valid barcode format | Shop-Level | Hardware Disconnect -> Spool to Desktop Print | PRD 6.1, Flow 1 |
| **5.1** | Purchase Order Creation | Generates draft PO for wholesale distributor | Supplier ID, Expected Items, Rate | Formal Purchase Order Document | D5 (`suppliers`) | D5 (`purchases`) | Supplier profile must be active | Shop-Level | Inactive Supplier -> Block PO | PRD 6.1, Flow 4 |
| **5.2** | GRN Receiving & Bulk IMEI Intake | Receives physical goods and scans dual-IMEIs | Scanned IMEIs, Landed Cost | Ingested IMEI Stock, GRN Voucher | D5 (`purchases`), D4 | D4 (`imei_serials`, `movements`) | 15-digit Luhn check; locks landed cost | Shop-Level | Duplicate IMEI in System -> Error 422 | PRD 6.1, Flow 4 |
| **5.3** | Landed Cost & Supplier Payable | Updates accounts payable and posts ledger journal | GRN Total, Initial Payment Amount | Updated Supplier Due, Ledger Post| D5 (`suppliers`), D4 | D5 (`suppliers`), D8, D9 | Double-entry: Debit Asset, Credit Payable | Shop-Level | Negative Cost -> Prevent Commit | PRD 6.1, Flow 4 |
| **5.4** | Purchase Return Voucher (PRV) | Returns defective goods to supplier | Defective IMEI, Supplier ID | PRV Debit Note, Supplier Due Down | D4 (`imei_serials`), D5 | D4 (`imei_serials`), D5, D9 | Handset must originate from selected supplier | Shop-Level | Wrong Supplier IMEI -> Return Blocked | PRD 6.1, Flow 5 |
| **6.1** | POS Cart Buffer & Stock Scan | Scans barcode/IMEI and buffers line items | Barcode string / 15-digit IMEI | Updated Cart State in Zustand | D3 (`variants`), D4 (`imeis`) | None (Client State Buffer) | Stock > 0 and IMEI status AVAILABLE | Shop-Level | Out of Stock / Sold IMEI -> Alert Modal | PRD 6.3, Flow 16 |
| **6.2** | Price Rule & Min-Selling Lock | Validates line-item discounts against floor price| Cart Item, Custom Discount Price | Validated Line Price | D3 (`variants`) | None (Pre-commit Validation) | `selling_price >= min_selling_price` | Shop-Level | Under-pricing -> Prevent Line Item Discount | PRD 6.3, Flow 3 |
| **6.3** | Multi-Tender Split Payment | Allocates bill total across multiple tenders | Cash, MFS, Due Allocation | Validated Tender Allocation | D8 (`accounts`), D6 (`customers`)| None (Pre-commit Validation) | Sum of split payments must equal net total | Shop-Level | Split Total Mismatch -> Prevent Checkout | PRD 6.4, Flow 3 |
| **6.4** | Change Arithmetic Processing | Calculates cash received and tendered change | Tendered Cash Amount | Net Placed Cash, Change Amount | None | D8 (`accounts` - Cash Drawer) | Change = Received - Bill (>= 0.00) | Shop-Level | Tendered < Net Bill -> Negative Change Block | PRD 6.4, Flow 3 |
| **6.5** | Atomic Commit & Specific COGS | Finalizes sale and freezes specific purchase cost| Cart Items, Payments, Customer | Final Sale, Movement, Ledger Logs| D4, D6, D8 | D4, D7, D8, D9 | ACID Transaction; Specific Unit COGS Frozen | Shop-Level | Transaction Abort -> Complete Rollback | Arch 5.4, Flow 3 |
| **6.6** | Receipt / Mushak 6.3 Thermal Print | Prints POS thermal receipt and Mushak 6.3 bill | Finalized Sale Invoice Snapshot | ESC/POS 80mm Print Stream / PDF | D7 (`sales`) | None (Print Stream) | Preserves fiscal invoice sequence | Shop-Level | Printer Offline -> Re-print from Sales History | PRD 6.14, Flow 3 |
| **7.1** | Sales Return & Quarantine | Processes customer return and inspection quarantine| Invoice No, Returned IMEI, Reason | Refund Voucher, Status Update | D7 (`sales`), D4 (`imei_serials`)| D4, D7, D8, D9 | Handset IMEI must match original invoice | Shop-Level | Unsold / Foreign IMEI -> Return Blocked | PRD 6.5, Flow 6 |
| **7.2** | Old Phone Diagnostic & Valuation| Inspects pre-owned handset and calculates value | Brand, Model, Condition Checklist | Agreed Trade-In Valuation Price | None | None (Transient Assessment) | 12-point hardware diagnostic checklist | Shop-Level | Missing Checklist -> Block Valuation | PRD 6.6, Flow 7 |
| **7.3** | Legal Undertaking & Police PDF | Generates 300-Tk police legal agreement PDF | Seller NID, Photo, IMEI, Price | Legal PDF Voucher, Undertaking | None | D11 (`buyback_devices`), Storage | Mandatory seller webcam photo, NID, signature | Shop-Level | Missing NID / Photo -> Prevent Intake | PRD 6.6, Flow 7 |
| **7.4** | Pre-Owned Stock Ingestion | Adds used handset to stock and issues voucher | Finalized Agreement, Payout Type | Stock Increment, TV Voucher | D11 (`buyback_devices`) | D4 (`imeis`, `movements`), D8, D9| Status = PRE_OWNED; Specific Cost locked | Shop-Level | Payout Cash Missing -> Block Cash Payout | PRD 6.6, Flow 7 |
| **8.1** | General Due Collection & Receipt | Collects customer due payments and issues receipt | Customer ID, Paid Cash Amount | Money Receipt, Updated Due | D6 (`customers`) | D6 (`customers`), D8, D9 | Drawer cash increases; Customer due decreases | Shop-Level | Overpayment -> Adjust to Customer Advance | PRD 6.7, Flow 8 |
| **8.2** | Kisti Loan Account Creation | Establishes Kisti account and records 2 guarantors| Sale ID, Down Payment, 2 Guarantors| Kisti Loan Account ID | D7 (`sales`), D6 (`customers`) | D10 (`kisti_accounts`) | 2 Guarantors Name, Phone, NID mandatory | Shop-Level | Missing Guarantor -> Block Kisti Setup | PRD 6.7, Flow 8 |
| **8.3** | Kisti Down Payment & Schedule Setup| Receives down payment and builds equal milestones | Loan Amount, Markup, Tenure (Mos) | Kisti Contract, Equal Milestones | D10 (`kisti_accounts`) | D8 (`drawers`), D10 (`schedules`) | Down payment added to drawer; milestones logged| Shop-Level | Invalid Tenure -> Error 400 | PRD 6.7, Flow 8 |
| **8.4** | Installment Collection Update | Collects installment and marks milestone paid | Account No, Milestone ID, Amount | Collection Receipt, Schedule PAID | D10 (`kisti_schedules`) | D8 (`drawers`), D9, D10 | Financial bookkeeping only; no automated SMS | Shop-Level | Duplicate Payment -> Prevent Double Credit | PRD 6.7, Flow 8 |
| **9.1** | Job Sheet Creation & 3x3 Pattern | Logs repair device and records 3x3 touch pattern| Customer Handset, Pattern Code, Issue| Repair Job Sheet with Claim Token | None | D12 (`repair_jobs`) | 3x3 touch pattern and estimated delivery | Shop-Level | Missing Pattern/Passcode -> Require Bypass Note| PRD 6.10, Flow 11 |
| **9.2** | Diagnostic & Spare Parts Intake | Diagnoses fault and requisitions spare parts | Job ID, Required Parts (Display/Batt) | Updated Job Cost, Decremented Stock| D4 (`stock`), D12 (`repair_jobs`) | D4 (`stock`, `movements`), D12 | Spare parts stock decrements automatically | Shop-Level | Part Out of Stock -> Alert Technician | PRD 6.10, Flow 11 |
| **9.3** | 50% Maker Labor Split & Delivery | Collects repair bill and settles technician split| Collected Fee, Technician ID | Delivered Handset, Commission Post | D12 (`repair_jobs`) | D8 (`drawers`), D9, D12 | 50% Split = (Service Fee - Parts Cost) / 2 | Shop-Level | Unpaid Bill -> Prevent Phone Delivery | PRD 6.10, Flow 11 |
| **9.4** | Brand Warranty RMA Dispatch | Dispatches official warranty handset to brand care | Handset IMEI, Distributor ID, Ticket | RMA Tracking Ticket, Status Update | D4 (`imeis`), D12 (`repair_jobs`) | D4, D12 | Status: SENT_TO_BRAND; Tracking slip generated | Shop-Level | Invalid Brand Handset -> Reject RMA Claim | PRD 6.12, Flow 12 |
| **10.1** | Multi-Drawer Shift Open/Close | Opens counter cash drawer and tracks shift handoff | Counter ID, Staff ID, Opening Float | Active Shift Session Document | D8 (`accounts`) | D8 (`accounts`) | Previous shift must be closed before opening new | Shop-Level | Shift Already Open -> Error 409 Conflict | PRD 6.4, Flow 13 |
| **10.2** | Internal Fund Transfer (Cash/Bank)| Moves cash between drawers or deposits into bank| Source Account, Dest Account, Amount | Contra Journal Voucher | D8 (`accounts`) | D8 (`accounts`), D9 (`ledgers`) | Source account must have sufficient balance | Shop-Level | Insufficient Funds -> Prevent Transfer | PRD 6.11, Flow 13 |
| **10.3** | Operating Expense Voucher Entry | Records daily store OPEX (Rent, Electric, Tea) | Expense Category, Amount, Drawer ID | Expense Voucher Document | D8 (`accounts`) | D8 (`accounts`), D9 (`ledgers`) | Drawer cash decreases; Store OPEX increases | Shop-Level | Negative Amount -> Validation Error | PRD 6.11, Flow 13 |
| **11.1** | Manual MFS Cash In Processing | Manual entry for bKash/Nagad Cash In | Customer No, Amount, TrxID, Sim | Float Ledger, Cash Drawer Log | D8 (`accounts`), D13 (`mfs_balances`)| D8, D9, D13 | No SMS scraping; 100% manual entry | Shop-Level | Float Insufficient -> Warn Agent | PRD 6.9, Flow 10 |
| **11.2** | Manual MFS Cash Out Processing | Manual entry for bKash/Nagad Cash Out | Customer No, Amount, TrxID, Sim | Float Ledger, Drawer Outflow Log | D8 (`accounts`), D13 (`mfs_balances`)| D8, D9, D13 | Customer sends float; merchant pays drawer cash | Shop-Level | Cash Drawer Insufficient -> Block Payout | PRD 6.9, Flow 10 |
| **11.3** | MFS Evening Float Reconciliation| Evening USSD dial audit vs software float balance| Sim USSD Balance, Recorded Balance | Reconciled Audit Log Entry | D13 (`mfs_balances`) | D9, D13 | Compares dialed balance with software ledger | Shop-Level | Discrepancy -> Post Discrepancy Journal | PRD 6.9, Flow 10 |
| **12.1** | Personal Contact Registration | Records name and phone for Amanat/Hawlat person | Contact Name, Phone, Notes | Personal Contact Entity Record | None | D14.1 (`personal_contacts`) | Completely isolated from customer/supplier tables| Shop-Level | Duplicate Phone -> Alert User | PRD 6.8, Flow 9 |
| **12.2** | Amanat Deposit & Return | Receives and returns personal money deposits | Contact ID, Amount, Type (IN/OUT) | Personal Ledger Entry, Drawer Sync | D14.1 (`personal_contacts`) | D8 (`drawers`), D14.2 (`personal_trx`)| Strictly isolated; exactly 0% Store P&L cost | Shop-Level | Negative Balance -> Prevent Return | PRD 6.8, Flow 9 |
| **12.3** | Hawlat Given & Repaid | Issues and recovers temporary personal loans | Contact ID, Amount, Type (GIVE/TAKE)| Personal Ledger Entry, Drawer Sync | D14.1 (`personal_contacts`) | D8 (`drawers`), D14.2 (`personal_trx`)| Drawer increases/decreases; 0% Store P&L impact| Shop-Level | Drawer Insufficient -> Block Hawlat Payout | PRD 6.8, Flow 9 |
| **12.4** | Expense on Behalf (Paid for Person)| Pays 3rd-party bill from drawer on person behalf| Contact ID, Amount, Expense Reason | Personal Ledger Entry, Drawer Out | D14.1, D14.2 | D8 (`drawers`), D14.2 (`personal_trx`)| Drawer decreases; Person liability decreases; 0%| Shop-Level | Contact Amanat Insufficient -> Prevent Payout | PRD 6.8, Flow 9 |
| **13.1** | Sales Target & Commission Calc | Calculates salesman monthly targets and bonuses | Salesman ID, Month, Achieved Sales | Monthly Commission Summary | D7 (`sales`), D12 (`repairs`) | None (Calculation Engine) | Integrates sales margin and 50% repair splits | Shop-Level | Calculation Failure -> Re-trigger Aggregation | PRD 6.13, Flow 17 |
| **13.2** | Payroll Disbursement | Disburses employee salaries and commissions | Staff ID, Base Salary, Commission | Payroll Payment Slip, Ledger Post | D8 (`accounts`), D9 | D8 (`accounts`), D9 | Double-entry: Debit Payroll Expense, Credit Cash| Shop-Level | Insufficient Funds -> Prevent Disbursement | PRD 6.13, Flow 17 |
| **14.1** | Financial Ledger Aggregator & P&L| Real-time profit/loss and balance sheet generation| Date Range, Shop ID | Net P&L Statement, Balance Sheet | D7 (`sales`), D9 (`ledgers`) | None (Read-Only Stream) | Specific COGS and verified double-entry balances | Shop-Level | Unbalanced Journal -> Alert System Administrator| PRD 6.13, Flow 14 |
| **14.2** | Blind Cash Count Submission | Cashier submits physical drawer note count blindly | Counted Notes Breakdown by Cashier | Blind Count Submission Document | None | D15 (`daily_closings`) | Cashier cannot view system expected balance | Shop-Level | Empty Notes -> Require at least 0 amount | PRD 6.13, Flow 14 |
| **14.3** | Variance Audit & Z-Report | Computes variance between counted & expected cash | Counted Cash, Expected Cash Totals | Daily Z-Report, Owner SMS Alert | D8 (`accounts`), D13, D14, D15 | D15 (`daily_closings`), SMS Provider | Variance = Physical Counted - System Expected | Shop-Level | Day-End Lock -> Terminal Locked until Next Day | PRD 6.13, Flow 14 |
| **14.4** | Dead Stock & Inventory Aging | Identifies unsold handsets and tied capital | Days Threshold (e.g., 60 or 90 Days)| Dead Stock Alert Summary, Tied Cash| D4 (`imei_serials`) | None (Analytics Stream) | Scans AVAILABLE handsets in D4 by intake date | Shop-Level | Database Timeout -> Stream via Cursor | PRD 6.15, Flow 18 |
| **15.1** | SMS Dispatcher & Gateway Failover | Dispatches OTPs and critical alerts via SMS | Mobile No, Message Text, Priority | SMS Gateway REST Call | None | None (Transient Dispatcher) | Primary gateway timeout triggers auto-failover | Platform-Level | All Gateways Down -> Queue & Alert SysAdmin | PRD 2.4, Flow 22 |
| **15.2** | WhatsApp Cloud Bill Dispatcher | Sends digital invoice link to customer WhatsApp | Customer Phone, Digital Memo URL | WhatsApp Message Dispatch Request | D7 (`sales`) | None (External Notification) | Enforces Meta-approved official template payload| Shop-Level | Customer Not on WhatsApp -> Graceful Ignore | PRD 6.14, Flow 3 |
| **16.1** | Streaming Shop Data Backup (JSON) | Merchant full data export in JSON/CSV format | Shop ID, Date Range, Format Scope | Complete ZIP Dump of Store Data | D2, D3, D4, D5, D6, D7, D8, D9 | None (Read-Only Stream) | Export remains active even in expired read-only | Shop-Level | Heavy Query Timeout -> Stream through Cursor | PRD 2.10, Flow 15 |
| **16.2** | Automated Weekly Cloud Snapshot | Produces platform encrypted disaster backup | Platform Cron Trigger, Shop ID | Encrypted SQLite/JSON Archive in R2| All Data Stores (D1 to D15) | Object Storage R2 | Encrypted cloud object storage archive | Platform-Level | Storage Fail -> Retry with Emergency Notice | PRD 2.10, Flow 15 |

---

## 10. Master Data Store Table

| Store ID | Logical Store Name | Purpose & Business Data Stored | Main Entities / Schemas Contained | Read By Processes | Written By Processes | Tenant Scope | Sensitive / Financial Data | Integrity Constraints & Foreign Keys | Retention & Purge Policy | Physical Mapping (Primary: MongoDB Atlas 7.0+ / Alternate: PostgreSQL 16+ RLS) | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **D1** | User Auth & Device Store | User profiles, OTPs, device PINs, Dual-OTP migrations| `users`, `user_devices`, `auth_otps`, `phone_change_requests` | 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 1.8 | 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8 | Platform / User | Argon2id PIN, Session Tokens, Dual-OTP | `phone` unique; `deviceId` unique; Dual-OTP locks | OTP TTL 120s; Users retained indefinitely | MongoDB: `users`, `user_devices`, `auth_otps`, `phone_change_requests` | Verified |
| **D2** | Shop Tenants & Subscription | Shop profiles, subscription tiers, billing invoices| `shops`, `subscription_plans`, `subscription_invoices` | 2.1, 2.2, 2.4, 3.0, 16.1 | 2.1, 2.3, 2.4, 3.1, 3.2 | Platform / Shop | Subscription Invoices, Gateway Trx | `shopId` unique PK; `slug` unique | Inactive shops preserved in Read-Only (12 Mo+) | MongoDB: `shops`, `subscription_plans`, `subscription_invoices` | Verified |
| **D3** | Product Catalog & Variants | Master catalog, categories, brands, SKU barcodes | `products`, `product_variants`, `categories`, `brands` | 4.1, 4.2, 5.1, 6.1, 6.2, 16.1 | 4.1, 4.2 | Shop-Level | Minimum Selling Prices (`minSellingPrice`) | `barcode` unique per shop; `categoryId` FK | Retained indefinitely; Soft-delete with flag | MongoDB: `products`, `product_variants`, `categories`, `brands` | Verified |
| **D4** | Dual-IMEI & Stock Movements | Handset IMEIs, specific costs, movement audit logs | `imei_serials`, `inventory_movements` | 4.3, 4.4, 5.2, 5.4, 6.1, 6.5, 7.1, 7.4, 9.2, 14.4, 16.1 | 4.3, 5.2, 5.4, 6.5, 7.1, 7.4, 9.2 | Shop-Level | Specific Landed Cost (`purchaseCost`) | `imei1` unique per shop; Append-only movements | Immutable history; Never hard deleted | MongoDB: `imei_serials`, `inventory_movements` | Verified |
| **D5** | Suppliers & Procurement | Supplier vendor master, POs, purchase challans | `suppliers`, `purchases`, `purchase_items` | 5.1, 5.2, 5.3, 5.4, 16.1 | 5.1, 5.2, 5.3, 5.4 | Shop-Level | Supplier Payable Balances, Bank Accounts | `purchaseNo` unique per shop; `supplierId` FK | Permanent tax audit records (7 Years) | MongoDB: `suppliers`, `purchases` (embedded items) | Verified |
| **D6** | Customers & Receivables | Retail customer profiles, due balances, credit limits| `customers` | 6.3, 6.5, 8.1, 8.2, 16.1 | 6.3, 6.5, 8.1 | Shop-Level | Customer Receivables, Due Balances, NID | `phone` unique per shop; Credit limit checks | Indefinite; Customer history immutable | MongoDB: `customers` | Verified |
| **D7** | Sales & Invoices | POS sales invoices, frozen line items, tender splits| `sales`, `sale_items`, `sale_payments` | 6.5, 6.6, 7.1, 8.2, 13.1, 14.1, 15.2, 16.1 | 6.5, 7.1 | Shop-Level | Selling Prices, Discounts, Profit Snapshot | `invoiceNo` unique per shop; Embedded items | Immutable accounting vouchers; No hard DELETE | MongoDB: `sales` (embedded items & payments) | Verified |
| **D8** | Cash Drawers & Accounts | Cash drawers, bank accounts, mobile agent accounts | `accounts`, `cash_in_out` | 5.3, 6.4, 6.5, 7.1, 7.4, 8.1, 8.3, 8.4, 9.3, 10.1–10.3, 11.1–11.2, 12.2–12.4, 13.2, 14.3, 16.1 | 5.3, 6.4, 6.5, 7.1, 7.4, 8.1, 8.3, 8.4, 9.3, 10.1–10.3, 11.1–11.2, 12.2–12.4, 13.2 | Shop-Level | Drawer Cash Balances, Bank Balances | Balance cannot drop below zero unless permitted | Immutable balance log; Daily reconciliation | MongoDB: `accounts`, `cash_in_out` | Verified |
| **D9** | Financial Double Ledgers | Double-entry accounting journals & P&L entries | `account_ledgers` | 10.2, 10.3, 13.2, 14.1, 16.1 | 2.3, 5.3, 5.4, 6.5, 7.1, 7.4, 8.1, 8.4, 9.3, 10.2, 10.3, 11.1, 11.2, 11.3, 13.2 | Shop-Level | Store P&L, COGS, Revenue, Expenses | Double-entry invariant: Sum(Debit) == Sum(Credit)| Append-Only; Compensating reversals only | MongoDB: `account_ledgers` | Verified |
| **D10**| Kisti Financial Schedules | Installment loan accounts, guarantors, milestones | `kisti_accounts`, `kisti_schedules` | 8.2, 8.4, 16.1 | 8.2, 8.3, 8.4 | Shop-Level | Loan Balances, Markup, Guarantor NID/Phone | `accountNo` unique per shop; 2 Guarantors req. | Permanent loan agreement records | MongoDB: `kisti_accounts` (embedded schedules) | Verified |
| **D11**| Buyback & Police Docs | Pre-owned phone purchases, seller NID, police forms | `buyback_devices` | 7.3, 7.4, 16.1 | 7.3, 7.4 | Shop-Level | Seller Photos, NID Docs, Fingerprint Signatures| `agreementNo` unique; Links to Cloud Storage | Legal compliance: Retain at least 5 years | MongoDB: `buyback_devices` | Verified |
| **D12**| Repair Jobs & RMA Center | Repair job sheets, 50% maker splits, brand tickets | `repair_jobs`, `repair_job_parts` | 9.1, 9.2, 9.3, 9.4, 13.1, 16.1 | 9.1, 9.2, 9.3, 9.4 | Shop-Level | Customer Lock Pattern, Technician 50% Split | `jobNo` unique per shop; Spare parts link | Permanent repair warranty history | MongoDB: `repair_jobs` (embedded parts) | Verified |
| **D13**| MFS Agent SIM Floats | bKash/Nagad agent SIM digital floats & commissions | `mfs_transactions` | 11.1, 11.2, 11.3, 14.3, 16.1 | 11.1, 11.2, 11.3 | Shop-Level | Agent SIM Balances, Telco Commission Ledger | 100% Manual bookkeeping; No SMS scraping fields | Audit trail of all float movements | MongoDB: `mfs_transactions` | Verified |
| **D14**| Isolated Personal Ledger | **Completely isolated** Amanat/Hawlat khata (0% P&L) | `personal_ledger_contacts`, `personal_transactions` | 12.1, 12.2, 12.3, 12.4, 14.3, 16.1 | 12.1, 12.2, 12.3, 12.4 | Shop-Level | Personal Money, Hawlat Given/Taken, Deposits | **Zero foreign keys to customers or sales tables**| Completely isolated; Never enters store P&L | MongoDB: `personal_contacts`, `personal_trx` | Verified |
| **D15**| Daily Closings & Audits | Day-end Z-reports, blind cash counts, system logs | `daily_closings`, `platform_audit_logs` | 14.3, 16.1 | 3.2, 3.3, 14.2, 14.3 | Shop / Platform | Cash Discrepancies, Variance Alerts, Admin Logs | `closingDate` unique per shop; Audit immutable | Tamper-evident hash; Permanent retention | MongoDB: `daily_closings`, `platform_audit_logs`| Verified |

---

## 11. Requirement Traceability Matrix

| Requirement ID | Requirement Summary | Source Document | DFD Process ID | Diagram Reference | Verification Status | Implementation & Traceability Notes |
|---|---|---|---|---|---|---|
| **RV-001** | Cardless 14-Day Gold Trial | `PRD.md` 3.2 | 2.1, 2.4 | Context, Level 1, Level 2 (2.0) | Verified in DFD | Activates 14-day Gold trial automatically without credit card |
| **RV-002** | 3-Day Grace Period Transition | `PRD.md` 3.3 | 2.4 | Level 2 (2.0) | Verified in DFD | Retains full write access for 3 days post-expiry |
| **RV-003** | Non-Destructive Read-Only Mode | `PRD.md` 3.3 | 2.4, 16.0 | Level 1, Level 2 (2.0) | Verified in DFD | Day 4 blocks sales but preserves data viewing and backup exports |
| **RV-004** | Non-Destructive Shop Suspension | `PRD.md` 3.4 | 3.0 | Context, Level 1 | Verified in DFD | Platform suspension locks write operations; zero data dropped |
| **RV-005** | Multi-Gateway Webhook Idempotency| `PRD.md` 3.1 | 2.3 | Level 2 (2.0) | Verified in DFD | Verifies HMAC-SHA256 signature and locks gateway transaction ID |
| **RV-008** | Mobile Device PIN (Argon2id) | `PRD.md` 2.4 | 1.3, 1.5 | Level 2 (1.0) | Verified in DFD | 4-digit device-bound terminal PIN with instant revocation |
| **RV-009** | Web Hybrid Auth & Inactivity | `PRD.md` 2.4 | 1.4 | Level 2 (1.0) | Verified in DFD | Hybrid web password/OTP login with 15-minute inactivity lock |
| **RV-010** | 100% Manual MFS Entry Policy | `PRD.md` 2.2 | 11.1, 11.2 | Level 1, Level 2 (11.0) | Verified in DFD | No SIM/SMS scraping; 100% manual merchant transaction input |
| **RV-011** | Sub-second POS (Keyboard F1-F12)| `PRD.md` 6.3 | 6.1, 6.2 | Level 1, Level 2 (6.0) | Verified in DFD | Sub-250ms cart buffering and keyboard-first checkout |
| **RV-012** | Change Arithmetic Handling | `PRD.md` 6.4 | 6.4 | Level 2 (6.0) | Verified in DFD | Bill ৳400, Tendered ৳500 -> Change ৳100 and drawer reconciliation |
| **RV-013** | Dual-IMEI & Specific Cost COGS | `PRD.md` 2.9 | 4.2, 5.2, 6.5 | Level 1, Level 2 (6.0) | Verified in DFD | Tracks IMEI 1 & 2 per unit and freezes exact landed cost |
| **RV-014** | Kisti Financial Engine (No SMS/Lock)| `PRD.md` 6.7 | 8.2, 8.3, 8.4 | Level 1, Level 2 (8.0) | Verified in DFD | 2 Guarantors per loan; no automated SMS or remote device locking |
| **RV-015** | Old Phone Buyback & Police Form | `PRD.md` 6.6 | 7.2, 7.3, 7.4 | Level 1, Level 2 (7.0) | Verified in DFD | Captures seller photo, NID, and generates 300-Tk police form |
| **RV-016** | 50% Repair Labor Split Engine | `PRD.md` 6.10 | 9.1 | Level 1, Level 2 (9.0) | Verified in DFD | Technician job sheet, pattern lock, and 50% labor commission |
| **RV-017** | Isolated Personal Ledger | `PRD.md` 2.5, 6.8| 12.1, 12.2, 12.4| Level 1, Level 2 (12.0) | Verified in DFD | Isolated from customers; Expense on Behalf has 0% P&L Cost |
| **RV-018** | POS MFS Cash Out Payment Split | `PRD.md` 6.4 | 6.3, 11.2 | Level 2 (6.0, 11.0) | Verified in DFD | Reconciles SIM float when customer cashes out to pay store bill |
| **RV-019** | Day-End Blind Cash & Z-Report | `PRD.md` 6.13 | 14.2, 14.3 | Level 1, Level 2 (14.0) | Verified in DFD | Cashier submits blind count; variance SMS dispatched to owner |
| **RV-020** | Multi-Tenancy Shop Isolation | `PRD.md` 2.3 | All Processes | All Diagrams | Verified in DFD | `shop_id` enforcement; prevents cross-shop data leaks |
| **RV-021** | NBR VAT 6.3 Invoicing | `PRD.md` 6.14 | 6.6 | Level 2 (6.0) | Verified in DFD | Prints tax invoices formatted to standard Mushak 6.3 layout |
| **RV-022** | Brand Warranty RMA Claim | `PRD.md` 6.12 | 9.2 | Context, Level 1 | Verified in DFD | Official warranty handset intake, brand dispatch, and delivery |
| **RV-023** | Salesman Target & Commission | `PRD.md` 6.13 | 13.0 | Level 1 | Verified in DFD | Calculates commission payouts upon meeting sales targets |
| **RV-024** | Dead Stock & Aging Alert | `PRD.md` 6.15 | 14.4 | Level 2 (14.0) | Verified in DFD | Identifies unsold handsets >60/90 days and reports tied capital |
| **RV-025** | Cloud Backup & Portability | `PRD.md` 2.10 | 16.0 | Context, Level 1 | Verified in DFD | Exports complete store data dump in JSON and cloud archives |

---

## 12. Financial and Data Integrity Rules

Every process and data flow in Bebsayik strictly enforces the following accounting and data integrity invariants:

1. **Specific Identification COGS versus Average Costing:**
   - Every mobile handset maintains its frozen purchase cost (`purchase_cost`) locked to its specific IMEI at GRN.
   - When multiple units of the same model exist in stock with varying purchase costs (e.g., ৳18,000, ৳18,500, and ৳19,000), gross margin is determined exclusively by the exact IMEI scanned at POS. Average costing is strictly prohibited.

2. **Amanat-Hawlat Isolation and "Expense on Behalf" Rule:**
   - `personal_ledger_contacts` and `personal_transactions` must never link to store customer or supplier accounts.
   - **Expense on Behalf:** When the merchant pays an external party ৳2,000 from the store cash drawer on behalf of an Amanat contact:
     - Cash drawer balance decreases (`Cash Drawer: -৳2,000.00`).
     - Contact personal liability decreases (`Contact Balance: -৳2,000.00`).
     - **Store Profit & Loss Impact is exactly ৳0.00** (This is a reduction in liability, not an operating expense).

3. **Change Arithmetic and Cash Drawer Integrity:**
   - When a customer bill is ৳400 and the customer tenders ৳500, the system tracks `Tendered: ৳500.00`, `Bill: ৳400.00`, and `Change Returned: ৳100.00`.
   - The cash drawer balance increments by exactly ৳400.00. The cashier is prevented from inadvertently logging the full ৳500.00 into drawer assets.

4. **100% Manual MFS Entry Policy (No SIM/SMS Automation):**
   - No SMS data is read or scraped from the device.
   - For a Cash In entry, the merchant collects cash and transfers digital float from their physical SIM. The software increments drawer cash and decrements the digital float ledger simultaneously.

5. **Day-End Blind Cash Reconciliation:**
   - Cashiers closing the register cannot view the system expected drawer total.
   - The cashier enters the physical note count blindly (e.g., twenty 1000-Tk notes, ten 500-Tk notes). The system computes the variance against expected balances and dispatches an instant SMS alert to the owner.

---

## 13. draw.io / diagrams.net Importable XML Specification

Below is the complete, valid draw.io / diagrams.net multi-page XML specification. It can be imported directly into draw.io desktop or web applications to edit and export the diagrams:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2026-10-10T15:30:00.000Z" agent="Antigravity Enterprise Architect" version="24.0.0" type="device">
  <!-- PAGE 1: CONTEXT DIAGRAM (LEVEL 0) -->
  <diagram id="ctx-page-1" name="Context Diagram (Level 0)">
    <mxGraphModel dx="1422" dy="850" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1100" background="#ffffff">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        
        <!-- Central Process 0.0 -->
        <mxCell id="proc_0" value="&lt;b&gt;0.0&lt;/b&gt;&lt;br&gt;&lt;font style=&quot;font-size: 14px;&quot;&gt;&lt;b&gt;Bebsayik.com SaaS Engine&lt;/b&gt;&lt;/font&gt;&lt;br&gt;(Powered by Bebsayik)" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#1e293b;strokeColor=#0ea5e9;strokeWidth=3;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="640" y="440" width="280" height="280" as="geometry" />
        </mxCell>

        <!-- External Entities -->
        <mxCell id="ent_owner" value="&lt;b&gt;👔 Shop Owner&lt;/b&gt;&lt;br&gt;(Tenant Admin)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#f0fdf4;strokeColor=#16a34a;strokeWidth=2;fontColor=#0f172a;" vertex="1" parent="1">
          <mxGeometry x="160" y="320" width="180" height="80" as="geometry" />
        </mxCell>

        <mxCell id="ent_staff" value="&lt;b&gt;👨‍💼 Shop Staff&lt;/b&gt;&lt;br&gt;(Cashier / Technician)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#eff6ff;strokeColor=#2563eb;strokeWidth=2;fontColor=#0f172a;" vertex="1" parent="1">
          <mxGeometry x="160" y="520" width="180" height="80" as="geometry" />
        </mxCell>

        <mxCell id="ent_customer" value="&lt;b&gt;🛒 Retail Customer&lt;/b&gt;&lt;br&gt;(Buyer / Borrower)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#fdf4ff;strokeColor=#c026d3;strokeWidth=2;fontColor=#0f172a;" vertex="1" parent="1">
          <mxGeometry x="160" y="720" width="180" height="80" as="geometry" />
        </mxCell>

        <mxCell id="ent_visitor" value="&lt;b&gt;👤 Visitor / Merchant&lt;/b&gt;&lt;br&gt;(bebsayik.com)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#f8fafc;strokeColor=#64748b;strokeWidth=2;fontColor=#0f172a;" vertex="1" parent="1">
          <mxGeometry x="160" y="120" width="180" height="80" as="geometry" />
        </mxCell>

        <mxCell id="ent_supplier" value="&lt;b&gt;🏢 Supplier / Vendor&lt;/b&gt;&lt;br&gt;(Distributor)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#fff7ed;strokeColor=#ea580c;strokeWidth=2;fontColor=#0f172a;" vertex="1" parent="1">
          <mxGeometry x="690" y="80" width="180" height="80" as="geometry" />
        </mxCell>

        <mxCell id="ent_admin" value="&lt;b&gt;🛡️ Platform Super-Admin&lt;/b&gt;&lt;br&gt;(admin.bebsayik.com)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#fef2f2;strokeColor=#dc2626;strokeWidth=2;fontColor=#0f172a;" vertex="1" parent="1">
          <mxGeometry x="1220" y="120" width="180" height="80" as="geometry" />
        </mxCell>

        <mxCell id="ent_sms" value="&lt;b&gt;📱 SMS Gateway&lt;/b&gt;&lt;br&gt;(SSL Wireless / BulkSMS)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#f5f3ff;strokeColor=#7c3aed;strokeWidth=2;fontColor=#0f172a;" vertex="1" parent="1">
          <mxGeometry x="1220" y="320" width="180" height="80" as="geometry" />
        </mxCell>

        <mxCell id="ent_pgw" value="&lt;b&gt;💳 Payment Gateways&lt;/b&gt;&lt;br&gt;(PayStation, EPS, bKash)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ecfdf5;strokeColor=#059669;strokeWidth=2;fontColor=#0f172a;" vertex="1" parent="1">
          <mxGeometry x="1220" y="520" width="180" height="80" as="geometry" />
        </mxCell>

        <mxCell id="ent_storage" value="&lt;b&gt;☁️ Cloud Storage&lt;/b&gt;&lt;br&gt;(Cloudflare R2 / AWS S3)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#f0f9ff;strokeColor=#0284c7;strokeWidth=2;fontColor=#0f172a;" vertex="1" parent="1">
          <mxGeometry x="1220" y="720" width="180" height="80" as="geometry" />
        </mxCell>

        <mxCell id="ent_brand" value="&lt;b&gt;🔧 Brand Care / Center&lt;/b&gt;&lt;br&gt;(Official RMA)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#fffbeb;strokeColor=#d97706;strokeWidth=2;fontColor=#0f172a;" vertex="1" parent="1">
          <mxGeometry x="690" y="1000" width="180" height="80" as="geometry" />
        </mxCell>

        <!-- Connecting Data Flows -->
        <mxCell id="flow_1" value="DF-001: Mobile, Shop Name, Selected Plan" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.2;entryDx=0;entryDy=0;" edge="1" parent="1" source="ent_visitor" target="proc_0">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_2" value="DF-002: OTP Challenge, Trial Confirm" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=0;exitY=0.1;exitDx=0;exitDy=0;entryX=1;entryY=0.2;entryDx=0;entryDy=0;" edge="1" parent="1" source="proc_0" target="ent_visitor">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_3" value="DF-003: Login Phone, OTP/PIN, Shop Settings" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.4;entryDx=0;entryDy=0;" edge="1" parent="1" source="ent_owner" target="proc_0">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_4" value="DF-004: Auth Tokens, P&amp;L Statements, Z-Report" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=0;exitY=0.3;exitDx=0;exitDy=0;entryX=1;entryY=0.7;entryDx=0;entryDy=0;" edge="1" parent="1" source="proc_0" target="ent_owner">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_5" value="DF-005: Staff PIN, Sales Entry, Job Sheets" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.6;entryDx=0;entryDy=0;" edge="1" parent="1" source="ent_staff" target="proc_0">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_6" value="DF-006: Shift Summary, Thermal Slip, Tokens" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=0;exitY=0.7;exitDx=0;exitDy=0;entryX=1;entryY=0.8;entryDx=0;entryDy=0;" edge="1" parent="1" source="proc_0" target="ent_staff">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_7" value="DF-007: Payments, Used Phone Trade-in, NID" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.8;entryDx=0;entryDy=0;" edge="1" parent="1" source="ent_customer" target="proc_0">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_8" value="DF-008: Tax Invoice, Police Undertaking" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=0;exitY=0.9;exitDx=0;exitDy=0;entryX=1;entryY=0.8;entryDx=0;entryDy=0;" edge="1" parent="1" source="proc_0" target="ent_customer">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_9" value="DF-009: Invoiced Handsets, Dual-IMEIs, Challan" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" edge="1" parent="1" source="ent_supplier" target="proc_0">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_10" value="DF-010: Purchase Order (PO), PRV Debit Note" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=0.6;exitY=0;exitDx=0;exitDy=0;entryX=0.6;entryY=1;entryDx=0;entryDy=0;" edge="1" parent="1" source="proc_0" target="ent_supplier">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_11" value="DF-011: Plan Configurations, Suspension Trigger" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.2;entryDx=0;entryDy=0;" edge="1" parent="1" source="ent_admin" target="proc_0">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_12" value="DF-012: Tenant Directory, Audit Logs" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=1;exitY=0.1;exitDx=0;exitDy=0;entryX=0;entryY=0.8;entryDx=0;entryDy=0;" edge="1" parent="1" source="proc_0" target="ent_admin">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_13" value="DF-013: Dispatch OTP SMS, Security Alerts" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=1;exitY=0.4;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="proc_0" target="ent_sms">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_15" value="DF-015: Subscription Checkout Payload" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=1;exitY=0.6;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="proc_0" target="ent_pgw">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_16" value="DF-016: Webhook Callback, HMAC Sig" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=0;exitY=0.8;exitDx=0;exitDy=0;entryX=1;entryY=0.7;entryDx=0;entryDy=0;" edge="1" parent="1" source="ent_pgw" target="proc_0">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_17" value="DF-017: Store Encrypted Police PDFs, Photos" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=1;exitY=0.8;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="proc_0" target="ent_storage">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="flow_21" value="DF-021: Official Warranty RMA Claims" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" edge="1" parent="1" source="proc_0" target="ent_brand">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>

  <!-- PAGE 2: LEVEL 1 SYSTEM-WIDE DFD -->
  <diagram id="l1-page-2" name="System-Wide DFD (Level 1)">
    <mxGraphModel dx="1600" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2200" pageHeight="1400" background="#ffffff">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- 16 Primary Level 1 Processes -->
        <mxCell id="p1" value="&lt;b&gt;1.0&lt;/b&gt;&lt;br&gt;Auth &amp;amp; Access" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0284c7;strokeColor=#0369a1;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="100" y="80" width="140" height="50" as="geometry" />
        </mxCell>

        <mxCell id="p2" value="&lt;b&gt;2.0&lt;/b&gt;&lt;br&gt;Tenant Billing" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0284c7;strokeColor=#0369a1;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="270" y="80" width="140" height="50" as="geometry" />
        </mxCell>

        <mxCell id="p3" value="&lt;b&gt;3.0&lt;/b&gt;&lt;br&gt;Platform Governance" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0284c7;strokeColor=#0369a1;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="440" y="80" width="140" height="50" as="geometry" />
        </mxCell>

        <mxCell id="p4" value="&lt;b&gt;4.0&lt;/b&gt;&lt;br&gt;Catalog &amp;amp; Dual-IMEI" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0284c7;strokeColor=#0369a1;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="610" y="80" width="140" height="50" as="geometry" />
        </mxCell>

        <mxCell id="p5" value="&lt;b&gt;5.0&lt;/b&gt;&lt;br&gt;Procurement &amp;amp; PRV" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0284c7;strokeColor=#0369a1;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="780" y="80" width="140" height="50" as="geometry" />
        </mxCell>

        <mxCell id="p6" value="&lt;b&gt;6.0&lt;/b&gt;&lt;br&gt;POS High-Speed Bill" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#059669;strokeColor=#047857;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="950" y="80" width="150" height="50" as="geometry" />
        </mxCell>

        <mxCell id="p7" value="&lt;b&gt;7.0&lt;/b&gt;&lt;br&gt;Returns &amp;amp; Buyback" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0284c7;strokeColor=#0369a1;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="1130" y="80" width="140" height="50" as="geometry" />
        </mxCell>

        <mxCell id="p8" value="&lt;b&gt;8.0&lt;/b&gt;&lt;br&gt;Customer Dues &amp;amp; Kisti" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0284c7;strokeColor=#0369a1;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="100" y="160" width="140" height="50" as="geometry" />
        </mxCell>

        <mxCell id="p9" value="&lt;b&gt;9.0&lt;/b&gt;&lt;br&gt;Repair &amp;amp; Brand RMA" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0284c7;strokeColor=#0369a1;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="270" y="160" width="140" height="50" as="geometry" />
        </mxCell>

        <mxCell id="p10" value="&lt;b&gt;10.0&lt;/b&gt;&lt;br&gt;Accounts &amp;amp; Transfers" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0284c7;strokeColor=#0369a1;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="440" y="160" width="140" height="50" as="geometry" />
        </mxCell>

        <mxCell id="p11" value="&lt;b&gt;11.0&lt;/b&gt;&lt;br&gt;Manual MFS Desk" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d97706;strokeColor=#b45309;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="610" y="160" width="140" height="50" as="geometry" />
        </mxCell>

        <mxCell id="p12" value="&lt;b&gt;12.0&lt;/b&gt;&lt;br&gt;Personal Ledger" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dc2626;strokeColor=#b91c1c;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="780" y="160" width="140" height="50" as="geometry" />
        </mxCell>

        <mxCell id="p13" value="&lt;b&gt;13.0&lt;/b&gt;&lt;br&gt;Payroll &amp;amp; Commission" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0284c7;strokeColor=#0369a1;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="950" y="160" width="150" height="50" as="geometry" />
        </mxCell>

        <mxCell id="p14" value="&lt;b&gt;14.0&lt;/b&gt;&lt;br&gt;Day-End &amp;amp; Reports" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0284c7;strokeColor=#0369a1;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="1130" y="160" width="140" height="50" as="geometry" />
        </mxCell>

        <mxCell id="p15" value="&lt;b&gt;15.0&lt;/b&gt;&lt;br&gt;Notification Dispatch" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0284c7;strokeColor=#0369a1;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="1300" y="80" width="140" height="50" as="geometry" />
        </mxCell>

        <mxCell id="p16" value="&lt;b&gt;16.0&lt;/b&gt;&lt;br&gt;Data Export &amp;amp; Audit" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0284c7;strokeColor=#0369a1;fontColor=#ffffff;" vertex="1" parent="1">
          <mxGeometry x="1300" y="160" width="140" height="50" as="geometry" />
        </mxCell>

        <!-- 15 Logical Data Stores (D1 to D15) -->
        <mxCell id="ds_d1" value="&lt;b&gt;D1: Auth &amp;amp; User Devices&lt;/b&gt;" style="shape=partialRectangle;top=0;bottom=0;fillColor=#f8fafc;strokeColor=#475569;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1350" y="260" width="240" height="40" as="geometry" />
        </mxCell>

        <mxCell id="ds_d2" value="&lt;b&gt;D2: Shops &amp;amp; Subscription&lt;/b&gt;" style="shape=partialRectangle;top=0;bottom=0;fillColor=#f8fafc;strokeColor=#475569;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1350" y="310" width="240" height="40" as="geometry" />
        </mxCell>

        <mxCell id="ds_d3" value="&lt;b&gt;D3: Catalog &amp;amp; Variants&lt;/b&gt;" style="shape=partialRectangle;top=0;bottom=0;fillColor=#f8fafc;strokeColor=#475569;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1350" y="360" width="240" height="40" as="geometry" />
        </mxCell>

        <mxCell id="ds_d4" value="&lt;b&gt;D4: Dual-IMEI &amp;amp; Stock Movements&lt;/b&gt;" style="shape=partialRectangle;top=0;bottom=0;fillColor=#f8fafc;strokeColor=#475569;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1350" y="410" width="240" height="40" as="geometry" />
        </mxCell>

        <mxCell id="ds_d5" value="&lt;b&gt;D5: Suppliers &amp;amp; Procurement&lt;/b&gt;" style="shape=partialRectangle;top=0;bottom=0;fillColor=#f8fafc;strokeColor=#475569;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1350" y="460" width="240" height="40" as="geometry" />
        </mxCell>

        <mxCell id="ds_d6" value="&lt;b&gt;D6: Customers &amp;amp; Receivables&lt;/b&gt;" style="shape=partialRectangle;top=0;bottom=0;fillColor=#f8fafc;strokeColor=#475569;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1350" y="510" width="240" height="40" as="geometry" />
        </mxCell>

        <mxCell id="ds_d7" value="&lt;b&gt;D7: Sales &amp;amp; Invoices (Snapshots)&lt;/b&gt;" style="shape=partialRectangle;top=0;bottom=0;fillColor=#f8fafc;strokeColor=#475569;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1350" y="560" width="240" height="40" as="geometry" />
        </mxCell>

        <mxCell id="ds_d8" value="&lt;b&gt;D8: Accounts &amp;amp; Cash Drawers&lt;/b&gt;" style="shape=partialRectangle;top=0;bottom=0;fillColor=#f8fafc;strokeColor=#475569;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1350" y="610" width="240" height="40" as="geometry" />
        </mxCell>

        <mxCell id="ds_d9" value="&lt;b&gt;D9: Double-Entry Financial Ledgers&lt;/b&gt;" style="shape=partialRectangle;top=0;bottom=0;fillColor=#f8fafc;strokeColor=#475569;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1350" y="660" width="240" height="40" as="geometry" />
        </mxCell>

        <mxCell id="ds_d10" value="&lt;b&gt;D10: Kisti Financial Schedules&lt;/b&gt;" style="shape=partialRectangle;top=0;bottom=0;fillColor=#f8fafc;strokeColor=#475569;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1350" y="710" width="240" height="40" as="geometry" />
        </mxCell>

        <mxCell id="ds_d11" value="&lt;b&gt;D11: Buyback &amp;amp; Police Docs&lt;/b&gt;" style="shape=partialRectangle;top=0;bottom=0;fillColor=#f8fafc;strokeColor=#475569;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1350" y="760" width="240" height="40" as="geometry" />
        </mxCell>

        <mxCell id="ds_d12" value="&lt;b&gt;D12: Repair Jobs &amp;amp; RMA Center&lt;/b&gt;" style="shape=partialRectangle;top=0;bottom=0;fillColor=#f8fafc;strokeColor=#475569;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1350" y="810" width="240" height="40" as="geometry" />
        </mxCell>

        <mxCell id="ds_d13" value="&lt;b&gt;D13: MFS Agent Sim Floats&lt;/b&gt;" style="shape=partialRectangle;top=0;bottom=0;fillColor=#f8fafc;strokeColor=#475569;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1350" y="860" width="240" height="40" as="geometry" />
        </mxCell>

        <mxCell id="ds_d14" value="&lt;b&gt;D14: Isolated Personal Ledger&lt;/b&gt;&lt;br&gt;(Strict Zero P&amp;amp;L Contamination)" style="shape=partialRectangle;top=0;bottom=0;fillColor=#fef2f2;strokeColor=#dc2626;strokeWidth=2;fontColor=#991b1b;" vertex="1" parent="1">
          <mxGeometry x="1350" y="910" width="240" height="50" as="geometry" />
        </mxCell>

        <mxCell id="ds_d15" value="&lt;b&gt;D15: Daily Closings &amp;amp; Platform Logs&lt;/b&gt;" style="shape=partialRectangle;top=0;bottom=0;fillColor=#f8fafc;strokeColor=#475569;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="1350" y="970" width="240" height="40" as="geometry" />
        </mxCell>

        <!-- Essential Level 1 Connectors -->
        <mxCell id="e_l1_1" value="Scan &amp;amp; Decrement IMEI" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="p6" target="ds_d4">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="e_l1_2" value="Commit Sale &amp;amp; Specific COGS" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=1;exitY=0.75;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="p6" target="ds_d7">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="e_l1_3" value="Cash Inflow &amp;amp; Change" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=1;exitY=0.25;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="p6" target="ds_d8">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="e_l1_4" value="Personal Hawlat &amp;amp; Behalf Expense" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="p12" target="ds_d14">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="e_l1_5" value="Drawer Impact (0% P&amp;amp;L)" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;" edge="1" parent="1" source="p12" target="p10">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="e_l1_6" value="Blind Cash Count &amp;amp; Variance" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="p14" target="ds_d15">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

---

## 14. DFD Validation Report and Statistics

### 14.1 Document Coverage and Audit Evaluation
- **Reviewed Documents:** `PRD.md` (v6.1.0), `user-flow.md` (v4.1.0), `ARCHITECTURE.md` (v1.0.0), `Requirement Validation.md` (v1.0.0), `database-schema.md` (v1.0.0), `schema.sql`, `idea.md`, and `saas-platform-audit.md`.
- **Business Requirement Coverage:** 100%. All 17+ specialized retail modules, 3-subdomain routing tiers, and 28+ end-to-end user flows have been mapped into processes, data flows, and logical data stores.
- **Specification Alignment:**
  - Kisti reminder SMS and remote device locking boundaries have been explicitly bounded and excluded per decision.
  - Warranty (RMA), salesman commission, Mushak 6.3 VAT billing, dead stock analysis, and cloud backup exports are fully articulated.

### 14.2 Balancing and Consistency Checks
1. **Level 0 vs. Level 1 Balancing:**
   - Every external entity in the Context Diagram (Visitor, Owner, Staff, Customer, Supplier, Admin, SMS, PGW, Storage, WhatsApp, Brand) matches corresponding Level 1 processes.
2. **Level 1 vs. Level 2 Balancing:**
   - POS (6.0), Procurement (5.0), Kisti (8.0), MFS (11.0), Personal Ledger (12.0), Service (9.0), Accounts (10.0), and Day-End (14.0) subprocess I/O boundary flows balance 100% with their Level 1 parent processes.
3. **Data Dictionary and Data Flow Consistency:**
   - External boundary data flow IDs (`DF-001` through `DF-022`) and internal domain flow IDs (`DF-101` through `DF-130`) match data dictionary and flow table definitions without collisions.
   - Financial entries enforce `NUMERIC(15,2) / Decimal128` and immutable append-only ledger invariants.
   - Dead stock scanning reads directly from `D4` (Stock & IMEI) to isolate unsold inventory units.

### 14.3 Validation Statistics Summary

| Validation Category | Total Checks | Passed | Passed with Warnings | Failed | Not Verified | Pending Decisions |
|---|---|---|---|---|---|---|
| **Document Coverage & Requirements** | 25 | 25 | 0 | 0 | 0 | 0 |
| **Diagram Balancing (L0 -> L1 -> L2)** | 18 | 18 | 0 | 0 | 0 | 0 |
| **Data Dictionary & Schema Field Integrity** | 30 | 30 | 0 | 0 | 0 | 0 |
| **Financial Integrity & Double-Entry Invariants**| 12 | 12 | 0 | 0 | 0 | 0 |
| **Multi-Tenancy & Security Isolation** | 10 | 10 | 0 | 0 | 0 | 0 |
| **Amanat/Hawlat Isolation (Zero P&L)** | 5 | 5 | 0 | 0 | 0 | 0 |
| **100% Manual MFS Policy (No SMS Scraping)** | 5 | 5 | 0 | 0 | 0 | 0 |
| **draw.io XML Syntax & Geometric Validation** | 6 | 6 | 0 | 0 | 0 | 0 |
| **Pending Business Decisions (Explicitly Tracked)**| 2 | 0 | 0 | 0 | 0 | 2 |
| **Total Validation Checks** | **113** | **111** | **0** | **0** | **0** | **2** |

*Tracked Pending Decisions: (1) BDT Sub-Paisa Rounding Policy, (2) POS Offline Sync Conflict Window First-Come Rule.*

### 14.4 Critical Next Steps
1. **Monorepo Codebase Scaffolding:** Architectural blueprint, PRD, user flows, and DFD are complete. Proceed to Phase 1: **Monorepo Setup (`apps/web`, `apps/api`)**.
2. **Database Connectivity and Models Verification:** Execute connection pool tests against MongoDB Atlas with Mongoose models adhering to the `DATABASE.md` specification.
3. **Hardware Print Driver Prototype:** Build `WebUSB` / Bluetooth thermal printer prototypes in the browser to validate 58mm/80mm receipt streaming.
