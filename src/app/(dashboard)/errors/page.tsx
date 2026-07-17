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
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import type { ErrorCodeRow } from "@/lib/types"

export const dynamic = "force-dynamic"

function ErrorTable({ rows }: { rows: ErrorCodeRow[] }) {
  const max = rows[0]?.cnt ?? 1
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">코드</TableHead>
          <TableHead>사유</TableHead>
          <TableHead className="w-[40%]">건수</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={`${r.system}-${r.code}`}>
            <TableCell className="font-mono text-xs">{r.code}</TableCell>
            <TableCell className="max-w-[320px] truncate text-sm" title={r.sample_msg ?? ""}>
              {(r.sample_msg ?? "–").split("\n")[0].slice(0, 80)}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div
                  className="h-4 min-w-1 rounded-sm"
                  style={{
                    width: `${(r.cnt / max) * 100}%`,
                    background: "var(--chart-1)",
                  }}
                  aria-hidden
                />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {r.cnt.toLocaleString()}
                </span>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default async function ErrorsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="미산출 분석" />
        <SetupNotice error="NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다." />
      </>
    )
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("v_error_codes")
    .select("*")
    .order("cnt", { ascending: false })
    .returns<ErrorCodeRow[]>()

  if (error) {
    return (
      <>
        <PageHeader title="미산출 분석" />
        <SetupNotice error={error.message} />
      </>
    )
  }

  const rows = data ?? []
  const systems = [
    { key: "MIS" as const, title: "MIS 산출불가 사유", desc: "경영정보등급(MIS) 오류코드별 건수" },
    { key: "FS" as const, title: "FS 산출불가 사유", desc: "재무등급(FS) 오류코드별 건수" },
  ]

  return (
    <>
      <PageHeader title="미산출 분석" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {systems.map((s) => {
            const total = rows
              .filter((r) => r.system === s.key)
              .reduce((sum, r) => sum + r.cnt, 0)
            return (
              <Card key={s.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {s.key} 오류 발생 건수
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold tabular-nums">
                    {total.toLocaleString()}건
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {rows.filter((r) => r.system === s.key).length}개 오류코드
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {systems.map((s) => (
          <Card key={s.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {s.title} <Badge variant="secondary">{s.key}</Badge>
              </CardTitle>
              <CardDescription>{s.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorTable rows={rows.filter((r) => r.system === s.key)} />
            </CardContent>
          </Card>
        ))}
      </main>
    </>
  )
}
