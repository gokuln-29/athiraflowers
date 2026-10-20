"use client"

import {
  ChartNoAxesColumn, Flower, Folder, Image as ImageIcon, Kanban, LayoutDashboard, LayoutTemplate, Link as LinkIcon, LogOut, Newspaper,
  Package, ScrollText, Search, Settings, ShieldCheck, TicketPercent, Truck, Users, type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import type { NavGroup } from "@/components/admin/nav-config"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { Role } from "@/db/schema"

const ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard, package: Package, link: LinkIcon, kanban: Kanban, users: Users, flower: Flower, folder: Folder,
  "ticket-percent": TicketPercent, image: ImageIcon, newspaper: Newspaper, "layout-template": LayoutTemplate, search: Search, truck: Truck,
  "chart-no-axes-column": ChartNoAxesColumn, settings: Settings, "shield-check": ShieldCheck, "scroll-text": ScrollText,
}

export function AdminNav({
  groups, brand, admin, signOut,
}: {
  groups: NavGroup[]
  brand: string
  admin: { name: string; email: string; role: Role }
  signOut: () => Promise<void>
}) {
  const pathname = usePathname()
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`))
  return (
    <Sidebar collapsible="offcanvas" className="border-e border-sidebar-border">
      <SidebarHeader className="px-4 pt-5 pb-2">
        <Link href="/admin" className="font-display text-xl leading-none">
          {brand}
        </Link>
        <span className="meta">Admin</span>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton isActive={isActive(item.href)} render={<Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined} />}>
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-2 p-3">
        <div className="px-1">
          <p className="truncate text-sm font-medium">{admin.name}</p>
          <p className="meta truncate">
            {admin.email} · {admin.role}
          </p>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/admin/account/password" />}>
              <ShieldCheck />
              <span>Account</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={signOut}>
              <SidebarMenuButton type="submit">
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
