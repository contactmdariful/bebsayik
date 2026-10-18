// scratch/build_api_spec_v2.js
const fs = require('fs');
const path = require('path');

const targetPath = 'c:/Users/conta/OneDrive/Documents/Dokan Management Software/api-spec.md';

const content = `# Bebsayik.com — Comprehensive REST API Specification (v2.0.0)
**Document File:** \`api-spec.md\`  
**Official Product Name:** Bebsayik  
**English Product Name:** Bebsayik.com  
**Brand:** Bebsayik | **Brand Attribution:** Powered by Bebsayik  
**Canonical Domain:** \`bebsayik.com\` (\`app.bebsayik.com\` | \`admin.bebsayik.com\` | \`api.bebsayik.com\`)  
**Heritage Context:** Initial ERP workflows originated from Kanchan Telecom retail operations; the SaaS platform is independently branded and operated as Bebsayik.com.  
**Architecture:** Node.js + Express.js Modular Monolith with TypeScript, MongoDB Atlas (Mongoose 8+) Multi-Document ACID Transactions, and Redis 7+ Cache/Rate-Limiting.  
**Version:** 2.0.0 (Hardened Master Production Specification)  
**Authoritative Scope:** Comprehensive RESTful Endpoint Catalog, Authentication, RBAC, Multi-Tenancy Isolation, Financial Invariants, Idempotency, Request/Response Payloads, Error Standards, ESC/POS Hardware Drivers, and Integration Webhooks.

---

## 1. Document Overview & Architectural Foundation

This document is the authoritative API specification for the **Bebsayik** multi-tenant SaaS ERP and POS platform. It defines all HTTP/HTTPS interface contracts for the frontend web application (\`app.bebsayik.com\`), mobile touch POS (\`app.bebsayik.com/app/pos\`), marketing conversion engine (\`bebsayik.com\`), and platform administration portal (\`admin.bebsayik.com\`).

### 1.1 Core API Principles:
1. **Strict Multi-Tenant Isolation:** Every tenant request must include an authenticated tenant context. The backend enforces database-level \`shopId\` scoping across all queries, updates, and aggregations.
2. **Sub-Second POS Response Time (<150ms):** Counter barcode lookups, IMEI scans, and cart calculations are optimized to respond within 150ms to sustain rapid cashier throughput during peak rush hours.
3. **Idempotency on Financial Operations:** All financial mutations (sales, refunds, due collections, MFS transfers, and cash closings) require a mandatory \`Idempotency-Key\` header (UUIDv4) to prevent double-charging or duplicate ledger writes.
4. **Double-Entry Financial Invariants:** Every transaction modifying balances must post balanced double-entry journals (\`sum(Debits) === sum(Credits)\`) within an atomic MongoDB transaction session.
5. **Specific Identification COGS:** Mobile handsets track specific landed purchase cost by exact 15-digit IMEI. Average costing is strictly prohibited.

---

## 2. Global API Conventions & Standards

### 2.1 Base URLs & Protocol:
- **Production API Gateway:** \`https://api.bebsayik.com/api/v1\`
- **Staging / Sandbox API:** \`https://staging-api.bebsayik.com/api/v1\`
- **Local Development:** \`http://localhost:5000/api/v1\`
- **Protocol:** HTTPS (TLS 1.3 mandatory in production) with HSTS enabled.

### 2.2 Global Headers:
| Header Name | Type | Mandatory? | Description |
|---|---|:---:|---|
| \`Authorization\` | String | Yes (Auth routes) | Bearer token format: \`Bearer <JWT_ACCESS_TOKEN>\` |
| \`X-Shop-Id\` | String | Yes (Tenant routes)| Scoped 24-character hex MongoDB ObjectId of the active shop |
| \`Idempotency-Key\` | String | Yes (Financial POST)| Client-generated UUIDv4 preventing duplicate financial execution |
| \`Content-Type\` | String | Yes (POST/PUT/PATCH)| Must be \`application/json\` (or \`multipart/form-data\` for file uploads) |
| \`Accept\` | String | Yes | Must be \`application/json\` |
| \`X-Client-Version\`| String | Recommended | Client build version (e.g., \`2.0.0\`) for deprecation warnings |

### 2.3 Standard Response Envelope:

#### Successful Response (HTTP 200 / 201):
\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-10-11T17:15:00.000Z",
    "requestId": "req_860124891240",
    "pagination": {
      "page": 1,
      "limit": 25,
      "totalRecords": 142,
      "totalPages": 6,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
\`\`\`

#### Standard Error Response (HTTP 4xx / 5xx):
\`\`\`json
{
  "success": false,
  "error": {
    "code": "MSP_FLOOR_BREACH",
    "message": "Discounted unit price (৳23,500.00) is below the minimum selling price floor (৳24,500.00).",
    "details": [
      {
        "field": "items.0.unitPrice",
        "issue": "Price below MSP floor of ৳24,500.00. Manager PIN override required."
      }
    ],
    "timestamp": "2026-10-11T17:15:00.000Z",
    "requestId": "req_860124891240"
  }
}
\`\`\`

### 2.4 Standard HTTP Status Codes:
- \`200 OK\` — Request succeeded with payload.
- \`201 Created\` — Resource successfully created.
- \`400 Bad Request\` — Malformed JSON or syntax failure.
- \`401 Unauthorized\` — Missing, expired, or invalid JWT token.
- \`403 Forbidden\` — User role lacks permission or account is terminated (\`STAFF_TERMINATED\`).
- \`404 Not Found\` — Resource does not exist within the scoped tenant.
- \`409 Conflict\` — Concurrent mutation conflict (e.g., IMEI already sold or duplicate barcode).
- \`422 Unprocessable Entity\` — Zod payload validation failure or business rule violation.
- \`429 Too Many Requests\` — Rate limit threshold exceeded.
- \`500 Internal Server Error\` — Unhandled server exception.

### 2.5 Query Filtering, Sorting & Pagination Parameters:
All list endpoints support standard URL query parameters:
- \`page\` (Integer, default: \`1\`) — Current page number.
- \`limit\` (Integer, default: \`25\`, max: \`100\`) — Items per page.
- \`sort\` (String, default: \`-createdAt\`) — Field sorting prefix (\`-\` for descending, \`+\` for ascending).
- \`search\` (String) — Text search query for names, phones, barcodes, or IMEIs.
- \`startDate\` & \`endDate\` (ISO8601) — Date range filtering.

### 2.6 Centralized Domain Error Code Catalog:
| Error Code | HTTP Status | Description & Recovery Action |
|---|:---:|---|
| \`MSP_FLOOR_BREACH\` | 422 | Unit price violates minimum selling price. Requires Manager PIN override. |
| \`IMEI_ALREADY_SOLD\` | 409 | Scanned IMEI has already been checked out or reserved in another active cart. |
| \`INVALID_IMEI_LUHN\` | 422 | Scanned 15-digit IMEI fails the international Luhn algorithm verification. |
| \`CREDIT_LIMIT_EXCEEDED\` | 422 | Bakir Khata credit sale exceeds customer's sanctioned balance limit. |
| \`STAFF_TERMINATED\` | 403 | Staff account has been deactivated by owner; token revoked immediately. |
| \`SHIFT_NOT_OPEN\` | 403 | Counter POS sale attempted before morning opening cash float is entered. |
| \`RECOUNT_LIMIT_EXCEEDED\` | 422 | Cashier attempted more than 1 blind recount grace submission at shift closing. |
| \`PERSONAL_LEDGER_CONTAMINATED\` | 422 | Attempted personal transaction that violates the strict 0.00% Store P&L invariant. |
| \`IDEMPOTENCY_CONFLICT\` | 409 | A transaction with the identical \`Idempotency-Key\` is currently in-flight. |
| \`SUPPLIER_DUES_EXCEEDED\` | 422 | Procurement blocked due to unpaid vendor balance exceeding credit threshold. |
| \`INSUFFICIENT_STOCK\` | 422 | Non-serialized inventory stock count is lower than requested quantity. |
| \`PATTERN_LOCK_INVALID\` | 422 | Technician repair pattern coordinates contains duplicate nodes or <4 points. |
| \`INVALID_MANAGER_PIN\` | 401 | 4-digit Manager Override PIN does not match the hashed store PIN. |
| \`TENANT_ACCESS_DENIED\` | 403 | Authenticated user is not authorized to access or mutate the requested \`shopId\`. |
| \`RATE_LIMIT_EXCEEDED\` | 429 | Sliding-window request count breached (e.g. >3 SMS OTPs per 15 minutes). |
| \`OTP_EXPIRED\` | 400 | SMS OTP challenge has exceeded its 120-second validity window. |

---

## 3. Authentication & Security Engine

### 3.1 Rate Limiting Architecture (Redis Sliding Window):
- **SMS OTP Endpoints (\`/auth/otp/*\`):** Strictly limited to **3 requests per 15 minutes** per mobile number and IP address.
- **Login Password Attempts (\`/auth/login\`):** Limited to **5 attempts per 15 minutes**. 5 consecutive failures lock the user account for 15 minutes (\`lockedUntil\`).
- **POS Scanner Endpoints (\`/inventory/imei/scan\`):** High-capacity threshold of **300 requests per minute** per terminal.
- **General API Endpoints:** Standard **100 requests per minute** per user token.

### 3.2 Dual Authentication Model:
1. **Passwordless SMS OTP Flow:** 11-digit Bangladeshi mobile number input -> Cloudflare Turnstile verification -> 6-digit SMS OTP challenge (120-second TTL in MongoDB \`auth_otps\` with SHA-256 hash) -> Verified JWT issue.
2. **Permanent Argon2id Password Flow:** Mobile number + password (minimum 8 characters with numbers and symbols) for web management login.

### 3.3 JWT Session Lifecycle & Revocation:
- **Access Token:** Short-lived JWT (15 minutes expiry) containing \`userId\`, \`role\`, and \`tokenVersion\`.
- **Refresh Token:** Long-lived HTTP-only secure cookie (7 days expiry) stored in Redis.
- **Instant Kill Switch:** Incrementing \`users.tokenVersion\` instantly invalidates all active access and refresh tokens across all devices within <1 second.

### 3.4 Zod Validation Schemas & Data Constraints:
The API strictly verifies all payloads against strongly-typed Zod schemas:
- **Bangladeshi Mobile Phone:** \`z.string().regex(/^01[3-9]\\d{8}$/, "Must be an 11-digit Bangladeshi mobile number")\`
- **15-Digit Luhn IMEI:** \`z.string().regex(/^\\d{15}$/, "IMEI must be exactly 15 numeric digits").refine(validateLuhn, "Invalid Luhn checksum")\`
- **Manager Override PIN:** \`z.string().regex(/^\\d{4}$/, "Manager PIN must be exactly 4 numeric digits")\`
- **Monetary String:** \`z.string().regex(/^\\d+(\\.\\d{1,2})?$/, "Monetary values must be formatted as 2-decimal strings (e.g. '24500.00')")\`
- **Idempotency Key:** \`z.string().uuid("Idempotency key must be a valid UUIDv4")\`
- **Pattern Lock Coordinates:** \`z.array(z.number().int().min(0).max(8)).min(4).max(9).refine(arr => new Set(arr).size === arr.length, "Pattern cannot contain duplicate nodes")\`

---

## 4. Master RBAC & Permission Matrix

The backend enforces role gates via Express middleware: \`requireRole(['STORE_OWNER', 'STORE_MANAGER'])\`.

### Canonical Roles & Hierarchy:
1. \`SUPER_ADMIN\` — Platform owner accessing \`admin.bebsayik.com\`.
2. \`STORE_OWNER\` — Shop owner with unrestricted access across all modules, billing, and isolated personal ledgers.
3. \`STORE_MANAGER\` — Store supervisor with operational, discount override, and closing permissions (no personal ledger).
4. \`SALESPERSON\` — Counter sales staff with cart, customer lookup, and quotation access.
5. \`CASHIER\` — Counter billing operator handling tenders, split payments, and day-end blind cash counting.
6. \`TECHNICIAN\` — Repair lab engineer handling device servicing, pattern locks, and spare parts.
7. \`ACCOUNTANT\` — Financial auditor managing accounts, ledgers, vouchers, and tax statements.

| Module / Operation | Super Admin | Store Owner | Store Manager | Cashier | Salesperson | Technician | Accountant |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Platform Management** | Full | None | None | None | None | None | None |
| **Shop Settings & Billing** | Read | Full | None | None | None | None | None |
| **Staff Emergency Terminate** | Full | Full | None | None | None | None | None |
| **Catalog & Products** | Read | Full | Full | Read | Read | Read | Read |
| **POS Counter Checkout** | None | Full | Full | Full | Create Cart | None | Read |
| **Manager PIN Override** | None | Full | Full | None | None | None | None |
| **Procurement GRN** | None | Full | Full | None | None | None | Read |
| **Customer Bakir Khata** | None | Full | Full | Collect | Lookup | None | Full |
| **Kisti / EMI Contracts** | None | Full | Full | Collect | Read | None | Full |
| **Used Phone Buyback** | None | Full | Full | Ingest | Read | None | Read |
| **Technician Servicing** | None | Full | Full | Intake/Deliver | Intake | Full | Read |
| **Manual MFS Desk** | None | Full | Full | Transact | None | None | Read |
| **Personal Ledger (Amanat)** | None | Full | None | None | None | None | None |
| **Day-End Shift Closing** | None | Full | Full | Blind Count | None | None | Read |
| **Financial Reports & P&L** | None | Full | Full (No P&L) | None | None | None | Full |

---

## 5. Master API Endpoint Directory

\`\`\`
├── 5.1 Authentication & Identity Lifecycle (/api/v1/auth)
├── 5.2 Shop & Workspace Management (/api/v1/shops)
├── 5.3 User & Staff Management (/api/v1/users)
├── 5.4 Product Catalog & Taxonomy (/api/v1/catalog)
├── 5.5 Dual-IMEI Serialized Inventory (/api/v1/inventory/imei)
├── 5.6 Non-Serialized Stock & Movements (/api/v1/inventory)
├── 5.7 Godown ↔ Outlet Stock Transfers (/api/v1/inventory/transfers)
├── 5.8 Damaged Stock Scrap Hub (/api/v1/inventory/damage)
├── 5.9 Brand Warranty (RMA) Tracking (/api/v1/inventory/warranty)
├── 5.10 Suppliers & Procurement GRN (/api/v1/procurement)
├── 5.11 POS Counter Sales & Split Payments (/api/v1/pos)
├── 5.12 Sales Returns & Exchanges (/api/v1/sales/returns)
├── 5.13 Customers & Bakir Khata Ledger (/api/v1/customers)
├── 5.14 Installment (Kisti / EMI) Engine (/api/v1/kisti)
├── 5.15 Used Phone Buyback & Police Compliance (/api/v1/buyback)
├── 5.16 Technician Servicing Lab (/api/v1/service)
├── 5.17 100% Manual MFS Agent Desk (/api/v1/mfs)
├── 5.18 Segregated Personal Ledger (/api/v1/personal-ledger)
├── 5.19 Accounts, Drawers & OPEX Expenses (/api/v1/accounts)
├── 5.20 Day-End Cash Closing & Z-Report (/api/v1/closing)
├── 5.21 HR, Sales Targets & Payroll (/api/v1/hr)
├── 5.22 SMS Notifications & Gateways (/api/v1/sms)
├── 5.23 Hardware Station Configurations (/api/v1/hardware)
├── 5.24 SaaS Subscription Billing & Coupons (/api/v1/billing)
├── 5.25 Reports & Financial Analytics (/api/v1/reports)
├── 5.26 Platform Super Admin Operations (/api/v1/admin)
├── 5.27 Payment Gateway Webhooks (/api/v1/webhooks)
├── 5.28 Media & Document Upload Service (/api/v1/media)
├── 5.29 Hardware Thermal Print Protocol & ESC/POS Byte Contract
└── 5.30 Payment Gateway Webhook HMAC-SHA256 Verification Guide
\`\`\`

---

### 5.1 Authentication & Identity Lifecycle (\`/api/v1/auth\`)

#### \`POST /api/v1/auth/otp/request\`
- **Purpose:** Request a 6-digit SMS OTP challenge for login, signup, or password recovery.
- **Access:** Public (Protected by Cloudflare Turnstile).
- **Rate Limit:** 3 requests / 15 minutes per phone.
- **Request Body:**
\`\`\`json
{
  "phone": "01712345678",
  "purpose": "login",
  "turnstileToken": "0.XXXXX.YYYYY"
}
\`\`\`
- **Response (200 OK):**
\`\`\`json
{
  "success": true,
  "data": {
    "phone": "01712345678",
    "expiresInSeconds": 120,
    "purpose": "login"
  }
}
\`\`\`

#### \`POST /api/v1/auth/otp/verify\`
- **Purpose:** Validate 6-digit SMS OTP and issue scoped session JWTs.
- **Access:** Public.
- **Request Body:**
\`\`\`json
{
  "phone": "01712345678",
  "otp": "841290",
  "purpose": "login"
}
\`\`\`
- **Response (200 OK):**
\`\`\`json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "user": {
      "id": "6709a12b3c4d5e6f7a8b9c01",
      "name": "Sumon Dash",
      "phone": "01712345678",
      "role": "STORE_OWNER",
      "shopId": "6709a12b3c4d5e6f7a8b9c00"
    },
    "shops": [
      { "id": "6709a12b3c4d5e6f7a8b9c00", "name": "Eastern Plaza Outlet", "role": "STORE_OWNER" },
      { "id": "6709a12b3c4d5e6f7a8b9c99", "name": "Jamuna Future Park", "role": "STORE_OWNER" }
    ]
  }
}
\`\`\`

#### \`POST /api/v1/auth/login\`
- **Purpose:** Authenticate using permanent phone and Argon2id password.
- **Access:** Public.
- **Request Body:**
\`\`\`json
{
  "phone": "01712345678",
  "password": "SecurePassword123#"
}
\`\`\`

#### \`POST /api/v1/auth/refresh\`
- **Purpose:** Exchange HTTP-only refresh token for a fresh 15-minute access token.
- **Access:** Public (Requires Refresh Cookie).

#### \`POST /api/v1/auth/logout\`
- **Purpose:** Revoke active refresh token in Redis and clear client cookie.
- **Access:** Authenticated.

#### \`POST /api/v1/auth/recovery/reset\`
- **Purpose:** Reset forgotten password using verified OTP challenge.
- **Access:** Public.
- **Request Body:**
\`\`\`json
{
  "phone": "01712345678",
  "otp": "841290",
  "newPassword": "NewStrongPassword2026!"
}
\`\`\`

#### \`POST /api/v1/auth/phone-change/initiate\`
- **Purpose:** Initiate 180s Dual-OTP handshake to migrate registered mobile number.
- **Access:** Authenticated (\`STORE_OWNER\` solely).
- **Request Body:**
\`\`\`json
{
  "newPhone": "01899887766"
}
\`\`\`

#### \`POST /api/v1/auth/phone-change/complete\`
- **Purpose:** Complete dual-OTP validation and atomically migrate owner phone.
- **Access:** Authenticated (\`STORE_OWNER\` solely).
- **Request Body:**
\`\`\`json
{
  "oldPhoneOtp": "123456",
  "newPhoneOtp": "654321"
}
\`\`\`

---

### 5.2 Shop & Workspace Management (\`/api/v1/shops\`)

#### \`GET /api/v1/shops/my-shops\`
- **Purpose:** Retrieve all dokans/workspaces authorized for the current user.
- **Access:** Authenticated.

#### \`POST /api/v1/shops/switch-workspace\`
- **Purpose:** Switch active shop context and issue new scoped tenant JWT.
- **Access:** Authenticated.
- **Request Body:**
\`\`\`json
{
  "targetShopId": "6709a12b3c4d5e6f7a8b9c99"
}
\`\`\`

#### \`GET /api/v1/shops/profile\`
- **Purpose:** Retrieve shop metadata, logo, NBR BIN, and thermal receipt headers.
- **Access:** Authenticated (Any shop staff).

#### \`PATCH /api/v1/shops/profile\`
- **Purpose:** Update shop profile branding, thermal footer, and return policy days.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).
- **Request Body:**
\`\`\`json
{
  "name": "Bebsayik Mobile - Eastern Plaza",
  "logoUrl": "https://storage.bebsayik.com/logos/shop_01.png",
  "receiptHeader": "Bebsayik Telecom | Eastern Plaza (4th Floor), Dhaka",
  "receiptFooter": "Thank you for shopping with us! No cash refunds on physical damage.",
  "binNumber": "002918274-0101",
  "returnPolicyDays": 7
}
\`\`\`

---

### 5.3 User & Staff Management (\`/api/v1/users\`)

#### \`GET /api/v1/users\`
- **Purpose:** List all staff members for the current shop with roles and statuses.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).

#### \`POST /api/v1/users/provision\`
- **Purpose:** Create a new staff account with a designated role and temporary one-time PIN.
- **Access:** Authenticated (\`STORE_OWNER\`).
- **Request Body:**
\`\`\`json
{
  "name": "Tanvir Ahmed",
  "phone": "01711223344",
  "role": "CASHIER",
  "salaryBase": "15000.00",
  "commissionRate": "50.00",
  "temporaryPin": "4819"
}
\`\`\`

#### \`POST /api/v1/users/:id/emergency-terminate\`
- **Purpose:** Instant one-click termination killing all active sessions in <1 second.
- **Access:** Authenticated (\`STORE_OWNER\` solely).
- **Request Body:**
\`\`\`json
{
  "ownerPassword": "OwnerMasterPassword123#",
  "reason": "Suspected drawer discrepancy and breach of trust"
}
\`\`\`

#### \`POST /api/v1/users/manager-pin/verify\`
- **Purpose:** Verify 4-digit Manager Override PIN for sensitive discounts or credit waivers.
- **Access:** Authenticated (\`STORE_MANAGER\`, \`STORE_OWNER\`).
- **Request Body:**
\`\`\`json
{
  "pin": "9812",
  "action": "MSP_FLOOR_OVERRIDE",
  "context": { "variantId": "6709a12b3c4d5e6f7a8b9c02", "requestedPrice": "23500.00" }
}
\`\`\`
- **Response (200 OK):**
\`\`\`json
{
  "success": true,
  "data": {
    "overrideToken": "ovr_token_9812034812",
    "authorizedBy": "Manager Rafiqul",
    "expiresInSeconds": 60
  }
}
\`\`\`

---

### 5.4 Product Catalog & Taxonomy (\`/api/v1/catalog\`)

#### \`GET /api/v1/catalog/products\`
- **Purpose:** Search and filter master products, categories, and variant SKUs.
- **Access:** Authenticated.
- **Query Parameters:** \`search\`, \`categoryId\`, \`brandId\`, \`hasImei\`, \`page\`, \`limit\`.

#### \`POST /api/v1/catalog/products\`
- **Purpose:** Create new master product with variants and barcode generation.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).
- **Request Body:**
\`\`\`json
{
  "name": "Redmi Note 13 Pro 5G",
  "categoryId": "6709a12b3c4d5e6f7a8b9c10",
  "brandId": "6709a12b3c4d5e6f7a8b9c11",
  "hasImei": true,
  "warrantyMonths": 12,
  "variants": [
    {
      "variantName": "8GB / 128GB - Phantom Black",
      "barcode": "8901234567890",
      "minSellingPrice": "24500.00",
      "mrpPrice": "27500.00",
      "attributes": { "color": "Phantom Black", "ram": "8GB", "storage": "128GB" }
    }
  ]
}
\`\`\`

#### \`GET /api/v1/catalog/products/:id\`
- **Purpose:** Fetch detailed product specification with all variant SKUs and current stock count.
- **Access:** Authenticated.

#### \`PATCH /api/v1/catalog/products/:id\`
- **Purpose:** Update master product attributes, names, or variant pricing / MSP floor.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).
- **Request Body:**
\`\`\`json
{
  "name": "Redmi Note 13 Pro 5G (Global)",
  "warrantyMonths": 12,
  "variants": [
    {
      "variantId": "6709a12b3c4d5e6f7a8b9c02",
      "minSellingPrice": "24000.00",
      "mrpPrice": "27000.00"
    }
  ]
}
\`\`\`

#### \`DELETE /api/v1/catalog/products/:id\`
- **Purpose:** Soft-delete/archive product (blocked if stock or sales history exists).
- **Access:** Authenticated (\`STORE_OWNER\`).

#### \`GET /api/v1/catalog/categories\` & \`POST /api/v1/catalog/categories\`
- **Purpose:** List or create product classification categories (e.g. Smart Phone, Feature Phone, Charger, Screen Protector).
- **Access:** Authenticated.
- **Request Body (POST):**
\`\`\`json
{
  "name": "Accessories",
  "description": "Chargers, cables, power banks and protective glasses"
}
\`\`\`

#### \`GET /api/v1/catalog/brands\` & \`POST /api/v1/catalog/brands\`
- **Purpose:** List or create brands (Xiaomi, Samsung, Realme, Vivo, Apple, Anker).
- **Access:** Authenticated.
- **Request Body (POST):**
\`\`\`json
{
  "name": "Xiaomi",
  "originCountry": "China"
}
\`\`\`

#### \`POST /api/v1/catalog/import-excel\`
- **Purpose:** Bulk import products, accessories, and variants from Excel/CSV file upload.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).
- **Content-Type:** \`multipart/form-data\`
- **Payload:** File field \`file\` (XLSX/CSV) + optional mapping options.
- **Response (200 OK):**
\`\`\`json
{
  "success": true,
  "data": {
    "totalRowsProcessed": 120,
    "productsCreated": 85,
    "variantsCreated": 115,
    "errors": []
  }
}
\`\`\`

---

### 5.5 Dual-IMEI Serialized Inventory (\`/api/v1/inventory/imei\`)

#### \`GET /api/v1/inventory/imei/scan/:code\`
- **Purpose:** Sub-second barcode/IMEI scanner lookup during POS checkout.
- **Access:** Authenticated (\`CASHIER\`, \`SALESPERSON\`, \`STORE_MANAGER\`, \`STORE_OWNER\`).
- **Response (200 OK):**
\`\`\`json
{
  "success": true,
  "data": {
    "imeiId": "6709a12b3c4d5e6f7a8b9c20",
    "imei1": "860123456789012",
    "imei2": "860123456789013",
    "status": "available",
    "productName": "Redmi Note 13 Pro 5G",
    "variantName": "8GB / 128GB - Phantom Black",
    "mrpPrice": "27500.00",
    "minSellingPrice": "24500.00",
    "specificPurchaseCost": "24200.00"
  }
}
\`\`\`

#### \`GET /api/v1/inventory/imei\`
- **Purpose:** List serialized handsets with aging stock filters (>60/90 days).
- **Access:** Authenticated.
- **Query Parameters:** \`status\` (\`available\`, \`sold\`, \`scrapped\`, \`transferred\`), \`agingDays\` (\`60\`, \`90\`), \`brandId\`.

#### \`GET /api/v1/inventory/imei/:imei1\`
- **Purpose:** Fetch end-to-end historical audit timeline of a specific IMEI (PO -> GRN -> STN -> POS Sale -> CRV).
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`, \`ACCOUNTANT\`).

---

### 5.6 Non-Serialized Stock & Movements (\`/api/v1/inventory\`)

#### \`GET /api/v1/inventory/movements\`
- **Purpose:** Audit append-only stock movement ledger (\`inventory_movements\`).
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`, \`ACCOUNTANT\`).

#### \`GET /api/v1/inventory/stock-levels\`
- **Purpose:** Fetch current stock counts, cost valuations, and items below reorder threshold.
- **Access:** Authenticated.

#### \`POST /api/v1/inventory/adjustments\`
- **Purpose:** Record manual stock audit discrepancy correction with manager authorization.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).
- **Request Body:**
\`\`\`json
{
  "variantId": "6709a12b3c4d5e6f7a8b9c05",
  "physicalCount": 24,
  "systemCount": 27,
  "reason": "Shrinkage or physical loss detected during monthly stock count",
  "managerPin": "9812"
}
\`\`\`

---

### 5.7 Godown ↔ Outlet Stock Transfers (\`/api/v1/inventory/transfers\`)

#### \`POST /api/v1/inventory/transfers/dispatch\`
- **Purpose:** Create Stock Transfer Note (STN - TX-19) and scan handsets out of godown.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).
- **Request Body:**
\`\`\`json
{
  "destinationShopId": "6709a12b3c4d5e6f7a8b9c99",
  "imeiList": ["860123456789012", "860123456789013"],
  "notes": "Dispatch to Jamuna Future Park branch"
}
\`\`\`

#### \`POST /api/v1/inventory/transfers/:id/receive\`
- **Purpose:** Scan and verify received handsets at destination outlet.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).
- **Request Body:**
\`\`\`json
{
  "receivedImeis": ["860123456789012", "860123456789013"]
}
\`\`\`

#### \`GET /api/v1/inventory/transfers\`
- **Purpose:** List STN transfers filtered by status (\`in_transit\`, \`completed\`, \`discrepancy\`).
- **Access:** Authenticated.

---

### 5.8 Damaged Stock Scrap Hub (\`/api/v1/inventory/damage\`)

#### \`POST /api/v1/inventory/damage/scrap\`
- **Purpose:** Log shattered/damaged stock, upload webcam photo, and write off cost (SWV - TX-17).
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).
- **Request Body:**
\`\`\`json
{
  "imei1": "860123456789099",
  "damageCategory": "CUSTOMER_DROP_DISPLAY_SHATTERED",
  "description": "Customer dropped handset during counter inspection",
  "photoUrl": "https://storage.bebsayik.com/evidence/shatter_11oct.jpg",
  "managerPin": "9812"
}
\`\`\`

#### \`GET /api/v1/inventory/damage\`
- **Purpose:** List all written-off scrap items with total P&L write-off loss valuation.
- **Access:** Authenticated (\`STORE_OWNER\`, \`ACCOUNTANT\`).

---

### 5.9 Brand Warranty (RMA) Tracking (\`/api/v1/inventory/warranty\`)

#### \`POST /api/v1/inventory/warranty/intake\`
- **Purpose:** Ingest customer faulty device for official brand warranty care.
- **Access:** Authenticated.
- **Request Body:**
\`\`\`json
{
  "customerName": "Tanvir Ahmed",
  "customerPhone": "01712345678",
  "imei1": "860123456789044",
  "brandName": "Xiaomi",
  "productName": "Redmi Note 13 Pro",
  "issueDescription": "Display vibrating, mic not working",
  "brandTrackingNo": "SA-PARCEL-981242"
}
\`\`\`

#### \`GET /api/v1/inventory/warranty\`
- **Purpose:** List active RMA claims with SLA aging and brand tracking numbers.
- **Access:** Authenticated.

#### \`PATCH /api/v1/inventory/warranty/:id/status\`
- **Purpose:** Update RMA claim status (\`sent_to_brand\`, \`received_from_brand\`, \`delivered_to_customer\`).
- **Access:** Authenticated.
- **Request Body:**
\`\`\`json
{
  "status": "received_from_brand",
  "resolutionNotes": "Motherboard replaced under manufacturer warranty",
  "notifyCustomerSms": true
}
\`\`\`

---

### 5.10 Suppliers & Procurement GRN (\`/api/v1/procurement\`)

#### \`GET /api/v1/procurement/suppliers\`
- **Purpose:** List suppliers with current outstanding balances and credit terms.
- **Access:** Authenticated.

#### \`POST /api/v1/procurement/suppliers\`
- **Purpose:** Create new supplier record with contact details and address.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).
- **Request Body:**
\`\`\`json
{
  "name": "Smart Technologies BD Ltd",
  "contactPerson": "Kamal Hossain",
  "phone": "01799887766",
  "address": "BCS Computer City, IDB Bhaban, Dhaka",
  "openingPayable": "0.00"
}
\`\`\`

#### \`GET /api/v1/procurement/suppliers/:id/statement\`
- **Purpose:** Retrieve supplier 360° ledger: invoices, payments, dues, and returns.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`, \`ACCOUNTANT\`).

#### \`POST /api/v1/procurement/suppliers/:id/payment\`
- **Purpose:** Record payout against outstanding supplier dues.
- **Access:** Authenticated (\`STORE_OWNER\`, \`ACCOUNTANT\`).
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Request Body:**
\`\`\`json
{
  "accountId": "6709a12b3c4d5e6f7a8b9c60",
  "amount": "150000.00",
  "paymentMethod": "bank_transfer",
  "referenceNo": "EFTN-8912401",
  "notes": "Partial settlement of October handset procurement"
}
\`\`\`

#### \`POST /api/v1/procurement/grn\`
- **Purpose:** Ingest partial or full GRN shipment, scan IMEIs, and freeze specific purchase cost (TX-07).
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Request Body:**
\`\`\`json
{
  "supplierId": "6709a12b3c4d5e6f7a8b9c40",
  "purchaseNo": "PO-202610-0089",
  "items": [
    {
      "variantId": "6709a12b3c4d5e6f7a8b9c02",
      "unitCost": "24200.00",
      "imeiPairs": [
        { "imei1": "860123456789011", "imei2": "860123456789012" }
      ]
    }
  ],
  "paidAmount": "0.00"
}
\`\`\`

#### \`POST /api/v1/procurement/returns\`
- **Purpose:** Return defective handsets or accessories to supplier (PRV - TX-08).
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Request Body:**
\`\`\`json
{
  "supplierId": "6709a12b3c4d5e6f7a8b9c40",
  "items": [
    {
      "variantId": "6709a12b3c4d5e6f7a8b9c02",
      "imei1": "860123456789011",
      "returnCost": "24200.00",
      "reason": "Dead on arrival - camera sensor malfunction"
    }
  ],
  "creditAdjustmentAccountId": "6709a12b3c4d5e6f7a8b9c60",
  "notes": "Returned under vendor warranty DOA agreement"
}
\`\`\`

---

### 5.11 POS Counter Sales & Split Payments (\`/api/v1/pos\`)

#### \`POST /api/v1/pos/checkout\`
- **Purpose:** Execute atomic counter checkout with split payments and change calculation (TX-01 to TX-04).
- **Access:** Authenticated (\`CASHIER\`, \`STORE_MANAGER\`, \`STORE_OWNER\`).
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Request Body:**
\`\`\`json
{
  "customerId": "6709a12b3c4d5e6f7a8b9c50",
  "items": [
    {
      "variantId": "6709a12b3c4d5e6f7a8b9c02",
      "imei1": "860123456789012",
      "quantity": 1,
      "unitPrice": "27500.00",
      "discountAmount": "500.00"
    }
  ],
  "payments": [
    { "accountId": "6709a12b3c4d5e6f7a8b9c60", "paymentMethod": "cash", "amountReceived": "20000.00", "amountApplied": "20000.00" },
    { "accountId": "6709a12b3c4d5e6f7a8b9c61", "paymentMethod": "bkash_merchant", "amountReceived": "7000.00", "amountApplied": "7000.00", "trxReference": "BJK89124LA" }
  ],
  "mushak63No": "MUSHAK-63-2026-00142"
}
\`\`\`
- **Response (201 Created):**
\`\`\`json
{
  "success": true,
  "data": {
    "saleId": "6709a12b3c4d5e6f7a8b9c80",
    "invoiceNo": "INV-202610-00142",
    "grandTotal": "27000.00",
    "paidAmount": "27000.00",
    "dueAmount": "0.00",
    "changeGiven": "0.00",
    "printData": {
      "rawEscPosBase64": "G0Ac..."
    }
  }
}
\`\`\`

#### \`POST /api/v1/pos/held-carts\`
- **Purpose:** Stash active POS shopping cart (\`F5\` key accelerator) to serve another waiting customer.
- **Access:** Authenticated (\`CASHIER\`, \`SALESPERSON\`, \`STORE_MANAGER\`, \`STORE_OWNER\`).
- **Request Body:**
\`\`\`json
{
  "customerName": "Walk-in Brother",
  "customerPhone": "01788776655",
  "items": [
    { "variantId": "6709a12b3c4d5e6f7a8b9c02", "imei1": "860123456789012", "quantity": 1, "unitPrice": "27500.00" }
  ],
  "note": "Customer stepped out to withdraw cash from ATM"
}
\`\`\`

#### \`GET /api/v1/pos/held-carts\`
- **Purpose:** Recall list of stashed shopping carts (\`F6\` key accelerator).
- **Access:** Authenticated.

#### \`DELETE /api/v1/pos/held-carts/:id\`
- **Purpose:** Discard stashed cart and release reserved inventory items back to active stock.
- **Access:** Authenticated.

#### \`GET /api/v1/pos/invoices/:invoiceNo\`
- **Purpose:** Lookup completed invoice for reprint or customer copy verification.
- **Access:** Authenticated.

#### \`POST /api/v1/pos/offline-sync\`
- **Purpose:** Replay batch of cached offline non-serialized accessory sales.
- **Access:** Authenticated (\`CASHIER\`, \`STORE_MANAGER\`, \`STORE_OWNER\`).
- **Request Body:**
\`\`\`json
{
  "syncedBatchId": "batch_offline_89124",
  "transactions": [
    {
      "offlineSaleId": "off_01",
      "timestamp": "2026-10-11T16:45:00.000Z",
      "items": [{ "variantId": "6709a12b3c4d5e6f7a8b9c08", "quantity": 2, "unitPrice": "250.00" }],
      "paidAmount": "500.00",
      "paymentMethod": "cash"
    }
  ]
}
\`\`\`

---

### 5.12 Sales Returns & Exchanges (\`/api/v1/sales/returns\`)

#### \`POST /api/v1/sales/returns\`
- **Purpose:** Process 7-day return validation, restock condition inspection, and refund (CRV - TX-05).
- **Access:** Authenticated (\`CASHIER\`, \`STORE_MANAGER\`, \`STORE_OWNER\`).
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Request Body:**
\`\`\`json
{
  "invoiceNo": "INV-202610-00142",
  "items": [
    {
      "variantId": "6709a12b3c4d5e6f7a8b9c02",
      "imei1": "860123456789012",
      "condition": "restockable",
      "refundPrice": "27000.00"
    }
  ],
  "refundMethod": "cash",
  "refundAccountId": "6709a12b3c4d5e6f7a8b9c60",
  "reason": "Customer preferred blue color variant",
  "managerPin": "9812"
}
\`\`\`

#### \`GET /api/v1/sales/returns\`
- **Purpose:** List historical sales returns, reasons, and condition logs.
- **Access:** Authenticated.

---

### 5.13 Customers & Bakir Khata Ledger (\`/api/v1/customers\`)

#### \`GET /api/v1/customers\`
- **Purpose:** List customers with search, dues filter (\`?hasDue=true\`), and credit limits.
- **Access:** Authenticated.

#### \`POST /api/v1/customers\`
- **Purpose:** Quick-add customer record during checkout (\`F3\` modal).
- **Access:** Authenticated.
- **Request Body:**
\`\`\`json
{
  "name": "Mahmudul Hasan",
  "phone": "01812345678",
  "address": "Shantinagar, Dhaka",
  "creditLimit": "20000.00"
}
\`\`\`

#### \`GET /api/v1/customers/:id/statement\`
- **Purpose:** Retrieve customer 360° statement, invoices, due payments, and Kisti contracts.
- **Access:** Authenticated.

#### \`POST /api/v1/customers/:id/collect-due\`
- **Purpose:** Receive cash/MFS payment against customer's outstanding Bakir Khata balance (TX-06).
- **Access:** Authenticated.
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Request Body:**
\`\`\`json
{
  "accountId": "6709a12b3c4d5e6f7a8b9c60",
  "amount": "5000.00",
  "paymentMethod": "cash",
  "notes": "Partial due payment received"
}
\`\`\`

#### \`POST /api/v1/customers/:id/send-sms-reminder\`
- **Purpose:** Dispatch automated due payment SMS reminder to customer mobile.
- **Access:** Authenticated.

#### \`PATCH /api/v1/customers/:id\`
- **Purpose:** Update customer profile, address, or credit limit.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).

---

### 5.14 Installment (Kisti / EMI) Engine (\`/api/v1/kisti\`)

#### \`POST /api/v1/kisti/contracts\`
- **Purpose:** Book installment contract with hybrid down payment and dual guarantors (TX-11).
- **Access:** Authenticated (\`CASHIER\`, \`STORE_MANAGER\`, \`STORE_OWNER\`).
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Request Body:**
\`\`\`json
{
  "customerId": "6709a12b3c4d5e6f7a8b9c50",
  "variantId": "6709a12b3c4d5e6f7a8b9c02",
  "imei1": "860123456789012",
  "cashPrice": "30000.00",
  "downPayment": "10000.00",
  "downPaymentAccountId": "6709a12b3c4d5e6f7a8b9c60",
  "tenureMonths": 6,
  "interestRate": "10.00",
  "guarantors": [
    { "name": "Mohammad Ali", "phone": "01711998877", "nid": "1990269251829", "relation": "Brother" },
    { "name": "Jashim Uddin", "phone": "01811998877", "nid": "1988269251811", "relation": "Uncle" }
  ]
}
\`\`\`

#### \`GET /api/v1/kisti/contracts\`
- **Purpose:** List Kisti contracts with status filters (\`active\`, \`overdue\`, \`settled\`).
- **Access:** Authenticated.

#### \`GET /api/v1/kisti/contracts/:id\`
- **Purpose:** Retrieve contract breakdown with monthly amortization schedule and guarantor details.
- **Access:** Authenticated.

#### \`POST /api/v1/kisti/contracts/:id/collect-milestone\`
- **Purpose:** Collect installment milestone and update amortization ledger.
- **Access:** Authenticated.
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Request Body:**
\`\`\`json
{
  "milestoneNo": 2,
  "amount": "3666.67",
  "accountId": "6709a12b3c4d5e6f7a8b9c60",
  "notes": "Installment 2 collected"
}
\`\`\`

#### \`GET /api/v1/kisti/defaulters\`
- **Purpose:** List all defaulters (>30-day overdue) for follow-up and SMS reminders.
- **Access:** Authenticated.

---

### 5.15 Used Phone Buyback & Police Compliance (\`/api/v1/buyback\`)

#### \`POST /api/v1/buyback/agreements\`
- **Purpose:** Ingest used handset, webcam seller photo & NID, and issue payment/voucher (TX-10).
- **Access:** Authenticated (\`CASHIER\`, \`STORE_MANAGER\`, \`STORE_OWNER\`).
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Request Body:**
\`\`\`json
{
  "sellerName": "Faruk Hossain",
  "sellerPhone": "01912345678",
  "sellerNid": "1994269251000",
  "deviceBrand": "Apple",
  "deviceModel": "iPhone 13",
  "imei1": "358912345678901",
  "imei2": "358912345678902",
  "purchasePrice": "42000.00",
  "payoutAccountId": "6709a12b3c4d5e6f7a8b9c60",
  "sellerPhotoUrl": "https://storage.bebsayik.com/kyc/seller_faruk.jpg",
  "nidFrontUrl": "https://storage.bebsayik.com/kyc/nid_front.jpg",
  "nidBackUrl": "https://storage.bebsayik.com/kyc/nid_back.jpg",
  "deviceConditionGrade": "A"
}
\`\`\`

#### \`GET /api/v1/buyback/agreements\`
- **Purpose:** List buyback agreements with search and police report filters.
- **Access:** Authenticated.

#### \`GET /api/v1/buyback/agreements/:id/police-form-pdf\`
- **Purpose:** Stream printable Bangladesh Police Legal Undertaking PDF document.
- **Access:** Authenticated.

---

### 5.16 Technician Servicing Lab (\`/api/v1/service\`)

#### \`POST /api/v1/service/jobs\`
- **Purpose:** Create repair job sheet with 3x3 pattern lock coordinates.
- **Access:** Authenticated.
- **Request Body:**
\`\`\`json
{
  "customerName": "Shahidul Islam",
  "customerPhone": "01722334455",
  "deviceBrand": "Samsung",
  "deviceModel": "Galaxy A54",
  "imei1": "869123456789011",
  "patternLockCoordinates": [0, 1, 2, 4, 7],
  "issueReported": "Display flickering and charging port loose",
  "estimatedCost": "3500.00",
  "advancePaid": "500.00",
  "advanceAccountId": "6709a12b3c4d5e6f7a8b9c60"
}
\`\`\`

#### \`GET /api/v1/service/jobs\`
- **Purpose:** List service tickets with status filters (\`received\`, \`diagnosing\`, \`waiting_parts\`, \`repaired\`, \`delivered\`).
- **Access:** Authenticated.

#### \`GET /api/v1/service/jobs/:id\`
- **Purpose:** Retrieve service job details, pattern lock grid, consumed spare parts, and labor fee breakdown.
- **Access:** Authenticated.

#### \`PATCH /api/v1/service/jobs/:id/status\`
- **Purpose:** Update job status and notify customer via SMS.
- **Access:** Authenticated.
- **Request Body:**
\`\`\`json
{
  "status": "repaired",
  "notifyCustomerSms": true
}
\`\`\`

#### \`POST /api/v1/service/jobs/:id/complete\`
- **Purpose:** Finalize repair, deduct spare parts, and credit technician 50% split (TX-09).
- **Access:** Authenticated (\`TECHNICIAN\`, \`STORE_MANAGER\`, \`STORE_OWNER\`).
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Request Body:**
\`\`\`json
{
  "technicianUserId": "6709a12b3c4d5e6f7a8b9c15",
  "partsConsumed": [
    { "variantId": "6709a12b3c4d5e6f7a8b9c30", "quantity": 1, "unitCost": "1800.00" }
  ],
  "totalBill": "3500.00",
  "laborFee": "1700.00",
  "collectedAmount": "3000.00",
  "collectionAccountId": "6709a12b3c4d5e6f7a8b9c60"
}
\`\`\`

#### \`POST /api/v1/service/jobs/:id/return-part\`
- **Purpose:** Return defective spare part back to godown inventory with zero technician loss.
- **Access:** Authenticated.
- **Request Body:**
\`\`\`json
{
  "variantId": "6709a12b3c4d5e6f7a8b9c30",
  "quantity": 1,
  "reason": "Display panel ribbon defective from supplier"
}
\`\`\`

---

### 5.17 100% Manual MFS Agent Desk (\`/api/v1/mfs\`)

#### \`POST /api/v1/mfs/transactions\`
- **Purpose:** Record manual MFS Cash-In or Cash-Out transaction from physical SIM (TX-12, TX-13).
- **Access:** Authenticated.
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Request Body:**
\`\`\`json
{
  "provider": "bkash",
  "txType": "cash_in",
  "amount": "5000.00",
  "customerPhone": "01712345678",
  "trxReference": "BJK89124LA"
}
\`\`\`

#### \`GET /api/v1/mfs/transactions\`
- **Purpose:** List MFS transactions with provider filter and commission accruals.
- **Access:** Authenticated.

#### \`POST /api/v1/mfs/audit-closing\`
- **Purpose:** Perform evening USSD float audit comparing physical SIM dial balance.
- **Access:** Authenticated.
- **Request Body:**
\`\`\`json
{
  "provider": "bkash",
  "simDialedBalance": "42850.00",
  "systemRecordedBalance": "42850.00"
}
\`\`\`

---

### 5.18 Segregated Personal Ledger (\`/api/v1/personal-ledger\`)

#### \`POST /api/v1/personal-ledger/transactions\`
- **Purpose:** Record non-P&L Amanat, Hawlat, or Expense on Behalf (TX-14, TX-15, TX-16).
- **Access:** Authenticated (**STORE_OWNER SOLELY**).
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Accounting Validation:** Strict 0.00% Store P&L invariant enforced.
- **Request Body:**
\`\`\`json
{
  "contactId": "6709a12b3c4d5e6f7a8b9c77",
  "txType": "hawlat_give",
  "amount": "20000.00",
  "accountId": "6709a12b3c4d5e6f7a8b9c60",
  "notes": "Emergency loan to cousin Brother Arif"
}
\`\`\`

#### \`GET /api/v1/personal-ledger/contacts\` & \`POST /api/v1/personal-ledger/contacts\`
- **Purpose:** Manage personal contacts (friends, family, personal loans) segregated from store customers.
- **Access:** Authenticated (**STORE_OWNER SOLELY**).
- **Request Body (POST):**
\`\`\`json
{
  "name": "Arif Ahmed",
  "phone": "01715566778",
  "relationship": "Cousin",
  "notes": "Personal family contact"
}
\`\`\`

#### \`GET /api/v1/personal-ledger/statement/:contactId\`
- **Purpose:** Retrieve isolated personal ledger statement for a specific contact.
- **Access:** Authenticated (**STORE_OWNER SOLELY**).

---

### 5.19 Accounts, Drawers & OPEX Expenses (\`/api/v1/accounts\`)

#### \`GET /api/v1/accounts\`
- **Purpose:** List cash drawers, bank accounts, and digital floats with current balances.
- **Access:** Authenticated.

#### \`POST /api/v1/accounts/transfers\`
- **Purpose:** Record inter-account fund transfers (e.g., Drawer Cash to Bank Deposit).
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`, \`ACCOUNTANT\`).
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Request Body:**
\`\`\`json
{
  "fromAccountId": "6709a12b3c4d5e6f7a8b9c60",
  "toAccountId": "6709a12b3c4d5e6f7a8b9c65",
  "amount": "100000.00",
  "referenceNo": "DEP-BRAC-0091",
  "notes": "Mid-day cash deposit to BRAC Bank current account"
}
\`\`\`

#### \`POST /api/v1/accounts/cash-in-out\`
- **Purpose:** Issue store OPEX petty expense slip (tea, electricity, rent) or owner cash injection.
- **Access:** Authenticated.
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Request Body:**
\`\`\`json
{
  "accountId": "6709a12b3c4d5e6f7a8b9c60",
  "type": "cash_out",
  "category": "SHOP_TEA_ENTERTAINMENT",
  "amount": "180.00",
  "notes": "Customer hospitality tea & snacks"
}
\`\`\`

#### \`GET /api/v1/accounts/transactions\`
- **Purpose:** Complete double-entry journal ledger inquiry with account and date filters.
- **Access:** Authenticated (\`STORE_OWNER\`, \`ACCOUNTANT\`).

---

### 5.20 Day-End Cash Closing & Z-Report (\`/api/v1/closing\`)

#### \`POST /api/v1/closing/shift-open\`
- **Purpose:** Record morning opening cash float in drawer.
- **Access:** Authenticated (\`CASHIER\`, \`STORE_MANAGER\`, \`STORE_OWNER\`).
- **Request Body:**
\`\`\`json
{
  "openingFloat": "5000.00",
  "notes": "Standard opening cash float verified"
}
\`\`\`

#### \`POST /api/v1/closing/blind-count\`
- **Purpose:** Submit physical currency note count without seeing system target (allows 1 recount grace attempt).
- **Access:** Authenticated.
- **Request Body:**
\`\`\`json
{
  "notesBreakdown": {
    "1000": 42,
    "500": 15,
    "200": 10,
    "100": 25,
    "50": 12,
    "20": 20
  }
}
\`\`\`
- **Response (200 OK):**
\`\`\`json
{
  "success": true,
  "data": {
    "countedTotal": "52500.00",
    "canRecount": true,
    "recountAttemptsRemaining": 1
  }
}
\`\`\`

#### \`POST /api/v1/closing/finalize\`
- **Purpose:** Commit final register closing, lock shift, and send Z-Report SMS digest to owner.
- **Access:** Authenticated.
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Request Body:**
\`\`\`json
{
  "countedTotal": "52500.00",
  "systemExpectedTotal": "52700.00",
  "variance": "-200.00",
  "varianceReason": "Shortage in counter coin change change giving",
  "notes": "Evening shift closed by Cashier Tanvir"
}
\`\`\`

#### \`GET /api/v1/closing/history\`
- **Purpose:** View historical Z-reports, shift durations, and variance audits.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`, \`ACCOUNTANT\`).

---

### 5.21 HR, Sales Targets & Payroll (\`/api/v1/hr\`)

#### \`GET /api/v1/hr/payroll/accruals\`
- **Purpose:** Aggregate technician 50% labor splits and salesperson commissions for month.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`, \`ACCOUNTANT\`).

#### \`POST /api/v1/hr/payroll/disburse\`
- **Purpose:** Disburse monthly salary and labor splits via Cash/Bank (TX-18).
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).
- **Headers:** \`Idempotency-Key: <UUIDv4>\`
- **Request Body:**
\`\`\`json
{
  "employeeId": "6709a12b3c4d5e6f7a8b9c15",
  "month": "2026-10",
  "baseSalary": "15000.00",
  "commissionAmount": "3500.00",
  "deductions": "0.00",
  "disbursedFromAccountId": "6709a12b3c4d5e6f7a8b9c65"
}
\`\`\`

#### \`GET /api/v1/hr/targets\` & \`POST /api/v1/hr/targets\`
- **Purpose:** Set and track staff sales targets, handset quota counts, and commission rules.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).

---

### 5.22 SMS Notifications & Gateways (\`/api/v1/sms\`)

#### \`GET /api/v1/sms/balance\`
- **Purpose:** Fetch remaining SMS credits from telecom gateway (SSL Wireless / BulkSMS BD).
- **Access:** Authenticated.

#### \`GET /api/v1/sms/templates\`
- **Purpose:** List localized notification templates with dynamic variables.
- **Access:** Authenticated.

#### \`PATCH /api/v1/sms/templates/:key\`
- **Purpose:** Update customized SMS template text body.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`).
- **Request Body:**
\`\`\`json
{
  "body": "Dear {{customerName}}, your handset ({{productName}}) repair is complete! Total bill: ৳{{totalBill}}. Pick it up at {{shopName}}."
}
\`\`\`

#### \`POST /api/v1/sms/send-custom\`
- **Purpose:** Broadcast customized SMS notification to selected customer groups.
- **Access:** Authenticated (\`STORE_OWNER\`).

---

### 5.23 Hardware Station Configurations (\`/api/v1/hardware\`)

#### \`GET /api/v1/hardware/station\`
- **Purpose:** Retrieve terminal hardware config (58mm/80mm ESC/POS, drawer kick pulse).
- **Access:** Authenticated.

#### \`PUT /api/v1/hardware/station\`
- **Purpose:** Save browser station fingerprint, paper width, and scanner wedge preferences.
- **Access:** Authenticated.
- **Request Body:**
\`\`\`json
{
  "terminalName": "Counter 1 - Front Gate",
  "paperWidthMm": 80,
  "kickDrawerOnSale": true,
  "printDirectViaWebUsb": true,
  "scannerWedgeSuffix": "ENTER"
}
\`\`\`

---

### 5.24 SaaS Subscription Billing & Coupons (\`/api/v1/billing\`)

#### \`GET /api/v1/billing/subscription\`
- **Purpose:** Fetch current plan tier, trial expiry, and license invoice history.
- **Access:** Authenticated (\`STORE_OWNER\` solely).

#### \`POST /api/v1/billing/validate-coupon\`
- **Purpose:** Validate promo discount coupon code (e.g., \`EID2026\`).
- **Access:** Authenticated (\`STORE_OWNER\` solely).
- **Request Body:**
\`\`\`json
{
  "couponCode": "EID2026",
  "planId": "PLAN_PRO_ANNUAL"
}
\`\`\`

#### \`POST /api/v1/billing/checkout\`
- **Purpose:** Generate subscription invoice and redirect to PayStation/EPS/bKash checkout URL.
- **Access:** Authenticated (\`STORE_OWNER\` solely).
- **Request Body:**
\`\`\`json
{
  "planId": "PLAN_PRO_ANNUAL",
  "couponCode": "EID2026",
  "gateway": "paystation"
}
\`\`\`

---

### 5.25 Reports & Financial Analytics (\`/api/v1/reports\`)

#### \`GET /api/v1/reports/sales-cogs-profit\`
- **Purpose:** Aggregation AP-01: Daily sales, specific landed COGS, and gross profit.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`, \`ACCOUNTANT\`).

#### \`GET /api/v1/reports/inventory-aging\`
- **Purpose:** Aggregation AP-02: Dead stock handset aging report (>60/90 days).
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`, \`ACCOUNTANT\`).

#### \`GET /api/v1/reports/technician-splits\`
- **Purpose:** Aggregation AP-03: Completed repair jobs and technician 50% split audit.
- **Access:** Authenticated (\`STORE_OWNER\`, \`STORE_MANAGER\`, \`ACCOUNTANT\`).

#### \`GET /api/v1/reports/vat-mushak\`
- **Purpose:** NBR Mushak 6.3 VAT tax breakdown report for statutory audit.
- **Access:** Authenticated (\`STORE_OWNER\`, \`ACCOUNTANT\`).

---

### 5.26 Platform Super Admin Operations (\`/api/v1/admin\`)

#### \`GET /api/v1/admin/shops\`
- **Purpose:** List all registered dokans across Bangladesh with plan status and owner details.
- **Access:** Platform Super Admin (\`SUPER_ADMIN\`).

#### \`POST /api/v1/admin/shops/:id/suspend\`
- **Purpose:** Non-destructive shop suspension setting status to \`read_only\` or \`suspended\`.
- **Access:** Platform Super Admin (\`SUPER_ADMIN\`).

#### \`POST /api/v1/admin/shops/:id/emergency-phone-migration\`
- **Purpose:** Super Admin hotline override to migrate owner phone on stolen SIM with NID proof.
- **Access:** Platform Super Admin (\`SUPER_ADMIN\`).
- **Request Body:**
\`\`\`json
{
  "targetShopId": "6709a12b3c4d5e6f7a8b9c00",
  "oldPhone": "01712345678",
  "newPhone": "01999887766",
  "nidVerified": true,
  "adminRemarks": "Police GD #4812 verified by Super Admin"
}
\`\`\`

#### \`GET /api/v1/admin/analytics\`
- **Purpose:** Global platform dashboard: total active tenants, MRR, SMS gateway balance.
- **Access:** Platform Super Admin (\`SUPER_ADMIN\`).

---

### 5.27 Payment Gateway Webhooks (\`/api/v1/webhooks\`)

#### \`POST /api/v1/webhooks/paystation\`
- **Purpose:** Asynchronous payment notification from PayStation gateway.
- **Access:** Public (HMAC-SHA256 signature verified via \`X-PayStation-Signature\`).
- **Security:** Idempotent processing updating \`subscription_invoices\` and activating shop plan.

#### \`POST /api/v1/webhooks/eps\`
- **Purpose:** EPS electronic payment webhook callback with signature verification.
- **Access:** Public (HMAC-SHA256 verified).

#### \`POST /api/v1/webhooks/bkash\`
- **Purpose:** bKash Direct checkout query and execution webhook callback.
- **Access:** Public (HMAC-SHA256 verified).

---

### 5.28 Media & Document Upload Service (\`/api/v1/media\`)

#### \`POST /api/v1/media/upload\`
- **Purpose:** Upload webcam photos, NID scans, shop logos, and damage proof images.
- **Access:** Authenticated.
- **Content-Type:** \`multipart/form-data\`
- **Payload:** File field \`image\` (JPEG/PNG/WebP, max 5MB) + \`tag\` (\`seller_photo\` | \`nid_scan\` | \`damage_proof\` | \`shop_logo\`).
- **Response (201 Created):**
\`\`\`json
{
  "success": true,
  "data": {
    "url": "https://storage.bebsayik.com/evidence/shatter_11oct.jpg",
    "mimeType": "image/jpeg",
    "sizeBytes": 421890,
    "tag": "damage_proof"
  }
}
\`\`\`

---

### 5.29 Hardware Thermal Print Protocol & ESC/POS Byte Contract

The POS counter system relies on high-speed thermal printers (58mm / 80mm). To ensure transaction speed <0.3s without browser print dialog lag, \`POST /api/v1/pos/checkout\` returns both an ESC/POS binary command stream (Base64-encoded) and a structured print descriptor:

#### 1. Hardware Cash Drawer Kick Pulse (RJ11):
- Byte Sequence: \`0x1B 0x70 0x00 0x19 0xFA\` (\`ESC p 0 25 250\`)
- Sends a 50ms solenoid pulse to pin 2 of the RJ11 connector before printing the invoice header.

#### 2. Thermal Paper Character Column Widths:
- **58mm Paper Width:** 32 standard monospace characters per line (Font A).
- **80mm Paper Width:** 48 standard monospace characters per line (Font A).

#### 3. Structured Print Payload Schema:
\`\`\`json
{
  "format": "ESC_POS_V1",
  "paperWidth": 80,
  "kickDrawer": true,
  "rawEscPosBase64": "G0AcABtwAAA...",
  "receiptData": {
    "shopName": "Bebsayik Telecom",
    "branch": "Eastern Plaza (4th Floor)",
    "invoiceNo": "INV-202610-00142",
    "date": "11-Oct-2026 05:15 PM",
    "cashier": "Tanvir Ahmed",
    "customer": "Walk-in Brother",
    "items": [
      {
        "name": "Redmi Note 13 Pro 5G",
        "imei": "860123456789012",
        "qty": 1,
        "price": "27000.00"
      }
    ],
    "subTotal": "27000.00",
    "discount": "0.00",
    "grandTotal": "27000.00",
    "paid": "27000.00",
    "due": "0.00",
    "footer": "Sold items non-refundable after 7 days. Powered by Bebsayik.com"
  }
}
\`\`\`

---

### 5.30 Payment Gateway Webhook HMAC-SHA256 Verification Guide

Platform subscription payments via PayStation, EPS, or bKash Direct require strict cryptographic authenticity validation to prevent forged activation requests.

#### PayStation Webhook HMAC Verification Algorithm:
\`\`\`typescript
import crypto from 'crypto';

export function verifyPayStationWebhook(
  payloadString: string,
  receivedSignature: string,
  webhookSecret: string
): boolean {
  const computedHash = crypto
    .createHmac('sha256', webhookSecret)
    .update(payloadString, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(computedHash, 'utf8'),
    Buffer.from(receivedSignature, 'utf8')
  );
}
\`\`\`

#### Verification Rules:
1. **Raw Body Required:** The signature must be computed against the raw unparsed JSON string, prior to any \`JSON.parse()\` formatting.
2. **Timing-Safe Comparison:** Avoid standard string equality (\`===\`) to prevent timing attack vulnerabilities. Use \`crypto.timingSafeEqual()\`.
3. **Idempotency Check:** Every webhook event payload contains a \`trxId\`. The handler must check if the transaction is already recorded before updating the subscription state.

---

## 6. Financial Integrity, Idempotency & Double-Entry Invariants

### 6.1 Idempotency Key Architecture:
- Every mutating financial endpoint checks Redis: \`SET idempotency:<shopId>:<key> <response> EX 86400 NX\`.
- If key exists and is in-flight, returns \`409 Conflict\` (\`IDEMPOTENCY_CONFLICT\`).
- If key exists and was completed, returns cached JSON response immediately without re-executing.

### 6.2 Monetary Precision Standards:
- All monetary arithmetic is conducted using MongoDB \`Decimal128\` and JavaScript \`bignumber.js\` / \`decimal.js\`.
- Use of IEEE 754 floating-point numbers (\`number\` in JS) is strictly prohibited for monetary calculation.
- Display values are formatted with the Bangladeshi Taka symbol (\`৳\`) and tabular lining numerals (\`tnum\`).

### 6.3 Transactional Rollback Safeguards:
Sales, procurement, returns, and closings wrap all Mongoose operations inside an active \`ClientSession\`:
\`\`\`typescript
const session = await mongoose.startSession();
session.startTransaction();
try {
  // 1. Decrement inventory
  // 2. Insert sale invoice
  // 3. Post double-entry account ledgers
  // 4. Update customer dues
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
\`\`\`

### 6.4 Double-Entry Financial Journal Matrix (TX-01 to TX-19):
Every financial mutation updates balanced debits and credits:
| Tx Code | Transaction Name | Debit Account | Credit Account | Invariant / Rule |
|:---:|---|---|---|---|
| **TX-01** | POS Cash Sale | \`1010-Cash-Drawer\` | \`4010-Sales-Revenue\` | Cash balance increases |
| **TX-02** | POS MFS Sale | \`1020-MFS-Floats\` | \`4010-Sales-Revenue\` | Digital float increases |
| **TX-03** | POS Bank/Card Sale | \`1030-Bank-Accounts\` | \`4010-Sales-Revenue\` | Bank balance increases |
| **TX-04** | POS Bakir Khata Sale | \`1110-Accounts-Receivable\` | \`4010-Sales-Revenue\` | Customer due recorded |
| **TX-05** | Customer Return (CRV) | \`4020-Sales-Returns\` | \`1010-Cash-Drawer\` / Due | Reverse revenue & restock |
| **TX-06** | Bakir Khata Due Collection | \`1010-Cash-Drawer\` | \`1110-Accounts-Receivable\` | Customer due reduces |
| **TX-07** | Procurement GRN | \`1210-Handset-Inventory\` | \`2010-Accounts-Payable\` | Inventory increases at landed cost |
| **TX-08** | Purchase Return (PRV) | \`2010-Accounts-Payable\` | \`1210-Handset-Inventory\` | Reduce vendor liability & stock |
| **TX-09** | Technician Service Repair | \`1010-Cash-Drawer\` | \`4030-Service-Revenue\` & Parts | 50% labor split to technician |
| **TX-10** | Used Handset Buyback | \`1220-Used-Inventory\` | \`1010-Cash-Drawer\` | Police compliance form generated |
| **TX-11** | Kisti EMI Booking | \`1120-Kisti-Receivable\` | \`4010-Sales-Revenue\` | Down payment + installments |
| **TX-12** | MFS Agent Cash-In | \`1010-Cash-Drawer\` | \`1020-MFS-Floats\` | Customer gives cash, SIM float sent |
| **TX-13** | MFS Agent Cash-Out | \`1020-MFS-Floats\` | \`1010-Cash-Drawer\` | SIM float received, cash disbursed |
| **TX-14** | Personal Amanat Deposit | \`1010-Cash-Drawer\` | \`2110-Owner-Amanat-Liability\` | Strict 0.00% Store P&L invariant |
| **TX-15** | Personal Amanat Return | \`2110-Owner-Amanat-Liability\` | \`1010-Cash-Drawer\` | Strict 0.00% Store P&L invariant |
| **TX-16** | Personal Hawlat Loan | \`1130-Owner-Hawlat-Receivable\` | \`1010-Cash-Drawer\` | Strict 0.00% Store P&L invariant |
| **TX-17** | Damaged Stock Scrap (SWV) | \`5020-Damaged-Stock-Loss\` | \`1210-Handset-Inventory\` | Write off cost to P&L |
| **TX-18** | Staff Payroll Disburse | \`5010-Salary-OPEX\` | \`1010-Cash\` / \`1030-Bank\` | Disburse base + commissions |
| **TX-19** | Godown Stock Transfer (STN) | \`1212-Outlet-Inventory\` | \`1211-Godown-Inventory\` | Pure asset transfer (0 P&L) |

---

## 7. Audit Findings, Cross-Document Consistency & Resolved Decisions

### 7.1 Cross-Document Consistency Audit:
1. **Consistency with [\`prd.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) & [\`appflow.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md):** 100% of the 17 business modules and 19 wireframe screens map directly to the 30 API controller modules above.
2. **Consistency with [\`DATABASE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md):** Every collection (all 36 MongoDB collections) has verified CRUD and transactional API endpoints.
3. **Consistency with [\`database-schema.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/database-schema.md):** All 43 relational tables align with the transactional entities exposed in the REST contracts.
4. **Consistency with [\`ARCHITECTURE.md\`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/ARCHITECTURE.md):** The Express.js modular architecture, Zod validation layer, Redis sliding-window caching, and Section 15 RBAC matrix are fully preserved.

### 7.2 Formally Codified Owner Decisions:
The API specification permanently incorporates the four strategic decisions confirmed by the project owner:
- **Decision 1 (POS Tablet Layout):** The API serves dense dual-column payloads matching fixed landscape tablet viewports (1024×768+).
- **Decision 2 (Thermal Print Mode):** \`POST /pos/checkout\` returns optimized, pre-formatted ESC/POS byte buffers in English text mode (<0.3s execution) alongside downloadable bilingual Web PDF URLs.
- **Decision 3 (Manager Override PIN):** \`POST /users/manager-pin/verify\` provides instantaneous synchronous on-screen modal validation.
- **Decision 4 (Closing Recount Protocol):** \`POST /closing/blind-count\` allows exactly one recount grace submission before the final commit endpoint permanently locks the register.

### 7.3 Tracked Implementation Gotchas (Edge-Cases):
- **Gotcha 1 (Concurrent Scan Lock):** During rush hour, two cashiers at different counters might scan the same physical IMEI. The backend must acquire a distributed Redis lock (\`SET lock:imei:<imei1> <token> EX 15 NX\`) during cart reservation to prevent duplicate checkouts.
- **Gotcha 2 (Offline Sync Token Expiry):** When an offline tablet reconnects after hours, its cached access token may have expired. The client must automatically invoke \`/auth/refresh\` before dispatching \`/pos/offline-sync\`.
- **Gotcha 3 (Personal Ledger Boundary):** Personal Amanat/Hawlat transactions are strictly segregated to \`STORE_OWNER\` and must never touch the store revenue or expense accounts.
- **Gotcha 4 (Single Recount Grace Lock):** Once a cashier submits their recount attempt, \`recountAttemptsRemaining\` drops to 0 and the UI disables the recount action, forcing shift finalization.

---
`;

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully wrote api-spec.md v2.0.0. Bytes:', fs.statSync(targetPath).size);
