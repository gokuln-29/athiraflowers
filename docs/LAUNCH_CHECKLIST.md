# Launch checklist

Status values: **verified** (evidence given), **pending** (we can do it, not done yet), **blocked** (needs something only the owner or the VPS can provide). Nothing is marked verified without evidence. "Local" means the development machine, a production build (`next build` + `next start`) against the local MySQL.

Evidence below was produced on 2026-10-20.

## A. Needed from the owner (blocked)

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| A1 | VPS access (SSH key for `deploy`, Hostinger console) and domain DNS | blocked | `docs/DEPLOYMENT.md` sections 1-2 not run |
| A2 | Live Stripe keys and webhook secret | blocked | Only mocked Stripe was exercised (see C4) |
| A3 | Brevo API key; sender domain authenticated (SPF, DKIM, DMARC) | blocked | Sending is real code; delivery never tried |
| A4 | Cloudflare R2 bucket, token, custom media domain, CORS | blocked | The R2 driver is written but only the local driver was run |
| A5 | UAE TRN, legal name, licence number, invoice address (Admin > Settings) | blocked | Invoices print blanks until set |
| A6 | Real phone, WhatsApp number, studio address, opening hours | blocked | Seed values are placeholders (`+971500000000`) |
| A7 | Legal text reviewed by a UAE advisor (privacy, terms, refund, delivery) | blocked | Seeded text is a draft; Admin > Pages has a "reviewed" marker |
| A8 | Native Arabic review of all UI strings, legal pages, emails, product copy | blocked | Arabic was written and RTL-tested, not signed off by a native editor |
| A9 | Real photography, products, prices, testimonials, client logos | blocked | Current photos are credited Unsplash images (`docs/CREDITS.md`); testimonials are flagged samples; seed products and prices are samples |
| A10 | Confirm Arabic brand spelling (`أثيرة للزهور`) and final domain | blocked | Set in `src/config/site.ts` / env |
| A11 | Google Analytics ID and Search Console verification | blocked | Hooks are in and consent-gated; no IDs set |
| A12 | Decide whether to enable Tabby/Tamara | blocked | Scaffold only, disabled |
| A13 | Delivery zones, fees, slot capacity and blackout dates confirmed | blocked | Seeded values are plausible samples |
| A14 | Off-VPS destination for backups and the restic password in the vault | blocked | Needed before the first real backup |

## B. Sample content to replace before launch

Seeded data is marked as sample: products and prices, delivery zones and fees, FAQs, the about and legal pages, testimonials (`is_sample`), blog posts, photography. Everything is editable in the admin. Pending until the owner supplies real content.

## C. Verified in this build

| # | Item | Status | Evidence |
| --- | --- | --- | --- |
| C1 | TypeScript strict, lint | verified | `tsc --noEmit` clean; `eslint` 0 errors (5 unused-variable warnings) |
| C2 | Unit and integration tests | verified | `vitest run`: 132 passed in 8 files against MySQL `athira_test` |
| C3 | Pricing is server-side only; client sends product id and quantity | verified | `test/pricing.test.ts`, `test/orders.test.ts` (tampered prices ignored, VAT, deposit, coupon, zone fee, slot fee) |
| C4 | Stripe webhook integrity | verified (mocked Stripe) | `test/stripe-webhook.test.ts`: bad or missing signature rejected, stale timestamp rejected, replayed event deduped, amount/currency/session mismatch refused, late payment on a cancelled order, refunds, payment links paid once and wrong amount refused |
| C5 | Oversell, slot capacity and coupon limits under concurrency | verified | `test/orders.test.ts` |
| C6 | Admin auth: Argon2id, TOTP with replay protection, lockout, session rotation, recovery codes | verified | `test/admin-auth.test.ts` |
| C7 | Role matrix (owner / manager / staff, every permission) | verified | `test/admin-auth.test.ts` (matrix and `authorize()`) |
| C8 | Image pipeline: magic-byte sniffing, EXIF stripped, WebP re-encode, truncated and disguised files rejected | verified | `test/media.test.ts` |
| C9 | Maintenance job cancels stale card orders and restores stock | verified | `test/stripe-webhook.test.ts` ("Maintenance job"); live run output all zeros/no errors |
| C10 | Production build succeeds | verified | `next build` completes with `ALLOW_LOCAL_STORAGE=1` (production refuses local storage otherwise, by design) |
| C11 | All 17 admin screens render at 1440 and 375 with no console errors, CSP violations or horizontal overflow | verified | `e2e/admin-screens.spec.ts`, 34 passed |
| C12 | Admin workflows: create product with image upload; order pending to delivered; tax-invoice PDF download (`%PDF`); blog article save; payment link create and public page | verified | `e2e/admin-workflows.spec.ts` (order test needs a pending order, run `checkout.spec.ts` first) |
| C13 | Storefront and checkout e2e, en and ar, 375 and 1440, crawl | verified | full Playwright run: 164 passed, 6 skipped (workflows on mobile by design, analytics test needs a GA build, order test without a pending order) |
| C14 | SEO: sitemap (both languages, hreflang), robots, `llms.txt`, canonical, Organization / Florist / WebSite JSON-LD | verified | `e2e/seo.spec.ts` 12 passed |
| C15 | Analytics load only after consent | verified | `e2e/seo.spec.ts` with a GA-enabled build: zero requests before accept and after "Essential only"; requests after "Accept analytics" |
| C16 | Lighthouse, production build, local | verified | Desktop: performance 98-99, accessibility 98-100, best practices 100, SEO 100, CLS 0. Mobile (simulated slow 4G, 4x CPU): performance 77-82, accessibility 98-100, best practices 100, SEO 100, CLS 0 |
| C17 | Dependency audit, production | verified | `npm audit --omit=dev`: 0 vulnerabilities (the shadcn CLI, which carried advisories, is a dev dependency) |
| C18 | Security headers and CSP with per-request nonce; no inline-style violations | verified | Response headers; no CSP violations in C11/C13 runs |
| C19 | No source maps in production | verified | `productionBrowserSourceMaps: false` |
| C20 | Encrypted backup and restore drill | verified (local) | `backup.sh` into a local restic repository: wrong password rejected, no plaintext in repository, failed dump exits 1 and creates no snapshot; `restore-drill.sh` restored orders 3/3, products 31/31, media 34/34, categories 6/6, admin users 1/1 and the latest order into a throwaway database in 2 seconds |

## D. Pending, needs the VPS or a real account

| # | Item | Status |
| --- | --- | --- |
| D1 | Run `server-setup.sh`, confirm ufw, fail2ban, unattended upgrades, MySQL loopback only | blocked (A1) |
| D2 | `nginx -t`, certbot issuance, `certbot renew --dry-run` | blocked (A1). The Nginx file has not been syntax-checked anywhere |
| D3 | systemd timers and PM2 start on boot (`systemctl list-timers`, reboot test) | blocked (A1). Units written, not loaded |
| D4 | First `deploy.sh` run, smoke test, rollback test | blocked (A1). Scripts pass `bash -n` only |
| D5 | Production backup to the real offsite remote, plus R2 media sync | blocked (A4, A14) |
| D6 | Restore drill on an isolated host, with timing recorded | blocked (A1) |
| D7 | Monitoring: dead-man's-switch URL and an external uptime monitor; test an alert | blocked (A1) |
| D8 | Stripe test-mode order end to end on staging, then one small live order and refund | blocked (A2) |
| D9 | Brevo: send each template to a real inbox, check spam placement | blocked (A3) |
| D10 | R2: presigned upload from the admin, CORS, public read through the custom domain | blocked (A4) |
| D11 | Lighthouse against the live origin with CDN and real TLS | blocked (A1) |
| D12 | Submit `sitemap.xml` in Search Console; rich-result test of product, FAQ and organization JSON-LD | blocked (A11) |
| D13 | Create the owner with `npm run admin:create`, enrol two-step verification, store recovery codes | blocked (A1) |
| D14 | Cookie banner appears only when a GA ID is set; confirm legal wording | blocked (A7, A11) |

## E. Known limits

* Mobile Lighthouse performance is 77-82 locally under simulated slow 4G; the cost is image bytes (hero 194 KB) and font files. Re-measure on the live origin; if still below target, re-encode hero variants at lower quality and add intermediate widths (480, 800) to `VARIANT_WIDTHS`.
* Migrations are forward-only; keep them backward compatible for one release so rollback works.
* Arabic and English strings have a parity test, but wording quality needs a native editor (A8).
