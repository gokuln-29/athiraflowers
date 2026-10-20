import { readdir, readFile, rm } from "node:fs/promises"
import path from "node:path"
import { eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { db } from "@/db"
import { customers, customerSessions, otpCodes } from "@/db/schema"
import { requestLoginCode, verifyLoginCode } from "@/server/auth/customer-auth"
import { CUSTOMER_COOKIE, getCustomer } from "@/server/auth/customer-session"

import { jar } from "./setup"
import { resetJar, wipe } from "./helpers"

const mailDir = path.resolve(process.cwd(), ".dev-mail")

async function lastCode(to: string): Promise<string> {
  const files = (await readdir(mailDir)).filter((f) => f.includes(to.replace(/[^a-z0-9@.]/gi, "_"))).sort()
  const mail = JSON.parse(await readFile(path.join(mailDir, files[files.length - 1]), "utf8"))
  return /\b(\d{6})\b/.exec(mail.text)![1]
}

beforeEach(async () => {
  resetJar()
  await rm(mailDir, { recursive: true, force: true })
  await wipe("customer_sessions", "otp_codes", "customers", "rate_limits")
})

describe("customer email OTP", () => {
  it("sends a code, stores only an HMAC, and signs the customer in", async () => {
    const email = "buyer@example.test"
    expect(await requestLoginCode({ email, locale: "en" })).toEqual({ ok: true })
    const code = await lastCode(email)
    const [stored] = await db.select().from(otpCodes).where(eq(otpCodes.email, email))
    expect(stored.codeHash).toHaveLength(64)
    expect(stored.codeHash).not.toContain(code)
    expect(await verifyLoginCode({ email, code })).toEqual({ ok: true })
    const me = await getCustomer()
    expect(me?.email).toBe(email)
    expect(jar.get(CUSTOMER_COOKIE())).toBeTruthy()
  })

  it("a code works once only", async () => {
    const email = "once@example.test"
    await requestLoginCode({ email })
    const code = await lastCode(email)
    expect((await verifyLoginCode({ email, code })).ok).toBe(true)
    jar.clear()
    expect((await verifyLoginCode({ email, code })).ok).toBe(false)
  })

  it("locks the code after 5 wrong attempts, even if the right code is then used", async () => {
    const email = "attempts@example.test"
    await requestLoginCode({ email })
    const code = await lastCode(email)
    const wrong = code === "000000" ? "111111" : "000000"
    for (let i = 0; i < 5; i++) expect((await verifyLoginCode({ email, code: wrong })).ok).toBe(false)
    expect((await verifyLoginCode({ email, code })).ok).toBe(false)
  })

  it("rejects expired codes", async () => {
    const email = "expired@example.test"
    await requestLoginCode({ email })
    const code = await lastCode(email)
    await db.update(otpCodes).set({ expiresAt: new Date(Date.now() - 1000) })
    expect((await verifyLoginCode({ email, code })).ok).toBe(false)
  })

  it("a new request invalidates the previous code", async () => {
    const email = "newer@example.test"
    await requestLoginCode({ email })
    const first = await lastCode(email)
    await db.update(otpCodes).set({ createdAt: new Date(Date.now() - 60_000) })
    await wipe("rate_limits")
    await requestLoginCode({ email })
    const second = await lastCode(email)
    if (first !== second) expect((await verifyLoginCode({ email, code: first })).ok).toBe(false)
    expect((await verifyLoginCode({ email, code: second })).ok).toBe(true)
  })

  it("rate-limits requests: 30s cooldown, then 5 per hour per address", async () => {
    const email = "limited@example.test"
    expect((await requestLoginCode({ email })).ok).toBe(true)
    expect(await requestLoginCode({ email })).toMatchObject({ ok: false, error: "cooldown" })
    const results: boolean[] = []
    for (let i = 0; i < 5; i++) {
      await db.execute(sql`DELETE FROM rate_limits WHERE \`key\` LIKE 'otp:cool:%'`)
      results.push((await requestLoginCode({ email })).ok)
    }
    expect(results).toEqual([true, true, true, true, false])
  })

  it("rejects malformed input", async () => {
    expect(await requestLoginCode({ email: "not-an-email" })).toMatchObject({ ok: false, error: "invalid_input" })
    expect((await verifyLoginCode({ email: "a@b.co", code: "12ab56" })).ok).toBe(false)
  })

  it("does not reveal whether an address already has an account", async () => {
    await db.insert(customers).values({ email: "known@example.test" })
    const known = await requestLoginCode({ email: "known@example.test" })
    const unknown = await requestLoginCode({ email: "unknown@example.test" })
    expect(known).toEqual(unknown)
  })

  it("erased customers cannot sign in", async () => {
    const email = "erased@example.test"
    await db.insert(customers).values({ email, erasedAt: new Date() })
    await requestLoginCode({ email })
    const code = await lastCode(email)
    expect((await verifyLoginCode({ email, code })).ok).toBe(false)
    expect(await db.select().from(customerSessions)).toHaveLength(0)
  })
})
