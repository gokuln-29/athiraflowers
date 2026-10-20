import { getRequestConfig } from "next-intl/server"

import { isLocale, routing } from "./routing"

/** Every namespace lives in messages/<locale>/<namespace>.json. A parity test keeps en and ar in sync. */
export const NAMESPACES = [
  "common", "nav", "footer", "a11y", "cart", "consent", "forms", "home", "shop", "product", "checkout", "order",
  "corporate", "events", "offers", "blog", "about", "contact", "account", "legal", "city", "errors",
] as const

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = requested && isLocale(requested) ? requested : routing.defaultLocale
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => [ns, (await import(`../../messages/${locale}/${ns}.json`)).default] as const)
  )
  return { locale, messages: Object.fromEntries(entries), timeZone: "Asia/Dubai" }
})
