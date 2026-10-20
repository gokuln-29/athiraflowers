import { PageHeader } from "@/components/admin/shell"
import { SettingsForms } from "@/components/admin/settings-forms"
import { requirePage } from "@/server/auth/admin-guards"
import { getSettings } from "@/server/queries/content"
import { getMediaMap } from "@/server/queries/media"

export const metadata = { title: "Store settings" }

export default async function SettingsPage() {
  await requirePage("settings:write")
  const settings = await getSettings()
  const heroes = settings.heroes as Record<string, number | null>
  const map = await getMediaMap(Object.values(heroes))
  const heroMedia = Object.fromEntries(
    ["corporate", "events", "about", "contact", "offers", "blog"].map((k) => {
      const id = heroes[k]
      const m = id ? map.get(id) : null
      return [k, m && id ? { id, key: m.key, width: m.width, height: m.height, altEn: m.altEn, altAr: m.altAr, credit: null, variants: (m.variants ?? []).map((v) => ({ w: v.w, h: v.h, key: v.key })) } : null]
    })
  )
  return (<><PageHeader title="Store settings" description="Business details, contact, checkout rules and page images." /><SettingsForms settings={settings} heroMedia={heroMedia} /></>)
}
