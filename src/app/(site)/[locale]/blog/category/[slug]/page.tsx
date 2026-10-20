import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { PostCard } from "@/components/site/post-card"
import { Link } from "@/i18n/navigation"
import { pickColumn } from "@/lib/i18n-text"
import { pageMetadata } from "@/lib/seo"
import { getBlogCategory, listBlogCategories, listPosts } from "@/server/queries/content"

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/category/[slug]">) {
  const { locale, slug } = await params
  const cat = await getBlogCategory(slug)
  if (!cat) return {}
  const t = await getTranslations({ locale, namespace: "blog" })
  const name = pickColumn(cat.nameEn, cat.nameAr, locale)
  return pageMetadata({ locale, path: `/blog/category/${slug}`, title: t("categoryTitle", { name }), description: t("categoryLead", { name }) })
}

export default async function BlogCategoryPage({ params }: PageProps<"/[locale]/blog/category/[slug]">) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const cat = await getBlogCategory(slug)
  if (!cat) notFound()
  const t = await getTranslations({ locale, namespace: "blog" })
  const [posts, categories] = await Promise.all([listPosts(locale, { categorySlug: slug }), listBlogCategories(locale)])
  const chip = "inline-flex h-11 items-center whitespace-nowrap border px-4 hover:bg-surface-deep"
  return (
    <div className="page-grid pt-8 pb-8 lg:pt-14">
      <h1 className="text-h1">{pickColumn(cat.nameEn, cat.nameAr, locale)}</h1>
      <nav aria-label={t("categories")} className="mt-8">
        <ul className="flex flex-wrap gap-2">
          <li><Link href="/blog" className={`${chip} border-input`} style={{ borderRadius: "var(--radius)" }}>{t("all")}</Link></li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/blog/category/${c.slug}`} aria-current={c.slug === slug ? "page" : undefined} className={`${chip} ${c.slug === slug ? "border-foreground bg-foreground text-background" : "border-input"}`} style={{ borderRadius: "var(--radius)" }}>{c.name}</Link>
            </li>
          ))}
        </ul>
      </nav>
      {posts.length === 0 ? <p className="mt-16 text-muted-foreground">{t("empty")}</p> : (
        <ul className="mt-12 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => <li key={p.id}><PostCard post={p} locale={locale} /></li>)}
        </ul>
      )}
    </div>
  )
}
