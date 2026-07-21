import type { SupabaseClient } from "@supabase/supabase-js"

export interface DateRange {
  from: string | null
  to: string | null
}

const YMD = /^\d{4}-\d{2}-\d{2}$/

function pick(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value
  return v && YMD.test(v) ? v : null
}

export function parseDateRange(searchParams: {
  [key: string]: string | string[] | undefined
}): DateRange {
  const from = pick(searchParams.from)
  const to = pick(searchParams.to)
  // Swapped bounds would silently return empty aggregates — normalize instead.
  if (from && to && from > to) return { from: to, to: from }
  return { from, to }
}

export function rangeLabel(range: DateRange): string {
  if (!range.from && !range.to) return "전체 기간"
  return `${range.from ?? "…"} ~ ${range.to ?? "…"}`
}

/** Sunday of the week containing ymd — for filtering week-bucketed views. */
export function weekStartOf(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() - date.getUTCDay())
  return date.toISOString().slice(0, 10)
}

/** min/max da_calc of the dataset — anchors the calendar and preset buttons. */
export async function getDateBounds(
  supabase: SupabaseClient
): Promise<{ min: string; max: string } | null> {
  const [minRes, maxRes] = await Promise.all([
    supabase
      .from("rating_requests")
      .select("da_calc")
      .order("da_calc", { ascending: true })
      .limit(1)
      .maybeSingle<{ da_calc: string }>(),
    supabase
      .from("rating_requests")
      .select("da_calc")
      .order("da_calc", { ascending: false })
      .limit(1)
      .maybeSingle<{ da_calc: string }>(),
  ])
  if (!minRes.data || !maxRes.data) return null
  return { min: minRes.data.da_calc, max: maxRes.data.da_calc }
}
