import type { Role } from "@/db/schema"

export const PERMISSIONS = [
  "dashboard:view",
  "orders:read",
  "orders:write",
  "leads:read",
  "leads:write",
  "customers:read",
  "catalog:read",
  "catalog:write",
  "offers:write",
  "blog:write",
  "content:write",
  "reports:read",
  "media:write",
  "delivery:write",
  "settings:write",
  "payment-links:write",
  "staff:write",
  "audit:read",
] as const
export type Permission = (typeof PERMISSIONS)[number]

/**
 * owner: everything. manager: catalogue, offers, blog, content, reports.
 * staff: orders, leads, customers (+ payment links, which are an order-handling tool).
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  manager: ["dashboard:view", "catalog:read", "catalog:write", "offers:write", "blog:write", "content:write", "reports:read", "media:write"],
  staff: ["dashboard:view", "orders:read", "orders:write", "leads:read", "leads:write", "customers:read", "payment-links:write"],
}

export const can = (role: Role, permission: Permission) => ROLE_PERMISSIONS[role].includes(permission)
