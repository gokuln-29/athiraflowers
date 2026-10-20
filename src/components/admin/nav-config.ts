import type { Permission } from "@/server/auth/permissions"

export type NavItem = { label: string; href: string; permission: Permission; icon: string; ready: boolean }
export type NavGroup = { label: string; items: NavItem[] }

/** Single source for the admin sidebar. `ready` flips on as each screen ships. */
export const NAV: NavGroup[] = [
  { label: "Overview", items: [{ label: "Dashboard", href: "/admin", permission: "dashboard:view", icon: "layout-dashboard", ready: true }] },
  {
    label: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", permission: "orders:read", icon: "package", ready: false },
      { label: "Payment links", href: "/admin/payment-links", permission: "payment-links:write", icon: "link", ready: false },
      { label: "Leads", href: "/admin/leads", permission: "leads:read", icon: "kanban", ready: false },
      { label: "Customers", href: "/admin/customers", permission: "customers:read", icon: "users", ready: false },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { label: "Products", href: "/admin/products", permission: "catalog:read", icon: "flower", ready: false },
      { label: "Categories", href: "/admin/categories", permission: "catalog:read", icon: "folder", ready: false },
      { label: "Offers", href: "/admin/offers", permission: "offers:write", icon: "ticket-percent", ready: false },
      { label: "Images", href: "/admin/media", permission: "media:write", icon: "image", ready: false },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Blog", href: "/admin/blog", permission: "blog:write", icon: "newspaper", ready: false },
      { label: "Pages and homepage", href: "/admin/pages", permission: "content:write", icon: "layout-template", ready: false },
      { label: "SEO", href: "/admin/seo", permission: "content:write", icon: "search", ready: false },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Delivery", href: "/admin/delivery", permission: "delivery:write", icon: "truck", ready: false },
      { label: "Reports", href: "/admin/reports", permission: "reports:read", icon: "chart-no-axes-column", ready: false },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Store settings", href: "/admin/settings", permission: "settings:write", icon: "settings", ready: false },
      { label: "Staff and roles", href: "/admin/staff", permission: "staff:write", icon: "shield-check", ready: false },
      { label: "Audit log", href: "/admin/audit", permission: "audit:read", icon: "scroll-text", ready: false },
    ],
  },
]
