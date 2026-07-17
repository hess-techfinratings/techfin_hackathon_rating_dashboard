/** 1234567890 → "12.3억", 6553263 → "655만", smaller → comma string. */
export function formatKRW(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "–"
  const v = typeof value === "string" ? Number(value) : value
  if (!Number.isFinite(v)) return "–"
  const abs = Math.abs(v)
  if (abs >= 1e8) {
    return `${(v / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억`
  }
  if (abs >= 1e4) {
    return `${Math.round(v / 1e4).toLocaleString("ko-KR")}만`
  }
  return v.toLocaleString("ko-KR")
}

/** Full amount with thousand separators (원 단위). */
export function formatWon(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "–"
  const v = typeof value === "string" ? Number(value) : value
  if (!Number.isFinite(v)) return "–"
  return v.toLocaleString("ko-KR")
}

/** "20251231" → "2025-12-31", "202512" → "2025-12" */
export function formatYmd(value: string | null | undefined): string {
  if (!value) return "–"
  if (/^\d{8}$/.test(value))
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
  if (/^\d{6}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4, 6)}`
  return value
}

/** "20241231" → "2024" (fiscal year label) */
export function fiscalYear(dmFndend: string | null | undefined): string {
  return dmFndend?.slice(0, 4) ?? "–"
}
