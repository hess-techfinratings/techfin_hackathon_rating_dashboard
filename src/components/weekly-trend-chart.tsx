"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export interface WeeklyTrendRow {
  week_start: string
  graded: number
  ungraded: number
}

const chartConfig = {
  graded: { label: "등급 산출", color: "var(--chart-1)" },
  ungraded: { label: "미산출", color: "var(--muted-foreground)" },
} satisfies ChartConfig

export function WeeklyTrendChart({ data }: { data: WeeklyTrendRow[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="week_start"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={44} />
        <ChartTooltip cursor content={<ChartTooltipContent />} />
        <Bar isAnimationActive={false} dataKey="graded" stackId="a" fill="var(--color-graded)" radius={[0, 0, 0, 0]} maxBarSize={28} />
        <Bar isAnimationActive={false} dataKey="ungraded" stackId="a" fill="var(--color-ungraded)" fillOpacity={0.45} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  )
}
