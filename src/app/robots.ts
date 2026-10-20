import type { MetadataRoute } from "next"

import { absoluteUrl, site } from "@/config/site"

/** Private and transactional paths are blocked; answer engines and search crawlers are welcome on everything public. */
export default function robots(): MetadataRoute.Robots {
  const blocked = ["/admin", "/api/", "/*/cart", "/*/checkout", "/*/account", "/*/order/", "/*/pay/", "/*/design"]
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: blocked }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: site.url,
  }
}
