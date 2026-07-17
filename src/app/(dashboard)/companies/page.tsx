import Link from "next/link"

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
import { fiscalYear, formatKRW } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import type { CompanySummary } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function CompaniesPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("v_companies")
    .select("*")
    .order("total_assets", { ascending: false, nullsFirst: false })
    .returns<CompanySummary[]>()

  if (error) {
    return (
      <>
        <PageHeader title="Companies" />
        <SetupNotice error={error.message} />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Companies" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>재무제표 보유 기업 ({data?.length ?? 0})</CardTitle>
            <CardDescription>
              BS/IS 데이터가 있는 평가 신청 건 — 행을 클릭하면 재무 상세로 이동합니다. 금액은 최근 회계연도 기준.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>신청번호</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>크레디뷰</TableHead>
                    <TableHead>나이스</TableHead>
                    <TableHead>크레탑</TableHead>
                    <TableHead>회계연도</TableHead>
                    <TableHead className="text-right">자산총계</TableHead>
                    <TableHead className="text-right">매출액</TableHead>
                    <TableHead className="text-right">당기순이익</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data ?? []).map((c) => (
                    <TableRow key={c.no_req}>
                      <TableCell className="font-mono text-xs">
                        <Link
                          href={`/companies/${c.no_req}`}
                          className="font-medium hover:underline"
                        >
                          {c.no_req}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {c.grade_type ? (
                          <Badge variant="secondary">{c.grade_type}</Badge>
                        ) : (
                          <Badge variant="outline">미산출</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{c.cv_char_grade ?? "–"}</TableCell>
                      <TableCell>{c.n_char_grade ?? "–"}</TableCell>
                      <TableCell>{c.k_char_grade ?? "–"}</TableCell>
                      <TableCell>{fiscalYear(c.latest_fiscal_end)}년</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatKRW(c.total_assets)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatKRW(c.revenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatKRW(c.net_income)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
