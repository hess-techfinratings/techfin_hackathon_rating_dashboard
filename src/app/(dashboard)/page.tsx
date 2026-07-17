import { Activity, Building2, FileCheck2, FileX2 } from "lucide-react"
import Link from "next/link"

import { BandComposition } from "@/components/band-composition"
import { GradeBadge } from "@/components/grade-badge"
import { GradeDistributionChart, type GradeCount } from "@/components/grade-distribution-chart"
import { PageHeader } from "@/components/page-header"
import { SetupNotice } from "@/components/setup-notice"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatYmd } from "@/lib/format"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import type { GradeDistributionRow, OverviewStats, RatingRequest } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function OverviewPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Overview" />
        <SetupNotice error="NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다. Vercel 배포라면 Project Settings → Environment Variables에 추가하세요." />
      </>
    )
  }
  const supabase = await createClient()

  const [statsRes, distRes, recentRes] = await Promise.all([
    supabase.from("v_overview_stats").select("*").single<OverviewStats>(),
    supabase.from("v_grade_distribution").select("*").returns<GradeDistributionRow[]>(),
    supabase
      .from("rating_requests")
      .select("no_req, da_calc, grade_type, cv_char_grade, cv_num_grade, n_char_grade, k_char_grade, mis_cd_error, fs_cd_error")
      .order("da_calc", { ascending: false })
      .order("no_req", { ascending: false })
      .limit(8)
      .returns<RatingRequest[]>(),
  ])

  const firstError = statsRes.error ?? distRes.error ?? recentRes.error
  if (firstError || !statsRes.data) {
    return (
      <>
        <PageHeader title="Overview" />
        <SetupNotice error={firstError?.message ?? "no data"} />
      </>
    )
  }

  const stats = statsRes.data
  const gradedPct = stats.total_requests
    ? Math.round((stats.cv_graded / stats.total_requests) * 100)
    : 0

  const byAgency: Record<"crediview" | "nice" | "cretop", GradeCount[]> = {
    crediview: [],
    nice: [],
    cretop: [],
  }
  for (const row of (distRes.data ?? []).sort(
    (a, b) => (a.grade_order ?? 99) - (b.grade_order ?? 99)
  )) {
    byAgency[row.agency]?.push({ char_grade: row.char_grade, cnt: row.cnt })
  }

  const cards = [
    {
      title: "전체 평가 신청",
      value: stats.total_requests.toLocaleString(),
      sub: `기업 수 ${stats.distinct_companies.toLocaleString()}개 (사업자번호 기준)`,
      icon: Activity,
    },
    {
      title: "크레디뷰 등급 산출",
      value: `${stats.cv_graded.toLocaleString()}건`,
      sub: `산출률 ${gradedPct}%`,
      icon: FileCheck2,
    },
    {
      title: "등급 미산출",
      value: `${stats.type_none.toLocaleString()}건`,
      sub: "산출불가 사유는 오류코드 참조",
      icon: FileX2,
    },
    {
      title: "재무제표 보유 기업",
      value: `${stats.companies_with_financials.toLocaleString()}개`,
      sub: "BS/IS 2개년 데이터",
      icon: Building2,
    },
  ]

  return (
    <>
      <PageHeader title="Overview" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.title}
                </CardTitle>
                <c.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{c.value}</div>
                <p className="text-xs text-muted-foreground">{c.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

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
              <CardTitle>최근 평가 신청</CardTitle>
              <CardDescription>최신 8건</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>신청번호</TableHead>
                    <TableHead>일자</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>크레디뷰</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recentRes.data ?? []).map((r) => (
                    <TableRow key={r.no_req}>
                      <TableCell className="font-mono text-xs">
                        <Link href={`/companies/${r.no_req}`} className="hover:underline">
                          {r.no_req}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">{formatYmd(r.da_calc?.replaceAll("-", ""))}</TableCell>
                      <TableCell>
                        {r.grade_type ? (
                          <Badge variant="secondary">{r.grade_type}</Badge>
                        ) : (
                          <Badge variant="outline">미산출</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <GradeBadge charGrade={r.cv_char_grade} numGrade={r.cv_num_grade} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>등급대 구성</CardTitle>
              <CardDescription>평가기관별 투자적격/투기/부실위험 비중</CardDescription>
            </CardHeader>
            <CardContent>
              <BandComposition rows={distRes.data ?? []} />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3 xl:col-span-3 xl:grid-cols-1">
            {[
              { label: "FS (재무등급)", value: stats.type_fs },
              { label: "MIS+FS (통합등급)", value: stats.type_mis_fs },
              { label: "MIS (경영정보등급)", value: stats.type_mis },
            ].map((t) => (
              <Card key={t.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{t.value.toLocaleString()}건</div>
                  <p className="text-xs text-muted-foreground">
                    전체의 {stats.total_requests ? Math.round((t.value / stats.total_requests) * 100) : 0}%
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
