import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { IntlMessageFormat } from "intl-messageformat"
import { describe, expect, it } from "vitest"

import { NAMESPACES } from "@/i18n/request"

const root = path.resolve(import.meta.dirname, "../messages")
const load = (locale: string, ns: string) => JSON.parse(readFileSync(path.join(root, locale, `${ns}.json`), "utf8")) as Record<string, unknown>

function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === "string") out[key] = v
    else Object.assign(out, flatten(v as Record<string, unknown>, key))
  }
  return out
}

type Node = { type: number; value?: unknown; options?: Record<string, { value: Node[] }>; children?: Node[] }
/** Argument names used by a message, found via the ICU AST (not a regex). */
function vars(message: string, locale: string): string[] {
  const found = new Set<string>()
  const walk = (nodes: Node[]) => {
    for (const n of nodes) {
      if (n.type !== 0 && n.type !== 7 && typeof n.value === "string") found.add(n.value)
      if (n.options) Object.values(n.options).forEach((o) => walk(o.value))
      if (n.children) walk(n.children)
    }
  }
  walk(new IntlMessageFormat(message, locale).getAst() as unknown as Node[])
  return [...found].sort()
}

describe("translations", () => {
  it("every namespace has a file in both languages and no stray files", () => {
    for (const locale of ["en", "ar"]) {
      expect(readdirSync(path.join(root, locale)).map((f) => f.replace(".json", "")).sort()).toEqual([...NAMESPACES].sort())
    }
  })

  for (const ns of NAMESPACES) {
    it(`${ns}: English and Arabic have identical keys`, () => {
      const en = Object.keys(flatten(load("en", ns))).sort()
      const ar = Object.keys(flatten(load("ar", ns))).sort()
      expect(ar).toEqual(en)
    })

    it(`${ns}: every message is valid ICU and placeholders match across languages`, () => {
      const en = flatten(load("en", ns))
      const ar = flatten(load("ar", ns))
      for (const [key, value] of Object.entries(en)) {
        expect(() => new IntlMessageFormat(value, "en"), `en ${ns}.${key}`).not.toThrow()
        expect(() => new IntlMessageFormat(ar[key], "ar"), `ar ${ns}.${key}`).not.toThrow()
        expect(vars(ar[key], "ar"), `placeholders ${ns}.${key}`).toEqual(vars(value, "en"))
        expect(value.trim(), `empty en ${ns}.${key}`).not.toBe("")
        expect(ar[key].trim(), `empty ar ${ns}.${key}`).not.toBe("")
      }
    })
  }
})
