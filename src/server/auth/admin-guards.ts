import "server-only"
import { notFound, redirect } from "next/navigation"
import { NextResponse } from "next/server"
import type { z } from "zod"

import { audit } from "@/server/security/audit"
import { rateLimit } from "@/server/security/rate-limit"

import { authorize, AuthorizationError, type AdminContext } from "./admin-session"
import type { Permission } from "./permissions"

/** For server components / pages: redirects to login, or 404s when the role lacks the permission. */
export async function requirePage(permission: Permission): Promise<AdminContext> {
  try {
    return await authorize(permission)
  } catch (error) {
    if (error instanceof AuthorizationError) {
      if (error.code === "unauthenticated") redirect("/admin/login")
      if (error.code === "mfa_required") redirect("/admin/login/verify")
      notFound()
    }
    throw error
  }
}

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export const fail = (error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> => ({ ok: false, error, fieldErrors })

/**
 * Wrapper for admin server actions: authorize() first, then validate with Zod, then run.
 * Errors are logged in detail server-side and returned generically.
 */
export function adminAction<S extends z.ZodType, R>(
  permission: Permission,
  schema: S,
  handler: (input: z.infer<S>, ctx: AdminContext) => Promise<ActionResult<R>>,
  opts: { name: string; rateLimit?: { limit: number; windowSeconds: number } }
) {
  return async (raw: unknown): Promise<ActionResult<R>> => {
    let ctx: AdminContext
    try {
      ctx = await authorize(permission)
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return fail(error.code === "forbidden" ? "You do not have permission to do this." : "Your session has ended. Sign in again.")
      }
      throw error
    }
    if (opts.rateLimit) {
      const rl = await rateLimit(`admin-action:${opts.name}:${ctx.adminId}`, opts.rateLimit.limit, opts.rateLimit.windowSeconds)
      if (!rl.allowed) return fail("Too many requests. Try again shortly.")
    }
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      return fail("Check the highlighted fields.", flat.fieldErrors as Record<string, string[]>)
    }
    try {
      return await handler(parsed.data, ctx)
    } catch (error) {
      if (isNextControlFlow(error)) throw error
      console.error(`[admin-action:${opts.name}]`, error)
      await audit({ actorType: "admin", actorId: ctx.adminId, action: `error:${opts.name}`, ipHash: ctx.ipHash })
      return fail("Something went wrong. The change was not saved.")
    }
  }
}

/** Wrapper for admin route handlers (JSON). */
export function adminRoute(
  permission: Permission,
  handler: (request: Request, ctx: AdminContext, params: Record<string, string>) => Promise<Response>
) {
  return async (request: Request, routeCtx: { params: Promise<Record<string, string>> }): Promise<Response> => {
    let ctx: AdminContext
    try {
      ctx = await authorize(permission)
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return NextResponse.json({ error: error.code === "forbidden" ? "Forbidden" : "Unauthorized" }, { status: error.code === "forbidden" ? 403 : 401 })
      }
      throw error
    }
    try {
      return await handler(request, ctx, await routeCtx.params)
    } catch (error) {
      console.error("[admin-route]", error)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }
  }
}

/** next/navigation redirect()/notFound() are thrown; never swallow them. */
export function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: string } | null)?.digest
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") || digest === "NEXT_NOT_FOUND")
}
