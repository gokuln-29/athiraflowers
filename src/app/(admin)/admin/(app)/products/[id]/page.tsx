import { asc, eq } from "drizzle-orm"
import { notFound } from "next/navigation"

import { ProductForm, type ProductFormInitial } from "@/components/admin/product-form"
import { PageHeader } from "@/components/admin/shell"
import { db } from "@/db"
import { categories, media, productImages, products } from "@/db/schema"
import { requirePage } from "@/server/auth/admin-guards"
import { can } from "@/server/auth/permissions"

export const metadata = { title: "Product" }

const blank: ProductFormInitial = {
  slug: "", sku: "", categoryId: 0, nameEn: "", nameAr: "", shortEn: "", shortAr: "", descriptionEn: "", descriptionAr: "", includesEn: "", includesAr: "", careEn: "", careAr: "",
  deliveryNoteEn: "", deliveryNoteAr: "", price: "", compareAt: "", deposit: "", pricingType: "one_time", billingInterval: null, rentalDays: null, minQty: 1, maxQty: 100,
  leadTimeHours: 0, sameDayEligible: true, trackStock: true, stockQty: 0, isActive: true, isFeatured: false, sort: 0, seoTitleEn: "", seoTitleAr: "", seoDescriptionEn: "", seoDescriptionAr: "", images: [],
}

export default async function ProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const ctx = await requirePage("catalog:read")
  const { id } = await params
  const cats = await db.select({ id: categories.id, name: categories.nameEn }).from(categories).orderBy(asc(categories.sort))
  let initial = blank
  if (id !== "new") {
    const pid = Number(id)
    if (!Number.isInteger(pid)) notFound()
    const [p] = await db.select().from(products).where(eq(products.id, pid)).limit(1)
    if (!p) notFound()
    const imgs = await db.select({ pi: productImages, m: media }).from(productImages).innerJoin(media, eq(media.id, productImages.mediaId)).where(eq(productImages.productId, pid)).orderBy(asc(productImages.sort))
    initial = {
      id: p.id, slug: p.slug, sku: p.sku, categoryId: p.categoryId, nameEn: p.nameEn, nameAr: p.nameAr, shortEn: p.shortEn, shortAr: p.shortAr,
      descriptionEn: p.descriptionEn ?? "", descriptionAr: p.descriptionAr ?? "", includesEn: p.includesEn ?? "", includesAr: p.includesAr ?? "", careEn: p.careEn ?? "", careAr: p.careAr ?? "",
      deliveryNoteEn: p.deliveryNoteEn ?? "", deliveryNoteAr: p.deliveryNoteAr ?? "", price: (p.priceMinor / 100).toFixed(2), compareAt: p.compareAtMinor ? (p.compareAtMinor / 100).toFixed(2) : "",
      deposit: p.depositMinor ? (p.depositMinor / 100).toFixed(2) : "", pricingType: p.pricingType, billingInterval: p.billingInterval, rentalDays: p.rentalDays, minQty: p.minQty, maxQty: p.maxQty,
      leadTimeHours: p.leadTimeHours, sameDayEligible: p.sameDayEligible, trackStock: p.trackStock, stockQty: p.stockQty, isActive: p.isActive, isFeatured: p.isFeatured, sort: p.sort,
      seoTitleEn: p.seoTitleEn ?? "", seoTitleAr: p.seoTitleAr ?? "", seoDescriptionEn: p.seoDescriptionEn ?? "", seoDescriptionAr: p.seoDescriptionAr ?? "",
      images: imgs.map(({ m }) => ({ id: m.id, key: m.key, width: m.width, height: m.height, altEn: m.altEn, altAr: m.altAr, credit: m.credit, variants: (m.variants ?? []).map((v) => ({ w: v.w, h: v.h, key: v.key })) })),
    }
  }
  if (!can(ctx.role, "catalog:write")) return (<><PageHeader title={initial.nameEn || "Product"} /><p className="meta">You can view the catalogue but not edit it.</p></>)
  return (
    <>
      <PageHeader title={initial.id ? initial.nameEn : "New product"} description={initial.id ? `SKU ${initial.sku}` : "Fill in the basics, add photos, then save."} />
      <ProductForm initial={initial} categories={cats} />
    </>
  )
}
