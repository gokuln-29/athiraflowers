import { getTranslations, setRequestLocale } from "next-intl/server"

import { PostCard } from "@/components/site/post-card"
import { Link } from "@/i18n/navigation"
import { pageMetadata } from "@/lib/seo"
import { listBlogCategories, listPosts } from "@/server/queries/content"
import { getSeoOverride } from "@/server/queries/seo"

export async function generateMetadata({ params }: PageProps<"/[locale]/blog">) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "blog" })
  const o = await getSeoOverride("/blog", locale)
  return pageMetadata({ locale, path: "/blog", title: o.title ?? t("metaTitle"), description: o.description ?? t("metaDescription"), noindex: o.noindex })
}

export default async function BlogPage({ params }: PageProps<"/[locale]/blog">) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "blog" })
  const [posts, categories] = await Promise.all([listPosts(locale), listBlogCategories(locale)])
  const [first, ...rest] = posts
  const chip = "inline-flex h-11 items-center whitespace-nowrap border px-4 hover:bg-surface-deep"
  return (
    <div className="page-grid pt-8 pb-8 lg:pt-14">
      <h1 className="text-display !text-[clamp(2.5rem,1.5rem+4vw,4.5rem)]">{t("title")}</h1>
      <p className="text-lead mt-4 max-w-[56ch] text-muted-foreground">{t("lead")}</p>
      <nav aria-label={t("categories")} className="mt-8">
        <ul className="flex flex-wrap gap-2">
          <li><Link href="/blog" aria-current="page" className={`${chip} border-foreground bg-foreground text-background`} style={{ borderRadius: "var(--radius)" }}>{t("all")}</Link></li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/blog/category/${c.slug}`} className={`${chip} border-input`} style={{ borderRadius: "var(--radius)" }}>{c.name}</Link>
            </li>
          ))}
        </ul>
      </nav>
      {posts.length === 0 ? (
        <p className="mt-16 text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          {first && <div className="mt-12"><PostCard post={first} locale={locale} large /></div>}
          {rest.length > 0 && (
            <ul className="mt-16 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => (
                <li key={p.id}><PostCard post={p} locale={locale} /></li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
