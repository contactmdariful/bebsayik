# Product Requirement Document (PRD): Bebsayik App
## Enterprise Mobile Shop & Retail ERP + POS SaaS Platform

**Version:** 6.1.0 (Hardened Master Edition — Audit Validated)  
**Status:** Pre-Implementation Specification  
**Official Product Name:** Bebsayik  
**English Product Name:** Bebsayik.com  
**Brand:** Bebsayik  
**Brand Attribution:** Powered by Bebsayik  
**Primary Website Domain:** `bebsayik.com` (Intended canonical domain, subject to verification)  
**Legacy Business Context:** The initial ERP requirements and workflows originated from the Kanchan Telecom retail operation. The SaaS product is independently branded and operated as Bebsayik.com.  
**Business Model:** Shop-Centric Freemium SaaS (Monthly, 6-Month & Yearly Subscriptions via PayStation, EPS & bKash)  
**Target Market:** Mobile Phone, Gadget, Electronics & Retail Retailers (Bangladesh & Emerging Markets)  
**Document Owner:** Antigravity Engineering & Product Architecture  
**Source Baseline:** `Requirement Validation.md`, `saas-platform-audit.md` (v2.0.0), `database-schema.md`, `schema.sql`, `user-flow.md` (v4.0.0)  

---

## 1. Executive Summary, Brand & Platform Architecture

### 1.1 Vision Statement & Legacy Business Context
**Bebsayik** (Bebsayik.com, Powered by Bebsayik) is a high-reliability, multi-tenant cloud ERP + POS SaaS platform engineered specifically for mobile phone, gadget, and electronics businesses. The initial ERP requirements and workflows originated from the Kanchan Telecom retail operation. The SaaS product is independently branded and operated as Bebsayik.com.

Unlike generic inventory systems, Bebsayik.com operates directly on an isolated **Shop-Centric SaaS Model** (the artificial "Organization" layer is permanently eliminated). It unifies:
- **Public Marketing Website (`bebsayik.com`):** High-converting public showcase, feature highlights, and subscription onboarding.
- **Enterprise Web ERP (`app.bebsayik.com`):** High-speed desktop POS, dual-IMEI tracking, procurement, accounting, and reporting.
- **Mobile POS & Management App (Android / iOS):** Ultra-fast mobile access with device-bound PIN/biometric authentication.
- **Central Platform Admin Panel (`admin.bebsayik.com`):** Global SaaS control for shop management, subscription lifecycle, payment gateways, and system diagnostics.
- **Core Dokan Workflows:** Sub-second POS checkout, BTRC vs Global Dual-IMEI tracking, Specific Identification COGS, Kisti (EMI) with guarantors, old phone police-compliant buybacks, repair job sheets with 50% labor commission split, dual-mode MFS agent desk, and a strictly isolated personal ledger (Amanat-Hawlat).

### 1.2 Three-Tier Domain & URL Routing Architecture
To guarantee maximum performance, security isolation, and CDN caching efficiency, Bebsayik.com enforces clean subdomain separation:

```
+---------------------------------------------------------------------------------------------------+
|                               BEBSAYIK.COM THREE-TIER ROUTING MODEL                               |
+---------------------------------------------------------------------------------------------------+
| 1. PUBLIC MARKETING WEBSITE      | 2. ENTERPRISE ERP APPLICATION    | 3. PLATFORM ADMIN PANEL     |
|    bebsayik.com                  |    app.bebsayik.com              |    admin.bebsayik.com       |
|    - Landing Page & Showcase     |    - POS & Sales Checkout        |    - SaaS Financial KPIs    |
|    - Feature Deep-Dives          |    - Dual-IMEI Inventory         |    - Shop Management        |
|    - Transparent Pricing         |    - Procurement & PRV           |    - Subscription Plans     |
|    - App Store Badges / Prelaunch|    - Customer Dues & Kisti       |    - Payment Transactions   |
|    - 14-Day Free Gold Trial CTA  |    - MFS Agent Desk              |    - Global CMS & Settings  |
|    - Passwordless OTP Signup     |    - Isolated Personal Ledger    |    - Platform RBAC & Logs   |
+---------------------------------------------------------------------------------------------------+
```

#### Authoritative Subdomain URL & Route Inventory:
- **Public Marketing Website (`bebsayik.com`):**
  - `/` — Public landing page, value proposition, and hero showcase
  - `/features` — Detailed retail ERP capability deep-dives
  - `/pricing` — Subscription tiers, tenure discounts (10% 6M / 16% 1Y), and ROI calculator
  - `/about` — Platform vision and Kanchan Telecom domain heritage
  - `/contact` — Merchant support hotline and direct onboarding assistance
  - `/terms` & `/privacy` — Terms of service and customer data privacy compliance
  - `/register` — Passwordless 11-digit mobile number + SMS OTP trial registration
  - `/login` — Web merchant login (SMS OTP or permanent Argon2id password)
  - `/onboarding/setup` — 3-step shop setup wizard (Profile, Outlets, Starting Float)
  - `/recovery` — 4-digit PIN and password account recovery
- **Enterprise Web ERP Application (`app.bebsayik.com`):**
  - `/app/dashboard` — Live sales turnover, cash drawer balances, and low-stock alerts
  - `/app/pos` — Sub-second counter POS terminal (F1-F12 fast keys, dual-IMEI selection)
  - `/app/inventory` — Product catalog, variant barcodes, and IMEI/serial lifecycle registry
  - `/app/procurement` — Purchase Orders, Partial GRN intake, and Purchase Return Vouchers (PRV)
  - `/app/customers` — Customer directory, credit limits, and Bakir Khata due collections
  - `/app/kisti` — Installment loans, 2 guarantors with NID/phone, and payment milestone tracker
  - `/app/buyback` — Second-hand phone intake, police undertaking contracts, and Trade-In vouchers
  - `/app/personal-ledger` — Segregated Amanat & Hawlat personal ledger (strictly Owner-Only, 0% P&L)
  - `/app/mfs-desk` — 100% manual bKash/Nagad agent float desk and evening USSD balance audit
  - `/app/service` — Repair job sheets, 3x3 pattern lock coordinates, and 50% maker labor split
  - `/app/accounts` — Cash drawers, bank ledgers, OPEX expense vouchers, and fund transfers
  - `/app/closing` — Day-end Z-Report and blind cash drawer note-count reconciliation
  - `/app/settings/profile` — User profile (avatar, email, personal credentials, password change)
  - `/app/settings/shop` — Shop profile & branding (logo, receipt header/footer, return window, BIN/VAT)
  - `/app/settings/staff` — Staff management (invitation, role assignment, temporary PIN, deactivation)
  - `/app/settings/security` — Security center (device sessions, remote revocation, registered mobile number change)
  - `/app/settings/hardware` — Hardware setup (thermal printer 58mm/80mm, cash drawer pulse, scanner test)
  - `/app/settings/billing` — SaaS subscription plan, invoices, and payment gateway renewals
- **Central Platform Admin Panel (`admin.bebsayik.com`):**
  - `/admin/login` — Super Admin authentication with mandatory 2FA
  - `/admin/dashboard` — Global SaaS metrics (MRR, ARR, Churn, Active Shop Tenants)
  - `/admin/shops` — Master tenant directory with non-destructive suspension controls
  - `/admin/subscriptions` — Plan tier versioning, pricing snapshots, and coupon engine
  - `/admin/payments` — Gateway transaction logs (PayStation, EPS, bKash) and webhook monitor
  - `/admin/audit-logs` — Central security audit logs and support impersonation audit trail

### 1.3 Public Marketing Website (`bebsayik.com`) Specification
1. **Hero Section:** Clear retailer-friendly value proposition (*"Complete mobile shop accounting now in one single software"*), dynamic POS & Dashboard mockups, and primary CTA: `[Start 14-Day Free Gold Trial (No Card Required)]`.
2. **Feature Showcase Grid:** 6 high-impact core modules highlighted (Sub-second POS, Dual-IMEI Warranty Badging, Kisti Financial Engine, Repair Job Sheets with 50% split, Isolated Amanat-Hawlat, MFS Agent Desk).
3. **Interactive Previews:** Walkthrough tabs for POS, IMEI Ledger, P&L Statement, and Day-End Z-Report.
4. **Transparent Pricing Table:** Dynamic Monthly, 6-Month (10% off), and 1-Year (16% off) tenure toggles with complete feature comparison matrix.
5. **Interactive ROI Calculator:**
   - **Retailer Inputs:** Monthly Turnover (e.g. ৳15,00,000), Uncollected Due Rate (default 2.5%), Handset Intake (60 units), Daily Bookkeeping Hours (2h).
   - **Formulas:** Recovered Dues (`Turnover * DueRate * 0.75`), Time Saved (`DailyHours * 30 * 0.70`), Dead Stock Avoidance (`Handsets * ৳18k * 0.03`).
   - **Outcome:** Visually illustrates ~৳41,325/month in preserved merchant capital versus Gold plan fee ৳999/month (**ROI > 40x**).
6. **Mobile App Store Promotion:**
   - Google Play Store & Apple App Store badges in Hero, Features, and Footer.
   - Pre-Launch State: Opens lead capture modal (*"Our mobile app is coming soon! Enter your mobile number to receive an SMS alert upon launch"*).
7. **Frequently Asked Questions (FAQ):**
   - *Will my data be deleted when my trial expires?* $\rightarrow$ Never. Zero Data Hostage guarantee provides permanent read-only access and Excel export.
   - *Can I sell if the internet drops?* $\rightarrow$ Yes, non-serialized accessory sales continue in offline encrypted queue. Serialized IMEI handsets require internet to prevent duplicate sales.
   - *Can staff see my personal money?* $\rightarrow$ No. Amanat/Hawlat is strictly isolated and visible only to the Shop Owner.

### 1.4 Master Document Architecture
- **[`prd.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) (This Document):** Master PRD, Business Rules, Subdomain Routing, Module Specs, and Test Cases.
- **[`ARCHITECTURE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/ARCHITECTURE.md):** System Architecture Blueprint, Technology Stack, RBAC Matrix (Section 15), and Security ADRs.
- **[`DATABASE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md):** Authoritative MongoDB Atlas Data Model, 24 Collections, and Double-Entry Financial Posting Matrix (Section 22).
- **[`user-flow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/user-flow.md):** 29 End-to-End User Flows, Mermaid Diagrams, `F1`-`F12` Shortcuts, and 23 Agile Epics.
- **[`DFD.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DFD.md):** Data Flow Diagrams (L0, L1, 17 Level-2 Subprocesses) and Data Dictionary.
- **[`Requirement Validation.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/Requirement%20Validation.md):** 55 Audited Requirements, Failure Matrices, and Strategic Decisions.
- **[`idea.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/idea.md):** Foundational Product Vision, Reading Order Guide, and Kanchan Telecom Heritage.
- **[`CHANGELOG.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/CHANGELOG.md):** Formal Version History (v1.0.0 through v6.1.0).
- **[`database-schema.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/database-schema.md):** Historical Relational Schema Reference (PostgreSQL 16+ RLS).
- **[`prd-analysis.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd-analysis.md):** Preliminary PRD Gap Audit History.

---

## 2. Core Philosophy & Non-Negotiables

1. **Kanchan Telecom Baseline Preservation (Immutable Core Logic):**
   - The 17+ core retail and ERP workflows built from Kanchan Telecom's operational experience are permanently locked.
   - Adding the SaaS subscription layer, public website, or admin panel will **NEVER** alter, weaken, or complicate the core ERP financial, inventory, or POS logic.
2. **Strict Prohibition of SIM & SMS Scraping (100% Manual Entry Policy):**
   - Bebsayik App **STRICTLY PROHIBITS** reading device SMS inboxes, background notification scraping, or interfacing directly with mobile SIM cards.
   - All MFS (bKash/Nagad) and bank transactions are **100% manual entries** by the shopkeeper.
   - *Rationale:* Protects user privacy, complies strictly with Google Play Store & Apple App Store SMS permissions policies, eliminates fake SMS fraud, and prevents device battery drain.
3. **Shop is the Primary Tenant (No Organization Layer):**
   - Every Shop is an independent, isolated SaaS tenant. Direct SQL queries and background jobs enforce Row Level Security: `WHERE shop_id = current_setting('app.current_shop_id')::uuid`.
4. **Passwordless Mobile OTP First:**
   - Registration and authentication operate via 11-digit Bangladeshi mobile number and 6-digit SMS OTP. No forgotten password friction for shopkeepers.
5. **Strict Entity Isolation of Personal Ledger (Amanat & Hawlat):**
   - Personal deposits and loans are tracked in a dedicated entity (`personal_ledger_contacts`), completely isolated from the store's `customers` and `suppliers`. Personal transactions never contaminate sales revenue, VAT, or store P&L.
6. **All-in-One Accounting with Zero Ledger Contamination:**
   - Retail sales, MFS agent banking, personal Hawlat, and repair services coexist harmoniously. Day-end closing reconciles total physical drawer cash across all inflows without blurring their respective subledgers.
7. **Freemium & Affordability First (Merchant Benefit Priority):**
   - Micro-shops use the software for FREE for life within generous tier boundaries (100 sales/mo).
   - When limits are reached, the system displays friendly upgrade prompts without locking existing data or blocking views/reports.
8. **Financial & Inventory Correctness Outranks UI Speed:**
   - No optimistic UI updates for stock or monetary balances. Operations commit authoritatively with row locks or ACID transactions before signaling success.
9. **Authoritative Specific Identification COGS:**
   - Serialized products (phones/tablets) use **Specific Identification Method** tied to the unique IMEI unit landed cost snapshot.
   - Non-serialized accessories use **FIFO (First In, First Out)** valuation.
10. **Zero Data Hostage Guarantee:**
    - Shopkeepers retain 100% ownership of their data. Full CSV/Excel/JSON export is guaranteed anytime. Expired subscriptions transition to Read-Only mode for a minimum of 12 months rather than cutting off access or purging records.

---

## 3. SaaS Subscription, Multi-Gateway & Platform Admin Panel

### 3.1 Multi-Gateway Architecture (PayStation, EPS & bKash)
Bebsayik App integrates a 3-tier gateway adapter framework:
1. **PayStation Bangladesh:** Primary local payment aggregator supporting bKash, Nagad, Rocket, Upay, Visa, MasterCard, and internet banking.
2. **EPS (Electronic Payment Settlement) Gateway:** Bangladesh Bank authorized gateway for low-cost bank-to-bank EFT transfers and corporate card payments (ideal for 6-month and yearly packages).
3. **bKash Direct Merchant API (Tokenized Checkout):** Direct 1-click tokenized checkout for frictionless monthly recurring subscriptions.

#### Webhook Architecture & Idempotency:
- All payment callbacks require cryptographic `HMAC-SHA256` signature verification.
- Every transaction enforces unique `gateway_transaction_id` constraints.
- Retries or duplicated webhooks return `200 OK` with zero duplicate credit or tier tampering.

### 3.2 Comprehensive Subscription Plan Matrix

```
+-----------------------------------------------------------------------------------------------------------------------+
|                                           BEBSAYIK APP SUBSCRIPTION PLANS                                             |
+----------------------+--------------------+--------------------+-----------------------+------------------------------+
| Features / Limits    | FREE (Lifetime)    | PREMIUM (Starter)  | GOLD (Best Choice)    | DIAMOND (Enterprise)         |
+----------------------+--------------------+--------------------+-----------------------+------------------------------+
| **Monthly Billing**  | ৳0 / month         | ৳499 / month       | ৳999 / month          | ৳1,999 / month               |
| **6-Month (10% Off)**| —                  | ৳2,695 (৳449/mo)   | ৳5,395 (৳899/mo)      | ৳10,795 (৳1,799/mo)          |
| **1-Year (16% Off)** | —                  | ৳4,999 (৳416/mo)   | ৳9,999 (৳833/mo)      | ৳19,999 (৳1,666/mo)          |
| **Outlets / Counters**| 1 Counter         | 1 Outlet           | 2 Outlets (w/ Godown) | Unlimited Outlets & Godowns  |
| **Staff Users**      | 1 User (Owner)     | 3 Staff Users      | 5 Staff Users         | Unlimited Staff Users        |
| **Sales Invoices**   | 100 Invoices/mo    | Unlimited Sales    | Unlimited Sales       | Unlimited Sales              |
| **Product Limit**    | 50 Products        | Unlimited Products | Unlimited Products    | Unlimited Products           |
| **Dual-IMEI Tracking**| ❌ Basic Stock    | ✅ Complete        | ✅ Complete           | ✅ Complete                  |
| **SMS Gateway**      | ❌                 | ✅ Custom Gateway  | ✅ Integrated         | ✅ Priority Routing          |
| **Kisti / EMI Engine**| ❌                | ❌                 | ✅ 2 Guarantors+Sched | ✅ Complete                  |
| **Service Job Sheets**| ❌                 | ❌                 | ✅ Tokens & 50% Split | ✅ Complete                  |
| **Trade-In Buyback** | ❌                 | ❌                 | ✅ NID & Police Deed  | ✅ Complete                  |
| **Godown STN Transfer**| ❌               | ❌                 | ❌                    | ✅ With Dispute Handling     |
| **Damage & Scrap**   | ❌                 | ❌                 | ❌                    | ✅ Owner SWV & P&L Loss      |
| **Data Backup/Export**| ✅ Full Excel     | ✅ Full Excel      | ✅ Full Excel         | ✅ Real-Time Cloud Drive     |
+----------------------+--------------------+--------------------+-----------------------+------------------------------+
```

### 3.3 Subscription Lifecycle & Non-Destructive Grace Mode
1. **14-Day Free Gold Trial:** Upon creating a new shop, full Gold Plan features are activated automatically for 14 days without requiring credit card details.
2. **Grace Period (3 Days):** When a subscription ends, full functionality remains active for 3 days with automated SMS reminders sent to the owner.
3. **Read-Only Mode (Business Continuity Guaranteed):**
   - Starting from Day 4, new sales and procurement entries are temporarily paused.
   - However, viewing past sales, reprinting receipts, collecting customer dues (Money Receipts), supplier payouts, viewing Amanat/Hawlat ledgers, and **exporting full business data in Excel/CSV format remains permanently accessible**.

### 3.4 Central Platform Admin Panel (`admin.bebsayik.com`) Specification
1. **SaaS Dashboard & Analytics:**
   - Real-time MRR, ARR, ARPU, Churn Rate, Active Paid Shops, Trial Shops, Expired Shops, and Gateway Success Rates.
2. **Shop & Customer Management (Non-Destructive Suspension Policy):**
   - Searchable directory of all registered shops with owner contact, registration date, tier, and billing history.
   - **Suspension Rule:** If an administrator suspends a shop (`status = SUSPENDED`), **zero shop business data is ever deleted**. The shop simply sees a polite notice upon login: *"Your account has been temporarily suspended. Please contact the support hotline for assistance."*. Shops can be reactivated in 1 click.
   - **Audited Support Impersonation:** Time-limited, visible support access with mandatory reason logged in `platform_audit_logs`.
3. **Subscription & Pricing Engine (Plan Versioning & Snapshotting):**
   - Platform Admins can modify tier pricing, trial durations, and feature quotas.
   - **Versioning Guarantee:** Updating a plan price does **NOT** alter existing subscribers' active terms. The subscription captures a price snapshot at payment time; new pricing only takes effect on subsequent renewal.
   - Promotional Coupon Engine (e.g. `EID2026`).
4. **Payment Management & Gateway Monitor:**
   - Central ledger of all gateway transactions (PayStation, EPS, bKash).
   - Manual payment verification option for direct bank transfer deposits.
   - Gateway enable/disable toggle during provider maintenance windows.
5. **Platform Global Settings & CMS:**
   - Website branding, support hotline, FAQ editor, and Live Mobile App download URL management.
6. **Platform Admin Roles (Admin RBAC):**
   - `PLATFORM_SUPER_ADMIN`, `BILLING_ADMIN`, `SUPPORT_LEAD`. Strictly isolated from shop tenant roles.
7. **Audited Support Impersonation Protocol:**
   - Time-bound access: Support sessions auto-expire after a strict maximum limit of 4 hours.
   - Read-only financial guard: Support impersonation cannot modify accounting ledgers, void invoices, or alter cash drawer records.
   - Merchant transparency: Shop Owner receives an instant SMS notification upon session initiation with support ticket reference.

---

## 4. Dual-Platform Authentication & Security Architecture

Bebsayik App deploys an optimized authentication architecture tailored to the physical context of mobile devices versus desktop browsers:

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                DUAL-PLATFORM AUTHENTICATION MATRIX                                |
+───────────────────────────────────+───────────────────────────────────────────────────────────────+
| Platform                          | Authentication Mechanism & Security Boundary                  |
+───────────────────────────────────+───────────────────────────────────────────────────────────────+
| **Mobile App (Android / iOS)**    | • Initial Setup: Mobile SMS OTP verification                  |
|                                   | • Subsequent: 4-digit **Device-Bound PIN** or Face/Fingerprint|
|                                   | • Secure Storage: Android Keystore / iOS Keychain             |
|                                   | • Offline-resilient and sub-second POS terminal access        |
+───────────────────────────────────+───────────────────────────────────────────────────────────────+
| **Web Application (Desktop PC)**  | • Initial Signup: Mobile SMS OTP verification                 |
|                                   | • Optional: Owner can configure a permanent password          |
|                                   | • Subsequent: Mobile + Password or SMS OTP                    |
|                                   | • Session: Secure, HttpOnly, SameSite cookie                  |
|                                   | • Sensitive Actions: 4-digit Manager PIN override             |
+───────────────────────────────────+───────────────────────────────────────────────────────────────+
```

### 4.1 Mobile App Authentication (Device-Bound PIN Model)
1. **First-Time Activation:** User enters 11-digit mobile number -> Verifies 6-digit SMS OTP -> Sets 4-digit Security PIN.
2. **PIN Security:** PIN is hashed on device/server using `Argon2id` with device salt. Never stored in plaintext.
3. **Device Binding:** Session key is securely stored in Android Keystore / iOS Keychain tied to `device_instance_id`.
4. **Fast Biometric Pass:** Fingerprint / Face ID unlocks the device-bound key instantly.
5. **Brute-Force Lockout:** 5 consecutive incorrect PIN attempts locks the app for 5 minutes and sends an SMS alert.
6. **Device Change / Reinstall Recovery:** Reinstalling app or switching phones requires **mandatory SMS OTP verification** before setting a new device PIN.

### 4.2 Web Application Authentication (Passwordless OTP / Password Hybrid)
1. **First-Time Signup:** Mobile number + 6-digit SMS OTP.
2. **SMS Cost Optimization:** To avoid recurring SMS OTP costs on every daily web login, shop owners can configure a permanent password in their profile settings.
3. **Session Security:** Issues secure `HttpOnly`, `SameSite=Lax` session cookies.
4. **Shared PC Timeout:** Automatically expires sessions after 15 minutes of inactivity on non-trusted public terminals.
5. **Logout All Devices:** Owner can invalidate all active mobile tokens and web sessions in 1 click from security settings.

### 4.3 Manager PIN Override & Security Lockout Policy
Sensitive retail operations—including sales below Minimum Selling Price (MSP), customer credit limit waivers, scrap write-off voucher (SWV) approvals, and invoice voids—require supervisor authorization via a 4-digit PIN:
1. **Security Lockout:** 3 consecutive incorrect PIN entries immediately lock the override modal for 5 minutes.
2. **Audit Logging:** Every attempt (successful or rejected) writes an immutable event (`AUDIT_SECURITY_OVERRIDE_FAILED` / `SUCCESS`) to `platform_audit_logs`.
3. **Escalation Alert:** If 2 lockout events occur within 60 minutes, an automated SMS alert is dispatched to the Shop Owner's registered mobile phone.

### 4.4 Web ERP Password Reset & Account Recovery Engine
1. **Forgot Password Flow:** Unauthenticated users on `app.bebsayik.com/recovery` enter their 11-digit registered mobile number.
2. **Bot & SMS Protection:** Cloudflare Turnstile CAPTCHA challenge protects against automated SMS flooding; rate-limited to 3 OTP requests per 15 minutes per IP/phone.
3. **Cryptographic OTP Challenge:** Dispatches 6-digit SMS OTP (120-second TTL). Upon submission, system validates against `auth_otps` with max 3 attempts.
4. **Argon2id Password Reset:** Once OTP is verified, user sets a new strong password (min 8 characters, mixed case, number, symbol).
5. **Instant Global Session Revocation:** Server increments `tokenVersion`, updates `passwordChangedAt = NOW()`, and invalidates all active JWT tokens and cookies across desktop and mobile terminals.
6. **Security Alert:** Dispatches automated confirmation SMS: *"Your Bebsayik account password was changed successfully."*

### 4.5 Registered Mobile Number Migration Protocol (The Identity Anchor)
In Bangladesh, mobile numbers represent the primary tenant login and identity key (`users.phone`). A secure migration protocol prevents lockout upon SIM replacement:
1. **Case A: Proactive Number Migration (Active Old SIM Available):**
   - User navigates to `/app/settings/security` -> *Change Registered Mobile Number*.
   - Re-authenticates via existing Web Password or 4-digit Manager PIN.
   - Enters new 11-digit Bangladeshi mobile number (`01XXXXXXXXX`).
   - Uniqueness Validation: Server checks that the target number is not registered to an active user.
   - **Dual-OTP Handshake:** System creates a `phone_change_requests` record and dispatches two independent OTPs:
     - OTP 1 to OLD phone (*"Approval OTP"*).
     - OTP 2 to NEW phone (*"Verification OTP"*).
   - Both OTPs must be submitted within 180 seconds.
   - **Atomic Transaction:** Server updates `users.phone = newPhone`, updates `shops.phone = newPhone` (if shop owner), terminates existing session tokens, logs `AUDIT_PHONE_NUMBER_CHANGED`, and sends SMS confirmation to both numbers.
2. **Case B: Lost / Stolen SIM Emergency Migration (Old SIM Inaccessible):**
   - Retailer cannot receive OTPs on old phone due to theft or damaged SIM.
   - Identity Verification: Retailer uploads National ID (NID) and shop trade license matching onboarding records.
   - Verification Tier: Automated OCR/Face match or Platform Super Admin review on `admin.bebsayik.com`.
   - Migration Execution: Super Admin executes authorized phone migration with mandatory support ticket reference and legal indemnity audit log.

### 4.6 Staff Account Lifecycle & Emergency Termination Protocol
1. **Staff Invitation & Provisioning:** Shop Owner visits `/app/settings/staff` -> *Add Employee*. Inputs Name, Mobile, Role (`CASHIER`, `STOCK_KEEPER`, `TECHNICIAN`, `MANAGER`), Base Salary, and Commission Rate.
2. **First-Login Handshake:** System sends onboarding SMS with one-time temporary PIN. On first app/web login, staff is forced to configure their permanent credentials.
3. **Instant Emergency Termination:**
   - Owner clicks *Terminate Staff* e.g., upon suspicious activity or resignation.
   - System atomically sets `users.isActive = false`, increments `tokenVersion`, revokes all `user_devices`, and blocks counter POS access instantly.
   - Historical sales invoices, job sheets, and audit entries preserve employee ID permanently for financial integrity.

### 4.7 Multi-Shop Workspace Switching Protocol
1. **Single Owner, Multiple Outlets:** An owner operating multiple mobile shops (e.g. Counter 1 in Stadium Market and Godown/Branch in Motijheel) registers under a single phone number.
2. **Workspace Switcher:** Top navigation bar renders a tenant workspace dropdown displaying authorized shops.
3. **Tenant Context Switching:** Selecting a shop issues an updated short-lived JWT scoped to the active `shopId`, re-mounting cash drawer balances, stock catalogs, and outlet permissions without requiring re-authentication.

---

## 5. User Registration & 3-Step Shop Setup Wizard

### 5.1 Registration Workflow
1. **Mobile Number Input:** User visits `bebsayik.com` and inputs their 11-digit Bangladeshi mobile number.
2. **6-Digit SMS OTP:** Dispatched via authorized SMS gateway (Validity: 120 seconds, Rate limit: maximum 3 requests per 10 minutes).
3. **Automated Duplicate Check:** If the number is already registered, the user is directly logged into their existing shop; if new, the 3-step setup wizard launches.

### 5.2 3-Step Shop Setup Wizard
- **Step 1: Shop Profile:**
  - Shop Name (`shop_name`) [Mandatory] (e.g. "City Telecom & Gadget")
  - Market & Address (`address`) [Mandatory] (e.g. "Shop #4, 2nd Floor, Eastern Plaza, Dhaka")
  - Owner Name (`owner_name`) [Mandatory]
  - Alternate Mobile Number (`alt_phone`) [Optional]
  - Business Category (`business_type`): Mobile Phone & Gadget (Default) / Electronics / Repair Lab / Wholesale & Retail.
- **Step 2: Outlets & Godowns:**
  - Primary Showroom Counter Name (e.g. "Counter 1")
  - Separate Warehouse / Godown toggle.
- **Step 3: Security PIN & Initialization:**
  - 4-digit Security PIN setup (for mobile app authentication and sensitive overrides).
  - *Quick Start:* Jump directly into dashboard and POS terminal.
  - *Opening Balance Ingestion & Equity Balancing Rule:*
    - Ingest starting inventory (IMEIs + purchase costs), cash/bank float, customer dues, and supplier payables.
    - **Accounting Invariant:** Starting Assets (Cash + Bank + Stock Valuation + Customer Dues) minus Starting Liabilities (Supplier Payables) automatically balances into Account `3.1 Opening Owner Equity`.
    - If liabilities exceed assets, Owner Equity registers as a negative opening capital deficit with an explicit owner confirmation warning modal.
    - The opening balance setup wizard is locked permanently upon committing the first live POS transaction; subsequent adjustments require formal Journal Vouchers (JV).

---

## 6. Functional Module Specifications (Kanchan Telecom Core ERP)

> [!NOTE]
> **Companion UX, Screen Interactions & Agile User Stories:**
> For the visual Mermaid flowcharts, step-by-step screen interactions, keyboard shortcuts (`F1`-`F12`), BDD test cases, and edge-case exceptions for each module below, see the companion document:
> 📖 **[user-flow.md (Master User Flows & User Stories Specification v4.0.0)](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/user-flow.md)**.

### 6.1 POS Checkout Engine & Keyboard Navigation (`F1`-`F12`)
- Rapid keyboard-driven checkout without mouse dependency:
  - `F1`: Payment & Tender Modal
  - `F2`: Quick Customer Search / Add
  - `F3`: Focus cursor on Barcode / IMEI input
  - `F4`: Hold Cart (up to 10 slots)
  - `F5`: Restore Held Cart (Resume Cart)
  - `F8`: Jump to Discount Field
  - `F12`: Manual Cash Drawer Kick (with manager audit)
  - `ESC`: Clear / Cancel Modal
  - `Enter`: Commit Sale & Print Receipt (<250ms).
- **The Overpayment & Change Rule:** Bill ৳400, customer gives ৳500 note -> Cash Drawer records +৳500 inflow and -৳100 change outflow cleanly in the ledger.

### 6.2 POS Multi-Tender & MFS Agent Cash Out Payment Engine
- Split payments across multiple tenders (Cash + Merchant QR + Bank Card + Due).
- **MFS Agent Cash Out As Payment:** When customer cashes out to the shop's Agent SIM instead of scanning a merchant QR:
  - Cash drawer is untouched.
  - Selected bKash Agent SIM digital float debits (+bill amount).
  - Telco commission credits to P&L as income (+৳41.00 per ৳10,000).
  - Configurable fee policy: Customer bears 1.85% fee vs. Shop absorbs fee.

### 6.3 Dual-IMEI & Serial Number Lifecycle Engine
- Tracks both IMEI-1 and IMEI-2 for every mobile handset.
- Lifecycle state transitions: `IN_TRANSIT` → `AVAILABLE` → `RESERVED` → `SOLD` → `RETURNED_INSPECTION` → `DAMAGED_QUARANTINE` → `SCRAPPED` / `RETURNED_TO_SUPPLIER`.
- Tenant-scoped uniqueness constraint across both IMEI-1 and IMEI-2.

### 6.4 Procurement, Partial GRN & Purchase Return (PRV)
- For a Purchase Order of 50 units where 30 arrive today, Partial GRN-01 receives 30 units and sets PO status to `PARTIALLY_FULFILLED`.
- Defective units returned to suppliers generate a Purchase Return Voucher (PRV), deducting stock and debiting supplier payables.

### 6.5 Sales Return, Refund & Exchange Decision Tree
- Customer returns route first to `RETURNED_INSPECTION` quarantine before restocking or RMA.
- Returns on credit reduce outstanding customer dues without cash disbursement; returns on installment cancel future schedules.
- Product exchanges apply returned item valuation as a tender credit against the replacement sales invoice.

### 6.6 Old Phone Trade-In / Second-Hand Buyback
- Captures seller name, mobile, photo of NID card, and front camera face photo.
- 4-digit SMS OTP verification for seller ownership validation.
- Generates printed legal compliance deed with seller signature.
- Issues Trade-In Voucher (`TV-XXXXX`) applied against a new sale or Kisti down payment.
- **NID Photo Storage & Legal Retention Policy:**
  - Seller NID photos and webcam biometric selfies are encrypted at rest (AES-256 / SSE-KMS) in private Cloudflare R2 / AWS S3 buckets.
  - Document viewing is strictly restricted to authenticated `Shop Owner` and `Shop Manager` roles via 15-minute time-limited pre-signed URLs.
  - In compliance with Bangladesh Police regulatory requirements for second-hand electronics, all buyback records and NID images are retained for a minimum of 7 years in immutable compliance storage, remaining exportable even under expired/read-only subscription status.

### 6.7 Installment (Kisti/EMI) Financial Engine
- Down payment handled via cash or trade-in voucher credit.
- Captures 2 guarantors with names, phone numbers, and NID details.
- Tracks installment schedules, due dates, and collection receipts.
- *Note: In accordance with retail practice, automated reminder SMS, escalation SMS, and remote device-locking mechanisms are not provided by Bebsayik; these are managed externally by brand manufacturers or specialized third-party tools.*

### 6.8 Segregated Personal Ledger (Amanat & Hawlat)
*Completely separated schema entity (`personal_ledger_contacts`) isolated from customers and suppliers.*
- Contacts can be created without appearing in the customer registry.
- **6 Transaction Types:** Amanat Deposit, Amanat Refund, Expense on Behalf (cash drawer decreases, contact liability decreases, exactly 0% impact on store P&L), Hawlat Given, Hawlat Repaid, Ledger Adjustment.

### 6.9 Mobile Banking (MFS Agent Desk) — 100% Manual Entry
- **Manual Policy:** Zero SMS scraping or SIM automation.
- **Configurable Commission Policy:** Commission rate is shop-configurable in Settings per provider (bKash, Nagad, Rocket, Upay). Default base rate is 0.41% (+৳41.00 per ৳10,000 / +৳4.10 per ৳1,000) for standard telco agent tier.
- **Agent Cash In:** Customer gives cash -> Cash Drawer `+৳1,000`, Agent SIM float `-৳1,000`, Telco commission `+৳4.10` (P&L Income).
- **Agent Cash Out:** Customer sends digital money -> Cash Drawer `-৳1,000`, Agent SIM float `+৳1,000`, Telco commission `+৳4.10` (P&L Income).
- **Daily Float Reconciliation:** Reconciles physical SIM balance against digital ledger balance.

### 6.10 Repair & Servicing Job Sheet Engine
- 3x3 touch grid screen lock pattern recording, intake scratch notes, and claim token printing.
- Dispenses spare parts from inventory; cleanly returns unused tested parts back to stock.
- 50% Labor Split: 50% of repair labor fee credits to technician payroll, 50% credits to store service revenue.

### 6.11 Damage, Quarantine & Scrap
- Damaged or shattered units in store transition to `DAMAGED_QUARANTINE`.
- Owner approves Scrap Write-Off Voucher (SWV).
- IMEI permanently marked `SCRAPPED` (cannot be sold or transferred) with `Loss on Damaged Stock` debited in P&L.

### 6.12 Brand Warranty & RMA Management
- Receives official warranty handset from customer with RMA Ticket.
- Tracks shipment to brand service center (`SENT_TO_BRAND`, `RECEIVED_FROM_BRAND`).
- Dispatches status updates to customer via SMS/WhatsApp.

### 6.13 Employee Target & Commission
- Configures monthly sales targets for sales staff (e.g. 50 handsets/month).
- Fixed or percentage commissions on specific models or brand lines upon target achievement.
- Automatically credits commission earnings into employee payroll ledgers at month-end.

### 6.14 NBR VAT 6.3 Compliance & Invoicing
- Formal Mushak 6.3 format print layout for corporate and compliant retail operations.
- Explicit VAT breakdown and reporting on tax-compliant sales invoices.

### 6.15 Dead Stock & Aging Analysis
- Automatically detects aging inventory exceeding 60 or 90 days.
- Reports capital tied up in slow-moving stock to facilitate clearance pricing decisions.

### 6.16 Godown ↔ Outlet Stock Transfer (STN) & Dispute Resolution
- Godown manager dispatches shipment (`IN_TRANSIT`).
- Showroom verifies items via physical IMEI scan (`RECEIVED & POSTED`).
- Missing units trigger **STN Dispute Flag** (`DISPUTED_IN_TRANSIT`) with instant owner SMS alert.

---

## 7. Comprehensive Chart of Accounts (COA) Framework

```
├── 1. Assets
│   ├── 1.1 Liquid Cash & Bank Accounts
│   │   ├── Cash Drawer 1 (Counter Cash)
│   │   ├── Bank Current / Savings Accounts
│   │   ├── Petty Cash (Manager Float)
│   ├── 1.2 Digital Floats
│   │   ├── MFS Agent Float SIMs (bKash, Nagad, Rocket)
│   │   ├── Flexiload / Recharge SIMs (GP, Robi, BL, Airtel)
│   │   ├── MFS Merchant Settlement Gateways
│   ├── 1.3 Current Receivables
│   │   ├── Customer Receivables (Customer Outstanding Dues)
│   │   ├── Hawlat Given Asset (Personal Hawlat Receivable)
│   │   ├── Supplier Advance Payments (Advances to Suppliers)
│   ├── 1.4 Inventory Assets
│   │   ├── Merchandise Inventory (Serialized Handsets & Accessories)
│   │   ├── Spare Parts Inventory (Servicing Parts)
├── 2. Liabilities
│   ├── 2.1 Supplier Payables (Vendor Trade Dues)
│   ├── 2.2 Amanat Liabilities (Personal Deposits Held)
│   ├── 2.3 Customer Advance Floats
├── 3. Equity
│   ├── 3.1 Opening Owner Equity
│   ├── 3.2 Owner Capital & Drawings
│   ├── 3.3 Retained Earnings
├── 4. Revenue
│   ├── 4.1 Sales Revenue
│   ├── 4.2 Repair Labor Revenue
│   ├── 4.3 MFS & Telco Commission Income
│   ├── 4.4 Scrap Recovery Income
├── 5. Expenses & Losses
│   ├── 5.1 Cost of Goods Sold (COGS - Specific IMEI Snapshot)
│   ├── 5.2 Loss on Damaged Stock
│   ├── 5.3 Operating Expenses (Rent, Utility, Salary, Tea/Refreshments)
│   ├── 5.4 Day-End Cash Shortage Expense
```

---

## 8. Acceptance Criteria & Test Scenarios

| Test Case ID | Scenario | Expected Behavior | Verification Check |
|---|---|---|---|
| **TC-01** | Cross-Tenant Query | User of Shop A attempts to fetch invoice from Shop B by ID. | Returns `404 Not Found` or `403 Forbidden`. No data leaked. |
| **TC-02** | POS Overpayment Change | ৳400 bill, ৳500 given. | Cash Drawer ledger records +৳500, -৳100 change. Sales invoice records ৳400. |
| **TC-03** | Dual-IMEI Uniqueness | Attempt to receive a phone where IMEI-2 already exists in Shop's active stock. | Transaction rejected with duplicate IMEI validation error. |
| **TC-04** | Dual-IMEI POS Scan | Scanning either IMEI-1 or IMEI-2 on POS search. | Both resolve to the exact same stock unit and variant. |
| **TC-05** | Double-Click POS Submission | Cashier double-clicks "Complete Sale" rapidly. | Idempotency key blocks second request; exactly 1 invoice and 1 stock decrement occur. |
| **TC-06** | Supplier Payment Expense Test | ৳50,000 paid to supplier for past GRN. | Payable decreases by ৳50,000, Bank decreases by ৳50,000. P&L operating expense is unchanged. |
| **TC-07** | Negative Balance Cash Out Block | Cashier attempts Cash Out of ৳5,000 from Drawer having ৳3,000. | Transaction rejected: "Insufficient account balance". |
| **TC-08** | Cash In/Out with Counter Account | ৳10,000 deposited from Cash Drawer to Bank. | Cash Drawer debited ৳10,000, Bank credited ৳10,000 in one atomic transaction. |
| **TC-09** | Amanat Expense on Person's Behalf | Shop pays ৳1,000 courier bill from Person X's deposited Amanat. | Cash Drawer decreases ৳1,000, Person X balance decreases ৳1,000. Shop expense is ৳0. |
| **TC-10** | Hawlat Sign Convention | Person Y borrows ৳5,000 from shop. | Person Y balance becomes -৳5,000 (Shop Receivable). Cash Drawer decreases ৳5,000. |
| **TC-11** | Minimum Selling Price (MSP) Lock | Cashier attempts ৳1,000 discount, dropping price below MSP. | POS blocks sale unless Manager PIN is validated. |
| **TC-12** | Concurrent IMEI Checkout Race | Counter 1 and Counter 2 attempt to sell the exact same IMEI simultaneously. | One counter completes; second receives immediate lock error with zero double-sales. |
| **TC-13** | Cashier Void Rejection | Cashier attempts to void a posted sale without supervisor PIN. | System rejects action; logs unauthorized void attempt in audit table. |
| **TC-14** | Duplicate Receipt Reprint Watermark | Cashier reprints an invoice 10 minutes after sale. | Header displays `*** DUPLICATE REPRINT (COPY #2) ***` with cashier username. |
| **TC-15** | Technician Labor Split Allocation | ৳1,000 repair labor fee collected from customer. | Shop ledger credits ৳500; technician payroll ledger credits ৳500. |
| **TC-16** | Offline Non-Serialized Checkout | Internet disconnects; cashier sells ৳200 screen protector. | Receipt prints locally with `OFFLINE-INV-XXX`; syncs to cloud on reconnect. |
| **TC-17** | Free Plan Limit Breach | Free user creates 101st sale in month. | Friendly upgrade prompt shown; historical data and due collections remain accessible. |
| **TC-18** | Fresh Start Reset Execution | Shop Owner executes Fresh Start reset before grand opening. | 2FA validated; test sales and stock cleared; product master catalog and settings preserved. |
| **TC-19** | Purchase Return (PRV) Netting | Shop returns 2 defective phones (Cost ৳30,000) to supplier. | Supplier Payable decreases by ৳30,000; IMEIs transition to `RETURNED_TO_SUPPLIER`; Stock decrements. |
| **TC-20** | Sales Return Inspection Quarantine | Customer returns a phone 2 days after purchase. | Invoice marked partially/fully returned; IMEI transitions to `RETURNED_INSPECTION` (not directly sellable). |
| **TC-21** | Sales Return Due Reduction | Customer bought ৳20,000 phone with ৳5,000 due; returns phone. | Customer due decreases by ৳5,000; cash refund issued for ৳15,000; no excess cash disbursed. |
| **TC-22** | Damage Scrap Write-Off | Screen smashed in godown (Cost ৳12,000); Owner approves Scrap. | Stock decrements; IMEI marked `SCRAPPED`; P&L debits ৳12,000 under Loss on Damaged Stock. |
| **TC-23** | Specific Identification COGS Test | Phone A bought at ৳18,000, Phone B at ৳19,000. Cashier sells Phone B for ৳22,000. | COGS recorded as exactly ৳19,000; Gross profit is ৳3,000 (unaffected by Phone A). |
| **TC-24** | Opening Balance Onboarding | Shop inputs ৳2,00,000 opening stock, ৳50,000 cash, ৳40,000 due, ৳30,000 payable. | Opening Equity balanced at ৳2,60,000 (`Assets 2.9L - Payable 0.3L`). Zero artificial P&L impact. |
| **TC-25** | SaaS Subscription Grace & Read-Only | Subscription expires; Day 2 in Grace Period vs Day 5 Overdue. | Day 2 allows sales with reminder; Day 5 pauses new sales but leaves due collection and reports fully operational. |
| **TC-26** | Complete Data Export Guarantee | Shop in Read-Only mode requests full data export. | System immediately generates downloadable Excel/CSV archive with zero blocks. |
| **TC-27** | Single-Session Free Tier Enforce | Free plan owner logs in on Phone while active on Laptop. | Laptop session transitions with polite notice; no multi-session concurrent conflict. |
| **TC-28** | Partial GRN Receiving | PO issued for 50 units; Supplier delivers 30 units today. | GRN records 30 units; PO marks `PARTIALLY_FULFILLED`; pending 20 units tracked for follow-up GRN. |
| **TC-29** | Passwordless Mobile OTP Login | New user enters `01711223344`. System sends 6-digit OTP. | User verifies OTP without entering any password; redirected to Shop Setup Wizard. |
| **TC-30** | Shop Setup Wizard Tenant Creation | User completes 3-step wizard with shop name "City Gadget". | Database atomically creates `shops` record with RLS isolation and assigns user as `SHOP_SUPER_ADMIN`. |
| **TC-31** | POS MFS Agent Cash Out Payment | Bill is ৳10,000; Customer cashes out to shop's bKash Agent SIM. | bKash Agent Float increments by ৳10,000; MFS commission records +৳41; Cash Drawer is untouched. |
| **TC-32** | Personal Ledger Strict Entity Isolation| Person "Hasan" created in Amanat/Hawlat with deposit ৳20,000. | Hasan does NOT appear in `customers` table; Sales and Customer Receivables are untouched. |
| **TC-33** | MFS Agent Cash In Commission | Customer gives ৳2,000 cash for Cash In to their personal wallet. | Cash Drawer increments +৳2,000; Agent SIM decrements -৳2,000; P&L credits +৳8.20 MFS Commission. |
| **TC-34** | PayStation / EPS Webhook Idempotency| PayStation sends subscription success webhook twice. | Webhook verification logs transaction once; Shop subscription activates once without double extension. |
| **TC-35** | 14-Day Free Gold Trial Expiry | New shop reaches Day 15 without paying subscription. | System transitions shop to Grace Period (Days 15-17), then Read-Only with polite upgrade banner. |
| **TC-36** | STN Mismatch Dispute Notification | Godown sends 20 IMEIs; Showroom verifies only 19 physical units. | 19 units become sellable in Showroom; 1 unit marked `DISPUTED_IN_TRANSIT`; SMS alert sent to Owner. |
| **TC-37** | Marketing Landing Page Route | Public visitor visits `bebsayik.com`. | Shows marketing showcase, pricing comparison, app store badges and CTA without requiring login. |
| **TC-38** | Non-Destructive Shop Suspension | Admin suspends Shop #105 from Admin Panel. | Login blocked with polite notice; zero shop inventory, sales, or customer data is deleted; Reactivates in 1 click. |
| **TC-39** | Plan Versioning Price Snapshot | Admin increases Gold Plan price from ৳999 to ৳1,199. | Existing Gold subscriber's active period is unaffected; captures price snapshot until subsequent renewal. |
| **TC-40** | Mobile App PIN 5-Attempt Lockout | User enters incorrect 4-digit PIN 5 consecutive times on mobile app. | Mobile app locked for 5 minutes; security audit event fired to owner's registered number. |
| **TC-41** | Web Logout All Devices | Shop owner triggers "Logout from All Devices" on web security page. | All active mobile JWT refresh tokens and web session cookies are revoked across all counters. |
| **TC-42** | Strict Prohibition of SMS Scraping | Codebase and mobile manifests audited for SMS permissions. | Zero `READ_SMS`, `RECEIVE_SMS`, or background scraping services; 100% compliant with Google Play Store. |
| **TC-43** | App Store Pre-Launch Lead Capture | Visitor clicks Google Play badge before public store release. | Opens modal capturing mobile number for SMS release alert; records lead in platform admin marketing list. |
| **TC-44** | Platform Admin RBAC Isolation | Shop Super Admin attempts to access `admin.bebsayik.com/dashboard`. | Rebuffed with `403 Forbidden`; Platform admin capabilities restricted to global platform administrators. |
| **TC-45** | Mobile Device Change OTP Recovery | User installs Mobile App on a new phone. | Prompts for mobile number + 6-digit SMS OTP before allowing creation of a new device-bound PIN. |
| **TC-46** | Remote Stolen Device Revocation | Owner clicks "Revoke Device" for a lost/stolen staff phone. | `user_devices.is_active` set to false, revoked_at logged; active JWT session instantly terminated; phone blocked. |
| **TC-47** | Paper-Jam Invoice Reprint Idempotency | Printer jams; cashier clicks "Reprint Invoice". | System increments `reprint_count`, prints `*** DUPLICATE REPRINT (COPY #N) ***`; zero ledger or inventory mutation. |
| **TC-48** | Offline Handset Sale Prevention | Internet drops; cashier attempts to sell serialized Dual-IMEI handset. | System strictly blocks checkout with warning; non-serialized accessories are allowed in IndexedDB queue. |
| **TC-49** | Gateway 3-Min Webhook Poller Sweeper | PayStation/EPS webhook delayed due to gateway network blip. | 3-minute background poller queries gateway status API; confirms transaction and unlocks tier automatically. |
| **TC-50** | Web Password SMS Cost Optimizer | New shop owner logs into Web ERP and sets strong password. | Subsequent web logins authenticate via mobile + password without triggering costly SMS OTPs. |
| **TC-51** | Web ERP Password Reset via SMS OTP | User forgets web password; requests recovery on `/recovery`. | 6-digit SMS OTP verified; new Argon2id password saved; all previous web/mobile sessions revoked. |
| **TC-52** | Dual-OTP Phone Number Migration | Shop owner changes registered mobile in security settings. | Dual OTPs sent to old and new SIMs; validated within 180s; atomic DB update updates login identity. |
| **TC-53** | Instant Staff Termination Session Kill | Owner terminates rogue cashier in staff settings. | Cashier `isActive` set to false; active POS tablet kicked out in <1 second; subsequent PIN logins blocked. |
| **TC-54** | Thermal Receipt Branding Customization | Owner uploads shop logo and configures Bangla header/footer. | WebUSB 58mm/80mm thermal receipt prints clear bitmap logo, header note, and return policy footer. |
| **TC-55** | Multi-Shop Workspace Switching | Owner with 2 Dokans selects second shop from header dropdown. | Context switches seamlessly; loads second shop's cash drawer, inventory, and sales ledger instantly. |
| **TC-56** | Lost SIM Emergency Recovery via NID | Retailer loses SIM; requests hotline assistance. | Super Admin verifies NID & Trade License; migrates phone with audit ticket; merchant recovers shop access. |

---

## 9. Phased Implementation Roadmap

- **Phase 0: Core Architecture, Multi-Tenant Schema & Security:**
  - Establish multi-tenant schema with `shop_id` RLS isolation.
  - Implement Passwordless OTP Authentication service & Session management.
  - Establish subdomain routing (`bebsayik.com`, `app.bebsayik.com`, `admin.bebsayik.com`).
  - Implement Specific Identification COGS engine and Opening Balance Wizard.
- **Phase 1: Public Marketing Website (`bebsayik.com`) & Shop Setup Wizard:**
  - Landing page, feature showcases, pricing comparison, and App Store badges (Pre-launch lead capture).
  - 3-Step Shop Setup Wizard (Profile, Outlets, Security PIN).
  - Dual-IMEI registry with 7 status lifecycle states.
  - Hardware Setup Wizard (ESC/POS printer, cash drawer kick, barcode scanner wedge).
- **Phase 2: High-Integrity POS, Multi-Tender & Returns Engine:**
  - Sub-second scan engine with keyboard shortcuts (`F1`-`F12`).
  - Multi-tender payments including MFS Agent Cash Out payment mechanism.
  - Deterministic Sales Return, Refund & Exchange Decision Tree with Inspection routing.
- **Phase 3: Procurement, Stock & Supplier Return (PRV) Engine:**
  - Purchase Orders (PO) with Partial GRN fulfillment tracking.
  - Supplier Advance Payment vouchers and GRN deduction logic.
  - Purchase Return Voucher (PRV) with IMEI status transition to `RETURNED_TO_SUPPLIER`.
  - Godown-to-Outlet Stock Transfer Note (STN) with dispute handling.
- **Phase 4: Customer Dues, Kisti & Trade-In Engine:**
  - Customer ledger, FIFO due collection receipts.
  - Installment (Kisti/EMI) schedule generator with guarantor profiles (Financial tracking only).
  - Old Phone Exchange / Trade-In module with police compliance undertaking contract.
  - Hybrid Trade-In valuation offsetting Kisti Down Payment.
- **Phase 5: Financial Subledgers, MFS & Personal Ledgers:**
  - Independent Personal Ledger (`personal_ledger_contacts`) with 6 transaction types.
  - MFS Agent Desk: 100% manual entry Cash In, Cash Out, commission calculations and float reconciliation.
  - Cash drawer registers, Counter-Account transfers with zero negative balance lock.
  - Operating expenses and automated Staff Payroll calculation (Base salary + commissions + technician splits).
  - Day-end closing (Z-Report) with blind cash count and owner summary SMS.
- **Phase 6: Servicing, Warranty, Damage & Scrap Engine:**
  - Repair job sheet ticketing with pattern lock record, claim tokens, and 50% labor split.
  - Technician spare parts dispensing and clean return-to-stock loop.
  - Damage, Quarantine & Scrap (SWV) module: write-off vouchers and P&L loss posting.
- **Phase 7: Central Platform Admin Panel (`admin.bebsayik.com`):**
  - SaaS Analytics Dashboard (MRR, Churn, Active/Suspended Shops).
  - Shop Management with Non-Destructive Suspension policy.
  - Subscription Plan Manager with Versioning and Snapshotting.
  - Payment Gateway transaction monitor with manual approval fallback.
  - Platform RBAC and Global Settings / CMS.
- **Phase 8: Mobile POS App (Android/iOS) & SaaS Hardening:**
  - Device-Bound PIN authentication and biometric login.
  - Integration with PayStation Bangladesh, EPS Gateway, and bKash Direct API.
  - 14-day cardless Gold trial, Grace period, and Read-only mode enforcement.
  - End-to-end automated test suite executing TC-01 through TC-50.
