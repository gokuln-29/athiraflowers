/**
 * Development/demo seed. Idempotent unless --reset is passed (which wipes content tables).
 * Refuses to run in production. Sample content is clearly marked in docs/LAUNCH_CHECKLIST.md.
 */
import "./_use-migrate-user"
import { randomBytes } from "node:crypto"
import { readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import { sql } from "drizzle-orm"

import { db, pool, schema } from "@/db"
import { slugify } from "@/lib/slug"
import { env } from "@/lib/env"
import { hashPassword } from "@/server/auth/password"
import { ingestImage } from "@/server/media/service"

import { careByCategory, seedCategories, seedProducts } from "@/db/seed/catalog"
import {
  seedBlogCategories,
  seedCoupons,
  seedFaqs,
  seedPages,
  seedPosts,
  seedSettings,
  seedSlots,
  seedZones,
} from "@/db/seed/content"
import { seedHomeSections } from "@/db/seed/home"

const t = schema

async function main() {
  if (env().NODE_ENV === "production") throw new Error("Refusing to seed in production")
  const reset = process.argv.includes("--reset")

  const [{ n }] = (await db.select({ n: sql<number>`count(*)` }).from(t.categories)) as { n: number }[]
  if (Number(n) > 0 && !reset) {
    console.log("Database already seeded. Use --reset to wipe and reseed.")
    await ensureOwner()
    await pool.end()
    return
  }

  if (reset) {
    console.log("Resetting content tables...")
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`)
    for (const table of [
      "order_status_history", "order_items", "payments", "coupon_redemptions", "orders", "stripe_events", "payment_links",
      "stock_movements", "product_images", "product_relations", "products", "categories", "media", "delivery_blackouts",
      "delivery_slots", "delivery_zones", "coupons", "leads", "lead_notes", "blog_posts", "blog_categories", "pages",
      "home_sections", "faqs", "testimonials", "client_logos", "seo_overrides", "settings", "email_outbox", "counters",
    ]) {
      await db.execute(sql.raw(`TRUNCATE TABLE \`${table}\``))
    }
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`)
    await rm(path.resolve(process.cwd(), ".storage"), { recursive: true, force: true })
  }

  // Counters
  await db.insert(t.counters).values({ name: "order", value: 100000 })

  // Settings
  for (const [key, value] of Object.entries(seedSettings)) {
    await db.insert(t.settings).values({ key, value: value as Record<string, unknown> })
  }

  // Delivery
  const zoneIds: number[] = []
  let zoneSort = 0
  for (const z of seedZones) {
    const [r] = await db
      .insert(t.deliveryZones)
      .values({ emirate: z.emirate, nameEn: z.nameEn, nameAr: z.nameAr, feeMinor: z.feeMinor, freeOverMinor: z.freeOverMinor, minOrderMinor: z.minOrderMinor, sameDayAvailable: z.sameDay, sort: zoneSort++ })
      .$returningId()
    zoneIds.push(r.id)
  }
  let slotSort = 0
  for (const s of seedSlots) {
    await db.insert(t.deliverySlots).values({ labelEn: s.labelEn, labelAr: s.labelAr, startTime: s.start, endTime: s.end, sameDayCutoff: s.cutoff, extraFeeMinor: s.fee, capacityPerDay: s.capacity, sort: slotSort++ })
  }

  for (const c of seedCoupons) {
    await db.insert(t.coupons).values({ ...c, descriptionEn: c.descriptionEn, descriptionAr: c.descriptionAr })
  }

  // Media
  console.log("Processing photographs...")
  const manifest = JSON.parse(await readFile("seed-assets/manifest.json", "utf8")) as {
    key: string; id: string; credit: string; altEn: string; altAr: string
  }[]
  const mediaByKey = new Map<string, number>()
  for (const item of manifest) {
    const buffer = await readFile(`seed-assets/photos/${item.key}.jpg`)
    const { id } = await ingestImage({ buffer, altEn: item.altEn, altAr: item.altAr, credit: `${item.credit} / Unsplash (${item.id})` })
    mediaByKey.set(item.key, id)
  }

  // Categories
  const categoryIds = new Map<string, number>()
  let cSort = 0
  for (const c of seedCategories) {
    const [r] = await db
      .insert(t.categories)
      .values({ slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr, descriptionEn: c.descriptionEn, descriptionAr: c.descriptionAr, imageId: mediaByKey.get(c.image) ?? null, sort: cSort++ })
      .$returningId()
    categoryIds.set(c.slug, r.id)
  }

  // Products
  let pSort = 0
  for (const p of seedProducts) {
    const care = careByCategory[p.category]
    const [r] = await db
      .insert(t.products)
      .values({
        slug: p.slug, sku: p.sku, categoryId: categoryIds.get(p.category)!, nameEn: p.nameEn, nameAr: p.nameAr,
        shortEn: p.shortEn, shortAr: p.shortAr, descriptionEn: p.descriptionEn, descriptionAr: p.descriptionAr,
        includesEn: p.includesEn, includesAr: p.includesAr, careEn: care?.en ?? null, careAr: care?.ar ?? null,
        deliveryNoteEn: p.leadTimeHours && p.leadTimeHours >= 48 ? `Needs ${Math.round(p.leadTimeHours / 24)} days' notice. Not available for same-day delivery.` : "Order before the cut-off shown at checkout for same-day delivery where available.",
        deliveryNoteAr: p.leadTimeHours && p.leadTimeHours >= 48 ? `يحتاج إشعاراً قبل ${Math.round(p.leadTimeHours / 24)} أيام. غير متاح للتوصيل في اليوم نفسه.` : "اطلبوا قبل موعد الإغلاق المعروض عند الدفع للتوصيل في اليوم نفسه حيثما توفر.",
        priceMinor: p.priceMinor, compareAtMinor: p.compareAtMinor ?? null, pricingType: p.pricingType ?? "one_time",
        billingInterval: p.billingInterval ?? null, rentalDays: p.rentalDays ?? null, depositMinor: p.depositMinor ?? 0,
        minQty: p.minQty ?? 1, maxQty: p.maxQty ?? 100, leadTimeHours: p.leadTimeHours ?? 0, sameDayEligible: p.sameDay ?? true,
        trackStock: p.stock > 0 || p.pricingType === undefined, stockQty: p.stock, isFeatured: p.featured ?? false, sort: pSort++,
      })
      .$returningId()
    let order = 0
    for (const img of p.images) {
      const mediaId = mediaByKey.get(img)
      if (mediaId) await db.insert(t.productImages).values({ productId: r.id, mediaId, sort: order++ })
    }
  }

  // Content
  let fSort = 0
  for (const f of seedFaqs) {
    await db.insert(t.faqs).values({ group: f.group, questionEn: f.qEn, questionAr: f.qAr, answerEn: f.aEn, answerAr: f.aAr, sort: fSort++ })
  }
  for (const p of seedPages) {
    await db.insert(t.pages).values({ key: p.key, titleEn: p.titleEn, titleAr: p.titleAr, bodyEn: p.bodyEn, bodyAr: p.bodyAr })
  }
  const blogCatIds = new Map<string, number>()
  let bSort = 0
  for (const c of seedBlogCategories) {
    const [r] = await db.insert(t.blogCategories).values({ slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr, sort: bSort++ }).$returningId()
    blogCatIds.set(c.slug, r.id)
  }
  let day = 0
  for (const post of seedPosts) {
    const words = post.bodyEn.split(/\s+/).length
    await db.insert(t.blogPosts).values({
      slug: post.slug, titleEn: post.titleEn, titleAr: post.titleAr, excerptEn: post.excerptEn, excerptAr: post.excerptAr,
      bodyEn: post.bodyEn, bodyAr: post.bodyAr, coverMediaId: mediaByKey.get(post.cover) ?? null,
      categoryId: blogCatIds.get(post.category)!, authorName: "Athira flowers", status: "published",
      publishedAt: new Date(Date.now() - (3 + day++ * 9) * 86_400_000), readingMinutes: Math.max(1, Math.round(words / 200)),
    })
  }

  // Home sections
  let hSort = 0
  for (const section of seedHomeSections(mediaByKey)) {
    await db.insert(t.homeSections).values({ type: section.type, data: section.data, isActive: section.active ?? true, sort: hSort++ })
  }

  void zoneIds
  void slugify
  await ensureOwner()
  console.log("Seed complete.")
  await pool.end()
}

async function ensureOwner() {
  const email = (process.env.SEED_OWNER_EMAIL ?? "owner@athiraflowers.ae").toLowerCase()
  const existing = await db.select({ id: t.adminUsers.id }).from(t.adminUsers).where(sql`${t.adminUsers.email} = ${email}`).limit(1)
  if (existing.length) return
  const password = process.env.SEED_OWNER_PASSWORD ?? randomBytes(15).toString("base64url")
  await db.insert(t.adminUsers).values({ email, name: "Owner", role: "owner", passwordHash: await hashPassword(password), passwordChangedAt: new Date() })
  // Development credential file (gitignored). Production owners are created with scripts/create-admin.ts.
  await writeFile(".dev-credentials", `OWNER_EMAIL=${email}\nOWNER_PASSWORD=${password}\n`, { mode: 0o600 })
  console.log(`Owner account created. Credentials written to .dev-credentials`)
}

main().catch(async (error) => {
  console.error(error)
  await pool.end().catch(() => undefined)
  process.exit(1)
})
