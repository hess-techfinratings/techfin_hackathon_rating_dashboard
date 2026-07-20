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

export interface WeeklyErrorsRow {
  week_start: string
  mis_errors: number
  fs_errors: number
}

const chartConfig = {
  mis_errors: { label: "MIS 오류", color: "var(--chart-1)" },
  fs_errors: { label: "FS 오류", color: "var(--chart-8)" },
} satisfies ChartConfig

/** Grouped (not stacked): the same request can carry both error types. */
export function WeeklyErrorsChart({ data }: { data: WeeklyErrorsRow[] }) {
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
        <Bar isAnimationActive={false} dataKey="mis_errors" fill="var(--color-mis_errors)" radius={[4, 4, 0, 0]} maxBarSize={16} />
        <Bar isAnimationActive={false} dataKey="fs_errors" fill="var(--color-fs_errors)" radius={[4, 4, 0, 0]} maxBarSize={16} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  )
}
