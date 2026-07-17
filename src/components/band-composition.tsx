import { GRADE_BANDS, gradeBand } from "@/lib/grade"
import type { GradeDistributionRow } from "@/lib/types"

const AGENCY_LABELS: Record<string, string> = {
  crediview: "크레디뷰",
  nice: "나이스",
  cretop: "크레탑",
}

/** Per-agency 100% stacked band composition (투자적격/투기/부실위험). */
export function BandComposition({ rows }: { rows: GradeDistributionRow[] }) {
  const agencies = Object.keys(AGENCY_LABELS).map((agency) => {
    const bandCounts = { investment: 0, speculative: 0, risk: 0 }
    let total = 0
    for (const r of rows) {
      if (r.agency !== agency) continue
      const band = gradeBand(r.grade_order)
      if (!band) continue
      bandCounts[band.key] += r.cnt
      total += r.cnt
    }
    return { agency, total, bandCounts }
  })

  return (
    <div className="space-y-4">
      {agencies.map(({ agency, total, bandCounts }) => (
        <div key={agency} className="space-y-1">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">{AGENCY_LABELS[agency]}</span>
            <span className="tabular-nums text-muted-foreground">
              {total.toLocaleString()}건
            </span>
          </div>
          <div className="flex h-5 gap-0.5 overflow-hidden rounded-md">
            {GRADE_BANDS.map((b) => {
              const cnt = bandCounts[b.key]
              const pctNum = total ? (cnt / total) * 100 : 0
              return (
                <div
                  key={b.key}
                  className="flex items-center justify-center overflow-hidden text-[10px] font-medium text-white"
                  style={{ width: `${pctNum}%`, background: b.colorVar }}
                  title={`${b.label} ${cnt.toLocaleString()}건 (${pctNum.toFixed(1)}%)`}
                >
                  {pctNum >= 12 ? `${Math.round(pctNum)}%` : ""}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {GRADE_BANDS.map((b) => (
          <span key={b.key} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: b.colorVar }} />
            {b.label} ({b.range})
          </span>
        ))}
      </div>
    </div>
  )
}
