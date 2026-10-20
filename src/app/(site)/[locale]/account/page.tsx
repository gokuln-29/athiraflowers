import { redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { ReorderButton } from "@/components/account/account-forms"
import { OrderStatusBadge } from "@/components/shop/order-status-badge"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { formatDate, formatMoney } from "@/lib/format"
import { pageMetadata } from "@/lib/seo"
import { getCustomer } from "@/server/auth/customer-session"
import { listCustomerOrders } from "@/server/queries/account"

export async function generateMetadata({ params }: PageProps<"/[locale]/account">) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "account" })
  return pageMetadata({ locale, path: "/account", title: t("title"), description: t("title"), noindex: true })
}

export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const { locale } = await params
  setRequestLocale(locale)
  const me = await getCustomer()
  if (!me) redirect(`/${locale}/account/login`)
  const t = await getTranslations({ locale, namespace: "account" })
  const to = await getTranslations({ locale, namespace: "order" })
  const orders = await listCustomerOrders(me.id, me.email)
  return (
    <section aria-labelledby="orders-title">
      <h2 id="orders-title" className="text-h2">{t("nav.orders")}</h2>
      {orders.length === 0 ? (
        <div className="mt-6 grid place-items-start gap-3">
          <p className="text-muted-foreground">{t("noOrders")}</p>
          <Button render={<Link href="/shop" />}>{t("startShopping")}</Button>
        </div>
      ) : (
        <ul className="mt-6 divide-y border-y">
          {orders.map(({ order, items }) => (
            <li key={order.id} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <Link href={`/order/${order.publicToken}`} className="tabular text-lg font-medium text-primary underline underline-offset-4">{order.orderNumber}</Link>
                  <OrderStatusBadge status={order.status} label={to(`status.${order.status}`)} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{formatDate(order.createdAt, locale)} · {t("itemsCount", { count: items.length })} · <span className="tabular">{formatMoney(order.totalMinor, locale, { compact: true })}</span></p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button render={<Link href={`/order/${order.publicToken}`} />} variant="outline">{t("viewOrder")}</Button>
                <ReorderButton items={items.filter((i) => i.productId).map((i) => ({ productId: i.productId!, quantity: i.quantity }))} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
