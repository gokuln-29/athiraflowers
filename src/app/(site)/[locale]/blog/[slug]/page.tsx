import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { JsonLd } from "@/components/seo/json-ld"
import { Markdown } from "@/components/site/markdown"
import { Media } from "@/components/site/media"
import { PostCard } from "@/components/site/post-card"
import { Button } from "@/components/ui/button"
import { absoluteUrl, site } from "@/config/site"
import { Link } from "@/i18n/navigation"
import { formatDate } from "@/lib/format"
import { pickColumn } from "@/lib/i18n-text"
import { mediaUrl, pickVariant } from "@/lib/media"
import { pageMetadata } from "@/lib/seo"
import { getBlogCategoryById, getPostBySlug, listPosts } from "@/server/queries/content"
import { getMediaMap } from "@/server/queries/media"

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale, slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}
  const cover = post.coverMediaId ? (await getMediaMap([post.coverMediaId])).get(post.coverMediaId) : null
  return pageMetadata({
    locale, path: `/blog/${slug}`, type: "article", image: cover, publishedTime: post.publishedAt?.toISOString(),
    title: pickColumn(post.seoTitleEn, post.seoTitleAr, locale) || pickColumn(post.titleEn, post.titleAr, locale),
    description: pickColumn(post.seoDescriptionEn, post.seoDescriptionAr, locale) || pickColumn(post.excerptEn, post.excerptAr, locale),
  })
}

export default async function PostPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const post = await getPostBySlug(slug)
  if (!post) notFound()
  const t = await getTranslations({ locale, namespace: "blog" })
  const category = post.categoryId ? await getBlogCategoryById(post.categoryId) : null
  const cover = post.coverMediaId ? (await getMediaMap([post.coverMediaId])).get(post.coverMediaId) : null
  const related = (await listPosts(locale, { categorySlug: category?.slug, excludeId: post.id, limit: 3 })).slice(0, 3)
  const title = pickColumn(post.titleEn, post.titleAr, locale)
  const body = pickColumn(post.bodyEn, post.bodyAr, locale)
  const coverVariant = pickVariant(cover?.variants, 1200)
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org", "@type": "Article", headline: title,
            description: pickColumn(post.excerptEn, post.excerptAr, locale),
            image: coverVariant ? [absoluteUrl(mediaUrl(coverVariant.key))] : undefined,
            datePublished: post.publishedAt?.toISOString(), dateModified: post.updatedAt.toISOString(),
            inLanguage: locale, mainEntityOfPage: absoluteUrl(`/${locale}/blog/${post.slug}`),
            author: { "@type": "Organization", name: post.authorName || site.name },
            publisher: { "@type": "Organization", name: site.name, url: site.url },
          },
          {
            "@context": "https://schema.org", "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: t("title"), item: absoluteUrl(`/${locale}/blog`) },
              { "@type": "ListItem", position: 2, name: title, item: absoluteUrl(`/${locale}/blog/${post.slug}`) },
            ],
          },
        ]}
      />
      <article className="page-grid pt-8 pb-8 lg:pt-14">
        <header className="max-w-[52rem]">
          {category && (
            <Link href={`/blog/category/${category.slug}`} className="font-medium text-primary underline underline-offset-4">
              {pickColumn(category.nameEn, category.nameAr, locale)}
            </Link>
          )}
          <h1 className="text-display mt-3 !text-[clamp(2.25rem,1.4rem+3.6vw,4.25rem)]">{title}</h1>
          <p className="text-lead mt-5 text-muted-foreground">{pickColumn(post.excerptEn, post.excerptAr, locale)}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span>{t("by", { name: post.authorName })}</span>
            {post.publishedAt && <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt, locale)}</time>}
            <span>{t("readingTime", { minutes: post.readingMinutes })}</span>
          </div>
        </header>
        <div className="mt-10 overflow-hidden rounded-[var(--radius)] bg-surface-deep">
          <Media media={cover} locale={locale} ratio="16 / 8" priority sizes="(min-width:1360px) 1360px, 100vw" />
        </div>
        <div className="mx-auto mt-12 max-w-[66ch] text-lg">
          <Markdown source={body} />
        </div>
        <div className="mx-auto mt-14 grid max-w-[66ch] gap-4 bg-surface p-6" style={{ borderRadius: "var(--radius)" }}>
          <h2 className="text-h3">{t("ctaTitle")}</h2>
          <p className="text-muted-foreground">{t("ctaBody")}</p>
          <div><Button render={<Link href="/shop" />}>{t("ctaShop")}</Button></div>
        </div>
      </article>
      {related.length > 0 && (
        <section className="page-grid mt-16" aria-labelledby="more-title">
          <h2 id="more-title" className="text-h2">{t("related")}</h2>
          <ul className="mt-8 grid gap-x-6 gap-y-12 md:grid-cols-3">
            {related.map((p) => <li key={p.id}><PostCard post={p} locale={locale} /></li>)}
          </ul>
        </section>
      )}
    </>
  )
}

