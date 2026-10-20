import { readFileSync } from "node:fs"
import * as OTPAuth from "otpauth"

export function devOwner() {
  const raw = readFileSync(".dev-credentials", "utf8")
  const get = (k: string) => raw.split("\n").find((l) => l.startsWith(`${k}=`))!.slice(k.length + 1)
  return { email: get("OWNER_EMAIL"), password: get("OWNER_PASSWORD") }
}

export const totpNow = (secret: string, stepOffset = 0) =>
  new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30 }).generate({ timestamp: Date.now() + stepOffset * 30_000 })

import { readFileSync as read } from "node:fs"
import type { Page } from "@playwright/test"

/** Signs the dev owner in. TOTP steps are single-use, so try the current step and its neighbours until one is accepted. */
export async function loginOwner(page: Page) {
  const owner = devOwner()
  const secret = read(".e2e-owner-totp", "utf8")
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const offset of [0, 1, -1]) {
      await page.goto("/admin/login")
      await page.getByLabel("Email").fill(owner.email)
      await page.getByLabel("Password").fill(owner.password)
      await page.getByRole("button", { name: "Continue" }).click()
      await page.waitForURL(/\/admin\/login\/verify/)
      await page.getByLabel("Code").fill(totpNow(secret, offset))
      await page.getByRole("button", { name: "Verify" }).click()
      try {
        await page.waitForURL(/\/admin$/, { timeout: 4000 })
        return
      } catch {
        /* step already used: try the next one */
      }
    }
    await page.waitForTimeout(31_000)
  }
  throw new Error("Could not sign in with any TOTP step")
}
