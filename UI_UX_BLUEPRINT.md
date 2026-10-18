# Bebsayik.com — Complete UI/UX Blueprint & Design System Direction
**Document File:** `UI_UX_BLUEPRINT.md`  
**Official Product Name:** Bebsayik  
**English Product Name:** Bebsayik.com  
**Brand:** Bebsayik | **Brand Attribution:** Powered by Bebsayik  
**Canonical Domain:** `bebsayik.com` (`app.bebsayik.com` | `admin.bebsayik.com`)  
**Legacy Business Context:** The initial ERP requirements and workflows originated from the Kanchan Telecom retail operation. The SaaS product is independently branded and operated as Bebsayik.com.  
**Version:** 2.0.0 (Hardened Master UI/UX Blueprint)  
**Status:** Authoritative UI/UX Design Direction, Visual Tokens, Reusable Component Specifications, and Interaction Standards.  
**Purpose:** Provide software engineers, frontend architects, and UI designers with a single, comprehensive, and unambiguous specification of the intended Bebsayik interface prior to and during software development.

---

## 1. Critical Instruction to Any AI Agent

**This document defines UI/UX direction, visual tokens, interaction design, and component contracts.**

At this stage, the project owner is finalizing product specifications and design preparation. Do not interpret this document as permission to start building arbitrary software or writing ad-hoc code.

Unless the owner explicitly requests implementation, do **NOT**:
- Write exploratory or unapproved application code;
- Install external NPM packages or modify project dependencies;
- Alter approved system frameworks, multi-tenant database schemas, API routes, or double-entry financial posting logic;
- Generate working mock ERP screens that conflict with approved specifications;
- Bypass or assume unresolved business decisions without asking the owner.

All design work must strictly derive from and align with the canonical specification suite: [`idea.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/idea.md), [`prd.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md), [`appflow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md), [`user-flow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/user-flow.md), [`DFD.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DFD.md), [`DATABASE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md), and [`ARCHITECTURE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/ARCHITECTURE.md).

---

## 2. Product Overview & User Experience Goals

**Product Name:** Bebsayik  
**English Product Name:** Bebsayik.com  
**Product Category:** Multi-Tenant Mobile Shop ERP + POS SaaS  
**Primary Market:** Bangladesh (Retail Mobile Handsets, Gadgets, Repair Labs, and MFS Banking)  
**Primary Users:** Store Owners, Store Managers, Counter Cashiers, Sales Executives, Repair Technicians, Accountants, and Platform Super Administrators.

### 2.1 Product Experience Goals:
1. **High-Velocity Counter Operations (<3s):** Counter cashiers during rush hours in Dhaka markets (Eastern Plaza, Multiplan, Jamuna Future Park) must be able to scan barcodes, verify 15-digit IMEIs, split payment tenders, print thermal receipts, and kick cash drawers using pure keyboard accelerators (`F1`–`F12`) without touching a mouse.
2. **Clarity Over Decorative Noise:** No unnecessary animations, heavy blur glassmorphism, or non-functional visual fluff that consumes system resources on low-cost counter tablets or POS terminals.
3. **Strict Financial Truth:** Monetary values are formatted with exact currency indicators (`৳` / `BDT`) using tabular lining numerals (`tnum`). Payment received is strictly segregated from payment applied; change return is prominent; and non-P&L personal ledgers (Amanat/Hawlat) are visually insulated from shop profit.
4. **Dual-Language Fluency:** Seamless support for bilingual English and Bengali interfaces. Bengali translations must use authentic Bangladeshi mobile market terminology (e.g., *বাকি*, *হাওলাত*, *আমানত*, *ক্যাশ-ইন*, *ক্যাশ-আউট*, *কিস্তি*, *জমা*, *খরচ*) rather than literal machine translations.
5. **Offline Transparency:** Clear, non-intrusive status indicators communicating whether the terminal is live, syncing, or operating offline with queued non-serialized transactions.

---

## 3. Product Areas & Multi-Host UI Boundaries

Bebsayik is partitioned across three isolated domain hosts, each enforcing strict session boundaries and layout shells:

```
                                  ┌───────────────────────────────┐
                                  │      bebsayik.com (Host 1)    │
                                  │    Public Marketing Portal    │
                                  └──────────────┬────────────────┘
                                                 │
                  ┌──────────────────────────────┴──────────────────────────────┐
                  ▼                                                             ▼
   ┌───────────────────────────────┐                             ┌───────────────────────────────┐
   │    app.bebsayik.com (Host 2)  │                             │    admin.bebsayik.com (Host 3)│
   │    Enterprise Web ERP & POS   │                             │    Platform Super Admin Portal│
   └───────────────────────────────┘                             └───────────────────────────────┘
```

### 3.1 Host 1: Public Marketing & Conversion Portal (`bebsayik.com`)
- **Audience:** Visiting mobile shop owners, potential subscribers, and retail partners.
- **Tone:** Professional, credible, modern, and trustworthy.
- **Key Views:**
  - `/` — Landing Page with value proposition, feature highlights, and video demonstrations.
  - `/features` — Detailed breakdown of Dual-IMEI tracking, Kisti, Repair, and MFS modules.
  - `/pricing` — Tier toggles (Free, Premium, Gold, Diamond), annual discount badges (16% off), and interactive ROI Calculator.
  - `/about` — Company mission and Kanchan Telecom retail heritage.
  - `/contact` — Hotline numbers, WhatsApp merchant onboarding widget, and physical office address.
  - `/register` — 11-digit mobile signup with 6-digit SMS OTP challenge (activates 14-day Gold trial).
  - `/login` — Dual authentication: passwordless OTP login or permanent Argon2id password login.
  - `/recovery` — Cloudflare Turnstile protected password recovery via SMS OTP.

### 3.2 Host 2: Enterprise Web ERP & Mobile POS (`app.bebsayik.com`)
- **Audience:** Authenticated merchants, store managers, cashiers, technicians, and accountants.
- **Layout:** Persistent navigation sidebar, universal top bar (with Multi-Shop Workspace Switcher `[🏢 Dokan Switcher ▼]`, active shift badge, and notification center), and high-density content workspace.
- **Authoritative Sub-Modules:**
  - `/app/dashboard` — KPI summary cards, live turnover, low-stock warnings, fast-action buttons.
  - `/app/pos` — Sub-second counter checkout, barcode/IMEI scanner, F1-F12 shortcuts, split tenders.
  - `/app/sales/returns` — 7-day return validation, condition inspection, cash/credit refund slips.
  - `/app/inventory` — Dual-IMEI registry, specific landed cost display (locked to authorized roles), aging stock (>60d).
  - `/app/inventory/transfers` — Godown ↔ Outlet Stock Transfer Notes (STN) with barcode dispatch/receiving.
  - `/app/inventory/damage` — Damaged/shattered stock quarantine and Scrap Write-Off Vouchers (SWV).
  - `/app/inventory/warranty` — Brand Warranty (RMA) customer care dispatch and courier tracking.
  - `/app/procurement` — Purchase orders, partial GRN intake, and supplier payable records.
  - `/app/customers` & `/app/customers/:id` — Bakir Khata ledger, credit limits, and Customer 360° 4-Tab profile.
  - `/app/kisti` — Installment loan agreements, dual guarantor NID verification, repayment schedules.
  - `/app/buyback` — Used phone purchase, live webcam seller photo capture, police compliance undertaking form.
  - `/app/service` — Technician repair job sheets, 3x3 pattern lock widget, spare parts, 50% labor split.
  - `/app/mfs-desk` — 100% manual MFS agent float ledger (bKash/Nagad/Rocket), evening USSD balance audit.
  - `/app/personal-ledger` — Strictly segregated Amanat & Hawlat ledger (Owner only; exactly 0% store P&L impact).
  - `/app/accounts` — Cash drawers, bank accounts, OPEX expense slips, inter-account transfers.
  - `/app/closing` — Day-end blind physical cash note count, Z-Report generator, owner SMS digest.
  - `/app/hr/*` — Monthly salesperson handset targets and technician labor split payroll.
  - `/app/settings/*` — Profile, shop branding (logo/header), staff provisioning/kill-switch, security (Dual-OTP), hardware, SMS templates, and SaaS billing.

### 3.3 Host 3: Platform Admin Portal (`admin.bebsayik.com`)
- **Audience:** Bebsayik platform super administrators and support tier-3 engineers.
- **Security:** Cloudflare Turnstile + mandatory SMS/TOTP 2FA.
- **Key Views:**
  - `/admin/dashboard` — System-wide MRR, ARR, active shop tenant count, churn rate, gateway health.
  - `/admin/shops` & `/admin/shops/:id` — Tenant directory, non-destructive suspension, read-only audit log, and hotline lost-SIM emergency phone migration.
  - `/admin/subscriptions` — Plan pricing versioning, tenure discount policies, promo coupon engine.
  - `/admin/payments` — Real-time gateway webhook logs (PayStation, EPS, bKash) and manual reconciliation.
  - `/admin/audit-logs` — Central security audit trail.

---

## 4. Visual Design Direction & Design System Tokens

Bebsayik employs a tailored, high-performance design language engineered for operational software.

### 4.1 Master Color Palette & Design Tokens:
All interface colors must use standardized CSS custom properties / design tokens. Arbitrary ad-hoc hex values are strictly prohibited:

```css
:root {
  /* Surface & Neutral Foundations */
  --bg-app: #F8FAFC;              /* slate-50: Main application canvas */
  --bg-surface: #FFFFFF;          /* Pure White: Cards, tables, drawers */
  --bg-surface-subtle: #F1F5F9;   /* slate-100: Table headers, input backgrounds */
  --border-subtle: #E2E8F0;       /* slate-200: Default card and table dividers */
  --border-strong: #CBD5E1;       /* slate-300: Active inputs, modal boundaries */
  
  /* Text Typography Colors */
  --text-primary: #0F172A;        /* slate-900: High-contrast primary headings & body */
  --text-secondary: #475569;      /* slate-600: Field labels, helper descriptions */
  --text-muted: #94A3B8;          /* slate-400: Placeholders, disabled text */
  --text-inverse: #FFFFFF;        /* White on dark backgrounds */
  
  /* Brand Primary & Financial Accent (Emerald / Deep Navy) */
  --brand-primary: #0F766E;        /* teal-700: Trustworthy corporate brand */
  --brand-primary-hover: #115E59;  /* teal-800: Interactive hover state */
  --brand-accent: #0284C7;         /* sky-600: Active links, information badges */
  
  /* Semantic Status Palette */
  --success-bg: #ECFDF5;          /* emerald-50: Paid, in-stock, verified */
  --success-border: #A7F3D0;      /* emerald-200 */
  --success-text: #065F46;        /* emerald-800 */
  
  --warning-bg: #FFFBEB;          /* amber-50: Due pending, aging stock (>60d), low stock */
  --warning-border: #FDE68A;      /* amber-200 */
  --warning-text: #92400E;        /* amber-800 */
  
  --danger-bg: #FEF2F2;           /* rose-50: Defaulter, returned, cancelled, scrap */
  --danger-border: #FECACA;       /* rose-200 */
  --danger-text: #991B1B;         /* rose-800 */
  
  --info-bg: #F0F9FF;             /* sky-50: Active shift, in-transit STN, RMA brand care */
  --info-border: #BAE6FD;         /* sky-200 */
  --info-text: #075985;           /* sky-800 */
}
```

### 4.2 Typography System:
- **Font Pairing:**
  - **English UI & Numerals:** `Inter`, `Geist Sans`, or system-ui fallback (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`).
  - **Bengali UI & Thermal Print:** `Hind Siliguri` or `Noto Sans Bengali`.
- **Tabular Figures (`tnum`):** Mandatory for all financial tables, cart subtotals, cash counts, and barcode displays:
  ```css
  .font-tabular {
    font-variant-numeric: tabular-nums lining-nums;
  }
  ```
- **Type Scale:**
  - **Display (Hero):** 32px / 40px, Bold (700)
  - **Page Header:** 24px / 32px, SemiBold (600)
  - **Section Title:** 18px / 24px, SemiBold (600)
  - **Body Standard:** 14px / 20px, Regular (400)
  - **Data Table / Compact POS:** 13px / 18px, Regular (400)
  - **Badge / Micro Label:** 11px / 14px, Medium (500), Uppercase

### 4.3 Spacing, Density & Elevation:
- **Compact Density for POS:** Table row height is fixed at `40px`–`44px` to maximize visible rows on small POS laptop screens without vertical scrolling.
- **Touch Targets:** On touch viewports (mobile/tablet), interactive buttons and barcode scan triggers enforce a minimum touch bounding box of **`44px × 44px`**.
- **Shadows:** Minimalist elevation (`shadow-sm` for cards, `shadow-lg` for modals/drawers). Zero heavy drop-shadows or glow effects.

---

## 5. Layout & Navigation Principles

### 5.1 Desktop ERP Architecture (1024px–1920px):
1. **Persistent Left Sidebar (240px Collapsible to 64px):** Displays primary navigation icons and labels grouped logically (Sales, Inventory, Finance, Service, Management).
2. **Top Application Bar (56px Fixed):**
   - **Left:** Shop Logo + Dokan Selector dropdown (`[🏢 Dokan 1: Eastern Plaza ▼]`).
   - **Center:** Universal Spotlight Search input (`Ctrl+K` shortcut).
   - **Right:** Network Status Indicator (`🟢 Online` / `🟡 Offline Queue: 3`), Cash Shift Counter Float (`Shift: ৳14,250`), Notification Bell, User Avatar dropdown.
3. **Workspace Canvas:** Full viewport height calculation with independent internal scrolling on data tables, ensuring headers and action footers remain permanently pinned.

### 5.2 Mobile POS & Touch Experience (390px–844px):
- **Bottom Navigation Bar (56px):** 4 primary taps: `[POS]`, `[Inventory]`, `[Bakir Khata]`, `[More ⋯]`.
- **Camera Barcode / IMEI Scanner Floating Button:** Prominently positioned for one-thumb activation.
- **Bottom Sheet Drawers:** Checkout split payments, IMEI selection, and customer search slide up from the bottom with swipe-to-dismiss behavior.

---

## 6. Reusable Component Specification & State Contracts

All interactive UI components must implement explicit behavior contracts across all lifecycle states:

### 6.1 Component State Matrix:
| Component Name | Idle / Default State | Loading / Fetching State | Empty / Zero State | Error / Invalid State | Disabled / Forbidden State |
|---|---|---|---|---|---|
| `DataTable` | Clean rows, zebra striping | Skeleton row shimmer (`SkeletonTable`) | Friendly icon + CTA (`EmptyState`) | Retry banner with error message | Access denied lock banner |
| `Button` | Primary/secondary fill | Spinning spinner + label preserved | N/A | Shake micro-animation on error | Dimmed opacity (0.5), no pointer events |
| `ImeiScannerInput` | Autofocused, placeholder | Validating Luhn checksum spinner | N/A | Red ring: "Invalid 15-digit IMEI" | Disabled if cashier has no inventory role |
| `MoneyText` | Formatted: `৳24,500.00` | Shimmer placeholder | Shows `৳0.00` | Red highlight if negative balance | Obscured (`••••••`) if role unauthorized |
| `ShiftStatusBadge` | `🟢 Active (৳14,250)` | Pulse shimmer | `⚪ Shift Closed` | Red ring: "Discrepancy Detected" | Hidden if user not cashier/manager |
| `PatternLockWidget`| 3x3 clean touch dots | N/A | Empty dots | Reset button highlighted | Read-only mode during device delivery |

---

## 7. Key Workflow UX Requirements

### 7.1 POS & Sub-Second Counter Sales:
- **Scan-to-Cart Flow:** Laser scanner input is parsed instantly. If a 15-digit IMEI is detected, the system auto-resolves the exact handset, locks the IMEI in the cart, and sounds an audible positive beep.
- **Split Tender Calculation:** Cashiers can allocate payment across multiple tenders (e.g., `৳20,000 Cash` + `৳7,500 bKash Merchant` + `৳5,000 Customer Due`). The system computes exact change return in real-time.
- **Floor Price Lock (MSP):** If a cashier enters a discount that drops the selling price below `product_variants.minSellingPrice`, the input border turns amber and a 4-digit Manager Override PIN modal (`Modal_ManagerPinOverride`) is triggered.

### 7.2 Installment (Kisti / EMI) Contract Booking:
- **Down Payment Hybrid Allocation:** Allows part-cash and part-trade-in down payment (e.g., customer gives old phone worth ৳15,000 + ৳10,000 cash).
- **Dual Guarantor Validation:** Requires two distinct guarantor names, 11-digit verified phone numbers, and physical NID numbers before contract generation.
- **Schedule Projection:** Generates interactive amortization table displaying exact monthly due dates and automatic SMS reminder toggle.

### 7.3 Used Phone Buyback & Police Compliance:
- **Webcam Biometric Capture:** Embedded UI camera capture tool taking seller live photograph and scanning physical NID front and back.
- **IMEI Blacklist Verification:** Instant check against store database and national stolen handset registry.
- **Police Undertaking Printout:** One-click generation of the standard Bangladesh Police legal declaration form containing seller photo, NID number, device IMEIs, and seller signature box.

### 7.4 Technician Servicing Lab & 50% Maker Split:
- **Pattern Lock Recording:** Interactive 3x3 dot grid allowing cashiers to draw and record customer Android pattern lock directly on the intake job sheet.
- **Spare Part Stock Return:** If a replacement display or IC is found defective during testing, the technician can trigger a spare part return to godown stock with zero financial loss.
- **Automated Labor Split:** The system automatically calculates 50% labor commission to the technician and 50% to the store upon job completion.

### 7.5 100% Manual MFS Agent Desk:
- **Manual Merchant Entry:** Strictly manual input of customer phone, transaction type (Cash-In / Cash-Out), amount, and TrxID from physical agent phones. Zero automatic SMS scraping.
- **Evening USSD Float Audit:** Dedicated reconciliation screen comparing physical SIM float dial balance with system expected balance.

### 7.6 Segregated Personal Ledger (Amanat & Hawlat):
- **Visual Insulation:** Dedicated purple/indigo UI accent distinguishing personal transactions from store sales.
- **Strict 0.00% Store P&L Impact:** Clearly displays that personal deposits (Amanat), personal loans (Hawlat), and expenses on behalf do not alter store operating profit or cost of goods sold.

### 7.7 Day-End Blind Cash Closing:
- **Blind Note Count:** Cashiers enter physical currency note counts (৳1000, ৳500, ৳100...) without being shown the system expected cash target.
- **Reconciliation Reveal:** After count submission, the system unlocks the expected cash comparison, calculates exact variance, and prompts for owner Z-Report SMS dispatch.

---

## 8. POS Hardware & Device Integration UX

### 8.1 Thermal Receipt Printing (58mm / 80mm):
- **Direct WebUSB / Bluetooth Driver:** The app connects directly to ESC/POS thermal printers via browser WebUSB/WebBluetooth APIs without requiring third-party print spoolers.
- **Bilingual Receipts:** Prints shop header, Mushak 6.3 BIN number, invoice number, IMEI list, warranty terms, and barcode cleanly formatted.
- **Cash Drawer Solenoid Kick:** Upon committing a cash sale or pressing `F12`, the printer sends a 24V 50ms electrical pulse via RJ11 to open the cash drawer.

### 8.2 Hardware Keyboard Accelerators (`F1`–`F12`):
- All counter actions are bound to global keyboard shortcuts (documented in [`appflow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) Section 9) with visible shortcut badges on screen buttons (e.g., `[F10 Checkout]`, `[F2 Search]`).

---

## 9. Content, Localization & Accessibility Standards

### 9.1 Currency & Number Formatting:
- Bangladeshi Taka format: `৳25,400.00` (with comma separation for thousands and lakhs).
- Phone numbers: Formatted as `01711-223344` with strict 11-digit Bangladeshi mobile validation (`013`, `014`, `015`, `016`, `017`, `018`, `019`).

### 9.2 Accessibility & High-Contrast Requirements:
- **Color Contrast:** All body text meets WCAG 2.1 AA standards (minimum 4.5:1 contrast ratio against background surfaces).
- **Non-Color Indicators:** Statuses are never conveyed by color alone; every status badge includes textual labels and distinct icons (e.g., `🟢 Available`, `🔴 Sold`, `🟡 Overdue`).

---

## 10. Design Documentation Map

The complete Bebsayik platform specification is strictly organized across the following authoritative documents:

| Document File | Core System Role & Content Scope | Authoritative For |
|---|---|---|
| [`UI_UX_BLUEPRINT.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/UI_UX_BLUEPRINT.md) | **UI/UX Direction & Design System** — Visual tokens, design philosophy, component state contracts, and UX standards. | Visual styling, design tokens & UX philosophy |
| [`appflow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) | **Master Application Flow (v2.0.0)** — Route inventory, 19 ASCII wireframes, global state machines, modal directory, and hardware drivers. | **Authoritative screen layouts & navigation flows** |
| [`user-flow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/user-flow.md) | **User Journeys & Mermaid Workflows** — 34 end-to-end operational user flows with decision branches. | Step-by-step user operational journeys |
| [`prd.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) | **Hardened PRD (v6.1.0)** — 17 business modules, SaaS pricing, test cases TC-01 to TC-56. | Business requirements & acceptance criteria |
| [`DATABASE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) | **Production Database (MongoDB 7.0+)** — 36 collections, Mongoose models, Section 22 Double-Entry Posting Matrix. | Authoritative database & financial posting |
| [`database-schema.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/database-schema.md) | **Relational Reference Schema** — 43 PostgreSQL 16+ tables with Row-Level Security (RLS). | Relational comparative reference |
| [`ARCHITECTURE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/ARCHITECTURE.md) | **System Architecture Blueprint** — Infrastructure, Express backend, security, Section 15 Master RBAC matrix. | System architecture & security boundaries |
| [`idea.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/idea.md) | **Product Vision & Master Map** — Core domain ontology, business vision, and master documentation index. | Product vision & domain concepts |

---

## 11. Resolved Architectural UX Decisions (Owner Approved)

The following four strategic product design decisions have been formally reviewed, aligned, and approved by the project owner:

### 11.1 Touch POS Tablet Layout Orientation (Decision Approved)
- **Approved Policy:** **Strict Landscape Orientation Enforcement (1024×768+)**.
- **UX Implementation:** Counter POS on iPad/Android tablets enforces a fixed dual-column layout (Left 60%: Search & Cart Table; Right 40%: Split Tenders & Rapid Touch Keypad). If a tablet is rotated to portrait mode, the UI displays a gentle rotation overlay: *"Please rotate device to landscape for Counter POS operations"*.

### 11.2 Thermal Receipt Print Engine & Language Protocol (Decision Approved)
- **Approved Policy:** **Sub-0.3s Pure ESC/POS English Text Mode**.
- **UX Implementation:** To prevent counter checkout bottlenecks during rush hours, 58mm/80mm thermal receipts are printed in high-speed native ASCII/ESC/POS text mode (<0.3 seconds per invoice). Full bilingual Bengali/English receipts are generated as formatted Web PDFs and printable A4/A5 documents for customer smartphone download.

### 11.3 Manager PIN Override Interaction Model (Decision Approved)
- **Approved Policy:** **On-Screen Modal Overlay (`Modal_ManagerPinOverride`)**.
- **UX Implementation:** When a cashier attempts to apply a discount below MSP (Floor Price Lock) or waive customer credit limits, an on-screen modal overlay appears. The Store Manager physically walks over and enters their 4-digit PIN into an obscured keypad. Successful PIN entry immediately dismisses the modal and logs the manager's user ID in the audit trail.

### 11.4 Blind Day-End Closing Cash Discrepancy Protocol (Decision Approved)
- **Approved Policy:** **One-Time Recount Grace Attempt Before Permanent Lock**.
- **UX Implementation:** When a cashier finishes physical note counting and the system reveals a cash shortage or overage, the cashier is granted exactly one single recount attempt (*"Recount drawer once to double-check notes"*). Upon the second submission, the register is permanently locked, the final variance is committed to the immutable ledger, and a Z-Report SMS digest is dispatched to the Store Owner.

---

## 12. UI/UX Readiness Checklist

The UI/UX specification is certified complete and ready for implementation when:
- [x] Every approved product area has a defined route and screen inventory in [`appflow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md).
- [x] Every key workflow has complete normal and failure paths documented.
- [x] Desktop and mobile touch layouts are specified.
- [x] Loading, empty, error, and offline sync conflict states are codified.
- [x] Hardware protocols for WebUSB thermal printing, cash drawers, and barcode scanners are defined.
- [x] Master Frontend RBAC matrix maps all 7 roles to UI action buttons.
- [x] Open UX decisions are documented with explicit options for the owner's review.
