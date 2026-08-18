"use client"

import type { ReactNode } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"
import { CHART_COLORS, type NamedValue } from "@/lib/dashboard-stats"
import { cn } from "@/lib/utils"

export function StatsChartCard({
  title,
  description,
  empty,
  emptyLabel,
  children,
  className,
}: {
  title: string
  description?: string
  empty?: boolean
  emptyLabel: string
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

export function StatsKpi({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-2xl border border-purple-100/80 bg-white p-4 shadow-sm shadow-purple-900/5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-servido-900">{value}</p>
    </div>
  )
}

const seriesConfig: ChartConfig = {
  value: { label: "", color: CHART_COLORS[0] },
}

function truncateLabel(value: string, max = 18) {
  if (!value) return "—"
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

export function StatsAreaChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ChartContainer config={seriesConfig} className="aspect-auto h-[240px] w-full">
      <AreaChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS[0]}
          fill={CHART_COLORS[0]}
          fillOpacity={0.18}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}

export function StatsBarChart({ data, layout = "vertical" }: { data: NamedValue[]; layout?: "vertical" | "horizontal" }) {
  if (layout === "horizontal") {
    return (
      <ChartContainer config={seriesConfig} className="aspect-auto h-[260px] w-full">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12, top: 8 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={128}
            tickFormatter={(value) => truncateLabel(String(value))}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" radius={4}>
            {data.map((item, index) => (
              <Cell key={`${item.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={seriesConfig} className="aspect-auto h-[240px] w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((item, index) => (
            <Cell key={`${item.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

export function StatsPieChart({ data }: { data: NamedValue[] }) {
  const config: ChartConfig = Object.fromEntries(
    data.map((item, index) => [
      item.name,
      { label: item.name, color: CHART_COLORS[index % CHART_COLORS.length] },
    ])
  )

  return (
    <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={52}
          outerRadius={84}
          paddingAngle={4}
          stroke="#fff"
          strokeWidth={2}
        >
          {data.map((item, index) => (
            <Cell key={`${item.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  )
}
