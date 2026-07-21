import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

import { DateRangeFilter } from "@/components/date-range-filter"
import { GradeBadge } from "@/components/grade-badge"
import { PageHeader } from "@/components/page-header"
import { RequestsFilters } from "@/components/requests-filters"
import { SetupNotice } from "@/components/setup-notice"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { getDateBounds, parseDateRange } from "@/lib/date-range"
import { GRADE_TYPE_OPTIONS } from "@/lib/request-filters"
import { formatYmd } from "@/lib/format"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import type { ErrorCodeRow, RequestListRow } from "@/lib/types"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 50

function first(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value
  return v ?? null
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="평가 신청 목록" />
        <SetupNotice error="NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다." />
      </>
    )
  }
  const supabase = await createClient()
  const params = await searchParams
  const range = parseDateRange(params)
  const gradeKey = first(params.grade)
  const errorKey = first(params.error)
  const page = Math.max(1, Number(first(params.page)) || 1)

  let query = supabase
    .from("rating_requests")
    .select(
      "no_req, da_calc, grade_type, cv_char_grade, cv_num_grade, n_char_grade, n_num_grade, k_char_grade, k_num_grade, mis_cd_error, fs_cd_error",
      { count: "exact" }
    )
  if (range.from) query = query.gte("da_calc", range.from)
  if (range.to) query = query.lte("da_calc", range.to)

  const gradeOption = GRADE_TYPE_OPTIONS.find((o) => o.key === gradeKey)
  if (gradeOption) {
    query = gradeOption.value
      ? query.eq("grade_type", gradeOption.value)
      : query.is("grade_type", null)
  }

  const [errorSystem, errorCode] = errorKey?.match(/^(MIS|FS):(.+)$/)?.slice(1) ?? []
  if (errorSystem && errorCode) {
    query = query.eq(errorSystem === "MIS" ? "mis_cd_error" : "fs_cd_error", errorCode)
  }

  const offset = (page - 1) * PAGE_SIZE
  const [listRes, codesRes, bounds] = await Promise.all([
    query
      .order("da_calc", { ascending: false })
      .order("no_req", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    supabase.from("v_error_codes").select("system, code").order("cnt", { ascending: false }),
    getDateBounds(supabase),
  ])

  const firstError = listRes.error ?? codesRes.error
  if (firstError) {
    return (
      <>
        <PageHeader title="평가 신청 목록" />
        <SetupNotice error={firstError.message} />
      </>
    )
  }

  const rows = (listRes.data ?? []) as RequestListRow[]
  const total = listRes.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageHref = (p: number) => {
    const next = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      const val = first(v)
      if (val && k !== "page") next.set(k, val)
    }
    if (p > 1) next.set("page", String(p))
    return next.size ? `/requests?${next}` : "/requests"
  }

  return (
    <>
      <PageHeader title="평가 신청 목록" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          {bounds && <DateRangeFilter min={bounds.min} max={bounds.max} />}
          <RequestsFilters
            errorCodes={(codesRes.data ?? []) as Pick<ErrorCodeRow, "system" | "code">[]}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>평가 신청 {total.toLocaleString()}건</CardTitle>
            <CardDescription>
              최신순 · 페이지 {page.toLocaleString()} / {totalPages.toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>신청번호</TableHead>
                  <TableHead>일자</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>크레디뷰</TableHead>
                  <TableHead>나이스</TableHead>
                  <TableHead>크레탑</TableHead>
                  <TableHead>오류코드</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.no_req}>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/companies/${r.no_req}`} className="hover:underline">
                        {r.no_req}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatYmd(r.da_calc?.replaceAll("-", ""))}
                    </TableCell>
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
                    <TableCell>
                      <GradeBadge charGrade={r.n_char_grade} numGrade={r.n_num_grade} />
                    </TableCell>
                    <TableCell>
                      <GradeBadge charGrade={r.k_char_grade} numGrade={r.k_num_grade} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {[r.mis_cd_error, r.fs_cd_error].filter(Boolean).join(" · ") || "–"}
                    </TableCell>
                  </TableRow>
                ))}
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      조건에 맞는 신청이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={page <= 1}
                  render={page > 1 ? <Link href={pageHref(page - 1)} /> : undefined}
                >
                  <ChevronLeft className="size-4" /> 이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={page >= totalPages}
                  render={page < totalPages ? <Link href={pageHref(page + 1)} /> : undefined}
                >
                  다음 <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  )
}
