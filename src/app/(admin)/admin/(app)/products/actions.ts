"use server"

import { and, eq, inArray, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { db } from "@/db"
import { categories, media, productImages, products, stockMovements } from "@/db/schema"
import { slugify } from "@/lib/slug"
import { toMinor, productSchema } from "@/server/admin/product-schema"
import { adminAction, fail } from "@/server/auth/admin-guards"
import { audit } from "@/server/security/audit"

export const saveProductAction = adminAction(
  "catalog:write",
  productSchema,
  async (v, ctx) => {
    const [cat] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, v.categoryId)).limit(1)
    if (!cat) return fail("Choose a category.", { categoryId: ["Choose a category"] })
    const slug = v.slug || slugify(v.nameEn, `product-${Date.now()}`)
    const dupSlug = await db.select({ id: products.id }).from(products).where(v.id ? and(eq(products.slug, slug), ne(products.id, v.id)) : eq(products.slug, slug)).limit(1)
    if (dupSlug.length) return fail("That web address is already used by another product.", { slug: ["Already used. Choose another."] })
    const dupSku = await db.select({ id: products.id }).from(products).where(v.id ? and(eq(products.sku, v.sku), ne(products.id, v.id)) : eq(products.sku, v.sku)).limit(1)
    if (dupSku.length) return fail("That SKU is already used by another product.", { sku: ["Already used. Choose another."] })
    if (v.imageIds.length) {
      const ready = await db.select({ id: media.id }).from(media).where(and(inArray(media.id, v.imageIds), eq(media.status, "ready")))
      if (ready.length !== new Set(v.imageIds).size) return fail("One of the chosen images is not available.")
    }

    const values = {
      slug, sku: v.sku, categoryId: v.categoryId, nameEn: v.nameEn, nameAr: v.nameAr, shortEn: v.shortEn, shortAr: v.shortAr,
      descriptionEn: v.descriptionEn || null, descriptionAr: v.descriptionAr || null, includesEn: v.includesEn || null, includesAr: v.includesAr || null,
      careEn: v.careEn || null, careAr: v.careAr || null, deliveryNoteEn: v.deliveryNoteEn || null, deliveryNoteAr: v.deliveryNoteAr || null,
      priceMinor: toMinor(v.price), compareAtMinor: v.compareAt ? toMinor(v.compareAt) : null, depositMinor: v.deposit ? toMinor(v.deposit) : 0,
      pricingType: v.pricingType, billingInterval: v.pricingType === "subscription" ? v.billingInterval : null, rentalDays: v.pricingType === "rental" ? v.rentalDays : null,
      minQty: v.minQty, maxQty: v.maxQty, leadTimeHours: v.leadTimeHours, sameDayEligible: v.sameDayEligible, trackStock: v.trackStock, stockQty: v.stockQty,
      isActive: v.isActive, isFeatured: v.isFeatured, sort: v.sort, seoTitleEn: v.seoTitleEn || null, seoTitleAr: v.seoTitleAr || null,
      seoDescriptionEn: v.seoDescriptionEn || null, seoDescriptionAr: v.seoDescriptionAr || null,
    }

    const id = await db.transaction(async (tx) => {
      let productId = v.id
      if (productId) {
        const [before] = await tx.select().from(products).where(eq(products.id, productId)).for("update")
        if (!before) throw new Error("Product not found")
        if (before.trackStock && before.stockQty !== v.stockQty)
          await tx.insert(stockMovements).values({ productId, delta: v.stockQty - before.stockQty, reason: "adjust", adminId: ctx.adminId })
        await tx.update(products).set(values).where(eq(products.id, productId))
        await audit({ actorType: "admin", actorId: ctx.adminId, actorLabel: ctx.email, action: "product.updated", entity: "product", entityId: productId, meta: { price: `${before.priceMinor}->${values.priceMinor}`, stock: `${before.stockQty}->${v.stockQty}`, active: `${before.isActive}->${v.isActive}` }, ipHash: ctx.ipHash }, tx)
      } else {
        const [row] = await tx.insert(products).values(values).$returningId()
        productId = row.id
        if (v.trackStock && v.stockQty > 0) await tx.insert(stockMovements).values({ productId, delta: v.stockQty, reason: "restock", adminId: ctx.adminId })
        await audit({ actorType: "admin", actorId: ctx.adminId, actorLabel: ctx.email, action: "product.created", entity: "product", entityId: productId, meta: { sku: v.sku }, ipHash: ctx.ipHash }, tx)
      }
      await tx.delete(productImages).where(eq(productImages.productId, productId))
      const unique = [...new Set(v.imageIds)]
      if (unique.length) await tx.insert(productImages).values(unique.map((mediaId, i) => ({ productId: productId!, mediaId, sort: i })))
      return productId
    })
    revalidatePath("/admin/products")
    return { ok: true as const, data: { id } }
  },
  { name: "product.save", rateLimit: { limit: 120, windowSeconds: 60 } }
)

export const archiveProductAction = adminAction(
  "catalog:write",
  z.object({ id: z.number().int().positive(), active: z.boolean() }),
  async ({ id, active }, ctx) => {
    await db.update(products).set({ isActive: active }).where(eq(products.id, id))
    await audit({ actorType: "admin", actorId: ctx.adminId, action: active ? "product.restored" : "product.archived", entity: "product", entityId: id, ipHash: ctx.ipHash })
    revalidatePath("/admin/products")
    return { ok: true as const, data: undefined }
  },
  { name: "product.archive" }
)

export async function goToProduct(id: number) {
  redirect(`/admin/products/${id}`)
}
