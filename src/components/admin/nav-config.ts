import type { Permission } from "@/server/auth/permissions"

export type NavItem = { label: string; href: string; permission: Permission; icon: string; ready: boolean }
export type NavGroup = { label: string; items: NavItem[] }

/** Single source for the admin sidebar. `ready` flips on as each screen ships. */
export const NAV: NavGroup[] = [
  { label: "Overview", items: [{ label: "Dashboard", href: "/admin", permission: "dashboard:view", icon: "layout-dashboard", ready: true }] },
  {
    label: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", permission: "orders:read", icon: "package", ready: true },
      { label: "Payment links", href: "/admin/payment-links", permission: "payment-links:write", icon: "link", ready: true },
      { label: "Leads", href: "/admin/leads", permission: "leads:read", icon: "kanban", ready: true },
      { label: "Customers", href: "/admin/customers", permission: "customers:read", icon: "users", ready: true },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { label: "Products", href: "/admin/products", permission: "catalog:read", icon: "flower", ready: true },
      { label: "Categories", href: "/admin/categories", permission: "catalog:read", icon: "folder", ready: true },
      { label: "Offers", href: "/admin/offers", permission: "offers:write", icon: "ticket-percent", ready: true },
      { label: "Images", href: "/admin/media", permission: "media:write", icon: "image", ready: true },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Blog", href: "/admin/blog", permission: "blog:write", icon: "newspaper", ready: true },
      { label: "Pages and homepage", href: "/admin/pages", permission: "content:write", icon: "layout-template", ready: true },
      { label: "SEO", href: "/admin/seo", permission: "content:write", icon: "search", ready: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Delivery", href: "/admin/delivery", permission: "delivery:write", icon: "truck", ready: true },
      { label: "Reports", href: "/admin/reports", permission: "reports:read", icon: "chart-no-axes-column", ready: true },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Store settings", href: "/admin/settings", permission: "settings:write", icon: "settings", ready: true },
      { label: "Staff and roles", href: "/admin/staff", permission: "staff:write", icon: "shield-check", ready: true },
      { label: "Audit log", href: "/admin/audit", permission: "audit:read", icon: "scroll-text", ready: true },
    ],
  },
]
