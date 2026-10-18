# Bebsayik.com — Cloudflare Edge CDN & Security Architecture Guide

**System:** Bebsayik.com — Multi-tenant SaaS ERP Platform  
**Target:** Cloudflare Edge CDN, DNS Routing, TLS 1.3, Strict HSTS, WAF & DDoS Shield  
**Version:** 2.0.0 (Hardened Production Standard)  

---

## 1. Domain & DNS Routing Matrix

Bebsayik operates on the canonical top-level domain `bebsayik.com` with isolated host boundaries across dedicated subdomains:

| Subdomain | Proxy Status | Target Ingress | Service / Application Description |
| :--- | :---: | :--- | :--- |
| `bebsayik.com` | **Proxied (Orange Cloud)** | Nginx Container (Web) | Public Marketing Landing, Feature Showcase, Pricing Calculator |
| `www.bebsayik.com` | **Proxied (Orange Cloud)** | Nginx Container (Web) | Canonical 301 Redirect to `bebsayik.com` |
| `app.bebsayik.com` | **Proxied (Orange Cloud)** | Nginx Container (Web) | Tenant Web ERP, Counter POS Terminal, Customer 360°, Servicing |
| `admin.bebsayik.com` | **Proxied (Orange Cloud)** | Nginx Container (Web) | Platform Super Admin Portal (Tenant Suspension, MRR Analytics) |
| `api.bebsayik.com` | **Proxied (Orange Cloud)** | Express API Gateway (`:5000`) | Multi-tenant Modular REST API, Webhook Listeners, ESC/POS Payloads |

---

## 2. SSL/TLS & Edge Encryption Configuration

To protect sensitive retail transactions, customer NIDs, and financial ledgers, Cloudflare SSL/TLS must be configured to the highest security tier:

1. **SSL/TLS Encryption Mode:** **Full (Strict)**
   - Requires a valid SSL/TLS certificate installed on the origin server (Cloudflare Origin CA Certificate or Let's Encrypt).
   - Prevents Man-in-the-Middle (MitM) attacks between Cloudflare Edge and Origin ingress.
2. **Minimum TLS Version:** **TLS 1.3**
   - Enforces modern cryptographic ciphers; legacy TLS 1.0, 1.1, and 1.2 are blocked.
3. **HTTP Strict Transport Security (HSTS):**
   - **Status:** Enabled
   - **Max-Age:** `31536000` (1 Year)
   - **Include subdomains:** Enabled (`app`, `admin`, `api`)
   - **Preload:** Enabled (Submitted to Chrome/Firefox HSTS Preload list)
4. **Opportunistic Encryption & Automatic HTTPS Rewrites:** Enabled.

---

## 3. Web Application Firewall (WAF) & Rate Limiting Rules

### 3.1 Rate Limiting Rules
Configure the following custom Cloudflare WAF rate limiting rules:

1. **Authentication Protection (`/api/v1/auth/*`):**
   - **Condition:** `http.request.uri.path matches "^/api/v1/auth/"`
   - **Threshold:** 15 requests per 1 minute per IP.
   - **Action:** Managed Challenge (Cloudflare Turnstile).
2. **SMS OTP Dispatch Throttling (`/api/v1/auth/request-otp`):**
   - **Condition:** `http.request.uri.path eq "/api/v1/auth/request-otp"`
   - **Threshold:** 3 requests per 15 minutes per IP.
   - **Action:** Block with HTTP 429.
3. **Public Lead Capture (`/api/v1/marketing/leads`):**
   - **Condition:** `http.request.uri.path eq "/api/v1/marketing/leads"`
   - **Threshold:** 5 requests per 10 minutes per IP.
   - **Action:** Managed Challenge.
4. **Financial POS Checkout (`/api/v1/pos/checkout`):**
   - **Condition:** `http.request.uri.path eq "/api/v1/pos/checkout"`
   - **Threshold:** 120 requests per 1 minute per IP (allows fast retail checkout throughput while blocking automated credential stuffing).
   - **Action:** Log & Alert.

### 3.2 Bot & Scraper Mitigation
- **Bot Fight Mode:** Enabled (blocks automated scrapers targeting product catalogs).
- **Strict Prohibition of Android SMS Scraping:** All requests carrying user-agents associated with background SMS reflection or illegal third-party SIM scrapers are blocked (TC-42 compliance).

---

## 4. Edge Caching & Cache-Busting Rules

```
┌─────────────────────────────────┬───────────────────────────────────────────────────────┐
│ Path / Pattern                  │ Caching Directive & Edge Rule                         │
├─────────────────────────────────┼───────────────────────────────────────────────────────┤
│ `/assets/*.js`, `/assets/*.css` │ Cache Everything, Edge TTL: 30 days, Browser: 1 year │
│ `/fonts/*`, `*.woff2`           │ Cache Everything, Edge TTL: 30 days, Browser: 1 year │
│ `*.png`, `*.jpg`, `*.svg`       │ Cache Everything, Edge TTL: 7 days                    │
│ `/api/v1/*`                     │ Bypass Cache (Never Cache Dynamic REST Endpoints)     │
│ `/index.html`                   │ Bypass Cache (`no-cache, no-store, must-revalidate`)  │
└─────────────────────────────────┴───────────────────────────────────────────────────────┘
```

---

## 5. Cloudflare Turnstile Integration

Cloudflare Turnstile replaces legacy Google reCAPTCHA v2/v3 without visual distortion or privacy intrusion:
- **Managed Mode Site Key:** Configured in `TURNSTILE_SITE_KEY`.
- **Secret Key:** Injected into API environment as `TURNSTILE_SECRET_KEY`.
- **Verification Endpoint:** Verified server-side via `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` before issuing mobile OTPs or recording marketing leads.
