import "server-only"

import { db, type Tx } from "@/db"
import { auditLog } from "@/db/schema"

const SENSITIVE = /pass|token|secret|code|card|cvv|iban|authorization|cookie|key/i

/** Remove anything that looks sensitive and cap size, so the audit log never stores secrets or large payloads. */
export function sanitizeMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!meta) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE.test(k)) continue
    if (typeof v === "string") out[k] = v.slice(0, 300)
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v
    else if (v && typeof v === "object") out[k] = JSON.stringify(v).slice(0, 500)
  }
  return out
}

export type AuditInput = {
  actorType: "admin" | "customer" | "system" | "webhook"
  actorId?: number | string | null
  actorLabel?: string | null
  action: string
  entity?: string
  entityId?: number | string
  meta?: Record<string, unknown>
  ipHash?: string | null
}

export async function audit(input: AuditInput, tx?: Tx): Promise<void> {
  try {
    await (tx ?? db).insert(auditLog).values({
      actorType: input.actorType,
      actorId: input.actorId == null ? null : String(input.actorId),
      actorLabel: input.actorLabel?.slice(0, 160) ?? null,
      action: input.action.slice(0, 80),
      entity: input.entity?.slice(0, 64),
      entityId: input.entityId == null ? undefined : String(input.entityId).slice(0, 64),
      meta: sanitizeMeta(input.meta),
      ipHash: input.ipHash ?? null,
    })
  } catch (error) {
    // Auditing must never break the user-facing action, but the failure must be visible to operators.
    console.error("[audit] failed to write audit entry", input.action, (error as Error).message)
  }
}
