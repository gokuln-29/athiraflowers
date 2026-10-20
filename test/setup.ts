import { vi } from "vitest"

/** In-memory replacement for next/headers so server code can be exercised without a request. */
export const jar = new Map<string, string>()
export const requestHeaders = new Headers({ "x-real-ip": "203.0.113.7", "user-agent": "vitest" })

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string, opts?: { maxAge?: number }) => {
      if (opts?.maxAge === 0 || value === "") jar.delete(name)
      else jar.set(name, value)
    },
    delete: (name: string) => jar.delete(name),
  }),
  headers: async () => requestHeaders,
}))
