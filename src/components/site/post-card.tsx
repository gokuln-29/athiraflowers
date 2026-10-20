import { getTranslations } from "next-intl/server"

import { Media } from "@/components/site/media"
import { Link } from "@/i18n/navigation"
import { formatDate } from "@/lib/format"
import type { PostCard as Post } from "@/server/queries/content"

export async function PostCard({ post, locale, large = false }: { post: Post; locale: string; large?: boolean }) {
  const t = await getTranslations({ locale, namespace: "blog" })
  return (
    <article className="group">
      <Link href={`/blog/${post.slug}`} className="zoom-on-hover block outline-offset-4">
        <div className="overflow-hidden rounded-[var(--radius)] bg-surface-deep">
          <Media media={post.cover} locale={locale} ratio={large ? "16 / 10" : "16 / 11"} sizes={large ? "(min-width:1024px) 58vw, 100vw" : "(min-width:1024px) 30vw, (min-width:640px) 50vw, 100vw"} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {post.category && <span className="font-medium text-foreground">{post.category.name}</span>}
          <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt, locale)}</time>
          <span>{t("readingTime", { minutes: post.readingMinutes })}</span>
        </div>
        <h3 className={large ? "text-h1 mt-2 group-hover:text-primary" : "text-h3 mt-2 !text-[1.375rem] group-hover:text-primary"}>{post.title}</h3>
        <p className="mt-2 max-w-[60ch] text-muted-foreground">{post.excerpt}</p>
      </Link>
    </article>
  )
}
