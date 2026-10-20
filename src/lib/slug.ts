/** Lowercase ASCII slug. Arabic-only titles fall back to the provided fallback. */
export function slugify(input: string, fallback = "item"): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
  return slug || fallback
}
