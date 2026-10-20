import { absoluteUrl, site, siteName } from "@/config/site"
import { isLocale } from "@/i18n/routing"
import { listPosts } from "@/server/queries/content"

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export async function GET(_req: Request, ctx: { params: Promise<{ locale: string }> }) {
  const { locale } = await ctx.params
  if (!isLocale(locale)) return new Response("Not found", { status: 404 })
  const posts = await listPosts(locale, { limit: 30 })
  const items = posts
    .map(
      (p) => `<item><title>${esc(p.title)}</title><link>${absoluteUrl(`/${locale}/blog/${p.slug}`)}</link><guid isPermaLink="true">${absoluteUrl(`/${locale}/blog/${p.slug}`)}</guid><pubDate>${p.publishedAt.toUTCString()}</pubDate>${p.category ? `<category>${esc(p.category.name)}</category>` : ""}<description>${esc(p.excerpt)}</description></item>`
    )
    .join("")
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(siteName(locale))}</title><link>${absoluteUrl(`/${locale}/blog`)}</link><description>${esc(locale === "ar" ? "مدونة أثيرة للزهور" : `${site.name} journal`)}</description><language>${locale}</language><atom:link href="${absoluteUrl(`/${locale}/blog/rss.xml`)}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=900, s-maxage=900" } })
}
