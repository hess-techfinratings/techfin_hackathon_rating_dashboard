"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// Placeholder data — replace with a Supabase query once your schema exists
const chartData = [
  { month: "Jan", revenue: 4200 },
  { month: "Feb", revenue: 4800 },
  { month: "Mar", revenue: 4500 },
  { month: "Apr", revenue: 5600 },
  { month: "May", revenue: 6100 },
  { month: "Jun", revenue: 5900 },
  { month: "Jul", revenue: 7200 },
]

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function OverviewChart() {
  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <AreaChart data={chartData} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="0" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={44}
          tickFormatter={(value: number) => `$${(value / 1000).toFixed(1)}k`}
        />
        <ChartTooltip cursor content={<ChartTooltipContent />} />
        <Area
          dataKey="revenue"
          type="monotone"
          fill="var(--color-revenue)"
          fillOpacity={0.15}
          stroke="var(--color-revenue)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
