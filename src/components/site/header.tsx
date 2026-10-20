import { User } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { LocaleSwitcher } from "@/components/site/locale-switcher"
import { MobileMenu } from "@/components/site/mobile-menu"
import { CartButton } from "@/components/shop/cart-sheet"
import { Button } from "@/components/ui/button"
import { siteName } from "@/config/site"
import { Link } from "@/i18n/navigation"

export async function SiteHeader({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "nav" })
  const brand = siteName(locale)
  const links = [
    { href: "/shop", label: t("shop") },
    { href: "/corporate", label: t("corporate") },
    { href: "/events", label: t("events") },
    { href: "/offers", label: t("offers") },
    { href: "/blog", label: t("blog") },
    { href: "/about", label: t("about") },
    { href: "/contact", label: t("contact") },
  ]
  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="page-grid flex h-16 items-center gap-4 lg:h-20">
        <MobileMenu links={links} brand={brand} />
        <Link href="/" aria-label={t("home", { name: brand })} className="text-h3 !text-[1.5rem] whitespace-nowrap lg:!text-[1.75rem]">
          {brand}
        </Link>
        <nav aria-label={t("mainNav")} className="mx-auto hidden lg:block">
          <ul className="flex items-center gap-1 xl:gap-3">
            {links.slice(0, 6).map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex h-11 items-center px-3 text-[0.9375rem] hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ms-auto flex items-center gap-1 lg:ms-0">
          <LocaleSwitcher className="hidden h-11 items-center px-3 text-[0.9375rem] hover:text-primary lg:inline-flex" />
          <Link href="/account" aria-label={t("account")} className="pressable grid size-11 place-items-center rounded-[var(--radius)] hover:bg-surface-deep">
            <User className="size-5" aria-hidden />
          </Link>
          <CartButton />
          <Button render={<Link href="/corporate#quote" />} className="ms-2 hidden lg:inline-flex">
            {t("quote")}
          </Button>
        </div>
      </div>
    </header>
  )
}
