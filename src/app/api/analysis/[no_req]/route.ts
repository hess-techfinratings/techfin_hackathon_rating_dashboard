import { NextResponse } from "next/server"

import { isLowGrade } from "@/lib/analysis"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import type { FinancialStatementRow, RatingRequest } from "@/lib/types"

export const maxDuration = 60

const KEY_METRICS = [
  { cd: "115000", name: "자산총계" },
  { cd: "118000", name: "부채총계" },
  { cd: "118900", name: "자본총계" },
  { cd: "121000", name: "매출액" },
  { cd: "125000", name: "영업이익" },
  { cd: "129000", name: "당기순이익" },
]

function pct(n: number | null): string {
  return n === null ? "산출불가" : `${n.toFixed(1)}%`
}
function eok(v: number | null): string {
  return v === null ? "N/A" : `${(v / 1e8).toFixed(1)}억원`
}
function ratio(num: number | null, den: number | null): number | null {
  return num !== null && den !== null && den !== 0 ? (num / den) * 100 : null
}

function buildFinancialSummary(rows: FinancialStatementRow[]): string {
  const years = [...new Set(rows.map((r) => r.dm_fndend?.slice(0, 4) ?? ""))]
    .filter(Boolean)
    .sort()
  const get = (cd: string, year: string): number | null => {
    const row = rows.find(
      (r) => r.acct_cd === cd && r.dm_fndend?.startsWith(year)
    )
    return row?.amt === null || row?.amt === undefined ? null : Number(row.amt)
  }

  const lines: string[] = []
  for (const year of years) {
    const m = Object.fromEntries(
      KEY_METRICS.map(({ cd, name }) => [name, get(cd, year)])
    )
    lines.push(
      `[${year}년] ` +
        KEY_METRICS.map(({ name }) => `${name} ${eok(m[name])}`).join(", ")
    )
    lines.push(
      `  → 부채비율 ${pct(ratio(m["부채총계"], m["자본총계"]))}, ` +
        `영업이익률 ${pct(ratio(m["영업이익"], m["매출액"]))}, ` +
        `순이익률 ${pct(ratio(m["당기순이익"], m["매출액"]))}` +
        (m["자본총계"] !== null && m["자본총계"] < 0 ? " ⚠ 완전자본잠식" : "")
    )
  }
  if (years.length === 2) {
    const [prev, latest] = years
    const growth = (cd: string) => {
      const p = get(cd, prev)
      const l = get(cd, latest)
      return p !== null && l !== null && p !== 0
        ? `${(((l - p) / Math.abs(p)) * 100).toFixed(1)}%`
        : "산출불가"
    }
    lines.push(
      `[증감 ${prev}→${latest}] 매출액 ${growth("121000")}, 자산총계 ${growth("115000")}, 자본총계 ${growth("118900")}`
    )
  }
  return lines.join("\n")
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ no_req: string }> }
) {
  const { no_req } = await params

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 503 })
  }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY가 설정되지 않았습니다." }, { status: 503 })
  }

  const force = new URL(request.url).searchParams.get("force") === "1"
  const supabase = await createClient()

  const { data: req } = await supabase
    .from("rating_requests")
    .select("no_req, cv_num_grade, cv_char_grade, cv_dm_base, grade_type")
    .eq("no_req", no_req)
    .maybeSingle<RatingRequest>()
  if (!req) {
    return NextResponse.json({ error: "존재하지 않는 신청번호입니다." }, { status: 404 })
  }
  if (!isLowGrade(req.cv_num_grade)) {
    return NextResponse.json({ error: "분석 대상 등급(C계열 이하)이 아닙니다." }, { status: 400 })
  }

  if (!force) {
    const { data: cached } = await supabase
      .from("grade_analyses")
      .select("*")
      .eq("no_req", no_req)
      .maybeSingle()
    if (cached) return NextResponse.json(cached)
  }

  const { data: fsRows } = await supabase
    .from("financial_statements")
    .select("acct_cd, acct_nm, amt, dm_fndend, fn_data_gb")
    .eq("no_req", no_req)
    .returns<FinancialStatementRow[]>()
  if (!fsRows?.length) {
    return NextResponse.json({ error: "재무제표 데이터가 없어 분석할 수 없습니다." }, { status: 400 })
  }

  const financialSummary = buildFinancialSummary(fsRows)
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
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content:
            "당신은 기업 신용평가 애널리스트입니다. 제공된 재무제표 수치에만 근거하여, 기업의 신용등급이 낮게 산출된 사유를 한국어로 간결하게 설명합니다. 제공되지 않은 수치나 사실을 지어내지 마세요.",
        },
        {
          role: "user",
          content: `다음 기업의 신용등급이 낮게 산출된 사유를 재무제표 관점에서 분석해 주세요.

신용등급: ${req.cv_char_grade} (평가 기준년월 ${req.cv_dm_base ?? "미상"}, 등급유형 ${req.grade_type ?? "미상"})

재무 현황:
${financialSummary}

작성 형식:
1) 핵심 요약 1~2문장
2) 주요 사유 3~5개 불릿 (각 불릿에 근거 수치 명시)
3) 개선 모니터링 포인트 1~2개
전체 600자 이내, 평문 텍스트로만 작성 (마크다운 헤더 금지, 불릿은 "- " 사용).`,
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
  const analysis: string | undefined = completion.choices?.[0]?.message?.content?.trim()
  if (!analysis) {
    return NextResponse.json({ error: "OpenAI 응답이 비어 있습니다." }, { status: 502 })
  }

  const record = {
    no_req,
    model,
    analysis,
    created_at: new Date().toISOString(),
  }
  const { error: upsertError } = await supabase.from("grade_analyses").upsert(record)
  if (upsertError) {
    // Analysis still succeeded — return it even if caching failed.
    console.error("grade_analyses upsert failed:", upsertError.message)
  }

  return NextResponse.json(record)
}
