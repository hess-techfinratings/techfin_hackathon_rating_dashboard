"use client"

import { Search } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { GradeBadge } from "@/components/grade-badge"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fiscalYear, formatKRW } from "@/lib/format"
import { GRADE_BANDS, gradeBand } from "@/lib/grade"
import type { CompanySummary } from "@/lib/types"

export function CompaniesTable({ companies }: { companies: CompanySummary[] }) {
  const [query, setQuery] = useState("")
  const [band, setBand] = useState<string>("all")

  const filtered = useMemo(
    () =>
      companies.filter((c) => {
        if (query && !c.no_req.toLowerCase().includes(query.toLowerCase())) return false
        if (band !== "all" && gradeBand(c.cv_num_grade)?.key !== band) return false
        return true
      }),
    [companies, query, band]
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="신청번호 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-56 pl-8"
          />
        </div>
        <Select value={band} onValueChange={(v) => setBand(v ?? "all")}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 등급</SelectItem>
            {GRADE_BANDS.map((b) => (
              <SelectItem key={b.key} value={b.key}>
                {b.label} ({b.range})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {filtered.length} / {companies.length}개
        </span>
      </div>

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
            {filtered.map((c) => (
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
                <TableCell>
                  <GradeBadge charGrade={c.cv_char_grade} numGrade={c.cv_num_grade} />
                </TableCell>
                <TableCell>{c.n_char_grade ?? "–"}</TableCell>
                <TableCell>{c.k_char_grade ?? "–"}</TableCell>
                <TableCell>{fiscalYear(c.latest_fiscal_end)}년</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatKRW(c.total_assets)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatKRW(c.revenue)}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${
                    c.net_income !== null && Number(c.net_income) < 0
                      ? "text-destructive"
                      : ""
                  }`}
                >
                  {formatKRW(c.net_income)}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                  조건에 맞는 기업이 없습니다 — 검색어나 등급 필터를 바꿔 보세요.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
