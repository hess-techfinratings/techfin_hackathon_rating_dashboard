import { CompaniesTable } from "@/components/companies-table"
import { PageHeader } from "@/components/page-header"
import { SetupNotice } from "@/components/setup-notice"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import type { CompanySummary } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function CompaniesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Companies" />
        <SetupNotice error="NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다. Vercel 배포라면 Project Settings → Environment Variables에 추가하세요." />
      </>
    )
  }
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
            <CompaniesTable companies={data ?? []} />
          </CardContent>
        </Card>
      </main>
    </>
  )
}
