import { BandComposition } from "@/components/band-composition"
import { DateRangeFilter } from "@/components/date-range-filter"
import { GradeDistributionChart, type GradeCount } from "@/components/grade-distribution-chart"
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
import type { GradeDistributionRow } from "@/lib/types"

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

  const [distRes, bounds] = await Promise.all([
    supabase.rpc("fn_grade_distribution", { d_from: range.from, d_to: range.to }),
    getDateBounds(supabase),
  ])

  if (distRes.error) {
    return (
      <>
        <PageHeader title="타사 등급" />
        <SetupNotice error={distRes.error.message} />
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
      </main>
    </>
  )
}
