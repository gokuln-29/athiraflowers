import { expect, test, type Page } from "@playwright/test"

/** Every public route, in both languages. Fails on console errors, missing messages, overflow and broken images. */
const PATHS = [
  "/", "/shop", "/shop/bouquets", "/shop/weekly-programs", "/product/white-roses-eucalyptus-bouquet", "/product/reception-arrangement-weekly",
  "/product/glass-cylinder-vase-set-rental", "/cart", "/checkout", "/corporate", "/events", "/offers", "/blog",
  "/blog/keeping-cut-flowers-fresh-in-uae-heat", "/blog/category/care-guides", "/about", "/contact", "/account", "/account/login",
  "/privacy", "/terms", "/delivery", "/refund", "/flowers/dubai", "/flowers/abu-dhabi", "/flowers/sharjah", "/credits",
].filter((p) => !process.env.CRAWL_ONLY || p.includes(process.env.CRAWL_ONLY))

async function audit(page: Page, url: string) {
  const problems: string[] = []
  page.on("console", (m) => {
    if (m.type() === "error" || /MISSING_MESSAGE|IntlError/.test(m.text())) problems.push(`console: ${m.text().slice(0, 200)}`)
  })
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message.slice(0, 200)}`))
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("favicon")) problems.push(`http ${r.status()}: ${r.url().slice(0, 120)}`)
  })
  const res = await page.goto(url, { waitUntil: "networkidle" })
  expect(res?.status(), `${url} status`).toBeLessThan(400)

  // Scroll to trigger lazy images, then check them.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 40))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(300)
  const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src).map((i) => i.src.slice(0, 100)))
  broken.forEach((b) => problems.push(`broken image: ${b}`))
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (overflow > 1) problems.push(`horizontal overflow: ${overflow}px`)
  const h1 = await page.locator("h1").count()
  if (h1 !== 1) problems.push(`expected exactly one h1, found ${h1}`)
  const text = await page.locator("body").innerText()
  if (/MISSING_MESSAGE|\b(nav|shop|product|cart|checkout|common|footer)\.[a-zA-Z]+\.?[a-zA-Z]*\b/.test(text)) problems.push("untranslated message key visible")
  return problems
}

for (const locale of ["en", "ar"]) {
  for (const path of PATHS) {
    test(`${locale}${path}`, async ({ page }) => {
      const problems = await audit(page, `/${locale}${path === "/" ? "" : path}`)
      expect(problems, problems.join("\n")).toEqual([])
    })
  }
}
