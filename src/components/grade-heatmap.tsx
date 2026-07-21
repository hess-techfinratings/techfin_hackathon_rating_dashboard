"use client"

import { useState } from "react"

import { NOTCH_COUNT } from "@/lib/grade"

export interface HeatmapCell {
  x: number // 크레디뷰 notch (1=best)
  y: number // other-agency notch (1=best)
  cnt: number
}

const CELL = 16
const M = { top: 8, right: 8, bottom: 42, left: 52 }
const GRID = CELL * NOTCH_COUNT
const W = M.left + GRID + M.right
const H = M.top + GRID + M.bottom

/** Sequential fill: monotone mix of --chart-1 into the surface (theme-aware). */
function fill(cnt: number, max: number): string {
  const pct = 12 + 88 * Math.sqrt(cnt / max)
  return `color-mix(in oklab, var(--chart-1) ${pct.toFixed(1)}%, var(--background))`
}

const TICKS = [1, 8, 16, 22] // band edges: AAA · BBB+ (투자적격 끝) · B- · D

export function GradeHeatmap({
  cells,
  yAgency,
  xChars,
  yChars,
}: {
  cells: HeatmapCell[]
  yAgency: string
  xChars: Record<number, string>
  yChars: Record<number, string>
}) {
  const [hover, setHover] = useState<HeatmapCell | null>(null)
  const max = Math.max(1, ...cells.map((c) => c.cnt))
  const px = (notch: number) => M.left + (notch - 1) * CELL
  // y is flipped: best grade (notch 1, AAA) sits at the bottom
  const py = (notch: number) => M.top + (NOTCH_COUNT - notch) * CELL

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[440px]"
        role="img"
        aria-label={`크레디뷰와 ${yAgency}의 등급 조합별 건수 히트맵`}
      >
        {/* empty grid backdrop */}
        <rect
          x={M.left}
          y={M.top}
          width={GRID}
          height={GRID}
          className="fill-muted/30 stroke-border"
          strokeWidth={1}
        />
        {/* band boundary lines after notch 8 (BBB+) and 16 (B-) */}
        {[8, 16].map((n) => (
          <g key={n} className="stroke-border">
            <line x1={px(n + 1)} y1={M.top} x2={px(n + 1)} y2={M.top + GRID} strokeWidth={1} />
            <line x1={M.left} y1={py(n)} x2={M.left + GRID} y2={py(n)} strokeWidth={1} />
          </g>
        ))}
        {cells.map((c) => (
          <rect
            key={`${c.x}-${c.y}`}
            x={px(c.x) + 0.5}
            y={py(c.y) + 0.5}
            width={CELL - 1}
            height={CELL - 1}
            rx={2}
            style={{ fill: fill(c.cnt, max) }}
            onMouseEnter={() => setHover(c)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {/* agreement diagonal — drawn over the cells so it stays visible */}
        <line
          x1={px(1)}
          y1={M.top + GRID}
          x2={px(NOTCH_COUNT + 1)}
          y2={M.top}
          className="pointer-events-none stroke-muted-foreground/50"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {/* x ticks (크레디뷰) */}
        {TICKS.map((n) => (
          <text
            key={`x${n}`}
            x={px(n) + CELL / 2}
            y={M.top + GRID + 14}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px]"
          >
            {xChars[n] ?? n}
          </text>
        ))}
        <text
          x={M.left + GRID / 2}
          y={H - 6}
          textAnchor="middle"
          className="fill-muted-foreground text-[10px]"
        >
          크레디뷰 (AAA → D)
        </text>
        {/* y ticks (other agency) */}
        {TICKS.map((n) => (
          <text
            key={`y${n}`}
            x={M.left - 6}
            y={py(n) + CELL / 2 + 3}
            textAnchor="end"
            className="fill-muted-foreground text-[9px]"
          >
            {yChars[n] ?? n}
          </text>
        ))}
      </svg>

      {/* sequential legend */}
      <div className="mt-1 flex max-w-[440px] items-center gap-2 pl-[11.5%] text-[10px] text-muted-foreground">
        <span>1건</span>
        <div
          className="h-2 flex-1 rounded-sm"
          style={{
            background: `linear-gradient(to right, ${fill(1, max)}, ${fill(max * 0.25, max)}, ${fill(max, max)})`,
          }}
          aria-hidden
        />
        <span>{max.toLocaleString()}건</span>
      </div>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
          style={{
            left: `${((px(hover.x) + CELL) / W) * 100}%`,
            top: `${(py(hover.y) / H) * 100}%`,
          }}
        >
          <span className="font-medium">크레디뷰 {xChars[hover.x] ?? hover.x}</span>
          {" · "}
          <span className="font-medium">
            {yAgency} {yChars[hover.y] ?? hover.y}
          </span>
          <span className="ml-1.5 tabular-nums">{hover.cnt.toLocaleString()}건</span>
        </div>
      )}
    </div>
  )
}
