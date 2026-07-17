"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface GradeCount {
  char_grade: string
  cnt: number
}

const chartConfig = {
  cnt: {
    label: "건수",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const AGENCIES = [
  { key: "crediview", label: "크레디뷰" },
  { key: "nice", label: "나이스" },
  { key: "cretop", label: "크레탑" },
] as const

function GradeBarChart({ data }: { data: GradeCount[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="char_grade"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={0}
          tick={{ fontSize: 11 }}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
        <ChartTooltip cursor content={<ChartTooltipContent />} />
        <Bar dataKey="cnt" fill="var(--color-cnt)" radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ChartContainer>
  )
}

export function GradeDistributionChart({
  byAgency,
}: {
  byAgency: Record<(typeof AGENCIES)[number]["key"], GradeCount[]>
}) {
  return (
    <Tabs defaultValue="crediview">
      <TabsList>
        {AGENCIES.map((a) => (
          <TabsTrigger key={a.key} value={a.key}>
            {a.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {AGENCIES.map((a) => (
        <TabsContent key={a.key} value={a.key}>
          <GradeBarChart data={byAgency[a.key]} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
