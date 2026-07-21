import { BandComposition } from "@/components/band-composition"
import { DateRangeFilter } from "@/components/date-range-filter"
import { GradeDistributionChart, type GradeCount } from "@/components/grade-distribution-chart"
import { GradeHeatmap } from "@/components/grade-heatmap"
import { PageHeader } from "@/components/page-header"
import { SetupNotice } from "@/components/setup-notice"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getDateBounds, parseDateRange } from "@/lib/date-range"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import type { GradeDistributionRow, GradePairRow } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function GradesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="타사 등급" />
        <SetupNotice error="NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다." />
      </>
    )
  }
  const supabase = await createClient()
  const range = parseDateRange(await searchParams)

  const rpcArgs = { d_from: range.from, d_to: range.to }
  const [distRes, pairsRes, bounds] = await Promise.all([
    supabase.rpc("fn_grade_distribution", rpcArgs),
    supabase.rpc("fn_grade_pairs", rpcArgs),
    getDateBounds(supabase),
  ])

  if (distRes.error || pairsRes.error) {
    return (
      <>
        <PageHeader title="타사 등급" />
        <SetupNotice error={(distRes.error ?? pairsRes.error)!.message} />
      </>
    )
  }

  const distRows = (distRes.data ?? []) as GradeDistributionRow[]
  const byAgency: Record<"crediview" | "nice" | "cretop", GradeCount[]> = {
    crediview: [],
    nice: [],
    cretop: [],
  }
  for (const row of distRows.sort(
    (a, b) => (a.grade_order ?? 99) - (b.grade_order ?? 99)
  )) {
    byAgency[row.agency]?.push({ char_grade: row.char_grade, cnt: row.cnt })
  }

  // notch → char label per agency, for heatmap ticks/tooltips
  const charMaps: Record<"crediview" | "nice" | "cretop", Record<number, string>> = {
    crediview: {},
    nice: {},
    cretop: {},
  }
  for (const row of distRows) {
    if (row.grade_order !== null && !charMaps[row.agency][row.grade_order]) {
      charMaps[row.agency][row.grade_order] = row.char_grade
    }
  }

  const pairRows = (pairsRes.data ?? []) as GradePairRow[]
  const heatmaps = [
    { key: "nice" as const, label: "나이스", subject: "나이스가" },
    { key: "cretop" as const, label: "크레탑", subject: "크레탑이" },
  ].map((a) => ({
    ...a,
    cells: pairRows
      .filter((p) => p.agency === a.key)
      .map((p) => ({ x: p.cv_grade, y: p.other_grade, cnt: p.cnt })),
    total: pairRows
      .filter((p) => p.agency === a.key)
      .reduce((s, p) => s + p.cnt, 0),
  }))

  return (
    <>
      <PageHeader title="타사 등급" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {bounds && <DateRangeFilter min={bounds.min} max={bounds.max} />}

        <div className="grid gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle>등급 분포</CardTitle>
              <CardDescription>평가기관별 문자등급 분포 (좋은 등급 → 낮은 등급 순)</CardDescription>
            </CardHeader>
            <CardContent>
              <GradeDistributionChart byAgency={byAgency} />
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>등급대 구성</CardTitle>
              <CardDescription>평가기관별 투자적격/투기/부실위험 비중</CardDescription>
            </CardHeader>
            <CardContent>
              <BandComposition rows={distRows} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {heatmaps.map((h) => (
            <Card key={h.key}>
              <CardHeader>
                <CardTitle>크레디뷰 × {h.label} 등급 일치 히트맵</CardTitle>
                <CardDescription>
                  비교 가능 {h.total.toLocaleString()}건 · 점선 대각선 = 등급 일치 · 대각선
                  아래는 {h.subject} 더 낮게 평가 (실선 = 투자적격/투기/부실위험 경계)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GradeHeatmap
                  cells={h.cells}
                  yAgency={h.label}
                  xChars={charMaps.crediview}
                  yChars={charMaps[h.key]}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  )
}
