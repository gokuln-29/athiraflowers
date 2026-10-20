"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { settings } from "@/db/schema"
import { adminAction } from "@/server/auth/admin-guards"
import { audit } from "@/server/security/audit"

const t = (n: number) => z.string().trim().max(n)
const url = z.string().trim().max(300).refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), "Use a full https:// link")

const SETTINGS_SCHEMAS = {
  contact: z.object({
    whatsapp: z.string().trim().max(32).regex(/^(\+?\d[\d\s-]{6,24})?$/, "Use international format, e.g. +971 50 123 4567"),
    phone: t(32), email: z.string().trim().email().max(254),
    addressEn: t(300), addressAr: t(300), hoursEn: t(200), hoursAr: t(200), whatsappMessageEn: t(200), whatsappMessageAr: t(200),
  }),
  business: z.object({
    legalName: t(160), trn: z.string().trim().regex(/^(\d{15})?$/, "A TRN has exactly 15 digits"), licenceNo: t(80), invoiceAddress: t(300), bankDetails: t(500),
  }),
  social: z.object({ instagram: url, facebook: url, linkedin: url, tiktok: url }),
  checkout: z.object({
    minOrderMinor: z.number().int().min(0).max(10_000_000), codEnabled: z.boolean(), codMaxMinor: z.number().int().min(0).max(10_000_000), stripeEnabled: z.boolean(),
    substitutionPolicyEn: t(500), substitutionPolicyAr: t(500), depositNoteEn: t(500), depositNoteAr: t(500),
  }),
  heroes: z.object({
    corporate: z.number().int().positive().nullable(), events: z.number().int().positive().nullable(), about: z.number().int().positive().nullable(),
    contact: z.number().int().positive().nullable(), offers: z.number().int().positive().nullable(), blog: z.number().int().positive().nullable(),
  }),
} as const

export const saveSettingsAction = adminAction(
  "settings:write",
  z.object({ group: z.enum(["contact", "business", "social", "checkout", "heroes"]), value: z.record(z.string(), z.unknown()) }),
  async ({ group, value }, ctx) => {
    const parsed = SETTINGS_SCHEMAS[group].safeParse(value)
    if (!parsed.success) return { ok: false as const, error: "Check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
    await db.insert(settings).values({ key: group, value: parsed.data, updatedBy: ctx.adminId }).onDuplicateKeyUpdate({ set: { value: parsed.data, updatedBy: ctx.adminId } })
    await audit({ actorType: "admin", actorId: ctx.adminId, actorLabel: ctx.email, action: "settings.updated", entity: "settings", entityId: group, ipHash: ctx.ipHash })
    revalidatePath("/admin/settings")
    return { ok: true as const, data: undefined }
  },
  { name: "settings.save" }
)

