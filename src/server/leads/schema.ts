import { z } from "zod"

const text = (max: number) => z.string().trim().max(max)
const phone = z
  .string()
  .trim()
  .max(32)
  .regex(/^[+()\d\s-]{7,32}$/, "phone")
const emirate = z.enum(["dubai", "abu_dhabi", "sharjah", "other"])

const base = {
  name: text(120).min(2),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: phone.optional().or(z.literal("")),
  message: text(2000).optional().or(z.literal("")),
  locale: z.enum(["en", "ar"]).default("en"),
  consent: z.literal(true),
  sourcePath: text(200).optional(),
  /** Honeypot: humans never see or fill this field. */
  website: z.string().max(0).optional().or(z.literal("")),
  /** ms timestamp when the form was rendered; instant submissions are bots. */
  startedAt: z.coerce.number().int().optional(),
}

export const corporateQuoteSchema = z.object({
  ...base,
  type: z.literal("corporate_quote"),
  company: text(160).min(2),
  need: z.enum(["program", "gifting", "both", "other"]),
  frequency: z.enum(["weekly", "monthly", "one_off", "unsure"]),
  emirate,
  locations: z.coerce.number().int().min(1).max(500).optional(),
  trn: z.string().trim().regex(/^\d{15}$/).optional().or(z.literal("")),
})

export const eventSchema = z.object({
  ...base,
  type: z.literal("event"),
  company: text(160).optional().or(z.literal("")),
  eventType: z.enum(["wedding", "corporate", "launch", "dinner", "conference", "private", "other"]),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(10000),
  emirate,
  venue: text(160).optional().or(z.literal("")),
  budget: z.enum(["under_5k", "5k_15k", "15k_50k", "over_50k", "unsure"]),
  consultation: z.coerce.boolean().default(false),
})

export const contactSchema = z.object({
  ...base,
  type: z.literal("contact"),
  message: text(2000).min(5),
})

export const leadSchema = z.discriminatedUnion("type", [corporateQuoteSchema, eventSchema, contactSchema])
export type LeadInput = z.infer<typeof leadSchema>
