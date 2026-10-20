import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { siteName } from "@/config/site"

export const metadata = { robots: { index: false, follow: false } }

const swatches = [
  ["background", "#F1EDE7", "foreground"],
  ["surface", "#F8F6F2", "foreground"],
  ["surface-deep", "#E6E0D8", "foreground"],
  ["foreground", "#1E1A18", "background"],
  ["primary", "#8A2B3F", "primary-foreground"],
  ["night", "#25201D", "night-foreground"],
]

/** Dev-only style tile for Phase 0. Not shipped to production. */
export default async function DesignPage({ params }: PageProps<"/[locale]/design">) {
  if (process.env.NODE_ENV === "production") notFound()
  const { locale } = await params
  setRequestLocale(locale)
  const ar = locale === "ar"

  return (
    <main id="main" className="pb-32">
      <section className="page-grid grid gap-10 pt-16 pb-24 md:grid-cols-12 md:pt-24">
        <div className="md:col-span-8">
          <h1 className="text-display">
            {ar ? "زهورٌ تصل قبل الضيوف" : "Flowers that arrive before the guests"}
          </h1>
          <p className="text-lead mt-8 max-w-[52ch] text-muted-foreground">
            {ar
              ? "برامج زهور أسبوعية للمكاتب، وتنسيق الفعاليات، وهدايا الشركات في دبي وأبوظبي والشارقة."
              : "Weekly flower programs for offices, event decor and corporate gifting in Dubai, Abu Dhabi and Sharjah."}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button size="lg" className="h-12 px-6 text-base">{ar ? "اطلب عرض سعر" : "Request a quote"}</Button>
            <Button size="lg" variant="secondary" className="h-12 px-6 text-base">{ar ? "تسوّق الآن" : "Shop flowers"}</Button>
          </div>
        </div>
        <div className="md:col-span-4">
          <div className="aspect-[4/5] bg-surface-deep" aria-hidden />
        </div>
      </section>

      <section className="page-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {swatches.map(([name, hex, fg]) => (
          <div
            key={name}
            className="min-h-32 p-5"
            style={{ background: hex, color: `var(--${fg})` }}
          >
            <p className="text-h3">{name}</p>
            <p className="tabular">{hex}</p>
          </div>
        ))}
      </section>

      <section className="page-grid mt-24 grid gap-12 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-h2">{siteName(locale)}</h2>
          <h3 className="text-h3">{ar ? "باقة المكتب الأسبوعية" : "The weekly office arrangement"}</h3>
          <p>
            {ar
              ? "تُسلَّم كل صباح اثنين قبل التاسعة، مع مزهرية زجاجية قابلة للاسترداد."
              : "Delivered every Monday before nine, with a refundable glass vase deposit."}
          </p>
          <p className="tabular text-h3">AED 285.00</p>
        </div>
        <form className="space-y-5 bg-surface p-6">
          <div className="space-y-2">
            <Label htmlFor="name">{ar ? "الاسم" : "Full name"}</Label>
            <Input id="name" className="h-12" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trn">{ar ? "الرقم الضريبي" : "Company TRN"}</Label>
            <Input id="trn" className="h-12" aria-invalid />
            <p className="text-sm text-destructive">
              {ar ? "يجب أن يتكون من 15 رقماً." : "Enter the 15 digits of your TRN."}
            </p>
          </div>
        </form>
      </section>

      <section className="mt-24 bg-night py-24 text-night-foreground">
        <div className="page-grid">
          <h2 className="text-h1 max-w-[18ch]">
            {ar ? "طلبٌ واحد، وفاتورة ضريبية واضحة" : "One order, one clear tax invoice"}
          </h2>
        </div>
      </section>
    </main>
  )
}
