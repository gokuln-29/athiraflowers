import "server-only"
import { and, eq, lte, sql } from "drizzle-orm"

import { db, type Db, type Tx } from "@/db"
import { emailOutbox } from "@/db/schema"

import { sendEmail, type OutgoingEmail } from "./brevo"

export type QueuedEmail = OutgoingEmail & { kind: string; dedupeKey?: string }

/**
 * Write an email to the outbox. Call this INSIDE the same transaction that saves the order/lead,
 * so an email can never be sent for a record that failed to save. A dedupe key makes retries idempotent.
 */
export async function queueEmail(conn: Db | Tx, email: QueuedEmail): Promise<void> {
  await conn
    .insert(emailOutbox)
    .values({
      dedupeKey: email.dedupeKey?.slice(0, 120) ?? null,
      kind: email.kind,
      toEmail: email.to,
      toName: email.toName ?? null,
      subject: email.subject.slice(0, 300),
      html: email.html,
      text: email.text,
      nextAttemptAt: new Date(),
    })
    .onDuplicateKeyUpdate({ set: { kind: sql`kind` } })
}

const MAX_ATTEMPTS = 6
const backoffMs = (attempt: number) => Math.min(60 * 60 * 1000, 30_000 * 2 ** attempt)

/** Sends due emails. Safe to call concurrently: each row is claimed with a conditional update. */
export async function flushOutbox(limit = 20): Promise<{ sent: number; failed: number }> {
  const now = new Date()
  const due = await db
    .select()
    .from(emailOutbox)
    .where(and(eq(emailOutbox.status, "pending"), lte(emailOutbox.nextAttemptAt, now)))
    .limit(limit)
  let sent = 0
  let failed = 0
  for (const row of due) {
    // Claim: push next attempt forward so a concurrent worker skips it.
    const [claim] = await db
      .update(emailOutbox)
      .set({ nextAttemptAt: new Date(now.getTime() + 2 * 60 * 1000), attempts: sql`${emailOutbox.attempts} + 1` })
      .where(and(eq(emailOutbox.id, row.id), eq(emailOutbox.status, "pending"), lte(emailOutbox.nextAttemptAt, now)))
    if (claim.affectedRows !== 1) continue

    const result = await sendEmail({ to: row.toEmail, toName: row.toName ?? undefined, subject: row.subject, html: row.html, text: row.text, tags: [row.kind] })
    if (result.ok) {
      await db.update(emailOutbox).set({ status: "sent", sentAt: new Date(), lastError: null }).where(eq(emailOutbox.id, row.id))
      sent++
    } else {
      const attempts = row.attempts + 1
      const dead = !result.retryable || attempts >= MAX_ATTEMPTS
      await db
        .update(emailOutbox)
        .set({ status: dead ? "failed" : "pending", lastError: result.error.slice(0, 300), nextAttemptAt: new Date(Date.now() + backoffMs(attempts)) })
        .where(eq(emailOutbox.id, row.id))
      failed++
    }
  }
  return { sent, failed }
}
