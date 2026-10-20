import { expect, test } from "@playwright/test"
import { writeFileSync, existsSync, readFileSync } from "node:fs"

import { devOwner, totpNow } from "./helpers"

const SECRET_FILE = ".e2e-owner-totp"

test.describe.configure({ mode: "serial" })

test("unauthenticated /admin redirects to sign in, and the page is not indexable", async ({ page }) => {
  const res = await page.goto("/admin")
  expect(page.url()).toContain("/admin/login")
  expect(res?.status()).toBe(200)
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
})

test("wrong password shows one generic error", async ({ page }) => {
  const owner = devOwner()
  await page.goto("/admin/login")
  await page.getByLabel("Email").fill(owner.email)
  await page.getByLabel("Password").fill("definitely-not-the-password")
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible()
})

test("owner signs in, enrols MFA (first run) or verifies TOTP, reaches the dashboard, and signs out", async ({ page }, testInfo) => {
  const owner = devOwner()
  await page.goto("/admin/login")
  await page.getByLabel("Email").fill(owner.email)
  await page.getByLabel("Password").fill(owner.password)
  await page.getByRole("button", { name: "Continue" }).click()

  await page.waitForURL(/\/admin\/(account\/mfa|login\/verify)/)
  if (page.url().includes("/admin/account/mfa")) {
    const secret = await page.getByLabel("Or enter this key manually").inputValue()
    writeFileSync(SECRET_FILE, secret, { mode: 0o600 })
    await page.getByLabel("6-digit code").fill(totpNow(secret))
    await page.getByRole("button", { name: "Turn on" }).click()
    await expect(page.getByRole("heading", { name: "Save your recovery codes" })).toBeVisible()
    await expect(page.getByLabel("Recovery codes").locator("li")).toHaveCount(10)
    await page.getByRole("link", { name: /I have saved them/ }).click()
  } else {
    expect(existsSync(SECRET_FILE)).toBe(true)
    await expect(page).toHaveURL(/\/admin\/login\/verify/)
    // Enrolment (or an earlier run) already used the current time-step: use the next one.
    await page.getByLabel("Code").fill(totpNow(readFileSync(SECRET_FILE, "utf8"), testInfo.project.name === "mobile" ? -1 : 1))
    await page.getByRole("button", { name: "Verify" }).click()
  }

  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole("heading", { name: /Good day/ })).toBeVisible()
  // cookie is HttpOnly
  const cookies = await page.context().cookies()
  const session = cookies.find((c) => c.name === "athira_admin")
  expect(session?.httpOnly).toBe(true)
  expect(session?.sameSite).toBe("Lax")

  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Open navigation" }).click()
  await page.getByRole("button", { name: "Sign out" }).first().click()
  await expect(page).toHaveURL(/\/admin\/login/)
  await page.goto("/admin")
  await expect(page).toHaveURL(/\/admin\/login/)
})
