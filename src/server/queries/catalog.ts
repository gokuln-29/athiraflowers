import "server-only"
import { and, asc, desc, eq, gte, inArray, lte, ne, or, sql, type SQL } from "drizzle-orm"

import { db } from "@/db"
import { categories, productImages, products } from "@/db/schema"
import type { MediaLite } from "@/lib/media"
import { pickColumn } from "@/lib/i18n-text"

import { getMediaMap } from "./media"

export type ProductCard = {
  id: number
  slug: string
  name: string
  short: string
  priceMinor: number
  compareAtMinor: number | null
  pricingType: "one_time" | "subscription" | "rental"
  billingInterval: "week" | "month" | null
  rentalDays: number | null
  depositMinor: number
  minQty: number
  inStock: boolean
  lowStock: boolean
  leadTimeHours: number
  categorySlug: string
  categoryName: string
  image: MediaLite | null
}

type ProductRow = typeof products.$inferSelect

function inStock(p: Pick<ProductRow, "trackStock" | "stockQty">) {
  return !p.trackStock || p.stockQty > 0
}

async function toCards(rows: { product: ProductRow; category: typeof categories.$inferSelect }[], locale: string): Promise<ProductCard[]> {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.product.id)
  const imgs = await db.select().from(productImages).where(inArray(productImages.productId, ids)).orderBy(asc(productImages.sort), asc(productImages.id))
  const firstImage = new Map<number, number>()
  for (const i of imgs) if (!firstImage.has(i.productId)) firstImage.set(i.productId, i.mediaId)
  const mediaMap = await getMediaMap([...firstImage.values()])
  return rows.map(({ product: p, category: c }) => ({
    id: p.id,
    slug: p.slug,
    name: pickColumn(p.nameEn, p.nameAr, locale),
    short: pickColumn(p.shortEn, p.shortAr, locale),
    priceMinor: p.priceMinor,
    compareAtMinor: p.compareAtMinor,
    pricingType: p.pricingType,
    billingInterval: p.billingInterval,
    rentalDays: p.rentalDays,
    depositMinor: p.depositMinor,
    minQty: p.minQty,
    inStock: inStock(p),
    lowStock: p.trackStock && p.stockQty > 0 && p.stockQty <= 5,
    leadTimeHours: p.leadTimeHours,
    categorySlug: c.slug,
    categoryName: pickColumn(c.nameEn, c.nameAr, locale),
    image: firstImage.has(p.id) ? (mediaMap.get(firstImage.get(p.id)!) ?? null) : null,
  }))
}

export type CategoryItem = {
  id: number
  slug: string
  name: string
  description: string
  image: MediaLite | null
  count: number
}

export async function listCategories(locale: string): Promise<CategoryItem[]> {
  const rows = await db
    .select({ category: categories, count: sql<number>`(select count(*) from products p where p.category_id = categories.id and p.is_active = 1)` })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sort), asc(categories.id))
  const mediaMap = await getMediaMap(rows.map((r) => r.category.imageId))
  return rows.map(({ category: c, count }) => ({
    id: c.id,
    slug: c.slug,
    name: pickColumn(c.nameEn, c.nameAr, locale),
    description: pickColumn(c.descriptionEn, c.descriptionAr, locale),
    image: c.imageId ? (mediaMap.get(c.imageId) ?? null) : null,
    count: Number(count),
  }))
}

export async function getCategory(slug: string) {
  const [row] = await db.select().from(categories).where(and(eq(categories.slug, slug), eq(categories.isActive, true))).limit(1)
  return row ?? null
}

export const SORTS = ["featured", "price-asc", "price-desc", "newest"] as const
export type Sort = (typeof SORTS)[number]
export const TYPES = ["one_time", "subscription", "rental"] as const

export type ListParams = {
  locale: string
  categorySlug?: string
  q?: string
  minMinor?: number
  maxMinor?: number
  types?: ("one_time" | "subscription" | "rental")[]
  inStockOnly?: boolean
  sort?: Sort
  page?: number
  pageSize?: number
}

export async function listProducts(params: ListParams): Promise<{ items: ProductCard[]; total: number; page: number; pages: number }> {
  const pageSize = params.pageSize ?? 12
  const page = Math.max(1, params.page ?? 1)
  const where: SQL[] = [eq(products.isActive, true), eq(categories.isActive, true)]
  if (params.categorySlug) where.push(eq(categories.slug, params.categorySlug))
  if (params.q) {
    const like = `%${params.q.replace(/[%_\\]/g, "\\$&")}%`
    where.push(or(sql`${products.nameEn} like ${like}`, sql`${products.nameAr} like ${like}`, sql`${products.shortEn} like ${like}`, sql`${products.sku} like ${like}`)!)
  }
  if (params.minMinor != null) where.push(gte(products.priceMinor, params.minMinor))
  if (params.maxMinor != null) where.push(lte(products.priceMinor, params.maxMinor))
  if (params.types?.length) where.push(inArray(products.pricingType, params.types))
  if (params.inStockOnly) where.push(or(eq(products.trackStock, false), sql`${products.stockQty} > 0`)!)

  const order =
    params.sort === "price-asc" ? [asc(products.priceMinor), asc(products.id)]
    : params.sort === "price-desc" ? [desc(products.priceMinor), asc(products.id)]
    : params.sort === "newest" ? [desc(products.createdAt), desc(products.id)]
    : [desc(products.isFeatured), asc(products.sort), asc(products.id)]

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...where))
  const rows = await db
    .select({ product: products, category: categories })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...where))
    .orderBy(...order)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  return { items: await toCards(rows, params.locale), total: Number(total), page, pages: Math.max(1, Math.ceil(Number(total) / pageSize)) }
}

export async function getFeatured(locale: string, limit: number): Promise<ProductCard[]> {
  const rows = await db
    .select({ product: products, category: categories })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.isActive, true), eq(categories.isActive, true)))
    .orderBy(desc(products.isFeatured), asc(products.sort), asc(products.id))
    .limit(limit)
  return toCards(rows, locale)
}

export type ProductDetail = {
  row: ProductRow
  category: typeof categories.$inferSelect
  images: (MediaLite & { id: number })[]
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const [found] = await db
    .select({ product: products, category: categories })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1)
  if (!found) return null
  const imgs = await db.select().from(productImages).where(eq(productImages.productId, found.product.id)).orderBy(asc(productImages.sort), asc(productImages.id))
  const mediaMap = await getMediaMap(imgs.map((i) => i.mediaId))
  const images = imgs.flatMap((i) => (mediaMap.has(i.mediaId) ? [{ id: i.mediaId, ...mediaMap.get(i.mediaId)! }] : []))
  return { row: found.product, category: found.category, images }
}

export async function getRelated(productId: number, categoryId: number, locale: string, limit = 4): Promise<ProductCard[]> {
  const rows = await db
    .select({ product: products, category: categories })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.isActive, true), ne(products.id, productId), eq(products.categoryId, categoryId)))
    .orderBy(desc(products.isFeatured), asc(products.sort))
    .limit(limit)
  const cards = await toCards(rows, locale)
  if (cards.length >= limit) return cards
  const more = await db
    .select({ product: products, category: categories })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.isActive, true), ne(products.id, productId), ne(products.categoryId, categoryId)))
    .orderBy(desc(products.isFeatured), asc(products.sort))
    .limit(limit - cards.length)
  return [...cards, ...(await toCards(more, locale))]
}

/** Authoritative rows for pricing a cart. Only active products are returned. */
export async function getProductsForPricing(ids: number[]) {
  if (ids.length === 0) return []
  return db.select().from(products).where(inArray(products.id, ids))
}

export async function getProductsForCart(ids: number[], locale: string): Promise<(ProductRow & { image: MediaLite | null; name: string })[]> {
  if (ids.length === 0) return []
  const rows = await db.select().from(products).where(inArray(products.id, ids))
  const imgs = await db.select().from(productImages).where(inArray(productImages.productId, ids)).orderBy(asc(productImages.sort))
  const first = new Map<number, number>()
  for (const i of imgs) if (!first.has(i.productId)) first.set(i.productId, i.mediaId)
  const mediaMap = await getMediaMap([...first.values()])
  return rows.map((p) => ({ ...p, name: pickColumn(p.nameEn, p.nameAr, locale), image: first.has(p.id) ? (mediaMap.get(first.get(p.id)!) ?? null) : null }))
}
