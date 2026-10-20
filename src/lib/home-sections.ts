import { z } from "zod"

import { localized } from "./i18n-text"

const cta = z.object({ label: localized, href: z.string().max(300) })
const mediaId = z.number().int().positive().nullable()

/** Validated shape of home_sections.data for each section type. */
export const homeSectionSchemas = {
  hero: z.object({
    headline: localized,
    sub: localized,
    primary: cta,
    secondary: cta.nullable(),
    imageMediaId: mediaId,
    note: localized.nullable(),
  }),
  pathways: z.object({
    title: localized,
    items: z
      .array(z.object({ title: localized, body: localized, href: z.string().max(300), imageMediaId: mediaId }))
      .min(1)
      .max(4),
  }),
  featured: z.object({ title: localized, body: localized.nullable(), limit: z.number().int().min(2).max(12) }),
  categories: z.object({ title: localized }),
  program: z.object({
    title: localized,
    body: localized,
    bullets: z.array(localized).max(6),
    cta,
    imageMediaId: mediaId,
  }),
  banner: z.object({ text: localized, cta }),
  steps: z.object({ title: localized, items: z.array(z.object({ title: localized, body: localized })).min(2).max(5) }),
  testimonials: z.object({ title: localized }),
  logos: z.object({ title: localized }),
  faq: z.object({ title: localized, group: z.enum(["all", "general", "delivery", "corporate", "events", "payment"]), limit: z.number().int().min(1).max(20) }),
  cta: z.object({ title: localized, body: localized, primary: cta, secondary: cta.nullable() }),
} as const

export type HomeSectionData<T extends keyof typeof homeSectionSchemas> = z.infer<(typeof homeSectionSchemas)[T]>
