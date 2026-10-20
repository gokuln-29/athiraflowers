"use client"

import { Menu } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { LocaleSwitcher } from "@/components/site/locale-switcher"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Link } from "@/i18n/navigation"

export type NavLink = { href: string; label: string }

export function MobileMenu({ links, brand }: { links: NavLink[]; brand: string }) {
  const t = useTranslations("nav")
  const tc = useTranslations("common")
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<button type="button" className="pressable grid size-11 place-items-center rounded-[var(--radius)] hover:bg-surface-deep lg:hidden" aria-label={t("openMenu")} />}>
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side={locale === "ar" ? "right" : "left"} closeLabel={tc("close")} className="w-full gap-0 p-0 data-[side=left]:w-full data-[side=right]:w-full sm:max-w-sm">
        <SheetHeader className="p-5">
          <SheetTitle className="text-h3">{brand}</SheetTitle>
          <SheetDescription className="sr-only">{t("mobileNav")}</SheetDescription>
        </SheetHeader>
        <nav aria-label={t("mobileNav")} className="flex-1 overflow-y-auto px-5">
          <ul>
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="text-h2 block py-3 !text-[1.75rem]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center justify-between gap-3 p-5">
          <Button render={<Link href="/corporate#quote" onClick={() => setOpen(false)} />} size="lg" className="flex-1">
            {t("quote")}
          </Button>
          <LocaleSwitcher className="grid h-12 min-w-12 place-items-center px-3 text-base hover:bg-surface-deep" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
