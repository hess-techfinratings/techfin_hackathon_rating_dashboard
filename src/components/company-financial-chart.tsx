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

export interface KeyMetricRow {
  name: string
  [year: string]: string | number | null
}

const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)"]

/** Grouped bars comparing key금액 across the two fiscal years, in 억원. */
export function CompanyFinancialChart({
  data,
  years,
}: {
  data: KeyMetricRow[]
  years: string[]
}) {
  const chartConfig = Object.fromEntries(
    years.map((y, i) => [y, { label: `${y}년`, color: SERIES_COLORS[i % 2] }])
  ) satisfies ChartConfig

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={0}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={52}
          tickFormatter={(v: number) => `${v.toLocaleString("ko-KR")}억`}
        />
        <ChartTooltip
          cursor
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => (
                <>
                  <div
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ background: item.color }}
                  />
                  {chartConfig[name as string]?.label ?? name}
                  <div className="ml-auto font-mono font-medium tabular-nums">
                    {Number(value).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억
                  </div>
                </>
              )}
            />
          }
        />
        {years.map((y, i) => (
          <Bar
            isAnimationActive={false}
            key={y}
            dataKey={y}
            fill={SERIES_COLORS[i % 2]}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        ))}
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  )
}
