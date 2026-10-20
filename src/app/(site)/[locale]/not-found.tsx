import { getTranslations } from "next-intl/server"

import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

export default async function NotFound() {
  const t = await getTranslations("errors")
  return (
    <div className="page-grid grid min-h-[60svh] content-center gap-6 py-20">
      <h1 className="text-display !text-[clamp(2.5rem,1.4rem+4.6vw,5rem)] max-w-[16ch]">{t("notFoundTitle")}</h1>
      <p className="text-lead max-w-[52ch] text-muted-foreground">{t("notFoundBody")}</p>
      <div className="flex flex-wrap gap-3">
        <Button render={<Link href="/shop" />} size="lg">{t("notFoundShop")}</Button>
        <Button render={<Link href="/" />} size="lg" variant="outline">{t("notFoundHome")}</Button>
        <Button render={<Link href="/contact" />} size="lg" variant="ghost">{t("notFoundContact")}</Button>
      </div>
    </div>
  )
}
