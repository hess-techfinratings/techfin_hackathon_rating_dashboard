"use client"

import { Loader2, RefreshCw, Sparkles } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { WeeklySummary } from "@/lib/analysis"
import type { WeeklyStats } from "@/lib/types"

function delta(cur: number, prev: number): string {
  const diff = cur - prev
  const sign = diff >= 0 ? "+" : ""
  const pct = prev ? ` (${sign}${Math.round((diff / prev) * 1000) / 10}%)` : ""
  return `${sign}${diff.toLocaleString()}건${pct}`
}

export function WeeklySummaryCard({
  stats,
  initial,
  aiConfigured,
}: {
  stats: WeeklyStats
  initial: WeeklySummary | null
  aiConfigured: boolean
}) {
  const [summary, setSummary] = useState<WeeklySummary | null>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate(force: boolean) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/weekly-summary${force ? "?force=1" : ""}`, {
        method: "POST",
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `요청 실패 (${res.status})`)
      setSummary(body)
    } catch (e) {
      setError(e instanceof Error ? e.message : "요약 생성에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const items = [
    { label: "평가 신청", cur: stats.this_week, prev: stats.prev_week },
    {
      label: "등급 정상 산출",
      cur: stats.this_week - stats.this_week_ungraded,
      prev: stats.prev_week - stats.prev_week_ungraded,
    },
    { label: "미산출", cur: stats.this_week_ungraded, prev: stats.prev_week_ungraded },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" />
          주간 변화 요약
        </CardTitle>
        <CardDescription>
          최근 1주(일~토, {stats.week_start.slice(5)}~{stats.week_end.slice(5)}) 전주 대비 증감과 AI 코멘트
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {items.map((it) => (
            <div key={it.label}>
              <p className="text-xs text-muted-foreground">{it.label}</p>
              <div className="text-xl font-semibold tabular-nums">
                {it.cur.toLocaleString()}건
              </div>
              <p className="text-xs tabular-nums text-muted-foreground">
                전주 {it.prev.toLocaleString()}건 대비 {delta(it.cur, it.prev)}
              </p>
            </div>
          ))}
        </div>

        {summary ? (
          <>
            <p className="text-sm leading-6 whitespace-pre-wrap">{summary.summary}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {summary.model} · {new Date(summary.created_at).toLocaleString("ko-KR")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => generate(true)}
                disabled={loading || !aiConfigured}
              >
                {loading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RefreshCw className="size-3" />
                )}
                재생성
              </Button>
            </div>
          </>
        ) : !aiConfigured ? (
          <p className="text-sm text-muted-foreground">
            OPENAI_API_KEY 환경변수가 설정되지 않아 AI 코멘트를 생성할 수 없습니다.
          </p>
        ) : (
          <Button onClick={() => generate(false)} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> 코멘트 생성 중… (최대 1분)
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> AI 코멘트 생성
              </>
            )}
          </Button>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
