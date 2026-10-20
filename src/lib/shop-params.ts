import { z } from "zod"

import { SORTS, TYPES, type ListParams } from "@/server/queries/catalog"

const num = z.coerce.number().int().min(0).max(1_000_000)

/** Parses untrusted search params for the shop. Invalid values are ignored, never thrown. */
export function parseShopParams(raw: Record<string, string | string[] | undefined>): Omit<ListParams, "locale" | "categorySlug"> {
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k]![0] : (raw[k] as string | undefined))
  const many = (k: string) => (Array.isArray(raw[k]) ? (raw[k] as string[]) : raw[k] ? [raw[k] as string] : [])
  const min = num.safeParse(one("min"))
  const max = num.safeParse(one("max"))
  const page = z.coerce.number().int().min(1).max(500).safeParse(one("page"))
  const sort = z.enum(SORTS).safeParse(one("sort"))
  const q = (one("q") ?? "").trim().slice(0, 80)
  return {
    q: q || undefined,
    minMinor: min.success ? min.data * 100 : undefined,
    maxMinor: max.success ? max.data * 100 : undefined,
    types: many("type").filter((t): t is (typeof TYPES)[number] => (TYPES as readonly string[]).includes(t)),
    inStockOnly: one("stock") === "1",
    sort: sort.success ? sort.data : "featured",
    page: page.success ? page.data : 1,
  }
}
