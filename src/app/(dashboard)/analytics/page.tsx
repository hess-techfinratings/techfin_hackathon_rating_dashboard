import { PageHeader } from "@/components/page-header"
import { SetupNotice } from "@/components/setup-notice"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DivergenceChart, type DivergenceRow } from "@/components/divergence-chart"
import { MonthlyTrendChart } from "@/components/monthly-trend-chart"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import type { AgencyDivergenceRow, MonthlyTrendViewRow } from "@/lib/types"

export const dynamic = "force-dynamic"

function agreementStats(rows: AgencyDivergenceRow[], agency: "nice" | "cretop") {
  const mine = rows.filter((r) => r.agency === agency)
  const total = mine.reduce((s, r) => s + r.cnt, 0)
  if (!total) return { total: 0, exact: 0, within1: 0, conservative: 0 }
  const sum = (pred: (d: number) => boolean) =>
    mine.filter((r) => pred(r.notch_diff)).reduce((s, r) => s + r.cnt, 0)
  return {
    total,
    exact: Math.round((sum((d) => d === 0) / total) * 100),
    within1: Math.round((sum((d) => Math.abs(d) <= 1) / total) * 100),
    conservative: Math.round((sum((d) => d > 0) / total) * 100),
  }
}

export default async function AnalyticsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Analytics" />
        <SetupNotice error="NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다." />
      </>
    )
  }
  const supabase = await createClient()

  const [trendRes, divRes] = await Promise.all([
    supabase.from("v_monthly_trend").select("*").order("month").returns<MonthlyTrendViewRow[]>(),
    supabase.from("v_agency_divergence").select("*").returns<AgencyDivergenceRow[]>(),
  ])

  const firstError = trendRes.error ?? divRes.error
  if (firstError) {
    return (
      <>
        <PageHeader title="Analytics" />
        <SetupNotice error={firstError.message} />
      </>
    )
  }

  const divRows = divRes.data ?? []
  const diffs = divRows.map((r) => r.notch_diff)
  const [minDiff, maxDiff] = diffs.length
    ? [Math.min(...diffs), Math.max(...diffs)]
    : [0, 0]
  const divergenceData: DivergenceRow[] = []
  for (let d = minDiff; d <= maxDiff; d++) {
    divergenceData.push({
      notch_diff: d,
      nice: divRows.find((r) => r.agency === "nice" && r.notch_diff === d)?.cnt ?? 0,
      cretop: divRows.find((r) => r.agency === "cretop" && r.notch_diff === d)?.cnt ?? 0,
    })
  }

  const agencies = [
    { key: "nice" as const, label: "나이스", subject: "나이스가" },
    { key: "cretop" as const, label: "크레탑", subject: "크레탑이" },
  ].map((a) => ({ ...a, stats: agreementStats(divRows, a.key) }))

  return (
    <>
      <PageHeader title="Analytics" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {agencies.map((a) => (
            <Card key={a.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  크레디뷰 vs {a.label} — 비교 가능 {a.stats.total.toLocaleString()}건
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-6">
                <div>
                  <div className="text-2xl font-semibold tabular-nums">{a.stats.exact}%</div>
                  <p className="text-xs text-muted-foreground">등급 일치</p>
                </div>
                <div>
                  <div className="text-2xl font-semibold tabular-nums">{a.stats.within1}%</div>
                  <p className="text-xs text-muted-foreground">±1노치 이내</p>
                </div>
                <div>
                  <div className="text-2xl font-semibold tabular-nums">{a.stats.conservative}%</div>
                  <p className="text-xs text-muted-foreground">{a.subject} 더 보수적</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>평가기관 간 등급 차이</CardTitle>
            <CardDescription>
              노치 차이 분포 (타기관 등급 − 크레디뷰 등급, 양수 = 타기관이 더 낮게 평가)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DivergenceChart data={divergenceData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>월별 평가 신청 추이</CardTitle>
            <CardDescription>월별 신청 건수와 등급 산출/미산출 구성</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyTrendChart data={trendRes.data ?? []} />
          </CardContent>
        </Card>
      </main>
    </>
  )
}
