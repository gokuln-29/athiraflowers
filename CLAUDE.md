@AGENTS.md

# Athira flowers

Premium corporate and events flowers for the UAE (Dubai, Abu Dhabi, Sharjah). Storefront in English and Arabic (`/en`, `/ar`, full RTL) plus an admin dashboard at `/admin`. Brand, domain and URL live ONLY in `src/config/site.ts` (read from env); never hard-code them elsewhere.

## Stack
Next.js 16 App Router (`src/proxy.ts`, not middleware), TypeScript strict, Tailwind v4 tokens, shadcn/ui on Base UI, next-intl, Zod, MySQL via Drizzle, Cloudflare R2 for images (local driver in dev), Brevo email, Stripe + COD (Tabby/Tamara scaffold only). Production: Nginx + PM2 on an Ubuntu VPS (see `docs/DEPLOYMENT.md`).

## Commands
- `npm run dev` / `npm run build` (set `ALLOW_LOCAL_STORAGE=1` for local production builds) / `npm run lint` / `npm run typecheck`
- `npm test` (vitest, needs MySQL database `athira_test`; migrate it with `npm run db:migrate:test`)
- `npm run db:generate` then `npm run db:migrate` (schema changes ONLY via migrations), `npm run db:seed` (dev only)
- `npm run maintenance` (housekeeping job), `npm run admin:create -- --email ... --name ... --role owner`
- e2e: build, start on port 3100 with `ALLOW_LOCAL_STORAGE=1 npx next start -p 3100`, then `E2E_BASE_URL=http://localhost:3100 npx playwright test`

## Rules that matter
- Money is integer fils; all pricing goes through `priceLine()` / `priceOrder()` in `src/lib/pricing.ts`, server side. The client sends product id and quantity only.
- Order state changes go through `src/server/orders/state.ts` + `transition.ts`; webhooks through `src/server/payments/webhook.ts` (signature, dedupe, amount/currency/session checks).
- Admin mutations use `adminAction(permission, schema, handler)`; admin routes use `adminRoute`. Permissions are in `src/server/auth/permissions.ts`.
- Strict CSP with per-request nonce: no inline `<style>`/scripts without nonce, no `unsafe-inline`. Avoid libraries that inject un-nonced style tags (shadcn `ChartContainer` is not used for that reason).
- Every user-facing string exists in `messages/en` and `messages/ar` (parity test enforces it). Use logical CSS properties for RTL. Test both locales at 375 and 1440.
- Timestamps are UTC in the database; business rules use Asia/Dubai (`src/lib/time.ts`).
- Never print or commit secrets: `.env`, `.dev-credentials`, `.admin-credentials-*`, `.e2e-owner-totp` stay local.
- Do not mark a checklist item verified without evidence (`docs/LAUNCH_CHECKLIST.md`).
