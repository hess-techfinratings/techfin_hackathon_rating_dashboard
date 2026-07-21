import { PageHeader } from "@/components/page-header"
import { SetupNotice } from "@/components/setup-notice"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DateRangeFilter } from "@/components/date-range-filter"
import { DivergenceChart, type DivergenceRow } from "@/components/divergence-chart"
import { MonthlyTrendChart } from "@/components/monthly-trend-chart"
import { WeeklyTrendChart } from "@/components/weekly-trend-chart"
import { getDateBounds, parseDateRange, weekStartOf } from "@/lib/date-range"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import type {
  AgencyCorrelationRow,
  AgencyDivergenceRow,
  MonthlyTrendViewRow,
  WeeklyTrendViewRow,
} from "@/lib/types"

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

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Analytics" />
        <SetupNotice error="NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다." />
      </>
    )
  }
  const supabase = await createClient()
  const range = parseDateRange(await searchParams)
  const rpcArgs = { d_from: range.from, d_to: range.to }

  let monthlyQuery = supabase.from("v_monthly_trend").select("*").order("month")
  if (range.from) monthlyQuery = monthlyQuery.gte("month", range.from.slice(0, 7))
  if (range.to) monthlyQuery = monthlyQuery.lte("month", range.to.slice(0, 7))

  let weeklyQuery = supabase
    .from("v_weekly_trend")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(12)
  if (range.from) weeklyQuery = weeklyQuery.gte("week_start", weekStartOf(range.from))
  if (range.to) weeklyQuery = weeklyQuery.lte("week_start", range.to)

  const [trendRes, weeklyRes, divRes, corrRes, bounds] = await Promise.all([
    monthlyQuery.returns<MonthlyTrendViewRow[]>(),
    weeklyQuery.returns<WeeklyTrendViewRow[]>(),
    supabase.rpc("fn_agency_divergence", rpcArgs),
    supabase.rpc("fn_agency_correlation", rpcArgs),
    getDateBounds(supabase),
  ])

  const firstError = trendRes.error ?? weeklyRes.error ?? divRes.error ?? corrRes.error
  if (firstError) {
    return (
      <>
        <PageHeader title="Analytics" />
        <SetupNotice error={firstError.message} />
      </>
    )
  }

  const divRows = (divRes.data ?? []) as AgencyDivergenceRow[]
  const corrRows = (corrRes.data ?? []) as AgencyCorrelationRow[]
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
  ].map((a) => ({
    ...a,
    stats: agreementStats(divRows, a.key),
    corr: corrRows.find((c) => c.agency === a.key) ?? null,
  }))

  return (
    <>
      <PageHeader title="Analytics" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {bounds && <DateRangeFilter min={bounds.min} max={bounds.max} />}
        <div className="grid gap-4 sm:grid-cols-2">
          {agencies.map((a) => (
            <Card key={a.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  크레디뷰 vs {a.label} — 비교 가능 {a.stats.total.toLocaleString()}건
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-6">
                  <div>
                    <div className="text-2xl font-semibold tabular-nums">
                      {a.corr ? Number(a.corr.spearman).toFixed(2) : "–"}
                    </div>
                    <p className="text-xs text-muted-foreground">스피어만 상관계수</p>
                  </div>
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
                </div>
                {a.corr && (
                  <p className="text-xs text-muted-foreground">
                    BB+ 이하 비중: 크레디뷰 {Math.round(a.corr.cv_bbplus_below_pct)}% · {a.label}{" "}
                    {Math.round(a.corr.other_bbplus_below_pct)}%
                  </p>
                )}
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

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>주별 평가 신청 추이</CardTitle>
              <CardDescription>
                최근 12주 신청 건수와 등급 산출/미산출 구성 (일~토 주 기준)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklyTrendChart data={[...(weeklyRes.data ?? [])].reverse()} />
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
        </div>
      </main>
    </>
  )
}
