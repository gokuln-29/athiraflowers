import { getTranslations } from "next-intl/server"

import { PaginationLinks } from "@/components/shop/pagination-links"
import { ProductCard } from "@/components/shop/product-card"
import { ShopFilters } from "@/components/shop/shop-filters"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { parseShopParams } from "@/lib/shop-params"
import { listCategories, listProducts } from "@/server/queries/catalog"

/** Shared by /shop and /shop/[category]. */
export async function ShopView({
  locale, categorySlug, title, description, searchParams, basePath,
}: {
  locale: string
  categorySlug?: string
  title: string
  description?: string
  searchParams: Record<string, string | string[] | undefined>
  basePath: string
}) {
  const t = await getTranslations({ locale, namespace: "shop" })
  const parsed = parseShopParams(searchParams)
  const [categories, result] = await Promise.all([listCategories(locale), listProducts({ ...parsed, locale, categorySlug, pageSize: 12 })])
  const chip = "inline-flex h-11 items-center whitespace-nowrap border px-4 hover:bg-surface-deep"
  return (
    <div className="page-grid pt-8 pb-8 lg:pt-14">
      <h1 className="text-display !text-[clamp(2.5rem,1.5rem+4vw,4.5rem)]">{title}</h1>
      {description && <p className="text-lead mt-4 max-w-[60ch] text-muted-foreground">{description}</p>}

      <nav aria-label={t("categories")} className="-mx-[var(--gutter)] mt-8 overflow-x-auto px-[var(--gutter)] pb-2">
        <ul className="flex gap-2">
          <li>
            <Link href="/shop" aria-current={!categorySlug ? "page" : undefined} className={cn(chip, !categorySlug ? "border-foreground bg-foreground text-background hover:bg-foreground" : "border-input")} style={{ borderRadius: "var(--radius)" }}>
              {t("all")}
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/shop/${c.slug}`} aria-current={categorySlug === c.slug ? "page" : undefined} className={cn(chip, categorySlug === c.slug ? "border-foreground bg-foreground text-background hover:bg-foreground" : "border-input")} style={{ borderRadius: "var(--radius)" }}>
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8">
        <ShopFilters total={result.total} />
        {result.items.length === 0 ? (
          <div className="grid place-items-center gap-4 bg-surface py-20 text-center" style={{ borderRadius: "var(--radius)" }}>
            <p className="text-h2">{t("noResults")}</p>
            <p className="max-w-[40ch] text-muted-foreground">{t("noResultsHint")}</p>
            <Button render={<Link href={basePath} />} variant="outline">
              {t("clearFilters")}
            </Button>
          </div>
        ) : (
          <>
          <h2 className="sr-only">{t("results", { count: result.total })}</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {result.items.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} locale={locale} priority={i < 4} />
              </li>
            ))}
          </ul>
          </>
        )}
        <PaginationLinks locale={locale} page={result.page} pages={result.pages} basePath={basePath} query={searchParams} />
      </div>
    </div>
  )
}
