import { gradeBand } from "@/lib/grade"
import { cn } from "@/lib/utils"

/**
 * Grade text with a band-colored dot. Text stays in ink tokens — the dot
 * alone carries band identity (color is never the only channel: the grade
 * letters themselves encode the band).
 */
export function GradeBadge({
  charGrade,
  numGrade,
  className,
}: {
  charGrade: string | null
  numGrade: number | null
  className?: string
}) {
  if (!charGrade) return <span className="text-muted-foreground">–</span>
  const band = gradeBand(numGrade)
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium", className)}>
      {band && (
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: band.colorVar }}
          aria-hidden
        />
      )}
      {charGrade}
    </span>
  )
}
