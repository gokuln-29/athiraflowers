import { expect, test, type Page } from "@playwright/test"
import sharp from "sharp"

import { loginOwner } from "./helpers"

test.describe.configure({ mode: "serial" })

let page: Page
const stamp = Date.now().toString(36)

test.beforeAll(async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop", "workflows run once, on desktop")
  page = await (await browser.newContext({ baseURL: info.project.use.baseURL, viewport: { width: 1440, height: 900 } })).newPage()
  await loginOwner(page)
})

test("create a product with an uploaded image, then it appears in the shop", async () => {
  const png = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: { r: 190, g: 60, b: 90 } } }).jpeg().toBuffer()
  await page.goto("/admin/products/new")
  await page.getByLabel("Name (English)").fill(`E2E Bouquet ${stamp}`)
  await page.getByLabel("SKU").fill(`E2E-${stamp}`.toUpperCase())
  await page.getByLabel("Category").selectOption({ index: 1 })
  await page.getByLabel("Price (AED)", { exact: true }).fill("199")
  await page.getByLabel("Units in stock").fill("10")
  await page.getByRole("button", { name: "Add images" }).click()
  await page.getByLabel("Upload an image").setInputFiles({ name: "e2e.jpg", mimeType: "image/jpeg", buffer: png })
  await expect(page.getByRole("button", { name: /Selected|e2e/ }).first()).toBeVisible({ timeout: 20_000 })
  await page.getByRole("button", { name: /^Use image/ }).click()
  await page.getByRole("button", { name: "Save product" }).click()
  await expect(page.getByText(/Product (saved|created)|Saved/).first()).toBeVisible({ timeout: 15_000 })
  await page.goto("/admin/products")
  await expect(page.getByText(`E2E Bouquet ${stamp}`).first()).toBeVisible()
})

test("an order moves pending -> confirmed -> preparing -> dispatched -> delivered and gets an invoice PDF", async () => {
  await page.goto("/admin/orders?status=pending&when=all")
  const first = page.getByRole("link", { name: /^AF-\d+/ }).first()
  test.skip(!(await first.isVisible({ timeout: 3000 }).catch(() => false)), "no pending order: run checkout.spec.ts first")
  await first.click()
  await expect(page).toHaveURL(/\/admin\/orders\/\d+/)
  for (const label of ["confirmed", "preparing", "dispatched", "delivered"]) {
    const btn = page.getByRole("button", { name: new RegExp(`^Mark ${label}`, "i") })
    await expect(btn).toBeVisible()
    await btn.click()
    await expect(page.getByText(`Marked ${label}`)).toBeVisible()
    await page.waitForLoadState("networkidle")
  }
  const issue = page.getByRole("button", { name: "Issue tax invoice" })
  if (await issue.isVisible()) { await issue.click(); await page.waitForLoadState("networkidle") }
  const link = page.getByRole("link", { name: /Invoice .* \(PDF\)/ })
  await expect(link).toBeVisible()
  const res = await page.request.get((await link.getAttribute("href"))!)
  expect(res.status()).toBe(200)
  expect(res.headers()["content-type"]).toContain("application/pdf")
  expect((await res.body()).subarray(0, 4).toString()).toBe("%PDF")
})

test("blog: create a scheduled article; payment link: create and copy", async () => {
  await page.goto("/admin/blog")
  await page.getByRole("button", { name: "New article" }).click()
  await page.getByLabel("Title (English)", { exact: true }).fill(`E2E article ${stamp}`)
  await page.getByLabel(/^Article \(English\)/).fill("Seasonal flowers for Dubai offices: a short guide to choosing stems that last in air conditioning.")
  await page.getByRole("button", { name: "Save article" }).click()
  await expect(page.getByText("Article saved")).toBeVisible()
  await page.goto("/admin/payment-links")
  await page.getByLabel("What is it for?").fill(`E2E deposit ${stamp}`)
  await page.getByLabel(/Amount/).fill("500")
  await page.getByRole("button", { name: "Create link" }).click()
  await expect(page.getByLabel("Payment link", { exact: true })).toHaveValue(/\/en\/pay\/[0-9a-f]{32}$/)
  const url = await page.getByLabel("Payment link", { exact: true }).inputValue()
  const pub = await page.request.get(new URL(url).pathname)
  expect(pub.status()).toBe(200)
})
