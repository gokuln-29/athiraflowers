"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const config = { revenue: { label: "Revenue (AED)", color: "var(--primary)" } } satisfies ChartConfig

export function RevenueChart({ data }: { data: { d: string; label: string; revenue: number; orders: number }[] }) {
  return (
    <ChartContainer config={config} className="h-56 w-full" role="img" aria-label="Revenue per day for the last 30 days">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={4} tickMargin={6} />
        <YAxis tickLine={false} axisLine={false} width={44} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => p?.[0]?.payload?.d ?? ""} />} />
        <Area dataKey="revenue" type="monotone" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.14} strokeWidth={2} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  )
}
