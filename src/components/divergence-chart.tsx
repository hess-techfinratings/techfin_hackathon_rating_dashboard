"use client"

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export interface DivergenceRow {
  notch_diff: number
  nice: number
  cretop: number
}

const chartConfig = {
  nice: { label: "나이스", color: "var(--chart-2)" },
  cretop: { label: "크레탑", color: "var(--chart-5)" },
} satisfies ChartConfig

/** Histogram of notch differences (타기관 − 크레디뷰). 0 = 일치. */
export function DivergenceChart({ data }: { data: DivergenceRow[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="notch_diff"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => (v > 0 ? `+${v}` : `${v}`)}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
        <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1} />
        <ChartTooltip
          cursor
          content={
            <ChartTooltipContent
              labelFormatter={(v) =>
                Number(v) === 0
                  ? "등급 일치"
                  : Number(v) > 0
                    ? `크레디뷰보다 ${v}노치 낮게(보수적)`
                    : `크레디뷰보다 ${Math.abs(Number(v))}노치 높게(관대)`
              }
            />
          }
        />
        <Bar isAnimationActive={false} dataKey="nice" fill="var(--color-nice)" radius={[4, 4, 0, 0]} maxBarSize={16} />
        <Bar isAnimationActive={false} dataKey="cretop" fill="var(--color-cretop)" radius={[4, 4, 0, 0]} maxBarSize={16} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  )
}
