"use server"

import { eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { adminUsers, LEAD_STATUSES, leadNotes, leads } from "@/db/schema"
import { adminAction, fail } from "@/server/auth/admin-guards"
import { audit } from "@/server/security/audit"

const id = z.object({ id: z.number().int().positive() })

export const moveLeadAction = adminAction("leads:write", id.extend({ status: z.enum(LEAD_STATUSES) }), async ({ id: leadId, status }, ctx) => {
  const [{ top }] = await db.select({ top: sql<number>`coalesce(max(position), 0)` }).from(leads).where(eq(leads.status, status))
  await db.update(leads).set({ status, position: Number(top) + 1 }).where(eq(leads.id, leadId))
  await audit({ actorType: "admin", actorId: ctx.adminId, action: "lead.moved", entity: "lead", entityId: leadId, meta: { status }, ipHash: ctx.ipHash })
  revalidatePath("/admin/leads")
  return { ok: true as const, data: undefined }
}, { name: "lead.move", rateLimit: { limit: 200, windowSeconds: 60 } })

export const updateLeadAction = adminAction("leads:write", id.extend({ assignedTo: z.number().int().positive().nullable(), estimatedValue: z.number().min(0).max(100_000_000).nullable() }), async ({ id: leadId, assignedTo, estimatedValue }, ctx) => {
  if (assignedTo) {
    const [a] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.id, assignedTo)).limit(1)
    if (!a) return fail("That person no longer exists.")
  }
  await db.update(leads).set({ assignedTo, estimatedValueMinor: estimatedValue == null ? null : Math.round(estimatedValue * 100) }).where(eq(leads.id, leadId))
  await audit({ actorType: "admin", actorId: ctx.adminId, action: "lead.updated", entity: "lead", entityId: leadId, ipHash: ctx.ipHash })
  revalidatePath("/admin/leads")
  return { ok: true as const, data: undefined }
}, { name: "lead.update" })

export const addLeadNoteAction = adminAction("leads:write", id.extend({ body: z.string().trim().min(1).max(2000) }), async ({ id: leadId, body }, ctx) => {
  await db.insert(leadNotes).values({ leadId, adminId: ctx.adminId, body })
  revalidatePath("/admin/leads")
  return { ok: true as const, data: undefined }
}, { name: "lead.note" })

export const getLeadAction = adminAction("leads:read", id, async ({ id: leadId }) => {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead) return fail("Lead not found.")
  const notes = await db.select({ n: leadNotes, who: adminUsers.name }).from(leadNotes).leftJoin(adminUsers, eq(adminUsers.id, leadNotes.adminId)).where(eq(leadNotes.leadId, leadId)).orderBy(leadNotes.createdAt)
  return { ok: true as const, data: { lead: { ...lead, createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString() }, notes: notes.map(({ n, who }) => ({ id: n.id, body: n.body, who: who ?? "Staff", at: n.createdAt.toISOString() })) } }
}, { name: "lead.get" })
