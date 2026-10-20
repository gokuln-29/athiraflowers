import { Link } from "@/i18n/navigation"
import { homeSectionSchemas } from "@/lib/home-sections"
import { pick } from "@/lib/i18n-text"
import { getHomeSections } from "@/server/queries/content"

export async function AnnouncementBar({ locale }: { locale: string }) {
  const sections = await getHomeSections()
  const banner = sections.find((s) => s.type === "banner")
  if (!banner) return null
  const parsed = homeSectionSchemas.banner.safeParse(banner.data)
  if (!parsed.success) return null
  const { text, cta } = parsed.data
  return (
    <div className="bg-night text-night-foreground">
      <p className="page-grid flex min-h-10 flex-wrap items-center justify-center gap-x-3 py-2 text-center text-sm">
        <span>{pick(text, locale)}</span>
        <Link href={cta.href} className="font-medium underline underline-offset-4 hover:no-underline">
          {pick(cta.label, locale)}
        </Link>
      </p>
    </div>
  )
}
