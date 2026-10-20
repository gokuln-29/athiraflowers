import Link from "next/link"
import { and, asc, desc, eq, like, or, sql, type SQL } from "drizzle-orm"
import { Plus } from "lucide-react"

import { Thumb } from "@/components/admin/media-picker"
import { PageHeader } from "@/components/admin/shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { db } from "@/db"
import { categories, media, productImages, products } from "@/db/schema"
import { formatMoney } from "@/lib/format"
import { requirePage } from "@/server/auth/admin-guards"
import { can } from "@/server/auth/permissions"

export const metadata = { title: "Products" }
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const ctx = await requirePage("catalog:read")
  const sp = await searchParams
  const q = one(sp.q)?.slice(0, 80)
  const cat = Number(one(sp.category)) || undefined
  const state = one(sp.state)
  const where: SQL[] = []
  if (q) { const l = `%${q.replace(/[%_\\]/g, "\\$&")}%`; where.push(or(like(products.nameEn, l), like(products.nameAr, l), like(products.sku, l))!) }
  if (cat) where.push(eq(products.categoryId, cat))
  if (state === "active") where.push(eq(products.isActive, true))
  if (state === "inactive") where.push(eq(products.isActive, false))
  if (state === "low") where.push(and(eq(products.trackStock, true), sql`${products.stockQty} <= 5`)!)

  const [rows, cats] = await Promise.all([
    db.select({ p: products, category: categories.nameEn }).from(products).innerJoin(categories, eq(categories.id, products.categoryId)).where(and(...where)).orderBy(desc(products.isFeatured), asc(products.sort), asc(products.id)).limit(200),
    db.select().from(categories).orderBy(asc(categories.sort)),
  ])
  const firstImg = new Map<number, number>()
  if (rows.length) {
    const imgs = await db.select().from(productImages).where(sql`${productImages.productId} in (${sql.join(rows.map((r) => sql`${r.p.id}`), sql`, `)})`).orderBy(asc(productImages.sort))
    for (const i of imgs) if (!firstImg.has(i.productId)) firstImg.set(i.productId, i.mediaId)
  }
  const mids = [...firstImg.values()]
  const mrows = mids.length ? await db.select().from(media).where(sql`${media.id} in (${sql.join(mids.map((m) => sql`${m}`), sql`, `)})`) : []
  const mmap = new Map(mrows.map((m) => [m.id, m]))

  return (
    <>
      <PageHeader title="Products" description={`${rows.length} shown`} actions={can(ctx.role, "catalog:write") ? <Button render={<Link href="/admin/products/new" />}><Plus data-icon="inline-start" />New product</Button> : undefined} />
      <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/products">
        <Input name="q" defaultValue={q} placeholder="Search name or SKU" aria-label="Search products" className="max-w-xs" />
        <select name="category" defaultValue={cat ?? ""} aria-label="Category" className="h-9 rounded-md border border-input bg-card px-2 text-sm">
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
        </select>
        <select name="state" defaultValue={state ?? ""} aria-label="State" className="h-9 rounded-md border border-input bg-card px-2 text-sm">
          <option value="">Any state</option><option value="active">Visible</option><option value="inactive">Hidden</option><option value="low">Low stock (5 or fewer)</option>
        </select>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
      </form>
      <div className="panel relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="w-14 px-3 py-2"><span className="sr-only">Photo</span></th><th className="px-3 py-2 font-medium">Product</th><th className="px-3 py-2 font-medium">Category</th><th className="px-3 py-2 text-right font-medium">Price</th><th className="px-3 py-2 text-right font-medium">Stock</th><th className="px-3 py-2 font-medium">State</th></tr></thead>
          <tbody>
            {rows.map(({ p, category }) => {
              const m = mmap.get(firstImg.get(p.id) ?? -1)
              return (
                <tr key={p.id} className="border-t hover:bg-muted/40">
                  <td className="px-3 py-2"><div className="size-10 overflow-hidden rounded bg-muted">{m && <Thumb item={{ key: m.key, variants: m.variants ?? [], altEn: "" }} size={120} />}</div></td>
                  <td className="px-3 py-2"><Link href={`/admin/products/${p.id}`} className="font-medium text-primary underline-offset-4 hover:underline">{p.nameEn}</Link><span className="meta num block">{p.sku}{p.pricingType !== "one_time" ? ` · ${p.pricingType}` : ""}</span></td>
                  <td className="px-3 py-2">{category}</td>
                  <td className="num px-3 py-2 text-right">{formatMoney(p.priceMinor, "en", { compact: true })}</td>
                  <td className={`num px-3 py-2 text-right ${p.trackStock && p.stockQty <= 5 ? "font-medium text-destructive" : ""}`}>{p.trackStock ? p.stockQty : "n/a"}</td>
                  <td className="px-3 py-2">{p.isActive ? "Visible" : <span className="text-muted-foreground">Hidden</span>}{p.isFeatured ? " · Featured" : ""}</td>
                </tr>
              )
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No products match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
