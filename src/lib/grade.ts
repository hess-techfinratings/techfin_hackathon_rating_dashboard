/**
 * Grade band semantics (크레디뷰 22-notch scale, num 1=AAA … 22=D).
 * Band colors reuse categorical chart slots so bands stay consistent
 * across every chart, badge, and the rating spectrum.
 */
export type GradeBand = "investment" | "speculative" | "risk"

export const GRADE_BANDS: {
  key: GradeBand
  label: string
  range: string
  min: number
  max: number
  colorVar: string
}[] = [
  { key: "investment", label: "투자적격", range: "AAA~BBB-", min: 1, max: 10, colorVar: "var(--chart-1)" },
  { key: "speculative", label: "투기등급", range: "BB+~B-", min: 11, max: 16, colorVar: "var(--chart-3)" },
  { key: "risk", label: "부실위험", range: "CCC+~D", min: 17, max: 22, colorVar: "var(--chart-6)" },
]

export function gradeBand(numGrade: number | null | undefined) {
  if (numGrade === null || numGrade === undefined) return null
  return GRADE_BANDS.find((b) => numGrade >= b.min && numGrade <= b.max) ?? null
}

/** Total notches on the scale (1..22). */
export const NOTCH_COUNT = 22
