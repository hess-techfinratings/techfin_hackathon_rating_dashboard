import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CompanyFinancialChart, type KeyMetricRow } from "@/components/company-financial-chart"
import { GradeAnalysisCard } from "@/components/grade-analysis-card"
import { PageHeader } from "@/components/page-header"
import { RatingSpectrum } from "@/components/rating-spectrum"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type GradeAnalysis, isLowGrade } from "@/lib/analysis"
import { fiscalYear, formatKRW, formatWon, formatYmd } from "@/lib/format"
import { computeRiskFlags } from "@/lib/risk-flags"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import type { FinancialStatementRow, RatingRequest } from "@/lib/types"

export const dynamic = "force-dynamic"

const KEY_METRICS: { cd: string; name: string }[] = [
  { cd: "115000", name: "자산총계" },
  { cd: "118000", name: "부채총계" },
  { cd: "118900", name: "자본총계" },
  { cd: "121000", name: "매출액" },
  { cd: "125000", name: "영업이익" },
  { cd: "129000", name: "당기순이익" },
]
const BOLD_CODES = new Set([
  ...KEY_METRICS.map((m) => m.cd),
  "119000", "123000", "124000",
])

interface PivotRow {
  acct_cd: string
  acct_nm: string
  depth: number
  amounts: Record<string, number | null>
}

function pivot(rows: FinancialStatementRow[], gb: "BS" | "IS", years: string[]): PivotRow[] {
  const byCode = new Map<string, PivotRow>()
  for (const r of rows) {
    if (r.fn_data_gb !== gb || !r.acct_cd) continue
    const year = fiscalYear(r.dm_fndend)
    let row = byCode.get(r.acct_cd)
    if (!row) {
      const nm = r.acct_nm ?? ""
      row = {
        acct_cd: r.acct_cd,
        acct_nm: nm.trim(),
        depth: Math.min(nm.length - nm.trimStart().length, 6),
        amounts: Object.fromEntries(years.map((y) => [y, null])),
      }
      byCode.set(r.acct_cd, row)
    }
    row.amounts[year] = r.amt === null ? null : Number(r.amt)
  }
  return [...byCode.values()].sort((a, b) => a.acct_cd.localeCompare(b.acct_cd))
}

function StatementTable({ rows, years }: { rows: PivotRow[]; years: string[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[220px]">계정과목</TableHead>
            {years.map((y) => (
              <TableHead key={y} className="text-right">
                {y}년 (원)
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.acct_cd}>
              <TableCell
                className={BOLD_CODES.has(r.acct_cd) ? "font-semibold" : ""}
                style={{ paddingLeft: `${12 + r.depth * 12}px` }}
              >
                {r.acct_nm}
              </TableCell>
              {years.map((y) => (
                <TableCell key={y} className="text-right tabular-nums">
                  {formatWon(r.amounts[y])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ no_req: string }>
}) {
  const { no_req } = await params
  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title={no_req} />
        <SetupNotice error="NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다. Vercel 배포라면 Project Settings → Environment Variables에 추가하세요." />
      </>
    )
  }
  const supabase = await createClient()

  const [reqRes, fsRes, analysisRes] = await Promise.all([
    supabase
      .from("rating_requests")
      .select("*")
      .eq("no_req", no_req)
      .maybeSingle<RatingRequest>(),
    supabase
      .from("financial_statements")
      .select("*")
      .eq("no_req", no_req)
      .order("acct_cd")
      .limit(2000)
      .returns<FinancialStatementRow[]>(),
    supabase
      .from("grade_analyses")
      .select("*")
      .eq("no_req", no_req)
      .maybeSingle<GradeAnalysis>(),
  ])

  if (reqRes.error || fsRes.error) {
    return (
      <>
        <PageHeader title={no_req} />
        <SetupNotice error={(reqRes.error ?? fsRes.error)!.message} />
      </>
    )
  }
  const req = reqRes.data
  if (!req) notFound()

  const fsRows = fsRes.data ?? []
  const years = [...new Set(fsRows.map((r) => fiscalYear(r.dm_fndend)))].sort()
  const bs = pivot(fsRows, "BS", years)
  const is = pivot(fsRows, "IS", years)

  const byCode = new Map([...bs, ...is].map((r) => [r.acct_cd, r]))
  const latest = years[years.length - 1]
  const prev = years.length > 1 ? years[years.length - 2] : null

  const chartData: KeyMetricRow[] = KEY_METRICS.map((m) => ({
    name: m.name,
    ...Object.fromEntries(
      years.map((y) => {
        const v = byCode.get(m.cd)?.amounts[y]
        return [y, v === null || v === undefined ? null : v / 1e8]
      })
    ),
  }))

  const riskFlags = computeRiskFlags(
    { get: (cd, year) => byCode.get(cd)?.amounts[year] ?? null },
    years
  )

  const agencies = [
    { label: "크레디뷰", charGrade: req.cv_char_grade, numGrade: req.cv_num_grade, base: formatYmd(req.cv_dm_base) },
    { label: "나이스", charGrade: req.n_char_grade, numGrade: req.n_num_grade, base: formatYmd(req.n_dm_base) },
    { label: "크레탑", charGrade: req.k_char_grade, numGrade: req.k_num_grade, base: formatYmd(req.k_dm_base) },
  ]

  return (
    <>
      <PageHeader title={`기업 상세 — ${no_req}`}>
        <Link
          href="/companies"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> 기업 목록
        </Link>
      </PageHeader>
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>평가기관 등급 비교</CardTitle>
            <CardDescription>
              3개 기관의 등급을 22노치 스케일(AAA→D) 위에서 비교합니다 · 평가 기준:{" "}
              {agencies
                .filter((a) => a.charGrade)
                .map((a) => `${a.label} ${a.base}`)
                .join(" · ")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RatingSpectrum agencies={agencies} />
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>신청일: {formatYmd(req.da_calc?.replaceAll("-", ""))}</span>
          <span>·</span>
          <span>등급 유형: {req.grade_type ?? "미산출"}</span>
          {req.fs_msg_error && (
            <>
              <span>·</span>
              <Badge variant="outline" className="font-normal">
                FS 오류 {req.fs_cd_error}
              </Badge>
            </>
          )}
        </div>

        {riskFlags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            <span className="text-xs font-medium text-destructive">
              위험 신호 {riskFlags.length}건 (재무제표 기준)
            </span>
            {riskFlags.map((f) => (
              <Badge key={f.code} variant="outline" className="border-destructive/40 font-normal text-destructive">
                {f.label}
              </Badge>
            ))}
          </div>
        )}

        {isLowGrade(req.cv_num_grade) && (
          <GradeAnalysisCard
            noReq={no_req}
            charGrade={req.cv_char_grade}
            initial={analysisRes.data ?? null}
            aiConfigured={Boolean(process.env.OPENAI_API_KEY)}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>주요 재무지표</CardTitle>
            <CardDescription>
              {prev ? `${prev}년 대비 ${latest}년` : `${latest}년`} 비교 (단위: 억원)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompanyFinancialChart data={chartData} years={years} />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          {KEY_METRICS.slice(3).map((m) => {
            const latestVal = byCode.get(m.cd)?.amounts[latest] ?? null
            const prevVal = prev ? (byCode.get(m.cd)?.amounts[prev] ?? null) : null
            let deltaText: string | null = null
            if (latestVal !== null && prevVal !== null && prevVal !== 0) {
              if (prevVal > 0 && latestVal < 0) deltaText = "적자 전환"
              else if (prevVal < 0 && latestVal >= 0) deltaText = "흑자 전환"
              else if (prevVal < 0 && latestVal < 0)
                deltaText = `적자 지속 (${latestVal < prevVal ? "확대" : "축소"})`
              else {
                const d = ((latestVal - prevVal) / Math.abs(prevVal)) * 100
                deltaText = `전년 대비 ${d > 0 ? "+" : ""}${d.toFixed(1)}%`
              }
            }
            return (
              <Card key={m.cd}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {m.name} ({latest}년)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatKRW(latestVal)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {deltaText ?? "전년 데이터 없음"}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>재무제표</CardTitle>
            <CardDescription>단위: 원</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="bs">
              <TabsList>
                <TabsTrigger value="bs">재무상태표 (BS)</TabsTrigger>
                <TabsTrigger value="is">손익계산서 (IS)</TabsTrigger>
              </TabsList>
              <TabsContent value="bs">
                <StatementTable rows={bs} years={years} />
              </TabsContent>
              <TabsContent value="is">
                <StatementTable rows={is} years={years} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
