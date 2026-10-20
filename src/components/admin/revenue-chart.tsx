"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type Point = { d: string; label: string; revenue: number; orders: number }

/** Plain Recharts, not the shadcn ChartContainer: that injects an un-nonced <style> tag, which our CSP blocks. */
export function RevenueChart({ data }: { data: Point[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Revenue per day for the last 30 days">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval={4} tickMargin={6} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={44} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={({ active, payload }) => {
              const p = active ? (payload?.[0]?.payload as Point | undefined) : undefined
              if (!p) return null
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
                  <div className="meta">{p.d}</div>
                  <div className="num font-medium">AED {p.revenue.toLocaleString("en")}</div>
                  <div className="meta">{p.orders} {p.orders === 1 ? "order" : "orders"}</div>
                </div>
              )
            }}
          />
          <Area dataKey="revenue" type="monotone" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.14} strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
