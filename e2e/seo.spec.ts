import { expect, test } from "@playwright/test"

test("sitemap lists both languages with hreflang, and excludes private paths", async ({ request }) => {
  const res = await request.get("/sitemap.xml")
  expect(res.status()).toBe(200)
  const xml = await res.text()
  expect(xml).toContain("/en/shop")
  expect(xml).toContain("/ar/shop")
  expect(xml).toMatch(/hreflang="ar"/)
  for (const bad of ["/admin", "/cart", "/checkout", "/account", "/pay/", "/order/"]) expect(xml).not.toContain(bad)
})

test("robots blocks admin and transactional paths and points to the sitemap", async ({ request }) => {
  const txt = await (await request.get("/robots.txt")).text()
  expect(txt).toMatch(/Disallow: \/admin/)
  expect(txt).toMatch(/Disallow: \/api\//)
  expect(txt).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/)
})

test("llms.txt is plain text with the key facts", async ({ request }) => {
  const res = await request.get("/llms.txt")
  expect(res.headers()["content-type"]).toContain("text/plain")
  const body = await res.text()
  expect(body).toMatch(/^# Athira flowers/)
  expect(body).toContain("Dubai, Abu Dhabi and Sharjah")
})

for (const locale of ["en", "ar"]) {
  test(`${locale} home: one h1, canonical, hreflang, valid Organization/Florist/WebSite JSON-LD`, async ({ page }) => {
    await page.goto(`/${locale}`)
    await expect(page.locator("h1")).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/${locale}$`))
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1)
    await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveCount(1)
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr")
    const blocks = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t))
    const ld = blocks.find((b) => b["@graph"])
    expect(ld, "an @graph JSON-LD block").toBeTruthy()
    const types = ld["@graph"].map((n: { "@type": string }) => n["@type"])
    expect(types).toEqual(expect.arrayContaining(["Organization", "Florist", "WebSite"]))
  })
}

test("analytics load only after consent is granted", async ({ page }) => {
  test.skip(!process.env.E2E_GA, "needs a build with NEXT_PUBLIC_GA_ID set")
  const gaRequests: string[] = []
  await page.route(/googletagmanager\.com/, (r) => { gaRequests.push(r.request().url()); return r.abort() })
  await page.goto("/en")
  const banner = page.getByRole("region", { name: "Cookies and analytics" })
  await expect(banner).toBeVisible()
  await page.waitForTimeout(500)
  expect(gaRequests).toHaveLength(0)
  await banner.getByRole("button", { name: "Essential only" }).click()
  await page.reload()
  await expect(banner).toHaveCount(0)
  expect(gaRequests).toHaveLength(0)
  await page.getByRole("button", { name: "Cookie settings" }).click()
  await page.getByRole("button", { name: "Accept analytics" }).click()
  await expect.poll(() => gaRequests.length).toBeGreaterThan(0)
})
