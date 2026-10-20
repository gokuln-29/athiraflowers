# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (responsive storefront, English and Arabic with full RTL) plus an English-only admin dashboard at `/admin`.

## Stack

Next.js 16 App Router, TypeScript strict, Tailwind v4, shadcn/ui (Base UI), next-intl, Drizzle ORM on MySQL, Cloudflare R2 for images, Stripe Checkout plus Cash on Delivery, Brevo for transactional email. Deployed on a Hostinger Ubuntu VPS behind Nginx and PM2. Source of truth for operations: `Adhira_Flowers_Architecture_Setup_Plan.pdf` (sections 2-11).

## Users

- Primary: corporate buyers in the UAE (office managers, facilities, HR, hotels, event planners) who want weekly or monthly flower programs, event decor and corporate gifting, and need quotes, tax invoices (TRN) and purchase-order handling.
- Secondary: individuals in Dubai, Abu Dhabi and Sharjah buying gifts, flowers and plants, often on a phone, often at the last minute (same-day cut-off matters).
- Operators: the owner, a manager and staff who run catalogue, orders, leads and content from the admin.

## Product Purpose

Athira flowers is a premium corporate and events florist with an online shop. Success means a corporate client can request a recurring program or an event quote with confidence, and any customer can find a product, choose an emirate and delivery slot, and pay (card or cash on delivery) without friction. The owner can run everything (prices, content, images, orders, leads) without a developer.

## Positioning

Premium, calm and precise: the florist an office or an event team trusts to arrive on time and look right. Corporate programs, event decor and gifting are the core; gifts and plants complete the shop. Not a discount flower marketplace.

## Brand

- Name: Athira flowers. Domain: athiraflowers.ae. (Earlier material that says "Adhira" is a typo.) All three live only in `src/config/site.ts`, read from env.
- Currency AED, VAT 5%, TRN shown on invoices. Prices are stored VAT-inclusive; the refundable vase/glass deposit sits outside the VAT base.

## Operating Context

- Delivery zones: Dubai, Abu Dhabi, Sharjah (zones, fees, slots, same-day cut-off and blackout dates managed in admin).
- Payments: Stripe Checkout (webhook is the only thing that marks an order paid) and Cash on Delivery (never auto-marked paid). Tabby and Tamara are scaffold only.
- Backups, restore drills and release/rollback follow the PDF plan.

## Evidence on Hand

No real catalogue, prices, TRN, WhatsApp number, testimonials, client logos or legal text were supplied. All such content in the seed is clearly marked sample data and listed in `docs/LAUNCH_CHECKLIST.md` as blocked until the owner supplies it. Never invent real customers, reviews, press or statistics.

## Product Principles

- Every price comes from the server. The browser sends productId and quantity only.
- Content lives in the admin; nothing user-facing is hardcoded in components.
- Corporate trust is built from specifics: delivery windows, invoice and TRN handling, minimums, deposits stated plainly.
- Mobile-first, bilingual by construction: logical CSS properties, no left/right assumptions.
- Mark nothing complete without evidence.

## Accessibility & Inclusion

WCAG 2.2 AA. Visible focus, 44px touch targets, labelled forms with errors linked to fields, reduced-motion respected, Arabic and English tested at 375 and desktop widths.
