import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"
import mysql from "mysql2/promise"

const dbUrl = () => readFileSync(".env", "utf8").split("\n").find((l) => l.startsWith("DATABASE_MIGRATE_URL="))!.slice(21).replace(/"/g, "")

test("guest buys a bouquet with cash on delivery, end to end", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile"
  const conn = await mysql.createConnection(dbUrl())
  const [before] = (await conn.query("SELECT stock_qty FROM products WHERE slug = 'seasonal-market-bunch'")) as unknown as [{ stock_qty: number }[]]

  await page.goto("/en/product/seasonal-market-bunch")
  await page.getByRole("button", { name: "Add to cart" }).click()
  await expect(page.getByRole("dialog", { name: "Your cart" })).toBeVisible()
  await expect(page.getByText("Subtotal").first()).toBeVisible()
  await page.getByRole("link", { name: "Go to checkout" }).click()
  await expect(page).toHaveURL(/\/en\/checkout$/)

  // Prices shown come from the server.
  await expect(page.getByRole("heading", { name: "Order summary" })).toBeVisible()
  await expect(page.getByText("Seasonal market bunch")).toBeVisible()

  await page.getByLabel("Full name").fill("Test Buyer")
  await page.getByLabel("Phone", { exact: true }).fill("+971501112222")
  await page.getByLabel("Email", { exact: true }).fill("buyer@example.test")
  await page.getByLabel("Emirate").selectOption("dubai")
  await page.getByLabel("Delivery area").selectOption({ index: 1 })
  await page.getByLabel("Area or neighbourhood").fill("Business Bay")
  await page.getByLabel("Building, villa or office").fill("Tower 5, Office 1203")

  // First available day and slot.
  const day = page.getByRole("radiogroup", { name: "Delivery date" }).getByRole("radio").and(page.locator(":not([disabled])")).first()
  await day.click()
  const slot = page.getByRole("radiogroup", { name: "Delivery window" }).getByRole("radio").and(page.locator(":not([disabled])")).first()
  await slot.click()

  // Card is unavailable without Stripe keys; cash on delivery is chosen automatically.
  await expect(page.getByRole("radio", { name: /Cash on delivery/ })).toHaveAttribute("aria-checked", "true")
  await page.getByRole("checkbox", { name: /I accept the/ }).check()
  const place = page.getByRole("button", { name: /Place order/ })
  await expect(place).toBeEnabled()
  await place.click()

  await expect(page).toHaveURL(/\/en\/order\/[0-9a-f]{32}/, { timeout: 15_000 })
  await expect(page.getByRole("heading", { name: /Thank you, Test/ })).toBeVisible()
  await expect(page.getByText(/AF-\d{6}/).first()).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)

  // Evidence in the database: order row, stock moved, emails queued after the record was saved.
  const token = page.url().split("/").pop()!
  const [orderRows] = (await conn.query("SELECT order_number, status, payment_method, payment_status, total_minor, vat_minor FROM orders WHERE public_token = ?", [token])) as unknown as [Record<string, unknown>[]]
  expect(orderRows).toHaveLength(1)
  expect(orderRows[0]).toMatchObject({ status: "pending", payment_method: "cod", payment_status: "unpaid" })
  const [after] = (await conn.query("SELECT stock_qty FROM products WHERE slug = 'seasonal-market-bunch'")) as unknown as [{ stock_qty: number }[]]
  expect(after[0].stock_qty).toBe(before[0].stock_qty - 1)
  const [mail] = (await conn.query("SELECT kind, status FROM email_outbox WHERE dedupe_key LIKE ?", [`order:${orderRows[0].order_number}:%`])) as unknown as [{ kind: string; status: string }[]]
  expect(mail.map((m) => m.kind)).toContain("order.received")
  await conn.end()
  void mobile
})

test("checkout with an empty cart explains what to do", async ({ page }) => {
  await page.goto("/ar/checkout")
  await expect(page.getByRole("heading", { name: "سلتك فارغة" })).toBeVisible()
})
