import "server-only"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { site } from "@/config/site"
import { env } from "@/lib/env"

export type OutgoingEmail = {
  to: string
  toName?: string
  subject: string
  html: string
  text: string
  replyTo?: string
  tags?: string[]
}

export type SendResult = { ok: true; id?: string } | { ok: false; error: string; retryable: boolean }

/**
 * Brevo transactional email API. In development without a key the message is written to .dev-mail/
 * so flows (OTP, orders) can be exercised end to end. In production a missing key is an error.
 */
export async function sendEmail(message: OutgoingEmail): Promise<SendResult> {
  const e = env()
  if (!e.BREVO_API_KEY || !e.BREVO_SENDER_EMAIL) {
    if (e.NODE_ENV === "production") return { ok: false, error: "Email is not configured", retryable: false }
    const dir = path.resolve(process.cwd(), ".dev-mail")
    await mkdir(dir, { recursive: true })
    const file = path.join(dir, `${Date.now()}-${message.to.replace(/[^a-z0-9@.]/gi, "_")}.json`)
    await writeFile(file, JSON.stringify({ ...message, sentAt: new Date().toISOString() }, null, 2))
    return { ok: true, id: path.basename(file) }
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": e.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: e.BREVO_SENDER_EMAIL, name: e.BREVO_SENDER_NAME ?? site.name },
        to: [{ email: message.to, name: message.toName }],
        replyTo: message.replyTo ? { email: message.replyTo } : undefined,
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
        tags: message.tags,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (res.ok) {
      const body = (await res.json().catch(() => ({}))) as { messageId?: string }
      return { ok: true, id: body.messageId }
    }
    // 4xx (except 429) will not succeed on retry; log status only, never the payload.
    console.error("[email] Brevo rejected message", res.status)
    return { ok: false, error: `Brevo ${res.status}`, retryable: res.status === 429 || res.status >= 500 }
  } catch (error) {
    console.error("[email] Brevo request failed", (error as Error).name)
    return { ok: false, error: "network", retryable: true }
  }
}
