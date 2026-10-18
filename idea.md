---

## 0. Master System Architecture & Reading Order Guide
> **Official Product Name:** Bebsayik  
> **English Product Name:** Bebsayik.com  
> **Brand Attribution:** Powered by Bebsayik  
> **Primary Domain:** `https://bebsayik.com` (`app.bebsayik.com` | `admin.bebsayik.com`)  
> **Product Category:** Multi-Tenant SaaS ERP and Mobile Shop Management Software  

### 0.1 Master Documentation Inventory & File Map
The complete Bebsayik platform specification is strictly codified across the following 13 canonical English documents:

| # | File Name | Document Role & Content Scope | Authoritative For |
|---|---|---|---|
| 1 | [`idea.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/idea.md) | **Product Vision, Domain Concepts & Master Architecture Map** — Business foundation, mobile shop context, terminology, and resolved architectural decisions. | Core vision & high-level domain ontology |
| 2 | [`prd.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md) | **Hardened Product Requirement Document (v6.1.0)** — Functional scope, three-tier routing model, SaaS pricing, POS engine, and test cases TC-01 to TC-50. | Product features, SaaS pricing & UI routes |
| 3 | [`prd-analysis.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd-analysis.md) | **Functional Gap & Edge-Case Analysis** — Exhaustive operational edge cases, failure recovery, and architectural risks. | Implementation gotchas & audit baselines |
| 4 | [`Requirement Validation.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/Requirement%20Validation.md) | **Requirement Validation & Compliance Audit** — Requirement traceability, regulatory compliance, and pending decisions. | Traceability matrix & compliance |
| 5 | [`UI_UX_BLUEPRINT.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/UI_UX_BLUEPRINT.md) | **UI/UX Direction & Design System Blueprint** — Visual tokens, design philosophy, component state contracts, and UX standards. | **Visual styling, design tokens & UX philosophy** |
| 6 | [`appflow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md) | **Master Application Flow & UI/UX Navigation Blueprint (v2.0.0)** — Route inventory, 19 ASCII wireframes, global state machines, modal directory, and hardware drivers. | **Frontend screen-by-screen navigation & UI state architecture** |
| 7 | [`user-flow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/user-flow.md) | **End-to-End User Journeys & Mermaid Workflows** — 34 complete step-by-step user and system operational flowcharts. | UI/UX navigation & operational state flows |
| 8 | [`DFD.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DFD.md) | **Data Flow Diagrams & Process Logic** — Context Level-0, Level-1, Level-2 (Processes 1.0 through 17.0) and Data Dictionary. | System processes, input/output & data flows |
| 9 | [`DATABASE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) | **Production Database Specification (MongoDB Atlas 7.0+)** — 30 Mongoose schemas, compound indexes, aggregation pipelines, and Section 22 Master Financial Posting Matrix. | **Authoritative production database & Double-Entry Ledgers** |
| 10 | [`database-schema.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/database-schema.md) | **Historical Relational Schema Reference** — PostgreSQL 16+ RLS architectural baseline (Deprecated in favor of `DATABASE.md`). | Relational reference & comparative DDL |
| 11 | [`ARCHITECTURE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/ARCHITECTURE.md) | **System Architecture Blueprint** — Multi-tenancy, Next.js 14 / Express backend, security, and Section 15 Master RBAC Matrix. | Infrastructure, deployment & security boundaries |
| 12 | [`api-spec.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/api-spec.md) | **Comprehensive REST API Specification (v2.0.0)** — 30 modular endpoint controllers, request/response payloads, authentication, RBAC, idempotency, hardware drivers, and gateway webhooks. | **Authoritative backend REST API interface contracts** |
| 13 | [`CHANGELOG.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/CHANGELOG.md) | **Project Changelog & Version History** — Comprehensive audit trail of all architecture updates, branding alignments, and merges. | Historical milestones & change log |

### 0.2 Recommended Reading & Implementation Sequence
1. **Business Architecture & Vision:** Start with [`idea.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/idea.md) and [`prd.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd.md)
2. **User Experience, Screen Architecture & Process Engineering:** Proceed to [`appflow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/appflow.md), [`user-flow.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/user-flow.md) and [`DFD.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DFD.md)
3. **Data Modeling & Financial Rules:** Study [`DATABASE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/DATABASE.md) (authoritative) and inspect Section 22 Financial Posting Matrix
4. **System Architecture & Security:** Read [`ARCHITECTURE.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/ARCHITECTURE.md) and inspect Section 15 RBAC Matrix
5. **Quality Assurance & Verification:** Validate against [`Requirement Validation.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/Requirement%20Validation.md) and [`prd-analysis.md`](file:///c:/Users/conta/OneDrive/Documents/Dokan%20Management%20Software/prd-analysis.md)

---

Bebsayik: Mobile Shop Management ERP + POS SaaS (Bebsayik.com) --- IDEA.md
Official Product Name: Bebsayik
Brand / Parent Brand: Bebsayik | Brand Attribution: Powered by Bebsayik
Legacy Business Context: The initial ERP requirements and workflows originated from the Kanchan Telecom retail operation. The SaaS product is independently branded and operated as Bebsayik.com.
Purpose
This document is the product-level source of truth for planning and
building the Mobile Shop Management platform in Antigravity. It explains
the product, module scope, workflows, business rules, data integrity,
risks and recommended delivery sequence.
Technology-neutral: Do not assume or select a programming language,
framework, database, hosting provider, cloud service or payment gateway
from this document. Inspect the actual repository first. Recommend a
stack only when explicitly asked.
Build discipline: Audit first; map current functionality; identify
verified gaps; plan small testable changes. Do not rewrite a working
module simply because a fresh implementation seems easier.
1. Product vision
Build a reliable, subscription-ready Mobile Shop Management ERP +
POS (Bebsayik App) for mobile phone, gadget and accessories businesses. It is not a
generic inventory app: variant handling, IMEI/serial identity, real
stock state, device warranty, return eligibility, payment allocation and
financial reconciliation are core requirements.
The product covers POS/sales, products/variants/barcodes, IMEI/serial
inventory, procurement, customers/dues/installments, suppliers/payables,
accounts, Cash In/Out, mobile banking/MFS bookkeeping, Amanat/Hawlat,
expenses, transfers, returns/exchanges/refunds, warranty, damage/scrap,
reports, daily closing, SMS, staff permissions, audit, diagnostics and
future SaaS subscription management.
2. Non-negotiable decisions
1. Shop is the primary tenant. The Organization layer is removed.
   Do not reintroduce organization-centric ownership or workflows.
2. Every Shop is an isolated business tenant. Shop A must never access
   Shop B's records, files, reports, exports, search results, or
   background-job data.
3. Shop Owner/Admin and SaaS Platform Admin are different roles. A
   shop owner controls their own shop, not all tenants.
4. Preserve existing business behavior. Inspect routes, components,
   data model, migrations, server functions, policies and tests before
   changing anything.
5. Financial and inventory correctness outrank UI convenience. Success
   must not be shown until the authoritative operation commits.
6. Never silently overwrite posted financial or inventory history. Use
   authorized reversal/adjustment flows and preserve audit history.
7. Use precision-safe monetary arithmetic, not floating-point as the
   authoritative money calculation.
8. No stack or vendor is chosen here. Do not assume Lovable or any
   particular framework.
9. Subscription billing is managed via approved Bangladeshi gateways (PayStation, EPS Gateway, bKash) supporting 14-day Gold trial, Monthly, 6-Month, and 1-Year plans with zero-data-hostage read-only protection.
10. A page/table/function existing does not prove a module is complete. Verify its workflow, permissions, financial/stock effects, failure behavior, audit and tests.
11. Authentication is dual-platform & mobile-first: Mobile app uses device-bound 4-digit PIN (Argon2id + device hardware signature + biometrics), while Web ERP uses SMS OTP / password login.
12. Three-tier Subdomain Architecture: Public marketing portal (`bebsayik.com`), Web ERP application (`app.bebsayik.com`), and Platform Admin portal (`admin.bebsayik.com`) [Canonical domains subject to domain and SSL verification].
13. Strict Manual MFS Policy: Automated SIM scraping and background SMS reading are strictly prohibited to comply with app store privacy policies, prevent fake SMS fraud, and preserve device health. All MFS operations are 100% manual entry.
14. Personal Ledger Isolation: Amanat/Hawlat counterparties are maintained in `personal_ledger_contacts` completely isolated from store customers and suppliers. Personal transactions never touch store P&L or sales revenue.
15. Non-Destructive Tenant Suspension: Platform admin suspension halts shop staff access with a polite notification, but zero inventory, customer, or sales records are ever wiped.
3. Users
- Shop Owner / Shop Super Admin: Full control of one Shop's
  operations, staff and settings.
- Shop Admin: Operational administration within assigned
  authority.
- Manager: Daily operations, restricted sensitive settings and
  corrections.
- Sales Staff/Cashier: POS, sales, customers, due collection,
  installments, returns and warranty actions as permitted.
- Accounts Staff/Accountant: Accounts, transfers, expenses, MFS,
  Cash In/Out, reconciliation and finance reports.
- Inventory Staff: Products, variants, barcodes, stock,
  IMEI/serial, purchases and suppliers.
- Platform Admin: Future SaaS tenant, plan and platform
  operations.
- Support Agent: Restricted, time-limited, visible and audited
  support access.
Never confuse a Shop Super Admin with a global platform admin.
4. Suggested information architecture
Compare this proposal with the repository before changing navigation; do not duplicate existing pages.
1. Dashboard
2. POS (F1-F12 fast keys, Dual-IMEI selection, Change calculation, POS Agent Cash Out)
3. Sales & Quotations
4. Returns & Exchanges
5. Products: catalog, variants, categories, brands, units, images, barcodes, import
6. Inventory: current stock, IMEI/serial, stock movements, opening stock, alerts, valuation, expiry, damage, reconciliation
7. Purchases: quick purchase, drafts, purchase orders, approvals, GRN/goods receipt, landed costs, purchase returns, purchase reports
8. Customers: customer list/detail, groups, ledger, dues, due collection
9. Kisti / Installment (EMI): Agreement generation, 2 guarantors with NID/phone, payment schedule, installment collection, overdue tracker
10. Old Phone Buyback: Customer NID, photo, device condition checklist, police compliance contract, stock intake
11. Repair & Servicing: Job sheet generation, customer diagnosis, spare parts consumption, technician assignment with 50% labor commission split
12. Suppliers: suppliers, categories, ledger/payables, payments, purchase history, returns
13. Accounts & Finance: accounts, ledger, statements, transfers, Cash In/Out, cash history, expenses, daily financial, daily closing, reconciliation
14. Mobile Banking/MFS Bookkeeping: 100% manual entry, Cash In, Cash Out, agent commission, counter float reconciliation
15. Amanat/Hawlat (Personal Ledger): people/counterparties in isolated table, money given, money received, settlements, zero P&L impact
16. Warranty & Claims
17. Damage & Scrap
18. Reports & Analytics
19. SMS & Notifications
20. Staff & Permissions (Role-based capabilities)
21. Shop Settings & Hardware Configuration (Thermal printer, barcode scanner)
22. Restricted System Diagnostics
23. Subscription & Invoicing (14-day Gold trial, plan upgrade, payment gateway)
24. Platform Admin (`admin.bebsayik.com`): Tenant directory, non-destructive suspension, plan pricing snapshots, gateway webhook monitor, platform audit
25. Public Marketing Site (`bebsayik.com`): Feature showcase, pricing matrix with 6M/1Y discounts, ROI calculator, pre-launch mobile lead capture modal
Navigation should be domain-oriented, collapsible and responsive. Show
only authorized actions. Use clear breadcrumbs, loading/empty/error
states and mobile-friendly layouts.
5. Module requirements
5.1 Dashboard
Show today's sales, number of sales, purchases, profit only when COGS is
reliable, expenses, cash/account balances, customer dues, overdue
installments, supplier payables, low stock, IMEI/serial overview,
returns/refunds, damaged stock and reconciliation alerts. Every KPI must
have a documented formula, date range, timezone and inclusion/exclusion
rules. Drill-downs should reveal the source transactions.
5.2 POS and Sales
Workflow: 1. Scan barcode/product code/IMEI/serial or search product. 2.
Validate product, variant, sellable stock, IMEI uniqueness and
permissions. 3. Select customer or protected walk-in customer. 4. Apply
allowed discounts and optional configured taxes/services. 5. Show
subtotal, discount, total, amount received, amount applied, due and
change separately. 6. Choose one or more payment methods and destination
account per payment leg. 7. Validate and post sale atomically. 8.
Generate receipt and audit record.
Must support mixed payment, account selection, due/installment where
allowed, minimum selling price/discount rules, receipt printing, sale
history, and authorized edit/cancel/void. Retries must not create
duplicate sale/payment/stock movement. If held/resumed sales exist,
revalidate price and stock on resume.
Overpayment rule: For a ৳400 bill and ৳500 actually received, record
৳500 received, ৳400 applied to the sale and ৳100 returned as change. The
receiving account must reflect the real inflow. The change leg must
identify the drawer/account paying the change. Never cap the receipt at
the bill total and discard the excess from the ledger.
5.3 Sales history
Filter by date, invoice, customer, cashier, payment method, status and
IMEI/serial. Show item snapshots, discounts, payments, due, change, COGS
and return links. Reprinting must not mutate the sale. Historical
cost/profit must not silently change when current product cost changes.
5.4 Returns, exchanges and refunds
Select original sale/item; validate return quantity, prior returns,
IMEI/serial and return policy; record condition/disposition; choose
refund/exchange; select settlement account; post and reconcile
inventory, account, customer due and COGS. - Never refund more than the
eligible amount actually paid. - Unpaid due is not cash received and is
not cash-refundable. - Inspection-required devices must not
automatically become sellable. - A return reversal preserves the
original return. - Retries must not duplicate refund or stock movement.
5.5 Products, variants and barcodes
Maintain product master, variant-specific attributes (e.g. RAM, storage,
color), categories, brands, units, images, stable product codes and
barcodes. Prevent duplicate/conflicting variants. Import must provide
preview, field mapping, row-level errors, duplicate warnings and safe
retry. Archived products remain visible in history but are unavailable
for new transactions by default.
5.6 IMEI/serial
Validate at receiving, import, manual entry and sale. Prevent duplicate
active sellable identities. Track received → available → sold → returned
→ inspection/repair/restocked/supplier-returned/scrapped. Link IMEI to
variant, purchase/GRN, cost snapshot, sale, customer and warranty.
Restrict manual entry/correction. Define dual-IMEI handling explicitly.
Provide lookup, history, audit and exception reports.
5.7 Inventory
Track opening stock, GRN receipt, sale, return/disposition, adjustment,
damage/repair/scrap and supported transfers. Distinguish on-hand,
sellable, reserved, inspection and damaged stock. Manual adjustment
requires reason, actor, timestamp and before/after quantity. Apply
batch/expiry/FEFO only to relevant product types. Current stock must
reconcile to stock movements. Drift repair requires preview, permission
and audit; never silently rewrite history.
5.8 Procurement: drafts, quick purchase, PO, GRN and landed cost
Keep these concepts distinct: - Draft: unposted; does not change
official stock/payables. - Quick Purchase: simplified path with the
same integrity controls. - Purchase Order: planned/ordered
quantities and approval lifecycle. - GRN: actual received goods and
serials; posting changes stock exactly once. - Landed Cost: eligible
freight/handling allocated by a documented method. - Purchase
Return: linked to original receipt/item/cost.
Prevent Quick Purchase and PO/GRN paths from adding the same goods
twice. Approved POs and posted GRNs must not be silently edited. If
partial receiving is supported, remaining quantity/status must be
explicit. Supplier payable, stock, IMEI/serial and cost must reconcile.
5.9 Customers, dues and installments
Maintain profiles, groups if needed, customer ledger, sale-created due,
collection against one/multiple sales, partial/advance payments,
installment schedule, due dates, paid/remaining amount, overdue status,
receipts and reversals. Collection must post to the chosen account and
reduce the correct receivable atomically. Bulk collection must preview
allocation. Duplicate submissions must not duplicate collection. Protect
system walk-in records.
5.10 Suppliers and payables
Maintain supplier profile/categories, purchase history, supplier ledger,
payable, partial/full payments, returns and credits. Purchase, return,
payment and adjustment are distinct linked events. Supplier balance is
derived from these events or a rigorously reconciled projection. Manual
correction requires permission, reason and audit. Paying an existing
payable is not a new expense.
5.11 Accounts and account ledger
Support cash drawer, bank and MFS/service accounts. Provide opening
balance, active/inactive state, ledger, statement, daily/period
summaries, transfers, Cash In/Out and reconciliation. Transfers post
paired debit/credit legs atomically. Do not edit balances without ledger
events. Inactive accounts cannot accept new postings but remain readable
historically. Negative balance is blocked by default unless an explicit
policy allows it.
5.12 Cash In / Cash Out
This is a distinct workflow, not a synonym for sales and expenses. -
Cash In examples: owner capital, miscellaneous receipt, personal loan
repayment, cash withdrawn from bank. - Cash Out examples: petty cash,
staff advance, owner withdrawal, cash deposited into bank. Fields:
direction, account, amount, category, counterparty, date/time,
note/reference, optional attachment, creator/approver, status and audit.
Rules: - Bank-to-cash movement is a transfer, not revenue. - Owner
capital is not sales revenue. - Owner withdrawal is not automatically
operating expense. - Staff advance may be a receivable until
settled/classified. - Expense posting and cash reduction must not be
duplicated. - Void/correction preserves original history.
5.13 Mobile Banking / MFS
Unless explicitly approved, this module means shop-side bookkeeping
and reconciliation, not executing real transactions on a provider
network. Do not claim provider API integration without a separately
approved scope and provider documentation. Record service/operator,
service account/agent identifier, transaction reference, customer/agent
details where needed, principal, customer fee, agent commission,
provider fee, net settlement, linked account legs, status
(pending/success/failed/reversed), actor and timestamps. Rules: -
Principal, fee, commission and net settlement are different values. -
MFS balance and cash-drawer movements must be linked and reconcilable. -
Failed/reversed transactions must not remain successful or leave
uncorrected financial effects. - Duplicate references should warn/reject
according to policy. - API credentials must never be exposed to the
client.
5.14 Amanat / Hawlat --- Personal Ledger
Track money the shop gives to or receives from a person, separately from
customer dues and supplier payables. Fields: person/counterparty,
direction/type, principal, date, due date if relevant, linked account
transaction if money moved, note/reference, creator/approver, settlement
links and audit. Rules: - Money lent by the shop generally creates a
receivable; money borrowed by the shop generally creates a payable. - A
note without real cash movement must not change account balance. -
Repayment reduces the correct personal balance and posts to the actual
account. - Support partial settlements. - Do not mix this ledger with
sales revenue, operating expense, customer due or supplier due. - Do not
add interest/charges without explicit approval. - Corrections must
preserve history.
5.15 Expenses
Expense categories, date, amount, account, payee, note/reference,
optional attachment/approval, category/date/account reports and
audit-safe edit/void. Expense posting and account reduction are linked
atomically. Supplier payable settlement, owner withdrawal, loan
principal repayment and account transfer must not automatically become
operating expenses.
5.16 Daily Financial, Daily Closing and Reconciliation
Show opening balance, inflows/outflows by category/account, sales
receipts, refunds, due collections, supplier payments, transfers,
expected closing balance, counted physical cash, variance, notes and
responsible user. Lock/unlock requires permission. Counted cash and
calculated balance are distinct; mismatches must be visible rather than
auto-corrected.
5.17 Warranty and service
Link claim to original sale and IMEI/serial; validate coverage; track
assigned staff, diagnosis, status, vendor/manufacturer, service cost and
resolution. Replacement inventory/accounting must be separate events. Do
not assume all products share a warranty policy.
5.18 Damage and scrap
Record reason/evidence, quarantine damaged unit, remove it from sellable
stock, track repair/return-to-stock/supplier-return/write-off/scrap.
Scrap requires a specific capability and audit. Supplier recovery must
not double-count loss.
5.19 Reports and exports
Preserve and define: sales summary/detail/item report; purchase summary,
purchase reports and supplier-item report; profit trend and COGS
integrity; expenses/cash flow; daily closing/daily financial;
transactions and account-wise reports;
account/customer/supplier/personal ledgers; due aging/installment
overdue; stock valuation/dead stock/brand stock/reconciliation;
IMEI/serial; warranty/damage/returns; staff performance; SMS logs;
audit/diagnostic exports. Every report needs a formula, source records,
filters, timezone, void/return handling, permissions, export format and
reconciliation total. Never invent formulas or show inconsistent
definitions across pages.
5.20 SMS, notifications and print
SMS provider/sender configuration, templates, trigger rules, reminders,
logs, retries, quota and duplicate-send protection. Define
consent/opt-out as appropriate. SMS failure must not roll back a
financial transaction. Invoice/receipt templates support shop branding
and stable numbering. Reprint must not mutate source transaction. Define
supported PDF/browser/thermal-printer behavior.
5.21 Staff, permissions and audit
Maintain module permissions plus fine-grained capabilities. High-risk
actions include delete/void/cancel, edit posted sale/purchase, financial
edit, manual stock adjustment, manual due collection, manual IMEI/serial
entry, manual transaction/balance correction, barcode override, warranty
service, damage and scrap. - Default deny for ungranted capabilities. -
Frontend visibility is not authorization; enforce on the server. - Audit
actor, tenant, action, target, timestamp, reason and before/after
summary. - Staff deactivation must not delete historical attribution. -
Support access must be scoped, time-limited, visible and audited.
5.22 System diagnostics and repair
Source architecture lists Audit Logs, System Health, IMEI Audit, Fresh
Stock Reset, Accounts Fresh Start, Inventory Diagnostics, Purchasing
Diagnostics, Drift Alerts, Stock Movements Export, System Configuration
and Certification Audit. These are restricted tools. For
destructive/repair operations: verify permission and re-authentication;
show impact report; preview/dry-run; confirm target Shop and action;
preserve recovery point where feasible; record before/after; rerun
reconciliation. Never expose internal debug data or cross-tenant
diagnostics to ordinary users.
6. Financial Posting Matrix --- must be produced before changing posting logic
For every operation, document: preconditions; source document; account
inflow/outflow or debit/credit legs; customer/supplier/personal ledger
effect; stock effect; COGS/profit effect; idempotency key; permission;
reversal method; audit fields; reconciliation test.
Initial rules: - Cash sale: selected account receives actual amount;
stock decreases; sale and COGS are recorded. - Sale with due: only
actual receipt enters the account; unpaid amount becomes customer
receivable. - Sale overpayment: received, applied and change are
separate values and legs. - Customer due collection: receiving account
increases and correct receivable decreases. - Supplier payment: account
decreases and payable decreases; do not duplicate expense. - Account
transfer: source debit and destination credit atomically. - Bank cash
withdrawal/deposit: transfer between accounts, not revenue/expense by
default. - Owner capital: account increases with capital classification
under the approved accounting model. - Owner withdrawal: account
decreases; not automatically operating expense. - MFS: principal, fees,
commission and settlement are separate. - Amanat/Hawlat: create
receivable/payable; account changes only when linked money moves. -
Expense: expense and account posting occur once. - Purchase/GRN: stock
and supplier payable/cash reflect actual receipt/payment terms. -
Purchase return: stock and supplier payable/refund reconcile. -
Return/refund: never exceed eligible amount actually paid; stock, due
and COGS remain consistent. - Void: preserve original and post a linked
compensating event.
This is a starting matrix, not a complete accounting specification. Tax,
debit/credit classification, rounding and profit treatment require
product-owner approval.
7. SaaS Subscription, Portals & Multi-Gateway Architecture
Bebsayik.com adopts an enterprise-grade multi-tenant architecture powered by Bebsayik (`bebsayik.com`):
- Three-tier Subdomain Routing:
  1. `bebsayik.com`: Static/SSR Marketing website hosted on CDN. Features feature showcases, plan matrix with 6M (-10%) & 1Y (-16%) discounts, interactive ROI calculator, pre-launch App Store/Play Store lead capture drawer, and cardless 14-day Gold trial onboarding.
  2. `app.bebsayik.com`: Tenant Web ERP application. Multi-tenant with strict tenant isolation, POS, inventory, finance, and settings.
  3. `admin.bebsayik.com`: Super-admin platform operations portal. Tenant directory, non-destructive suspension (account locked with notice, zero business data wiped), plan versioning & pricing snapshotting, gateway webhook health monitor, and platform audit logs.
- Subscription Plans: Lifetime Free (within limits), Premium (৳499/mo), Gold (৳999/mo), and Diamond (৳1,999/mo).
- Discounted Multi-Month Tiers: 6-Month plans (10% discount) and 1-Year plans (16% discount).
- Payment Gateways: Integrated via PayStation Bangladesh (Aggregator), EPS Gateway (Bank/Cards), and bKash Direct Merchant API.
- Lifecycle & Grace Period: 14-day Gold trial -> Grace period (3 days) -> Read-only protection (no business hostage, zero data loss, past records, dues and ledger exports remain accessible).
- Platform admin controls global plans and pricing snapshots, while Shop Owners manage their own tenant subscription.
8. Tenant isolation and data ownership
Every business record belongs to one Shop unless explicitly
platform-level. All reads/writes---including APIs, server functions,
reports, exports, storage, background jobs and search---must enforce
Shop membership. Missing/invalid Shop context fails closed. Never trust
a client-supplied shop identifier without server-side checks. Tenant
exports contain only that Shop's permitted data. Platform plans must not
create a backdoor into Shop business data.
9. Data integrity, security and reliability
- Precision-safe money; atomic related postings; idempotency for
  retries, webhooks and jobs.
- Immutable posted ledger history or equivalent audit-safe event
  history.
- Server-authoritative COGS and historical cost snapshots.
- Unique active IMEI/serial constraints and atomic stock
  claim/decrement.
- Backend authorization, least privilege, default deny, rate limiting
  and secure session recovery.
- Secrets never in source code or client bundle.
- Automated backups, tested restore, monitoring, error alerts and
  recovery runbooks.
- Offline POS Boundary: Serialized Dual-IMEI devices strictly require an active internet connection to prevent cross-counter multi-terminal duplicate sales. Offline queue (IndexedDB) is strictly limited to non-serialized accessories.
- Remote Device Revocation: If a staff mobile phone is lost or stolen, the Shop Owner can instantly revoke its access from Web ERP Settings, terminating active JWT sessions and marking the device inactive in `user_devices`.
- Reprint Idempotency: Printer paper jams or reprint requests must increment `reprint_count` and print `*** DUPLICATE REPRINT (COPY #N) ***` without creating any duplicate ledger, cash drawer, or stock movement.
- Gateway 3-Minute Sweeper: Any delayed or dropped webhook from PayStation or EPS is automatically resolved via a 3-minute background poller querying the gateway transaction status API.
- Define measurable performance targets after auditing the actual implementation and expected load.
10. Acceptance tests
1. Shop A cannot access Shop B through UI, direct request, file URL,
   export, search or background job.
2. Unauthorized capabilities fail at the backend.
3. ৳400 bill/৳500 received records 500 received, 400 applied and 100
   change with correct account legs.
4. Unpaid due is never recorded as cash received.
5. Duplicate POS submission creates no duplicate sale/payment/stock
   decrement.
6. Due collection updates the correct customer and account once.
7. Supplier payment reduces payable and account once without
   double-counting expense.
8. Transfer posts both legs or neither.
9. MFS failed/reversed transaction leaves no unreconciled successful
   posting.
10. Amanat/Hawlat partial settlement updates the person balance and
    cash/account only when appropriate.
11. Duplicate GRN post does not duplicate stock or payable.
12. Duplicate IMEI cannot become two active sellable units.
13. Refund does not exceed eligible actually paid amount.
14. Void preserves original and creates an auditable reversal.
15. Reconciliation identifies source transactions behind a mismatch.
16. Future subscription webhook is idempotent when implemented.
17. Restore drill verifies recovery targets and financial/inventory
    consistency.
11. Architectural Decisions Status Registry

### 11.1 Formally Resolved Decisions (Codified in PRD, ARCHITECTURE & DATABASE)
- **Full Double-Entry Accounting vs Subledgers:** DECIDED. Complete Chart of Accounts with immutable append-only double-entry journal vouchers (`account_ledgers`, `JV-YYYYMM-XXXXXX`) across all financial events.
- **MFS Bookkeeping Policy:** DECIDED. 100% manual entry. Automated SIM reading or SMS scraping is strictly prohibited.
- **Offline POS Policy:** DECIDED. Serialized Dual-IMEI devices strictly require online connectivity. Only non-serialized accessories are permitted in encrypted client-side IndexedDB queue.
- **COGS and Margin Calculation:** DECIDED. Specific Identification Costing tied to each handset's unique 15-digit IMEI. Accessories utilize Weighted Average landed cost.
- **Branches and Warehouses Scope:** DECIDED. Showroom Counter + Central Godown with Stock Transfer Notes (STN) and receiving verification.
- **Subscription Pricing & Enforcement:** DECIDED. Free, Premium (৳499), Gold (৳999), Diamond (৳1,999) with 10% 6-Month and 16% 1-Year discounts. 14-day Gold trial, 3-day grace period, followed by non-destructive Read-Only mode.
- **Negative Balance & Overdraft Policy:** DECIDED. Strict zero negative cash drawer balance enforced; cash out blocked if physical cash is insufficient.
- **Currency Precision:** DECIDED. IEEE 754-2008 `Decimal128` used across all database monetary fields with 2 decimal places precision.
- **SMS Provider & Infrastructure:** DECIDED. Dual-gateway architecture (SSL Wireless primary, BulkSMS BD / Greenweb secondary failover) with rate limits.
- **Registered Mobile Number Migration:** DECIDED. Two-phase Dual-OTP handshake (180s TTL) for active numbers; lost/stolen SIM recovery verified via NID & Platform Super Admin audit ticket.
- **Multi-Shop Account Federation:** DECIDED. Single registered owner telephone number can manage multiple independent shops via top-level Workspace Switcher issuing scoped tenant JWTs.
- **Web Password Recovery & Brute-Force Rate Limiting:** DECIDED. SMS OTP recovery protected by Cloudflare Turnstile and 3 OTP/15m limit; password reset triggers global session kill via `tokenVersion`.
- **Staff Account Lifecycle & Emergency Termination:** DECIDED. Invitation via temporary one-time PIN; emergency termination with instant POS counter lockout in <1 second.

### 11.2 Open Strategic Decisions (Pending Future Product Phases)
- **Amanat/Hawlat Interest/Charge Policy:** Default policy remains strict 0.00% interest/charge. Any profit/markup mechanism requires formal merchant legal/Shariah review.
- **External Integration Connectors:** Scope of automated external accounting sync (e.g. Tally / QuickBooks) versus native Bebsayik Excel/CSV streaming exports.
12. Recommended implementation sequence
Phase 0 --- Repository audit
Inspect routes, components, data model, migrations, server functions,
policies, tests and configuration. Produce a feature inventory:
implemented and verified, partial, UI-only, backend-only, missing,
broken, duplicate or unknown. Map modules and identify source-of-truth
records/functions. Do not make broad changes during audit.
Phase 1 --- Requirement and architecture plan
Produce a requirements-to-test matrix, module/page inventory,
role-permission matrix, financial posting matrix, entity/data ownership
map, existing-vs-missing gap register, risk register and phased plan. Do
not migrate or select technology without approval.
Phase 2 --- Critical integrity gaps
Fix only verified critical defects: tenant isolation/permission bypass,
POS received/applied/change accounting, duplicate posting, IMEI
uniqueness, stock reconciliation, customer/supplier/personal balance
integrity, return/refund and COGS. Prefer additive and
backward-compatible changes.
Phase 3 --- Confirmed missing business workflows
Implement verified gaps in Cash In/Out, Mobile Banking/MFS,
Amanat/Hawlat, Daily Financial/reconciliation, settlements and any
missing procurement, warranty, damage, expiry or reporting workflows.
Each requires UI, backend rules, permissions, audit, report and tests.
Phase 4 --- UX and reporting completeness
Align navigation with permissions, improve mobile POS/scanning, document
report formulas, reconcile report totals, complete
print/SMS/export/error states.
Phase 5 --- SaaS layer planning
Design future plan/entitlement state machine. Do not activate billing,
paid-plan enforcement or automatic suspension until explicitly approved.
Define backup/recovery, export, cancellation and support policy before
public scale.
Phase 6 --- Release verification
Run unit/integration/end-to-end tests, tenant isolation and
permission-negative tests, concurrency/retry tests, financial/inventory
reconciliation, backup restore drill and release checklist. Report known
limitations honestly.
13. Antigravity working instructions
Before coding: 1. Read this idea.md completely. 2. Inspect the actual
repository and infer the existing stack from files/configuration; do not
guess. 3. Summarize current architecture and module status. 4. Compare
the repository against this document. 5. List exact gaps, risks and
areas likely to change. 6. Propose a small ordered implementation plan
with tests and expected effects. 7. Ask for approval when decisions
affect financial semantics, tenant model, data migration, subscription
behavior or destructive operations.
During coding: - One coherent change at a time; small, reversible,
backward-compatible changes. - Do not rename/delete tables, functions or
routes merely to simplify code. - Do not create duplicate modules or
competing sources of truth. - Do not invent fake data to hide
integration failure. - Do not claim success until relevant tests and
reconciliation checks pass. - Update documentation/tests with every
behavior change.
At the end of each phase, report what changed, what was not changed,
affected files, data migration impact, tests/results, reconciliation
evidence and remaining risks.
14. Definition of Done
A module is complete only when its workflow is documented; UI has
loading/empty/validation/success/failure states; backend permissions and
tenant ownership are enforced; financial/stock effects are explicit and
tested; retries are safe; corrections preserve history; reports
reconcile to source records; happy-path, permission-denied and
failure-path tests pass; and limitations are documented.
Final product definition
Bebsayik App is a Shop-centric, subscription-ready Mobile Shop Management ERP + POS
for mobile, gadget and accessories businesses. Each Shop is an isolated
tenant. It integrates POS, IMEI/serial inventory, procurement,
sales/returns, customer dues/installments, supplier payables, accounts,
Cash In/Out, MFS bookkeeping, Amanat/Hawlat, expenses, warranty/damage,
reports, SMS, staff permissions, audit and diagnostics. The foundation
is financial correctness, stock integrity, tenant isolation and
traceable workflows. Subscription billing remains a future layer until
explicitly approved.
Primary principle: Build a trustworthy business system first. Add a
feature only after its data ownership, workflow, permissions, financial
effects, failure behavior and tests are defined.