import "server-only"
import { after } from "next/server"

import { db } from "@/db"
import { leads } from "@/db/schema"
import { env } from "@/lib/env"
import { audit } from "@/server/security/audit"
import { hmacHex } from "@/server/security/crypto"
import { rateLimit } from "@/server/security/rate-limit"
import { requestContext } from "@/server/security/request"
import { flushOutbox, queueEmail } from "@/server/email/outbox"
import { leadAcknowledgement, leadNotification } from "@/server/email/lead-emails"

import { leadSchema } from "./schema"

export type LeadResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "rate_limited" | "failed"; fieldErrors?: Record<string, string[]> }

export async function submitLead(raw: unknown): Promise<LeadResult> {
  const parsed = leadSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  const input = parsed.data
  const ctx = await requestContext()

  // Bot checks answer "success" so scripts learn nothing; nothing is saved or emailed.
  if (input.website) return { ok: true }
  if (input.startedAt && Date.now() - input.startedAt < 2500) return { ok: true }

  const byIp = await rateLimit(`lead:ip:${ctx.ipHash}`, 6, 3600)
  const byEmail = await rateLimit(`lead:email:${hmacHex(input.email, "email")}`, 4, 86_400)
  if (!byIp.allowed || !byEmail.allowed) return { ok: false, error: "rate_limited" }

  const { type, name, email, phone, message, locale, sourcePath, ...rest } = input
  const company = "company" in input ? input.company || null : null
  const details: Record<string, string | number | boolean | null> = {}
  for (const [k, v] of Object.entries(rest)) {
    if (["consent", "website", "startedAt", "company"].includes(k)) continue
    details[k] = v === "" || v === undefined ? null : (v as string | number | boolean)
  }

  try {
    const leadId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(leads)
        .values({ type, name, company, email, phone: phone || null, message: message || null, details, sourcePath: sourcePath ?? null, locale, consent: true, ipHash: ctx.ipHash })
        .$returningId()
      // Emails are queued in the same transaction: they exist only if the lead was saved.
      const notify = env().NOTIFY_EMAIL
      if (notify) await queueEmail(tx, { ...leadNotification({ to: notify, type, name, email, phone: phone || null, company, message: message || null, details }), dedupeKey: `lead:${row.id}:notify` })
      await queueEmail(tx, { ...leadAcknowledgement(locale, { to: email, name, type }), dedupeKey: `lead:${row.id}:ack` })
      return row.id
    })
    await audit({ actorType: "system", action: "lead.created", entity: "lead", entityId: leadId, meta: { type }, ipHash: ctx.ipHash })
    after(() => flushOutbox().catch((e) => console.error("[outbox]", e.message)))
    return { ok: true }
  } catch (error) {
    console.error("[lead] save failed", error)
    return { ok: false, error: "failed" }
  }
}
