import { describe, expect, it } from "vitest"

import { can, PERMISSIONS, ROLE_PERMISSIONS } from "@/server/auth/permissions"
import { checkPasswordPolicy, hashPassword, verifyPassword } from "@/server/auth/password"
import { decryptSecret, encryptSecret, randomDigits, randomHex, safeEqual, sha256Hex } from "@/server/security/crypto"
import { rateLimit, resetRateLimit } from "@/server/security/rate-limit"
import { sanitizeMeta } from "@/server/security/audit"

describe("password hashing (Argon2id)", () => {
  it("hashes with argon2id and verifies", async () => {
    const hash = await hashPassword("a-long-unique-passphrase")
    expect(hash.startsWith("$argon2id$")).toBe(true)
    expect(await verifyPassword(hash, "a-long-unique-passphrase")).toBe(true)
    expect(await verifyPassword(hash, "wrong")).toBe(false)
    expect(await verifyPassword("garbage", "x")).toBe(false)
  })
  it("enforces the policy", () => {
    expect(checkPasswordPolicy("short").ok).toBe(false)
    expect(checkPasswordPolicy("aaaaaaaaaaaaaaaa").ok).toBe(false)
    expect(checkPasswordPolicy("password1").ok).toBe(false)
    expect(checkPasswordPolicy("correct horse battery").ok).toBe(true)
  })
})

describe("crypto helpers", () => {
  it("round-trips AES-GCM and rejects tampering", () => {
    const enc = encryptSecret("JBSWY3DPEHPK3PXP", "mfa")
    expect(decryptSecret(enc, "mfa")).toBe("JBSWY3DPEHPK3PXP")
    const [iv, tag, ct] = enc.split(".")
    expect(() => decryptSecret([iv, tag, ct.slice(0, -2) + "AA"].join("."), "mfa")).toThrow()
    expect(() => decryptSecret(enc, "other-purpose")).toThrow()
  })
  it("generates tokens of expected shape", () => {
    expect(randomHex(32)).toMatch(/^[0-9a-f]{32}$/)
    expect(randomDigits(6)).toMatch(/^\d{6}$/)
    expect(safeEqual("a", "a")).toBe(true)
    expect(safeEqual("a", "b")).toBe(false)
    expect(sha256Hex("x")).toHaveLength(64)
  })
})

describe("role permissions", () => {
  it("owner can do everything", () => {
    for (const p of PERMISSIONS) expect(can("owner", p)).toBe(true)
  })
  it("manager: catalogue, offers, blog, reports; not orders, staff or settings", () => {
    for (const p of ["catalog:write", "offers:write", "blog:write", "reports:read", "content:write"] as const) expect(can("manager", p)).toBe(true)
    for (const p of ["orders:write", "orders:read", "leads:write", "staff:write", "settings:write", "delivery:write"] as const) expect(can("manager", p)).toBe(false)
  })
  it("staff: orders, leads, customers; not catalogue, reports or staff", () => {
    for (const p of ["orders:write", "leads:write", "customers:read"] as const) expect(can("staff", p)).toBe(true)
    for (const p of ["catalog:write", "reports:read", "staff:write", "settings:write", "blog:write"] as const) expect(can("staff", p)).toBe(false)
    expect(ROLE_PERMISSIONS.staff).not.toContain("audit:read")
  })
})

describe("DB-backed rate limit", () => {
  it("allows up to the limit then blocks, and reopens after the window", async () => {
    const key = `test:rl:${Math.random()}`
    const results = []
    for (let i = 0; i < 4; i++) results.push((await rateLimit(key, 3, 1)).allowed)
    expect(results).toEqual([true, true, true, false])
    await new Promise((r) => setTimeout(r, 1200))
    expect((await rateLimit(key, 3, 1)).allowed).toBe(true)
    await resetRateLimit(key)
  })
})

describe("audit sanitiser", () => {
  it("drops sensitive keys and caps values", () => {
    const out = sanitizeMeta({ password: "x", token: "y", apiKey: "z", note: "n".repeat(1000), count: 2 })!
    expect(out).not.toHaveProperty("password")
    expect(out).not.toHaveProperty("token")
    expect(out).not.toHaveProperty("apiKey")
    expect((out.note as string).length).toBe(300)
    expect(out.count).toBe(2)
  })
})
