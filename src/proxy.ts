import createMiddleware from "next-intl/middleware"
import { NextRequest, NextResponse } from "next/server"

import { site } from "@/config/site"
import { routing } from "@/i18n/routing"

const handleI18n = createMiddleware({ ...routing, alternateLinks: false })

/** Paths that are not localised (admin, APIs, media, machine-readable files). */
const PASSTHROUGH = ["/admin", "/api", "/media", "/llms.txt", "/health"]
const isPassthrough = (pathname: string) =>
  PASSTHROUGH.some((p) => pathname === p || pathname.startsWith(`${p}/`))

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])
/** Endpoints that are called by third parties (no browser Origin). Signed separately. */
const ORIGIN_EXEMPT = ["/api/stripe/webhook", "/api/health"]

function allowedHosts(request: NextRequest): Set<string> {
  const hosts = new Set<string>()
  const forwarded = request.headers.get("x-forwarded-host")
  const host = request.headers.get("host")
  if (forwarded) hosts.add(forwarded)
  if (host) hosts.add(host)
  try {
    hosts.add(new URL(site.url).host)
  } catch {}
  for (const extra of (process.env.ALLOWED_ORIGINS ?? "").split(",")) {
    const value = extra.trim()
    if (!value) continue
    try {
      hosts.add(new URL(value).host)
    } catch {}
  }
  return hosts
}

/** CSRF / origin check for state-changing requests to route handlers. */
function originIsValid(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  if (!origin) {
    // Browsers always send Origin on cross-site and same-site unsafe requests.
    // Missing Origin is only acceptable for non-browser clients without cookies.
    return !request.headers.get("cookie")
  }
  try {
    return allowedHosts(request).has(new URL(origin).host)
  } catch {
    return false
  }
}

function buildCsp(nonce: string): string {
  const dev = process.env.NODE_ENV !== "production"
  const media = /^https?:\/\//.test(site.mediaUrl) ? new URL(site.mediaUrl).origin : ""
  const r2Account = process.env.R2_ACCOUNT_ID
  const r2 = r2Account ? `https://${r2Account}.r2.cloudflarestorage.com` : ""
  const ga = site.analytics.gaId
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}${ga ? " https://www.googletagmanager.com" : ""}`,
    `style-src 'self' 'nonce-${nonce}'${dev ? " 'unsafe-inline'" : ""}`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: blob: ${media}${ga ? " https://www.google-analytics.com https://www.googletagmanager.com" : ""}`.trim(),
    `font-src 'self'`,
    `media-src 'self' ${media}`.trim(),
    `connect-src 'self' ${media} ${r2}${ga ? " https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com" : ""}${dev ? " ws: wss:" : ""}`
      .replace(/\s+/g, " ")
      .trim(),
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://checkout.stripe.com`,
    `frame-ancestors 'none'`,
  ]
  // Skipped for local rehearsals over http://localhost.
  if (!dev && !site.url.startsWith("http://localhost")) directives.push("upgrade-insecure-requests")
  return directives.join("; ")
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/api/") &&
    !SAFE_METHODS.has(request.method) &&
    !ORIGIN_EXEMPT.includes(pathname) &&
    !originIsValid(request)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const csp = buildCsp(nonce)

  const headers = new Headers(request.headers)
  headers.set("x-nonce", nonce)
  headers.set("Content-Security-Policy", csp)
  const nextRequest = new NextRequest(request, { headers })

  const response = isPassthrough(pathname)
    ? NextResponse.next({ request: { headers } })
    : handleI18n(nextRequest)

  response.headers.set("Content-Security-Policy", csp)
  return response
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|woff2?|xml|txt|mp4|webm)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
