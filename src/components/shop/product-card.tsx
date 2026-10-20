import { getTranslations } from "next-intl/server"

import { Media } from "@/components/site/media"
import { Price } from "@/components/shop/price"
import { Link } from "@/i18n/navigation"
import type { ProductCard as Card } from "@/server/queries/catalog"

export async function ProductCard({ product, locale, priority = false, sizes }: { product: Card; locale: string; priority?: boolean; sizes?: string }) {
  const t = await getTranslations({ locale, namespace: "product" })
  return (
    <article className="group">
      <Link href={`/product/${product.slug}`} className="block outline-offset-4">
        <div className="zoom-on-hover relative overflow-hidden rounded-[var(--radius)] bg-surface-deep">
          <Media media={product.image} locale={locale} ratio="4 / 5" priority={priority} sizes={sizes ?? "(min-width:1024px) 22vw, (min-width:640px) 33vw, 50vw"} />
          {!product.inStock && (
            <span className="absolute start-2 top-2 bg-foreground px-2 py-1 text-xs font-medium text-background">{t("soldOut")}</span>
          )}
          {product.inStock && product.lowStock && (
            <span className="absolute start-2 top-2 bg-surface px-2 py-1 text-xs font-medium text-foreground">{t("fewLeft")}</span>
          )}
        </div>
        <h3 className="text-h3 mt-3 text-balance !text-[1.125rem] !leading-snug sm:!text-[1.25rem]">{product.name}</h3>
        <Price
          locale={locale}
          priceMinor={product.priceMinor}
          compareAtMinor={product.compareAtMinor}
          pricingType={product.pricingType}
          billingInterval={product.billingInterval}
          rentalDays={product.rentalDays}
          className="mt-1"
        />
      </Link>
    </article>
  )
}
