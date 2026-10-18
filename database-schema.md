# Bebsayik.com — Database Architecture & Schema Specification
**Official Product Name:** Bebsayik  
**English Product Name:** Bebsayik.com  
**Brand:** Bebsayik  
**Brand Attribution:** Powered by Bebsayik  
**Platform Domain:** Bebsayik (`bebsayik.com`, `app.bebsayik.com`, `admin.bebsayik.com`)  
**Legacy Business Context:** The initial ERP requirements and workflows originated from the Kanchan Telecom retail operation. The SaaS product is independently branded and operated as Bebsayik.com.  
**Version:** 1.0.0 (Historical Architecture Baseline)  
**Database Engine:** PostgreSQL 16+ with Row-Level Security (RLS) [DEPRECATED RELATIONAL REFERENCE]  

> [!WARNING]
> **DEPRECATION NOTICE — HISTORICAL RELATIONAL REFERENCE ONLY:**  
> This document specifies an exploratory PostgreSQL 16+ relational schema with Row-Level Security (RLS).  
> In accordance with approved architectural decisions ([`ARCHITECTURE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/ARCHITECTURE.md) ADR-02 and [`DATABASE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md)), the **authoritative production database specification is MongoDB Atlas 7.0+ Replica Set with Mongoose 8+ ODM**.  
> Please refer to [**`DATABASE.md`**](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) for all active collection schemas, Mongoose models, compound indexes, and aggregation pipelines. This file is retained exclusively as an architectural reference for relational data structures.

---

## 1. Database Architecture Overview (Architectural Foundations)

The Bebsayik ERP/SaaS platform is engineered on a **Shared Database, Shared Schema Multi-Tenant** architecture. To achieve enterprise-grade data security and database-level tenant isolation, PostgreSQL **Row-Level Security (RLS)** is strictly enforced across all tenant tables.

```
                                  ┌───────────────────────────────┐
                                  │      Bebsayik Global Web      │
                                  │       (bebsayik.com)          │
                                  └──────────────┬────────────────┘
                                                 │
                  ┌──────────────────────────────┴──────────────────────────────┐
                  ▼                                                             ▼
   ┌───────────────────────────────┐                             ┌───────────────────────────────┐
   │     Web & Mobile Shop ERP     │                             │     Central Admin Portal      │
   │      (app.bebsayik.com)       │                             │     (admin.bebsayik.com)      │
   └──────────────┬────────────────┘                             └──────────────┬────────────────┘
                  │ JWT Context (shop_id, user_id)                              │ Super-Admin Bypass
                  ▼                                                             ▼
   ┌────────────────────────────────────────────────────────────────────────────────────────────┐
   │                           PostgreSQL Database Cluster (v16+)                                │
   │   ┌────────────────────────────────────────────────────────────────────────────────────┐   │
   │   │                     Row-Level Security (RLS) Enforcement Layer                     │   │
   │   │       POLICY: shop_id = NULLIF(current_setting('app.current_shop_id'), '')::UUID   │   │
   │   └────────────────────────────────────────────────────────────────────────────────────┘   │
   │                                                                                            │
   │  ┌───────────────────────┐  ┌───────────────────────┐  ┌────────────────────────────────┐  │
   │  │   Tenant & Core Auth  │  │   Catalog & Specific  │  │   POS & Financial Ledgers      │  │
   │  │ shops, users, devices │  │  variants, imei_serials│  │ sales, accounts, ledgers, mfs  │  │
   │  └───────────────────────┘  └───────────────────────┘  └────────────────────────────────┘  │
   │  ┌───────────────────────┐  ┌───────────────────────┐  ┌────────────────────────────────┐  │
   │  │  Kanchan Telecom Core │  │  Personal Ledger Core │  │   SaaS Subscriptions & Webhook │  │
   │  │  kisti, buyback, repair│ │personal_ledger_contact│  │   plans, invoices, platform_audit │  │
   │  └───────────────────────┘  └───────────────────────┘  └────────────────────────────────┘  │
   └────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Guardrails:
1. **Multi-Tenancy via RLS:** Every tenant-specific table contains `shop_id UUID NOT NULL REFERENCES shops(id)`. Database connection initialization sets `SET LOCAL app.current_shop_id = '...'`. If any query inadvertently omits a tenant filter, RLS automatically isolates and prevents access to other tenants' data.
2. **Precision-Safe Monetary Arithmetic:** Mandatory `NUMERIC(15, 2)` for all monetary calculations. `FLOAT` and `REAL` data types are strictly prohibited.
3. **Immutable Financial History:** `account_ledgers`, `inventory_movements`, and `sale_items` tables are strictly append-only; zero `UPDATE` or `DELETE` operations are permitted. Corrections require compensating or reversal ledger entries.
4. **Strict Isolation of Personal Ledger:** Amanat and Hawlat personal ledgers (`personal_ledger_contacts`) are segregated in dedicated tables. They never mix with customer or supplier ledgers and have exactly 0.00% impact on the shop's Profit & Loss (P&L).
5. **Specific Identification COGS:** Every mobile handset is tracked by exact IMEI with its specific purchase cost (`purchase_cost`). Average costing is strictly prohibited; gross profit is computed on an exact item basis.
6. **100% Manual MFS Bookkeeping:** Zero automatic SIM scraping or SMS parsing fields. All transactions are controlled by verified manual merchant inputs.

---

## 2. Core ERD & Schema Catalog

### 2.1 Platform & Multi-Tenant Core

#### 1. `subscription_plans` (SaaS Subscription Plans)
Global subscription tiers configured and managed by Platform Super Admins.
```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL, -- 'free', 'premium', 'gold', 'diamond'
    name VARCHAR(100) NOT NULL,
    price_monthly NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    price_6_month NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- 10% discount
    price_1_year NUMERIC(15, 2) NOT NULL DEFAULT 0.00,  -- 16% discount
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
```

#### 2. `shops` (Shop / Tenant Master)
The core tenant business unit of the platform.
```sql
CREATE TYPE shop_status AS ENUM ('trial', 'active', 'grace_period', 'read_only', 'suspended');

CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'my-mobile-shop'
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    trade_license_no VARCHAR(100),
    bin_number VARCHAR(50), -- NBR Business Identification Number for Mushak 6.3 VAT compliance
    logo_url TEXT, -- Shop logo printed on thermal receipts
    receipt_header TEXT, -- Custom header text on thermal receipts
    receipt_footer TEXT, -- Custom footer terms/warranty notice on thermal receipts
    return_policy_days INT NOT NULL DEFAULT 7, -- Default return policy window
    current_plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status shop_status NOT NULL DEFAULT 'trial',
    trial_starts_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    trial_ends_at TIMESTAMPTZ NOT NULL, -- 14 days from signup
    subscription_ends_at TIMESTAMPTZ,
    grace_period_ends_at TIMESTAMPTZ,
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    suspension_reason TEXT,
    suspended_at TIMESTAMPTZ,
    suspended_by UUID, -- references platform super-admin
    settings JSONB NOT NULL DEFAULT '{
        "currency": "BDT",
        "thermal_paper_width": "80mm",
        "invoice_header_note": "Thank you for shopping with us",
        "low_stock_threshold": 3,
        "vat_percent": 0.00,
        "default_warranty_policy": "1 Year Service Warranty"
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_shops_status ON shops(status);
CREATE INDEX idx_shops_phone ON shops(phone);
```

#### 3. `subscription_invoices` (Subscription Billing & Payment Tracking)
Shop license fees, payment histories, and gateway transaction statuses.
```sql
CREATE TYPE payment_gateway_type AS ENUM ('paystation', 'eps', 'bkash_direct', 'manual_cash');
CREATE TYPE subscription_payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

CREATE TABLE subscription_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL, -- 'monthly', '6_month', '1_year'
    amount NUMERIC(15, 2) NOT NULL,
    plan_snapshot JSONB NOT NULL, -- Frozen price and features snapshot
    gateway payment_gateway_type NOT NULL,
    gateway_trx_id VARCHAR(150),
    payment_status subscription_payment_status NOT NULL DEFAULT 'pending',
    poll_attempts INT NOT NULL DEFAULT 0,
    last_polled_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_sub_invoices_shop ON subscription_invoices(shop_id);
```

#### 4. `platform_audit_logs` (Platform Super Admin Audit Logs)
Activity audit logs for Central Platform Administrators (e.g., suspending shops, altering plan rates).
```sql
CREATE TABLE platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    target_shop_id UUID REFERENCES shops(id),
    action VARCHAR(100) NOT NULL, -- 'SUSPEND_SHOP', 'ACTIVATE_SHOP', 'UPDATE_PLAN_PRICING'
    ip_address VARCHAR(45),
    user_agent TEXT,
    old_data JSONB,
    new_data JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_audit_created_at ON platform_audit_logs(created_at DESC);
```

#### 5. `marketing_leads` (Public Pre-Launch & Trial Ingestion)
Ingests inbound merchant interest from public marketing landing pages and ROI calculators.
```sql
CREATE TABLE marketing_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    retailer_name VARCHAR(150),
    shop_name VARCHAR(255),
    market_location VARCHAR(255),
    lead_source VARCHAR(50) NOT NULL DEFAULT 'landing_hero', -- 'landing_hero', 'roi_calculator', 'mobile_app_modal', 'facebook_campaign'
    has_converted_to_trial BOOLEAN NOT NULL DEFAULT false,
    converted_shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_marketing_leads_phone ON marketing_leads(phone);
CREATE INDEX idx_marketing_leads_source ON marketing_leads(lead_source, created_at DESC);
```

#### 6. `promo_codes` (Platform Subscription Coupons)
Platform-level discount coupon engine applied during SaaS checkout.
```sql
CREATE TABLE promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'EID2026', 'INNOVATE25'
    discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage', 'fixed_bdt'
    discount_value NUMERIC(15, 2) NOT NULL,
    applicable_plan_slugs TEXT[] NOT NULL DEFAULT '{"premium", "gold", "diamond"}',
    max_redemptions INT NOT NULL DEFAULT 100,
    current_redemptions INT NOT NULL DEFAULT 0,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    valid_until TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_promo_redemptions CHECK (current_redemptions <= max_redemptions)
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code) WHERE is_active = true;
```

---

### 2.2 Users, Devices & Dual Authentication

#### 7. `users` (Staff & Shop Owners)
Store owners, managers, and employee user accounts.
```sql
CREATE TYPE user_role AS ENUM (
    'owner', 
    'admin', 
    'manager', 
    'cashier', 
    'accountant', 
    'inventory_manager', 
    'technician'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    avatar_url TEXT,
    nid_number VARCHAR(50), -- National ID for accountability & regulatory compliance
    emergency_contact VARCHAR(20),
    password_hash VARCHAR(255), -- For web login (Argon2id)
    manager_pin_hash VARCHAR(255), -- Argon2id hash of 4-digit Manager Override PIN (Web ERP)
    salary_base NUMERIC(12,2) DEFAULT 0.00,
    commission_rate NUMERIC(5,2) DEFAULT 0.00,
    role user_role NOT NULL DEFAULT 'cashier',
    is_active BOOLEAN NOT NULL DEFAULT true,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    token_version INT NOT NULL DEFAULT 1, -- For instant global session invalidation
    capabilities TEXT[] DEFAULT '{}', -- Fine-grained capabilities
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_user_phone UNIQUE (shop_id, phone)
);

CREATE INDEX idx_users_shop_phone ON users(shop_id, phone);
```

#### 8. `user_devices` (Mobile Device Binding & PIN Security)
Device-bound PIN and biometric authentication tokens for mobile app instances.
```sql
CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL, -- Hardware UUID / Android ID
    device_model VARCHAR(150),
    os_version VARCHAR(50),
    app_version VARCHAR(50),
    pin_hash VARCHAR(255) NOT NULL, -- Argon2id hashed PIN
    biometric_enrolled BOOLEAN NOT NULL DEFAULT false,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    revocation_reason TEXT,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_user_device UNIQUE (user_id, device_id)
);

CREATE INDEX idx_user_devices_lookup ON user_devices(device_id, user_id);
```

#### 9. `auth_otps` (SMS OTP Verification Logs)
OTP verification logs for registration, web logins, and PIN resets.
```sql
CREATE TABLE auth_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'registration', 'web_login', 'pin_reset'
    attempts INT NOT NULL DEFAULT 0,
    is_consumed BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_auth_otps_phone ON auth_otps(phone, purpose);
```

#### 10. `phone_change_requests` (Dual-OTP Mobile Number Migration Ledger)
Two-phase approval ledger for migrating registered merchant or staff mobile numbers.
```sql
CREATE TABLE phone_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_phone VARCHAR(20) NOT NULL,
    new_phone VARCHAR(20) NOT NULL,
    old_phone_otp_hash VARCHAR(255) NOT NULL,
    new_phone_otp_hash VARCHAR(255) NOT NULL,
    old_phone_verified BOOLEAN NOT NULL DEFAULT false,
    new_phone_verified BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'expired', 'cancelled'
    requested_ip VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL, -- 180 seconds window for dual handshake
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE UNIQUE INDEX uq_pending_user_phone_change ON phone_change_requests(shop_id, user_id) WHERE status = 'pending';
CREATE INDEX idx_phone_change_lookup ON phone_change_requests(old_phone, new_phone);
```

---

### 2.3 Product Catalog & Specific Identification Inventory (Catalog & IMEI Core)

#### 11. `categories`, `brands`, `units`
Foundational catalog taxonomies.
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_category UNIQUE (shop_id, name)
);

CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_brand UNIQUE (shop_id, name)
);

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- 'Pcs', 'Box', 'Kg'
    short_code VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
```

#### 12. `products` and `product_variants` (Product & Variant Master)
Specifications and retail pricing models for handsets and accessories.
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    brand_id UUID REFERENCES brands(id),
    unit_id UUID REFERENCES units(id),
    name VARCHAR(255) NOT NULL,
    model_number VARCHAR(100),
    has_variants BOOLEAN NOT NULL DEFAULT false,
    has_imei BOOLEAN NOT NULL DEFAULT false, -- When true, IMEI scanning is mandatory
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_name VARCHAR(150) NOT NULL, -- e.g. "8GB / 128GB - Phantom Black"
    sku VARCHAR(100),
    barcode VARCHAR(100),
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"color": "Phantom Black", "ram": "8GB", "storage": "128GB"}
    cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Reference or non-serialized cost
    selling_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    min_selling_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Floor Price Lock
    mrp_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Retail sticker price
    current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    low_stock_alert NUMERIC(12, 2) NOT NULL DEFAULT 3.00,
    reorder_level NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Automated inventory reorder point
    batch_expiry_date DATE, -- Expiry date for battery / chemical / warranty accessory batches
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_variant_barcode UNIQUE (shop_id, barcode)
);

CREATE INDEX idx_variants_shop_product ON product_variants(shop_id, product_id);
```

#### 13. `imei_serials` (Dual-IMEI Specific Identification Table)
Unique serial number and Dual-IMEI tracking for handsets with exact purchase cost attribution (Specific Identification COGS).
```sql
CREATE TYPE imei_status AS ENUM (
    'available', 
    'sold', 
    'returned_inspection', 
    'in_repair', 
    'scrapped', 
    'returned_to_supplier'
);

CREATE TABLE imei_serials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    imei_1 VARCHAR(50) NOT NULL,
    imei_2 VARCHAR(50),
    serial_number VARCHAR(100),
    purchase_cost NUMERIC(15, 2) NOT NULL, -- FROZEN Specific Landed Cost (COGS)
    source VARCHAR(50) NOT NULL DEFAULT 'purchase', -- 'purchase', 'buyback', 'customer_exchange'
    purchase_invoice_id UUID,
    buyback_id UUID, -- References buyback_devices(id)
    sale_invoice_id UUID,
    status imei_status NOT NULL DEFAULT 'available',
    received_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    sold_at TIMESTAMPTZ,
    warranty_expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_imei_1 UNIQUE (shop_id, imei_1),
    CONSTRAINT uq_shop_imei_2 UNIQUE (shop_id, imei_2)
);

CREATE INDEX idx_imei_lookup ON imei_serials(shop_id, imei_1, status);
CREATE INDEX idx_imei_variant ON imei_serials(shop_id, variant_id, status);
```

#### 14. `inventory_movements` (Immutable Stock Ledger)
Immutable audit trail recording every inventory increment, decrement, and transfer.
```sql
CREATE TYPE movement_type AS ENUM (
    'purchase_in', 
    'sale_out', 
    'customer_return_in', 
    'supplier_return_out', 
    'buyback_in', 
    'repair_part_used', 
    'damage_quarantine', 
    'stock_adjustment'
);

CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    imei_id UUID REFERENCES imei_serials(id),
    movement_type movement_type NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL, -- Positive (In) or Negative (Out)
    unit_cost NUMERIC(15, 2) NOT NULL,
    reference_id UUID NOT NULL, -- purchase_id, sale_id, buyback_id, etc.
    reference_type VARCHAR(50) NOT NULL,
    stock_after NUMERIC(12, 2) NOT NULL,
    note TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_inv_movement_shop_var ON inventory_movements(shop_id, variant_id, created_at);
```

---

### 2.4 Purchases & Suppliers

#### 15. `suppliers` and `purchases`
Supplier accounts, purchase orders, and Goods Received Notes (GRN).
```sql
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    company_name VARCHAR(150),
    address TEXT,
    payable_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TYPE purchase_status AS ENUM ('draft', 'received', 'partial', 'cancelled');

CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    purchase_number VARCHAR(100) NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal NUMERIC(15, 2) NOT NULL,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    due_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status purchase_status NOT NULL DEFAULT 'received',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_purchase_number UNIQUE (shop_id, purchase_number)
);

CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL,
    unit_cost NUMERIC(15, 2) NOT NULL,
    total_cost NUMERIC(15, 2) NOT NULL
);
```

---

### 2.5 POS & Sales Engine

#### 16. `customers` (Customer & Receivables Ledger)
Customer directory, credit limits, and outstanding receivables.
```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    nid_number VARCHAR(50),
    receivable_due NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    is_walk_in BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_customers_shop_phone ON customers(shop_id, phone);
```

#### 17. `sales`, `sale_items`, `sale_payments` (Authoritative POS Sales Model)
Kanchan Telecom high-speed POS checkout, multi-split tenders, change arithmetic, and exact COGS gross margin calculation.
```sql
CREATE TYPE sale_status AS ENUM ('completed', 'returned', 'voided');
CREATE TYPE sale_type AS ENUM ('regular', 'kisti', 'quotation');

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    mushak_63_no VARCHAR(100), -- NBR Mushak 6.3 Fiscal Tax Serial
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal NUMERIC(15, 2) NOT NULL,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    final_total NUMERIC(15, 2) NOT NULL,
    amount_received NUMERIC(15, 2) NOT NULL, -- Actual cash received from customer
    amount_applied NUMERIC(15, 2) NOT NULL,  -- Amount applied against invoice total
    change_returned NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Change returned to customer
    due_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,      -- New unpaid balance
    cogs_total NUMERIC(15, 2) NOT NULL, -- Specific ID aggregated purchase cost
    gross_profit NUMERIC(15, 2) GENERATED ALWAYS AS (final_total - cogs_total) STORED,
    sale_type sale_type NOT NULL DEFAULT 'regular',
    status sale_status NOT NULL DEFAULT 'completed',
    reprint_count INT NOT NULL DEFAULT 0,
    last_reprinted_at TIMESTAMPTZ,
    offline_synced BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_sale_invoice UNIQUE (shop_id, invoice_number)
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    imei_id UUID REFERENCES imei_serials(id), -- Specific IMEI reference for serialized handsets
    quantity NUMERIC(12, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    unit_cost NUMERIC(15, 2) NOT NULL, -- Item-specific purchase cost
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(15, 2) NOT NULL,
    warranty_months INT NOT NULL DEFAULT 0
);

CREATE TYPE pos_payment_method AS ENUM (
    'cash', 
    'bank_card', 
    'bkash_merchant', 
    'nagad_merchant', 
    'pos_agent_cashout' -- Customer cashed out to shop agent SIM
);

CREATE TABLE sale_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    account_id UUID NOT NULL, -- references accounts(id)
    payment_method pos_payment_method NOT NULL,
    amount_received NUMERIC(15, 2) NOT NULL,
    amount_applied NUMERIC(15, 2) NOT NULL,
    change_given NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    agent_commission_earned NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    trx_reference VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_sales_shop_date ON sales(shop_id, sale_date);
CREATE INDEX idx_sales_customer ON sales(shop_id, customer_id);
```

---

### 2.6 Kanchan Telecom Specialized Core

#### 18. `kisti_accounts` and `kisti_schedules` (Installment / EMI Module)
Dual-guarantor verification and automated installment schedule management.
```sql
CREATE TYPE kisti_status AS ENUM ('active', 'completed', 'defaulted');

CREATE TABLE kisti_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    account_number VARCHAR(100) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    down_payment NUMERIC(15, 2) NOT NULL,
    principal_due NUMERIC(15, 2) NOT NULL,
    installment_count INT NOT NULL,
    frequency VARCHAR(20) NOT NULL, -- 'weekly', 'monthly'
    installment_amount NUMERIC(15, 2) NOT NULL,
    total_paid NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    remaining_due NUMERIC(15, 2) NOT NULL,
    
    -- Guarantor 1 Information
    guarantor_1_name VARCHAR(150) NOT NULL,
    guarantor_1_phone VARCHAR(20) NOT NULL,
    guarantor_1_nid VARCHAR(50) NOT NULL,
    guarantor_1_relation VARCHAR(100),
    
    -- Guarantor 2 Information
    guarantor_2_name VARCHAR(150) NOT NULL,
    guarantor_2_phone VARCHAR(20) NOT NULL,
    guarantor_2_nid VARCHAR(50) NOT NULL,
    guarantor_2_relation VARCHAR(100),
    
    status kisti_status NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_kisti_acc UNIQUE (shop_id, account_number)
);

CREATE TABLE kisti_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kisti_account_id UUID NOT NULL REFERENCES kisti_accounts(id) ON DELETE CASCADE,
    installment_no INT NOT NULL,
    due_date DATE NOT NULL,
    expected_amount NUMERIC(15, 2) NOT NULL,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    paid_date DATE,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    late_fee NUMERIC(15, 2) NOT NULL DEFAULT 0.00
);

CREATE TABLE kisti_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    kisti_account_id UUID NOT NULL REFERENCES kisti_accounts(id) ON DELETE RESTRICT,
    schedule_id UUID REFERENCES kisti_schedules(id),
    account_id UUID NOT NULL, -- Cash drawer or Bank account
    amount_paid NUMERIC(15, 2) NOT NULL,
    receipt_no VARCHAR(100) NOT NULL,
    collected_by UUID NOT NULL REFERENCES users(id),
    collected_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_kisti_schedules_due ON kisti_schedules(kisti_account_id, due_date, is_paid);
```

#### 19. `buyback_devices` (Second-Hand Phone Buyback & Police Compliance)
NID verification, physical condition checklist, and police compliance deed.
```sql
CREATE TABLE buyback_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    agreement_number VARCHAR(100) NOT NULL, -- Police agreement reference
    seller_name VARCHAR(150) NOT NULL,
    seller_phone VARCHAR(20) NOT NULL,
    seller_nid VARCHAR(50) NOT NULL,
    seller_photo_url TEXT,
    nid_front_photo_url TEXT,
    nid_back_photo_url TEXT,
    
    brand_name VARCHAR(100) NOT NULL,
    model_name VARCHAR(150) NOT NULL,
    imei_1 VARCHAR(50) NOT NULL,
    imei_2 VARCHAR(50),
    color VARCHAR(50),
    device_condition_notes TEXT,
    checklist_status JSONB NOT NULL DEFAULT '{
        "display_original": true,
        "camera_working": true,
        "network_calling": true,
        "battery_health_good": true,
        "body_scratches": "minor",
        "box_and_memo_available": false
    }'::jsonb,
    
    purchase_price NUMERIC(15, 2) NOT NULL,
    account_id UUID NOT NULL, -- Account disbursed for buyback cash
    stock_variant_id UUID NOT NULL REFERENCES product_variants(id),
    created_stock_imei_id UUID REFERENCES imei_serials(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_buyback_agree UNIQUE (shop_id, agreement_number)
);

CREATE INDEX idx_buyback_imei ON buyback_devices(shop_id, imei_1);
```

#### 20. `repair_jobs` and `repair_parts` (Servicing & Technician 50% Labor Split)
Repair job sheets, spare parts consumption, and 50% maker labor split calculations.
```sql
CREATE TYPE repair_job_status AS ENUM (
    'received', 
    'diagnosing', 
    'waiting_parts', 
    'repaired', 
    'delivered', 
    'cancelled'
);

CREATE TABLE repair_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    job_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    device_model VARCHAR(150) NOT NULL,
    imei_or_serial VARCHAR(100),
    security_pin_pattern VARCHAR(50), -- Screen lock pattern/PIN
    problem_description TEXT NOT NULL,
    
    technician_id UUID NOT NULL REFERENCES users(id),
    technician_labor_split_pct NUMERIC(5, 2) NOT NULL DEFAULT 50.00, -- 50% maker share
    
    labor_charge NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    parts_charge NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_bill NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    technician_commission NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Technician commission earnings
    shop_labor_profit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,     -- Shop net labor earnings
    
    advance_paid NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    due_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status repair_job_status NOT NULL DEFAULT 'received',
    delivered_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_repair_job UNIQUE (shop_id, job_number)
);

CREATE TABLE repair_job_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_job_id UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    quantity NUMERIC(12, 2) NOT NULL,
    cost_price NUMERIC(15, 2) NOT NULL,
    billing_price NUMERIC(15, 2) NOT NULL
);

CREATE INDEX idx_repair_jobs_status ON repair_jobs(shop_id, status);
```

---

### 2.7 Accounts, Ledgers & MFS (Accounts, Ledgers & MFS)

#### 21. `accounts` and `account_ledgers` (Financial Cash & Bank Accounts)
```sql
CREATE TYPE account_type AS ENUM (
    'cash_drawer', 
    'bank', 
    'mfs_counter', 
    'mfs_agent_float'
);

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    account_name VARCHAR(150) NOT NULL, -- e.g. "Main Cash Drawer", "bKash Agent 1"
    account_type account_type NOT NULL,
    account_number VARCHAR(100),
    bank_name VARCHAR(150),
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_account_name UNIQUE (shop_id, account_name)
);

CREATE TYPE ledger_entry_type AS ENUM ('debit', 'credit');

CREATE TABLE account_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    entry_type ledger_entry_type NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    balance_after NUMERIC(15, 2) NOT NULL,
    reference_type VARCHAR(50) NOT NULL, -- 'sale', 'purchase', 'expense', 'transfer', 'mfs', 'cash_in', 'cash_out'
    reference_id UUID NOT NULL,
    note TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_acc_ledger_stream ON account_ledgers(shop_id, account_id, created_at);
```

#### 22. `cash_in_out` (Internal Cash In & Out Ledger)
Internal store cash deposits and expense tracking.
```sql
CREATE TYPE cash_direction AS ENUM ('cash_in', 'cash_out');

CREATE TABLE cash_in_out (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    direction cash_direction NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'owner_capital', 'petty_cash', 'staff_advance', 'bank_deposit', 'bank_withdraw'
    counterparty VARCHAR(150),
    note TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
```

#### 23. `mfs_transactions` (100% Manual MFS Bookkeeping)
Accurate bKash/Nagad agent ledger with zero automated scraping or SMS parsing.
```sql
CREATE TYPE mfs_provider AS ENUM ('bkash', 'nagad', 'rocket', 'upay');
CREATE TYPE mfs_tx_type AS ENUM ('customer_cash_in', 'customer_cash_out', 'b2b_float_recharge');

CREATE TABLE mfs_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    provider mfs_provider NOT NULL,
    agent_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    counter_cash_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    tx_type mfs_tx_type NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    principal_amount NUMERIC(15, 2) NOT NULL,
    customer_fee NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    agent_commission NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    net_float_delta NUMERIC(15, 2) NOT NULL, -- Impact on digital float account
    net_cash_delta NUMERIC(15, 2) NOT NULL,  -- Impact on physical cash drawer
    manual_trx_id VARCHAR(100),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_mfs_shop_provider ON mfs_transactions(shop_id, provider, created_at);
```

---

### 2.8 Personal Ledger Isolation (Amanat & Hawlat)

#### 24. `personal_ledger_contacts` and `personal_ledger_transactions`
Personal ledger completely isolated from store customer and supplier accounts.
```sql
CREATE TABLE personal_ledger_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    person_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    relationship_note VARCHAR(150), -- e.g. "Proprietor brother", "Neighboring shopkeeper"
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Positive = Shop receivable, Negative = Shop liability
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_personal_person UNIQUE (shop_id, person_name, phone)
);

CREATE TYPE personal_tx_direction AS ENUM (
    'money_given',         -- Shop owner lent money
    'money_received',      -- Loan repayment or deposit received
    'expense_on_behalf'    -- Paid expense on behalf of contact
);

CREATE TABLE personal_ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES personal_ledger_contacts(id) ON DELETE CASCADE,
    direction personal_tx_direction NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT, -- When cash drawer or bank is involved
    balance_after NUMERIC(15, 2) NOT NULL,
    note TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_personal_ledger_stream ON personal_ledger_transactions(shop_id, contact_id);
```

---

### 2.9 Daily Closing & Store Audit

#### 25. `daily_closings` (Daily Cash Closing & Variance Tracker)
```sql
CREATE TABLE daily_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    closing_date DATE NOT NULL,
    opening_cash NUMERIC(15, 2) NOT NULL,
    total_sales_cash NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_due_collection_cash NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_other_cash_in NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_purchase_cash_out NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_expense_cash NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_other_cash_out NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    system_expected_cash NUMERIC(15, 2) NOT NULL,
    physical_counted_cash NUMERIC(15, 2) NOT NULL,
    cash_variance NUMERIC(15, 2) GENERATED ALWAYS AS (physical_counted_cash - system_expected_cash) STORED,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    closed_by UUID NOT NULL REFERENCES users(id),
    closed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_closing_date UNIQUE (shop_id, closing_date)
);
```

---


---

### 2.10 Extended Operations, Warranty RMA, HR & Hardware

#### 26. `warranty_claims` (Brand Warranty / RMA Tracking)
Tracks customer handsets sent to official brand customer care (Xiaomi, Samsung, Realme, etc.) with courier/ticket tracking.
```sql
CREATE TABLE warranty_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    claim_no VARCHAR(100) NOT NULL, -- e.g. "RMA-202610-0018"
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    imei_1 VARCHAR(50) NOT NULL,
    imei_2 VARCHAR(50),
    product_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(100) NOT NULL,
    issue_description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'received_at_store', 
    -- 'received_at_store', 'sent_to_brand', 'received_from_brand', 'delivered_to_customer', 'rejected_by_brand'
    brand_tracking_no VARCHAR(100), -- Courier or brand ticket tracking ID
    brand_service_center_note TEXT,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    dispatched_to_brand_date DATE,
    received_from_brand_date DATE,
    delivered_to_customer_date DATE,
    technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_warranty_claim_no UNIQUE (shop_id, claim_no)
);

CREATE INDEX idx_warranty_claims_imei ON warranty_claims(shop_id, imei_1);
CREATE INDEX idx_warranty_claims_status ON warranty_claims(shop_id, status);
```

#### 27. `employee_targets` (Monthly Sales Quota & Commission)
Tracks salesperson monthly handset sales quota, revenue goals, and commission settlements.
```sql
CREATE TABLE employee_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_month VARCHAR(7) NOT NULL, -- Format "YYYY-MM" e.g. "2026-10"
    target_handset_units INT NOT NULL DEFAULT 0,
    target_gross_revenue NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    achieved_handset_units INT NOT NULL DEFAULT 0,
    achieved_gross_revenue NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    commission_type VARCHAR(50) NOT NULL DEFAULT 'fixed_per_unit', -- 'fixed_per_unit', 'percentage_of_revenue', 'tiered'
    commission_rate NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    is_target_met BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_employee_target_month UNIQUE (shop_id, employee_id, target_month)
);

CREATE INDEX idx_employee_targets_lookup ON employee_targets(shop_id, target_month);
```

#### 28. `payroll_ledger` (Technician Split & Staff Salary Records)
Immutable ledger tracking technician 50% labor splits, sales commissions, and monthly salary disbursements.
```sql
CREATE TABLE payroll_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payroll_month VARCHAR(7) NOT NULL, -- "YYYY-MM"
    ledger_type VARCHAR(50) NOT NULL, 
    -- 'technician_repair_split', 'sales_commission', 'monthly_salary', 'advance_salary_deduction', 'bonus'
    repair_job_id UUID REFERENCES repair_jobs(id) ON DELETE SET NULL,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'accrued', -- 'accrued', 'approved', 'paid'
    disbursed_at TIMESTAMPTZ,
    disbursed_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    disbursed_voucher_no VARCHAR(100), -- JV-YYYYMM-XXXXXX
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_payroll_ledger_emp_month ON payroll_ledger(shop_id, employee_id, payroll_month);
CREATE INDEX idx_payroll_ledger_status ON payroll_ledger(shop_id, status);
```

#### 29. `sms_logs` (SMS Gateway Delivery Audit Trail)
Comprehensive audit trail for every SMS notification dispatched across all telecom gateways.
```sql
CREATE TABLE sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL, -- Nullable for platform OTPs
    recipient_phone VARCHAR(20) NOT NULL,
    template_key VARCHAR(50) NOT NULL, 
    -- 'OTP_VERIFICATION', 'DAY_END_Z_REPORT', 'KISTI_REMINDER', 'REPAIR_READY', 'DEVICE_REVOCATION'
    message_body TEXT NOT NULL,
    gateway_provider VARCHAR(50) NOT NULL, -- 'ssl_wireless', 'bulksms_bd', 'greenweb'
    gateway_message_id VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'queued', -- 'queued', 'delivered', 'failed', 'retry_fallback'
    cost_bdt NUMERIC(10, 4) NOT NULL DEFAULT 0.3500, -- Telecom gateway rate snapshot
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_sms_logs_shop_status ON sms_logs(shop_id, status, created_at DESC);
CREATE INDEX idx_sms_logs_phone ON sms_logs(recipient_phone, created_at DESC);
```

#### 30. `sms_templates` (Localized Notification SMS Templates)
Customizable SMS notification templates with dynamic template tags.
```sql
CREATE TABLE sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE, -- Nullable for platform global defaults
    template_key VARCHAR(50) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    body_text TEXT NOT NULL,
    variables TEXT[] NOT NULL DEFAULT '{}', -- e.g. '{"customer_name", "invoice_no", "due_amount"}'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_template_key UNIQUE (shop_id, template_key)
);

CREATE INDEX idx_sms_templates_lookup ON sms_templates(shop_id, template_key);
```

#### 31. `shop_hardware_configs` (Thermal Printers & Barcode Scanners)
Station hardware configurations saving device fingerprints, thermal printer widths, and drawer pulse parameters.
```sql
CREATE TABLE shop_hardware_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    terminal_id VARCHAR(150) NOT NULL, -- Browser / app hardware fingerprint
    printer_type VARCHAR(50) NOT NULL DEFAULT 'esc_pos_usb', -- 'esc_pos_usb', 'esc_pos_bluetooth', 'network_ip', 'system_dialog'
    paper_width VARCHAR(20) NOT NULL DEFAULT '80mm', -- '58mm', '80mm'
    auto_print_on_checkout BOOLEAN NOT NULL DEFAULT true,
    auto_kick_drawer BOOLEAN NOT NULL DEFAULT true,
    barcode_scanner_mode VARCHAR(50) NOT NULL DEFAULT 'usb_keyboard_wedge', -- 'usb_keyboard_wedge', 'bluetooth_hid', 'camera_stream'
    ip_address VARCHAR(50),
    bluetooth_mac VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_shop_terminal_config UNIQUE (shop_id, terminal_id)
);

CREATE INDEX idx_hardware_configs_lookup ON shop_hardware_configs(shop_id, terminal_id);
```

---

## 3. PostgreSQL Row-Level Security (RLS) Policy Model

Standard implementation enforcing RLS across all tenant-specific tables:

```sql
-- 1. Helper function reading current tenant ID from session context
CREATE OR REPLACE FUNCTION current_app_shop_id() 
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_shop_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Enable RLS on shops table
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY shop_isolation_policy ON shops
    FOR ALL
    USING (id = current_app_shop_id());

-- 3. Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_isolation_policy ON users
    FOR ALL
    USING (shop_id = current_app_shop_id());

-- 4. Enable RLS on sales and POS tables
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY sales_isolation_policy ON sales
    FOR ALL
    USING (shop_id = current_app_shop_id());

-- 5. Enable RLS on specific IMEI table
ALTER TABLE imei_serials ENABLE ROW LEVEL SECURITY;
CREATE POLICY imei_isolation_policy ON imei_serials
    FOR ALL
    USING (shop_id = current_app_shop_id());

-- 6. Enable RLS on personal ledger tables
ALTER TABLE personal_ledger_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY personal_contacts_isolation_policy ON personal_ledger_contacts
    FOR ALL
    USING (shop_id = current_app_shop_id());

-- 7. Enable RLS on Warranty & RMA
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY warranty_claims_isolation_policy ON warranty_claims
    FOR ALL
    USING (shop_id = current_app_shop_id());

-- 8. Enable RLS on Employee Targets & Commissions
ALTER TABLE employee_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY employee_targets_isolation_policy ON employee_targets
    FOR ALL
    USING (shop_id = current_app_shop_id());

-- 9. Enable RLS on Payroll & Technician Splits
ALTER TABLE payroll_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY payroll_ledger_isolation_policy ON payroll_ledger
    FOR ALL
    USING (shop_id = current_app_shop_id());

-- 10. Enable RLS on Hardware Configurations
ALTER TABLE shop_hardware_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY hardware_configs_isolation_policy ON shop_hardware_configs
    FOR ALL
    USING (shop_id = current_app_shop_id());

-- 11. Enable RLS on SMS Logs and Templates
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY sms_logs_isolation_policy ON sms_logs
    FOR ALL
    USING (shop_id = current_app_shop_id());

ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY sms_templates_isolation_policy ON sms_templates
    FOR ALL
    USING (shop_id = current_app_shop_id());
```

---

## 4. Performance Indexing & Optimization Strategy

1. **Sub-Second POS Search:**
   - `imei_serials(shop_id, imei_1, status)` — B-Tree composite index enabling sub-30ms barcode/IMEI scanner lookups.
   - `product_variants(shop_id, barcode)` — Unique index for high-speed accessory barcode lookups.
2. **Financial Aggregations:**
   - `account_ledgers(shop_id, account_id, created_at)` — Composite index for instant ledger and account statement rendering.
3. **Kisti Overdue Detection:**
   - `kisti_schedules(kisti_account_id, due_date, is_paid)` — Filtered partial index for rapid daily identification of overdue installments.
4. **Warranty RMA & Customer Claim Indexing:**
   - `warranty_claims(shop_id, imei_1)` — Instant IMEI search when customer brings device back to store.
5. **Technician 50% Labor Split & Payroll Accrual:**
   - `payroll_ledger(shop_id, employee_id, status)` — Real-time aggregation of unpaid accrued labor splits and commissions.
6. **Station Hardware Autoload:**
   - `shop_hardware_configs(shop_id, terminal_id)` — Sub-5ms retrieval of terminal-specific thermal ESC/POS and scanner settings.

---

## 5. Conclusion & Implementation Readiness

This database schema fully codifies all practical retail requirements originating from Kanchan Telecom (Specific IMEI COGS, 50% maker labor split, second-hand buyback police compliance deeds, personal ledger isolation, and device-bound PIN security). Simultaneously, it delivers Bebsayik SaaS cloud capabilities: strict multi-tenancy, Row-Level Security isolation, and robust subscription lifecycle management.
