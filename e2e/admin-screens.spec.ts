import { expect, test, type Page } from "@playwright/test"

import { loginOwner } from "./helpers"

test.describe.configure({ mode: "default" })

const SCREENS = ["/admin", "/admin/orders", "/admin/products", "/admin/categories", "/admin/media", "/admin/offers", "/admin/delivery", "/admin/payment-links", "/admin/leads", "/admin/customers", "/admin/blog", "/admin/pages", "/admin/seo", "/admin/reports", "/admin/settings", "/admin/staff", "/admin/audit"]

let page: Page
const problems: string[] = []

test.beforeAll(async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: test.info().project.use.viewport ?? undefined, ...(test.info().project.name === "mobile" ? { isMobile: true, hasTouch: true } : {}) })
  page = await ctx.newPage()
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${m.text()}`) })
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`))
  page.on("response", (r) => { if (r.status() >= 500) problems.push(`${r.status()} ${r.url()}`) })
  await loginOwner(page)
})

for (const path of SCREENS) {
  test(`${path} renders without errors, overflow or CSP violations`, async ({}, info) => {
    problems.length = 0
    const res = await page.goto(path)
    expect(res?.status()).toBe(200)
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
    await page.waitForLoadState("networkidle")
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, "horizontal overflow").toBeLessThanOrEqual(0)
    await page.screenshot({ path: `e2e-shots/${info.project.name}${path.replace(/\//g, "_")}.png`, fullPage: true })
    expect(problems).toEqual([])
  })
}
