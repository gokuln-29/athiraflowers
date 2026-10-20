import { desc, eq } from "drizzle-orm"

import { MediaLibrary } from "@/components/admin/media-library"
import { PageHeader } from "@/components/admin/shell"
import { db } from "@/db"
import { media } from "@/db/schema"
import { requirePage } from "@/server/auth/admin-guards"

export const metadata = { title: "Images" }

export default async function MediaPage() {
  await requirePage("media:write")
  const rows = await db.select().from(media).where(eq(media.status, "ready")).orderBy(desc(media.id)).limit(120)
  return (
    <>
      <PageHeader title="Images" description="Every image is re-encoded to WebP, stripped of location and camera data, and published in responsive sizes." />
      <MediaLibrary items={rows.map((m) => ({ id: m.id, key: m.key, width: m.width, height: m.height, altEn: m.altEn, altAr: m.altAr, credit: m.credit, bytes: m.bytes, createdAt: m.createdAt.toISOString(), variants: (m.variants ?? []).map((v) => ({ w: v.w, h: v.h, key: v.key })) }))} />
    </>
  )
}
