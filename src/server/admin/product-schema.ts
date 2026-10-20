import { z } from "zod"

const aed = z.string().trim().regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter an amount like 295 or 295.50")
const text = (max: number) => z.string().trim().max(max)
export const toMinor = (v: string) => Math.round(Number(v) * 100)

export const productSchema = z
  .object({
    id: z.number().int().positive().optional(),
    slug: z.string().trim().max(140).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only").or(z.literal("")),
    sku: z.string().trim().min(2).max(60).regex(/^[A-Za-z0-9._-]+$/, "Letters, numbers, dot, dash and underscore only"),
    categoryId: z.number({ error: "Choose a category" }).int("Choose a category").positive("Choose a category"),
    nameEn: text(180).min(2),
    nameAr: text(180).default(""),
    shortEn: text(300).default(""),
    shortAr: text(300).default(""),
    descriptionEn: text(8000).default(""),
    descriptionAr: text(8000).default(""),
    includesEn: text(2000).default(""),
    includesAr: text(2000).default(""),
    careEn: text(3000).default(""),
    careAr: text(3000).default(""),
    deliveryNoteEn: text(2000).default(""),
    deliveryNoteAr: text(2000).default(""),
    price: aed,
    compareAt: aed.or(z.literal("")).default(""),
    deposit: aed.or(z.literal("")).default(""),
    pricingType: z.enum(["one_time", "subscription", "rental"]),
    billingInterval: z.enum(["week", "month"]).nullable().default(null),
    rentalDays: z.number().int().min(1).max(60).nullable().default(null),
    minQty: z.number().int().min(1).max(1000),
    maxQty: z.number().int().min(1).max(1000),
    leadTimeHours: z.number().int().min(0).max(720),
    sameDayEligible: z.boolean(),
    trackStock: z.boolean(),
    stockQty: z.number().int().min(0).max(1_000_000),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
    sort: z.number().int().min(0).max(100000).default(0),
    seoTitleEn: text(160).default(""),
    seoTitleAr: text(160).default(""),
    seoDescriptionEn: text(320).default(""),
    seoDescriptionAr: text(320).default(""),
    imageIds: z.array(z.number().int().positive()).max(12),
  })
  .superRefine((v, ctx) => {
    if (v.maxQty < v.minQty) ctx.addIssue({ code: "custom", path: ["maxQty"], message: "Maximum cannot be below the minimum" })
    if (v.pricingType === "subscription" && !v.billingInterval) ctx.addIssue({ code: "custom", path: ["billingInterval"], message: "Choose weekly or monthly" })
    if (v.pricingType === "rental" && !v.rentalDays) ctx.addIssue({ code: "custom", path: ["rentalDays"], message: "Enter the rental period in days" })
    if (v.compareAt && toMinor(v.compareAt) <= toMinor(v.price)) ctx.addIssue({ code: "custom", path: ["compareAt"], message: "Compare-at price must be higher than the price" })
  })

export type ProductForm = z.infer<typeof productSchema>
