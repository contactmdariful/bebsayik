# Final Gap Analysis Report: Bebsayik (Bebsayik.com)
## Final Gap Analysis — idea.md + prd.md + prd-analysis.md

**Official Product Name:** Bebsayik  
**Parent Brand:** Bebsayik | **Brand Attribution:** Powered by Bebsayik  
**Legacy Business Context:** The initial ERP requirements and workflows originated from the Kanchan Telecom retail operation. The SaaS product is independently branded and operated as Bebsayik.com.  
**Analyst:** Senior Product Architect & ERP Domain Specialist  
**Date:** October 2026  
**Baseline Documents:** `idea.md`, `prd.md`, `prd-analysis.md`  
**Total Gaps Identified:** 24 (Critical: 8, Important: 10, Minor: 6)

---

## Gap Severity Definitions

| Severity | Definition | Business Impact |
|---|---|---|
| 🔴 **Critical** | Absence directly causes financial loss, ledger corruption, or legal risk | Must be resolved before implementation starts |
| 🟡 **Important** | Absence creates severe usability issues, merchant friction, or manual overhead | Must be resolved during Phases 1–3 |
| 🟢 **Minor** | Value-add enhancements that are non-blocking for initial operation | Can be added in Phase 4+ |

---

## 🔴 Critical Gaps (8 Items) — Immediate Resolution Required

### Critical Gap 1: Purchase Return to Vendor (PRV) Completely Missing
- **Problem:** Returning defective or unsold phones to suppliers is a daily reality in retail mobile shops.
  - What happens when a serialized phone with Dual-IMEI is returned? Where does stock route? What is the IMEI status transition?
  - How is the net settlement calculated against outstanding supplier payables?
- **Requirements:**
  - Purchase Return Voucher (PRV) workflow.
  - IMEI Status Transition: `SOLD` / `AVAILABLE` → `RETURNED_TO_SUPPLIER`.
  - Supplier Ledger Impact: Original GRN Credit netted against PRV Debit.
  - Landed Cost Reversal: Exact reversal of pro-rata landed costs allocated during intake.

---

### Critical Gap 2: Sales Return & Refund Financial Logic Ambiguous
- **Problem:** Early documentation mentions "Sale Return (Refund)" without answering crucial accounting questions:
  - If a customer purchased on credit, does the return reduce their due balance or disburse cash?
  - If purchased via installment (Kisti), what happens to remaining unpaid installment schedules?
  - What status does a returned IMEI transition to? Does it enter direct stock or an inspection quarantine?
  - In product exchanges/swaps, how are the respective COGS and gross margins recorded?
- **Requirements:** Authoritative Return/Exchange Decision Tree explicitly mapping refund accounting per payment tender.

---

### Critical Gap 3: Opening Balance & First-Day Setup Wizard
- **Problem:** When an existing retailer adopts Bebsayik.com, there was no documented ingestion workflow for legacy stock, dues, and cash float.
  - How does a store ingest 50 handsets currently in stock, 8 customers owing ৳3,00,000, and ৳50,000 drawer cash?
- **Requirements:**
  - **Opening Stock Entry:** Bulk scan/Excel ingest of IMEIs/Serials with landed purchase costs.
  - **Opening Account Balances:** Initial liquid balances across cash drawers, banks, and MFS float SIMs.
  - **Opening Customer Dues:** Legacy unpaid customer balance schedule.
  - **Opening Supplier Payables:** Legacy vendor debts.
  - **Equity Offset:** Net difference posted to Opening Owner Equity with zero P&L distortion.

---

### Critical Gap 4: Damage & Scrap (Loss Write-Off) Module Missing
- **Problem:** While `idea.md` detailed damage handling (Section 5.18), it was omitted from early PRD drafts.
  - How are broken screens, water damage, or transit destruction written off?
  - How does the loss post to the Profit & Loss statement?
  - Are scrapped IMEIs permanently blacklisted from re-entry?
- **Requirements:**
  - Damage Quarantine Module: Intake logging with photo evidence.
  - Scrap Write-Off Voucher (SWV): Stock decrement + P&L `Loss on Damaged Stock` debit posting.
  - Permanent status lock: IMEI transitions to `SCRAPPED` with future sales/transfers blocked.

---

### Critical Gap 5: Cost of Goods Sold (COGS) Methodology Unspecified
- **Problem:** PRD referenced "Cost Snapshot" without defining inventory costing rules across serialized vs non-serialized goods.
  - **FIFO (First In First Out):** In tech markets where prices drop, FIFO can overstate margins or distort specific unit margins.
  - **Weighted Average:** Unsuitable for serialized phones where identical models have different purchase costs.
  - **Specific Identification (Serialized):** Tracks exact landed cost of the specific IMEI scanned at checkout — essential for mobile phones.
- **Requirements:** Enforce Specific Identification COGS for serialized phones and FIFO/Weighted Average for non-serialized accessories.

---

### Critical Gap 6: Subscription Payment Mechanism Unspecified
- **Problem:** Freemium SaaS model specifies ৳0–৳1,999/mo tiers, but omitted payment infrastructure:
  - Which payment gateways process subscriptions? (PayStation, EPS, bKash)
  - What grace period applies upon payment failure?
  - How do webhooks process callbacks idempotently?
- **Requirements:** Codify SaaS Billing State Machine: `TRIAL` → `ACTIVE` → `GRACE_PERIOD` → `READ_ONLY` → `REACTIVATED`.

---

### Critical Gap 7: Data Migration & Data Portability Policy Missing
- **Problem:** Merchants fear vendor lock-in and will hesitate to subscribe without a data portability guarantee.
- **Requirements:**
  - **Full Data Export:** Self-service one-click CSV/Excel archive generation available anytime.
  - **Data Retention Guarantee:** 12-month read-only archive retention post-subscription expiry; zero sudden record deletion.

---

### Critical Gap 8: Concurrent Device Session Policy on Free Tier
- **Problem:** Free Plan specifies "1 User (Owner)", but lacks device boundary definitions:
  - Can the owner maintain active sessions on both mobile app and laptop?
  - How are concurrent cart conflicts resolved across browser tabs?
- **Requirements:** Define clear session management, device binding, and cart locking rules.

---

## 🟡 Important Gaps (10 Items) — Resolve in Phases 1–3

### Important Gap 1: Shelf Life & Batch Tracking for Accessories
- **Problem:** Batteries, power banks, and adhesives have shelf lives; expired accessories risk merchant liability.
- **Requirements:** Batch number, manufacturing date, and expiry alert fields for non-serialized consumables.

---

### Important Gap 2: Partial Purchase Order Receiving (Partial GRN)
- **Problem:** Suppliers frequently deliver purchase orders in split shipments (e.g., 30 of 50 units today, 20 tomorrow).
- **Requirements:**
  - Partial GRN receiving setting PO status to `PARTIALLY_FULFILLED`.
  - Linked follow-up GRN tracking for remaining units.

---

### Important Gap 3: Installment Default & Guarantor Collateral Management
- **Problem:** Actions required when an installment customer becomes non-responsive or defaults.
- **Requirements:** Default status tracking, guarantor contact logs, and legal recovery notes. (Note: External device-locking is excluded from core SaaS scope).

---

### Important Gap 4: Dashboard Date Range Filtering
- **Problem:** Early mockups only showed "Today" metrics, while owners require comparative weekly/monthly views.
- **Requirements:** Date range selector: Today / This Week / This Month / Custom Date Range.

---

### Important Gap 5: Supplier Advance Payments
- **Problem:** Wholesale distributors in Bangladesh frequently require 30%–50% advance deposits prior to dispatch.
- **Requirements:** Supplier Advance Payment Voucher (Asset) reconciling against subsequent GRN payables.

---

### Important Gap 6: Comprehensive Employee & Payroll Management
- **Problem:** Staff commission was mentioned without supporting employee profile and tenure tracking.
- **Requirements:** Staff profile records (hire date, role, base salary, commission tiers) and historical preservation upon deactivation.

---

### Important Gap 7: SaaS Platform Admin Console Capabilities
- **Problem:** Super Admin panel functionality was undefined in early drafts.
- **Requirements:** Define platform admin portal: MRR/churn metrics, audited support impersonation, and non-destructive shop suspension.

---

### Important Gap 8: Reorder Points & Automated PO Suggestions
- **Problem:** Low stock alerts lacked automated procurement triggers.
- **Requirements:** Reorder level thresholds with auto-generated Draft PO recommendations.

---

### Important Gap 9: User-Facing Security Audit Log UI
- **Problem:** Database audit tables existed without a merchant-facing dashboard.
- **Requirements:** Searchable, filterable audit log interface with automated SMS alerts for high-risk actions.

---

### Important Gap 10: Hardware Setup Wizard
- **Problem:** Setting up ESC/POS thermal printers, barcode scanners, and cash drawers is challenging for non-technical Dokandars.
- **Requirements:** Step-by-step Hardware Setup Wizard in Settings (test print, drawer pulse kick, scanner wedge calibration).

---

## 🟢 Minor Gaps (6 Items) — Deferred to Phase 4+

### Minor Gap 1: Bundle / Combo Offer Engine
- Logic for bundling handsets with accessories (e.g., phone + glass protector + charger discount).

### Minor Gap 2: Customer Loyalty & Reward Points
- Point accrual and redemption engine for repeat retail customers.

### Minor Gap 3: Multi-Channel Messaging (WhatsApp & Email)
- Expanding transactional receipts beyond SMS to WhatsApp Business API and Email.

### Minor Gap 4: Multi-Currency & Cross-Border Support
- Multi-currency rate conversion engine for future regional expansion.

### Minor Gap 5: POS Keyboard Shortcut Map
- Formalized `F1`–`F12` keyboard shortcut mapping across all POS modal screens.

### Minor Gap 6: Dark Mode & Tablet-Optimized Responsive POS
- Touch-first responsive layouts tailored for 10-inch Android/iPad POS counters.

---

## Summary Gap Inventory Table

| # | Gap Title | Severity | Affected Modules | Target Phase |
|---|---|---|---|---|
| 1 | Purchase Return to Vendor (PRV) Missing | 🔴 Critical | Procurement, Stock, Supplier Ledger | Phase 3 |
| 2 | Sales Return/Refund Accounting Logic Ambiguous | 🔴 Critical | POS, Customer Ledger, COGS | Phase 2 |
| 3 | Opening Balance & Day-1 Setup Wizard Missing | 🔴 Critical | Core Ledgers, Inventory | Phase 0/1 |
| 4 | Damage & Scrap Write-Off (SWV) Missing | 🔴 Critical | Inventory, P&L Statement | Phase 6 |
| 5 | COGS Methodology Unspecified (Specific vs FIFO) | 🔴 Critical | Financial Reports | Phase 0 |
| 6 | SaaS Subscription Billing Architecture Unspecified | 🔴 Critical | SaaS Billing, Gateways | Phase 8 |
| 7 | Data Portability & Retention Policy Missing | 🔴 Critical | Platform Core | Phase 7 |
| 8 | Concurrent Device Login & Session Policy | 🔴 Critical | Auth & Sessions | Phase 1 |
| 9 | Batch / Shelf-Life Expiry Tracking | 🟡 Important | Inventory | Phase 6 |
| 10 | Partial Purchase Order Receiving (GRN) | 🟡 Important | Procurement | Phase 3 |
| 11 | Installment Default & Guarantor Action Logs | 🟡 Important | Kisti / EMI Module | Phase 4 |
| 12 | Dashboard Dynamic Date Range Selector | 🟡 Important | Dashboard & Analytics | Phase 1 |
| 13 | Supplier Advance Payment Vouchers | 🟡 Important | Procurement, Accounts | Phase 3 |
| 14 | Employee Profile & Payroll Ledger Lifecycle | 🟡 Important | Staff & HR | Phase 5 |
| 15 | Central Platform Admin Console Specification | 🟡 Important | SaaS Admin Platform | Phase 8 |
| 16 | Reorder Point Thresholds & Draft PO Suggestions | 🟡 Important | Inventory Management | Phase 6 |
| 17 | Merchant-Facing Audit Log UI & Security Alerts | 🟡 Important | System Diagnostics | Phase 7 |
| 18 | POS Hardware Setup Wizard (Printer/Drawer/Scanner)| 🟡 Important | Shop Settings | Phase 1 |
| 19 | Bundle & Combo Discount Engine | 🟢 Minor | POS Sales | Phase 4 |
| 20 | Customer Loyalty & Reward Point Program | 🟢 Minor | Customer Management | Phase 5 |
| 21 | WhatsApp & Email Receipt Dispatch | 🟢 Minor | Notifications | Phase 7 |
| 22 | Multi-Currency & FX Engine | 🟢 Minor | Financial Engine | Future v2 |
| 23 | POS Keyboard Shortcut Map (`F1`–`F12`) | 🟢 Minor | POS Terminal | Phase 2 |
| 24 | Tablet-Optimized Responsive POS UI | 🟢 Minor | POS Frontend | Phase 2 |

---

## Three-Way Document Cross-Check Matrix

This matrix traces alignment between `idea.md`, `prd-analysis.md`, and `prd.md` (v6.0.0):

| Domain / Capability | idea.md | prd-analysis.md | prd.md v6.0.0 | Status |
|---|---|---|---|---|
| Dual-IMEI Engine | ✅ Specified | ✅ Detailed | ✅ Complete | Fully Resolved |
| Purchase Return (PRV) | ✅ Mentioned | ❌ Gap Flagged | ✅ Codified (Sec 6.4) | Fully Resolved |
| Old Phone Trade-In | ✅ Specified | ✅ Detailed | ✅ Codified (Sec 6.6) | Fully Resolved |
| Damage & Scrap (SWV) | ✅ Sec 5.18 | ❌ Gap Flagged | ✅ Codified (Sec 6.11) | Fully Resolved |
| COGS Methodology | ⚠️ Ambiguous | ❌ Gap Flagged | ✅ Specific ID + FIFO | Fully Resolved |
| Opening Balance Wizard | ❌ Missing | ❌ Gap Flagged | ✅ Codified (Sec 5.2) | Fully Resolved |
| Kisti / EMI Engine | ✅ Specified | ✅ Guarantors added | ✅ Codified (Sec 6.7) | Fully Resolved |
| Installment Default Actions | ❌ Missing | ❌ Gap Flagged | ✅ Codified (Guarantor log)| Fully Resolved |
| MFS Agent Dual-Role Desk | ✅ Specified | ✅ Detailed | ✅ 100% Manual Policy | Fully Resolved |
| Amanat & Hawlat Isolation | ✅ Specified | ❌ Gap Flagged | ✅ Strict Entity Isolation| Fully Resolved |
| Flexiload SIM Float Desk | ✅ Specified | ❌ Gap Flagged | ✅ Codified in COA | Fully Resolved |
| Repair Job Sheet Engine | ❌ Missing | ✅ Gap Flagged | ✅ 50% Labor Split | Fully Resolved |
| Staff Target & Commission | ❌ Missing | ✅ Gap Flagged | ✅ Codified (Sec 6.13) | Fully Resolved |
| Anti-Theft Guardrails | ❌ Missing | ✅ Gap Flagged | ✅ Manager PIN + Audits | Fully Resolved |
| Supplier Advance Vouchers | ❌ Missing | ❌ Gap Flagged | ✅ Codified in COA | Fully Resolved |
| SaaS Freemium Lifecycle | ❌ Missing | ❌ Gap Flagged | ✅ PayStation, EPS, bKash | Fully Resolved |
| Data Portability Guarantee | ⚠️ Mentioned | ❌ Gap Flagged | ✅ CSV/Excel + 12mo Read | Fully Resolved |
| Central Platform Admin | ✅ Mentioned | ❌ Gap Flagged | ✅ admin.bebsayik.com | Fully Resolved |
| Offline POS Resilience | ❌ Missing | ✅ Gap Flagged | ✅ IndexedDB Non-serialized| Fully Resolved |

---

## Prioritized Action Plan & Verification

### Resolved in Master Documentation:
1. **Authoritative COGS Model:** Specific Identification for serialized Dual-IMEI units; FIFO for non-serialized accessories.
2. **Opening Balance Wizard:** Day-1 onboarding reconciling legacy inventory, dues, payables, and owner equity.
3. **Purchase Return Workflow (PRV):** Complete IMEI status transition to `RETURNED_TO_SUPPLIER` with supplier payable netting.
4. **Sales Return Decision Tree:** Deterministic inspection quarantine and tender-specific refund logic.
5. **Damage & Scrap Module:** Scrap Write-Off Vouchers with `Loss on Damaged Stock` P&L postings.
6. **SaaS Billing Architecture:** 3-tier gateway adapters (PayStation, EPS, bKash) with non-destructive grace and read-only modes.
7. **Strict Prohibition of SIM/SMS Scraping:** Codified 100% manual merchant bookkeeping across all MFS workflows.

*This report represents the comprehensive technical gap analysis reconciling all foundational project documentation for Bebsayik.com (Powered by Bebsayik).*
