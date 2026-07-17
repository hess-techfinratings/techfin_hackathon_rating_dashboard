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
import type { GradeAnalysis } from "@/lib/analysis"

export function GradeAnalysisCard({
  noReq,
  charGrade,
  initial,
  aiConfigured,
}: {
  noReq: string
  charGrade: string | null
  initial: GradeAnalysis | null
  aiConfigured: boolean
}) {
  const [analysis, setAnalysis] = useState<GradeAnalysis | null>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate(force: boolean) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/analysis/${noReq}${force ? "?force=1" : ""}`, {
        method: "POST",
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `요청 실패 (${res.status})`)
      setAnalysis(body)
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 생성에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" />
          AI 등급 사유 분석
        </CardTitle>
        <CardDescription>
          {charGrade} 등급 산출 사유를 재무제표 기반으로 AI가 분석합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {analysis ? (
          <>
            <p className="text-sm leading-6 whitespace-pre-wrap">{analysis.analysis}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {analysis.model} · {new Date(analysis.created_at).toLocaleString("ko-KR")}
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
            OPENAI_API_KEY 환경변수가 설정되지 않아 분석을 생성할 수 없습니다.
          </p>
        ) : (
          <Button onClick={() => generate(false)} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> 분석 생성 중… (최대 1분)
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> AI 분석 생성
              </>
            )}
          </Button>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
