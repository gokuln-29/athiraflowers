import { boolean, index, int, json, mysqlEnum, mysqlTable, text, uniqueIndex, varchar } from "drizzle-orm/mysql-core"

import { adminUsers } from "./auth"
import { media } from "./catalog"
import { createdAt, fk, pk, ts, updatedAt } from "./_helpers"

export const blogCategories = mysqlTable(
  "blog_categories",
  {
    id: pk(),
    slug: varchar("slug", { length: 120 }).notNull(),
    nameEn: varchar("name_en", { length: 120 }).notNull(),
    nameAr: varchar("name_ar", { length: 120 }).notNull().default(""),
    sort: int("sort").notNull().default(0),
  },
  (t) => [uniqueIndex("blog_categories_slug_uq").on(t.slug)]
)

export const blogPosts = mysqlTable(
  "blog_posts",
  {
    id: pk(),
    slug: varchar("slug", { length: 160 }).notNull(),
    titleEn: varchar("title_en", { length: 200 }).notNull(),
    titleAr: varchar("title_ar", { length: 200 }).notNull().default(""),
    excerptEn: varchar("excerpt_en", { length: 400 }).notNull().default(""),
    excerptAr: varchar("excerpt_ar", { length: 400 }).notNull().default(""),
    /** Markdown. Rendered with sanitisation. */
    bodyEn: text("body_en").notNull(),
    bodyAr: text("body_ar"),
    coverMediaId: fk("cover_media_id").references(() => media.id, { onDelete: "set null" }),
    categoryId: fk("category_id").references(() => blogCategories.id, { onDelete: "set null" }),
    authorId: fk("author_id").references(() => adminUsers.id, { onDelete: "set null" }),
    authorName: varchar("author_name", { length: 120 }).notNull(),
    /** draft | scheduled | published. A post is public when published_at <= now and status != draft. */
    status: mysqlEnum("status", ["draft", "scheduled", "published"]).notNull().default("draft"),
    publishedAt: ts("published_at"),
    readingMinutes: int("reading_minutes").notNull().default(1),
    seoTitleEn: varchar("seo_title_en", { length: 160 }),
    seoTitleAr: varchar("seo_title_ar", { length: 160 }),
    seoDescriptionEn: varchar("seo_description_en", { length: 320 }),
    seoDescriptionAr: varchar("seo_description_ar", { length: 320 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("blog_posts_slug_uq").on(t.slug), index("blog_posts_public_idx").on(t.status, t.publishedAt), index("blog_posts_category_idx").on(t.categoryId)]
)

/** Editable static pages: about, privacy, terms, delivery, refund. */
export const pages = mysqlTable(
  "pages",
  {
    id: pk(),
    key: varchar("key", { length: 60 }).notNull(),
    titleEn: varchar("title_en", { length: 160 }).notNull(),
    titleAr: varchar("title_ar", { length: 160 }).notNull().default(""),
    bodyEn: text("body_en").notNull(),
    bodyAr: text("body_ar"),
    seoTitleEn: varchar("seo_title_en", { length: 160 }),
    seoTitleAr: varchar("seo_title_ar", { length: 160 }),
    seoDescriptionEn: varchar("seo_description_en", { length: 320 }),
    seoDescriptionAr: varchar("seo_description_ar", { length: 320 }),
    /** Legal pages carry a review marker until a local advisor signs off. */
    reviewedAt: ts("reviewed_at"),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("pages_key_uq").on(t.key)]
)

export const HOME_SECTION_TYPES = ["hero", "pathways", "featured", "categories", "program", "banner", "steps", "testimonials", "logos", "faq", "cta"] as const
export type HomeSectionType = (typeof HOME_SECTION_TYPES)[number]

/** Homepage blocks in display order. `data` is validated per type (see src/lib/home-sections.ts). */
export const homeSections = mysqlTable(
  "home_sections",
  {
    id: pk(),
    type: mysqlEnum("type", HOME_SECTION_TYPES).notNull(),
    sort: int("sort").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    data: json("data").$type<Record<string, unknown>>().notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [index("home_sections_sort_idx").on(t.isActive, t.sort)]
)

export const faqs = mysqlTable(
  "faqs",
  {
    id: pk(),
    group: mysqlEnum("group", ["general", "delivery", "corporate", "events", "payment"]).notNull().default("general"),
    questionEn: varchar("question_en", { length: 300 }).notNull(),
    questionAr: varchar("question_ar", { length: 300 }).notNull().default(""),
    answerEn: text("answer_en").notNull(),
    answerAr: text("answer_ar"),
    sort: int("sort").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("faqs_group_idx").on(t.group, t.isActive, t.sort)]
)

export const testimonials = mysqlTable("testimonials", {
  id: pk(),
  authorName: varchar("author_name", { length: 120 }).notNull(),
  authorRole: varchar("author_role", { length: 120 }),
  company: varchar("company", { length: 160 }),
  quoteEn: text("quote_en").notNull(),
  quoteAr: text("quote_ar"),
  /** True until the owner replaces the seed text with a real, permissioned quote. */
  isSample: boolean("is_sample").notNull().default(false),
  sort: int("sort").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
})

export const clientLogos = mysqlTable("client_logos", {
  id: pk(),
  name: varchar("name", { length: 120 }).notNull(),
  mediaId: fk("media_id").references(() => media.id, { onDelete: "set null" }),
  url: varchar("url", { length: 300 }),
  sort: int("sort").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
})

export const seoOverrides = mysqlTable(
  "seo_overrides",
  {
    id: pk(),
    /** Locale-less path such as "/", "/shop", "/corporate". */
    path: varchar("path", { length: 190 }).notNull(),
    titleEn: varchar("title_en", { length: 160 }),
    titleAr: varchar("title_ar", { length: 160 }),
    descriptionEn: varchar("description_en", { length: 320 }),
    descriptionAr: varchar("description_ar", { length: 320 }),
    ogMediaId: fk("og_media_id").references(() => media.id, { onDelete: "set null" }),
    noindex: boolean("noindex").notNull().default(false),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("seo_overrides_path_uq").on(t.path)]
)

/** Key/value JSON settings: contact, business, social, checkout. */
export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: json("value").$type<Record<string, unknown>>().notNull(),
  updatedBy: fk("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
})

/** Transactional email outbox: written in the same transaction as the record, sent afterwards. */
export const emailOutbox = mysqlTable(
  "email_outbox",
  {
    id: pk(),
    dedupeKey: varchar("dedupe_key", { length: 120 }),
    kind: varchar("kind", { length: 60 }).notNull(),
    toEmail: varchar("to_email", { length: 254 }).notNull(),
    toName: varchar("to_name", { length: 120 }),
    subject: varchar("subject", { length: 300 }).notNull(),
    html: text("html").notNull(),
    text: text("text").notNull(),
    status: mysqlEnum("status", ["pending", "sent", "failed"]).notNull().default("pending"),
    attempts: int("attempts").notNull().default(0),
    lastError: varchar("last_error", { length: 300 }),
    nextAttemptAt: ts("next_attempt_at").notNull(),
    sentAt: ts("sent_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("email_outbox_dedupe_uq").on(t.dedupeKey), index("email_outbox_due_idx").on(t.status, t.nextAttemptAt)]
)
