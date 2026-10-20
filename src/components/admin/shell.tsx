import Link from "next/link"

import { AdminNav } from "@/components/admin/admin-nav"
import { NAV } from "@/components/admin/nav-config"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { site } from "@/config/site"
import { logoutAction } from "@/app/(admin)/admin/(auth)/actions"
import { can } from "@/server/auth/permissions"
import type { Role } from "@/db/schema"

export function AdminShell({ admin, children }: { admin: { name: string; email: string; role: Role }; children: React.ReactNode }) {
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.ready && can(admin.role, i.permission)) })).filter((g) => g.items.length)
  return (
    <SidebarProvider style={{ "--sidebar-width": "15rem" } as React.CSSProperties}>
      <AdminNav groups={groups} brand={site.name} admin={admin} signOut={logoutAction} />
      <SidebarInset className="bg-background">
        <header className="flex h-12 items-center gap-2 px-4 md:hidden">
          <SidebarTrigger aria-label="Open navigation" />
          <Separator orientation="vertical" className="h-4" />
          <Link href="/admin" className="font-display text-lg">
            {site.name}
          </Link>
        </header>
        <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="meta mt-1 max-w-[70ch] text-sm">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export { Button }
