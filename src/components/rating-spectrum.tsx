import { GRADE_BANDS, gradeBand, NOTCH_COUNT } from "@/lib/grade"

interface AgencyGrade {
  label: string
  charGrade: string | null
  numGrade: number | null
}

/**
 * The 22-notch rating scale (AAA→D) with each agency's grade as a marker.
 * All rows share one axis, so cross-agency disagreement is visible as
 * horizontal offset between markers.
 */
export function RatingSpectrum({ agencies }: { agencies: AgencyGrade[] }) {
  return (
    <div className="space-y-1.5">
      {agencies.map((a) => (
        <div key={a.label} className="grid grid-cols-[72px_1fr_56px] items-center gap-3">
          <span className="text-xs text-muted-foreground">{a.label}</span>
          <div className="relative flex h-2.5 overflow-visible rounded-full">
            {GRADE_BANDS.map((b) => (
              <div
                key={b.key}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${((b.max - b.min + 1) / NOTCH_COUNT) * 100}%`,
                  background: b.colorVar,
                  opacity: a.numGrade === null ? 0.08 : 0.18,
                }}
              />
            ))}
            {a.numGrade !== null && (
              <span
                className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
                style={{
                  left: `${((a.numGrade - 0.5) / NOTCH_COUNT) * 100}%`,
                  background: gradeBand(a.numGrade)?.colorVar,
                }}
                aria-hidden
              />
            )}
          </div>
          <span className="text-right text-sm font-semibold tabular-nums">
            {a.charGrade ?? "–"}
          </span>
        </div>
      ))}
      <div className="grid grid-cols-[72px_1fr_56px] gap-3 pt-1">
        <span />
        <div className="flex text-[10px] leading-4 text-muted-foreground">
          {GRADE_BANDS.map((b) => (
            <span
              key={b.key}
              className="border-l border-border pl-1 first:border-l-0 first:pl-0"
              style={{ width: `${((b.max - b.min + 1) / NOTCH_COUNT) * 100}%` }}
            >
              {b.label} <span className="hidden sm:inline">({b.range})</span>
            </span>
          ))}
        </div>
        <span />
      </div>
    </div>
  )
}
