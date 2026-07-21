import { NextResponse } from "next/server"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import type { WeeklyStats } from "@/lib/types"

export const maxDuration = 60

interface WindowRow {
  da_calc: string
  cv_char_grade: string | null
  mis_cd_error: string | null
  fs_cd_error: string | null
}

function shiftDate(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function topCodes(rows: WindowRow[], key: "mis_cd_error" | "fs_cd_error"): Map<string, number> {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const code = r[key]
    if (code) counts.set(code, (counts.get(code) ?? 0) + 1)
  }
  return new Map([...counts.entries()].sort((a, b) => b[1] - a[1]))
}

function describeWindow(label: string, rows: WindowRow[]): string {
  const graded = rows.filter((r) => r.cv_char_grade !== null).length
  // mis_cd_error / fs_cd_error hold the 미산출 사유 text itself
  const reasonLine = (key: "mis_cd_error" | "fs_cd_error") =>
    [...topCodes(rows, key).entries()]
      .slice(0, 4)
      .map(([reason, cnt]) => `${reason} ${cnt}건`)
      .join(", ") || "없음"
  return [
    `[${label}] 신청 ${rows.length}건, 등급 산출 ${graded}건, 미산출 ${rows.length - graded}건`,
    `  MIS 미산출 사유: ${reasonLine("mis_cd_error")}`,
    `  FS 미산출 사유: ${reasonLine("fs_cd_error")}`,
  ].join("\n")
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 503 })
  }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY가 설정되지 않았습니다." }, { status: 503 })
  }

  const force = new URL(request.url).searchParams.get("force") === "1"
  const supabase = await createClient()

  const { data: stats, error: statsError } = await supabase
    .from("v_weekly_stats")
    .select("*")
    .single<WeeklyStats>()
  if (statsError || !stats) {
    return NextResponse.json({ error: statsError?.message ?? "주간 통계가 없습니다." }, { status: 500 })
  }

  if (!force) {
    const { data: cached } = await supabase
      .from("weekly_summaries")
      .select("*")
      .eq("week_end", stats.week_end)
      .maybeSingle()
    if (cached) return NextResponse.json(cached)
  }

  const prevStart = shiftDate(stats.week_start, -7)
  const { data: rows, error: rowsError } = await supabase
    .from("rating_requests")
    .select("da_calc, cv_char_grade, mis_cd_error, fs_cd_error")
    .gte("da_calc", prevStart)
    .lte("da_calc", stats.week_end)
    .returns<WindowRow[]>()
  if (rowsError || !rows?.length) {
    return NextResponse.json({ error: rowsError?.message ?? "비교할 주간 데이터가 없습니다." }, { status: 500 })
  }

  const thisRows = rows.filter((r) => r.da_calc >= stats.week_start)
  const prevRows = rows.filter((r) => r.da_calc < stats.week_start)

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini"
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content:
            "당신은 신용평가 운영 리포트를 작성하는 애널리스트입니다. 제공된 주간 집계 수치에만 근거하여 전주 대비 변화를 한국어로 간결하게 설명합니다. 제공되지 않은 수치·원인·사실을 추측하거나 지어내지 마세요. 데이터로 확인되지 않는 원인은 '데이터상 확인 불가'로 표현하세요.",
        },
        {
          role: "user",
          content: `최근 1주와 전주의 평가 신청 데이터를 비교해, 무엇이 어떻게 달라졌는지 짧은 주간 코멘트를 작성해 주세요.

${describeWindow(`최근 1주 ${stats.week_start}~${stats.week_end}`, thisRows)}
${describeWindow(`전주 ${prevStart}~${shiftDate(stats.week_start, -1)}`, prevRows)}

작성 형식:
1) 핵심 변화 요약 1~2문장 (신청량·산출률 증감 % 포함)
2) 미산출 사유 변화 불릿 2~3개 (증감을 이끈 사유와 건수 명시, 불릿은 "- " 사용)
전체 400자 이내, 평문 텍스트로만 작성 (마크다운 헤더 금지).`,
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  })

  if (!openaiRes.ok) {
    const detail = await openaiRes.text()
    return NextResponse.json(
      { error: `OpenAI API 오류 (${openaiRes.status}): ${detail.slice(0, 300)}` },
      { status: 502 }
    )
  }

  const completion = await openaiRes.json()
  const summary: string | undefined = completion.choices?.[0]?.message?.content?.trim()
  if (!summary) {
    return NextResponse.json({ error: "OpenAI 응답이 비어 있습니다." }, { status: 502 })
  }

  const record = {
    week_end: stats.week_end,
    model,
    summary,
    created_at: new Date().toISOString(),
  }
  const { error: upsertError } = await supabase.from("weekly_summaries").upsert(record)
  if (upsertError) {
    // Summary still succeeded — return it even if caching failed.
    console.error("weekly_summaries upsert failed:", upsertError.message)
  }

  return NextResponse.json(record)
}
