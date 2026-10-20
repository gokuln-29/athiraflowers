import { and, asc, eq, isNotNull, lte, ne, sql } from "drizzle-orm"

import { absoluteUrl, site } from "@/config/site"
import { db } from "@/db"
import { blogPosts, categories } from "@/db/schema"
import { getSettings } from "@/server/queries/content"

export const dynamic = "force-dynamic"

/** A plain-text brief for answer engines (llms.txt convention): who we are, what we sell, where we deliver, and where to read more. */
export async function GET() {
  const [settings, cats, posts] = await Promise.all([
    getSettings(),
    db.select({ slug: categories.slug, name: categories.nameEn }).from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sort)),
    db.select({ slug: blogPosts.slug, title: blogPosts.titleEn }).from(blogPosts).where(and(ne(blogPosts.status, "draft"), isNotNull(blogPosts.publishedAt), lte(blogPosts.publishedAt, sql`UTC_TIMESTAMP(3)`))).limit(20),
  ])
  const c = settings.contact
  const body = `# ${site.name}

> ${site.name} is a florist for offices, events and gifting in Dubai, Abu Dhabi and Sharjah (UAE). We run weekly corporate flower programs, dress events, and deliver bouquets and plants with tax invoices (VAT ${(site.vatBps / 100).toFixed(0)}%). The site is available in English and Arabic.

## Key facts
- Delivery: Dubai, Abu Dhabi and Sharjah, in booked delivery windows. Same-day cut-off and lead times are shown at checkout.
- Prices are in AED and include VAT. Corporate customers can add TRN and PO number for a tax invoice.
- Payment: card (Stripe) or cash on delivery.
- Hours: ${c.hoursEn}
- Contact: ${c.email}, WhatsApp ${c.whatsapp}

## Main pages
- [Shop](${absoluteUrl("/en/shop")}): all flowers, plants and gifts
- [Corporate flower programs](${absoluteUrl("/en/corporate")}): weekly or monthly office flowers
- [Events](${absoluteUrl("/en/events")}): event and venue flowers, quotes within one working day
- [Delivery](${absoluteUrl("/en/delivery")}): areas, windows, fees and cut-off times
- [About](${absoluteUrl("/en/about")})
- [Contact](${absoluteUrl("/en/contact")})
- Arabic edition: ${absoluteUrl("/ar")}

## Categories
${cats.map((x) => `- [${x.name}](${absoluteUrl(`/en/shop/${x.slug}`)})`).join("\n")}

## Guides
${posts.map((p) => `- [${p.title}](${absoluteUrl(`/en/blog/${p.slug}`)})`).join("\n") || "- None yet"}
`
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } })
}
