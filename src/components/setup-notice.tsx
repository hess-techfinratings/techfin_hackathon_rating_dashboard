import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function SetupNotice({ error }: { error: string }) {
  return (
    <div className="p-6">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>데이터베이스 설정이 필요합니다</CardTitle>
          <CardDescription>Supabase에서 데이터를 불러오지 못했습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="rounded-md bg-muted p-3 font-mono text-xs">{error}</p>
          <p>
            테이블이 아직 없다면 <code className="font-mono">.env.local</code>에{" "}
            <code className="font-mono">SUPABASE_DB_URL</code>을 추가한 뒤 아래 명령으로
            스키마 생성과 데이터 임포트를 실행하세요:
          </p>
          <p className="rounded-md bg-muted p-3 font-mono text-xs">
            node scripts/setup-db.mjs
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
