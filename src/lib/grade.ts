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
  { key: "investment", label: "투자적격", range: "AAA~BBB+", min: 1, max: 8, colorVar: "var(--chart-1)" },
  { key: "speculative", label: "투기등급", range: "BBB~B-", min: 9, max: 16, colorVar: "var(--chart-3)" },
  { key: "risk", label: "부실위험", range: "CCC+~D", min: 17, max: 22, colorVar: "var(--chart-6)" },
]

export function gradeBand(numGrade: number | null | undefined) {
  if (numGrade === null || numGrade === undefined) return null
  return GRADE_BANDS.find((b) => numGrade >= b.min && numGrade <= b.max) ?? null
}

/** Total notches on the scale (1..22). */
export const NOTCH_COUNT = 22

/**
 * Canonical letter per notch (크레디뷰-style). Used as a fallback label when an
 * agency has no observed grade at a notch (agency spellings differ, e.g. 나이스 BBB0).
 */
export const NOTCH_CHARS: Record<number, string> = {
  1: "AAA", 2: "AA+", 3: "AA", 4: "AA-", 5: "A+", 6: "A", 7: "A-",
  8: "BBB+", 9: "BBB", 10: "BBB-", 11: "BB+", 12: "BB", 13: "BB-",
  14: "B+", 15: "B", 16: "B-", 17: "CCC+", 18: "CCC", 19: "CCC-",
  20: "CC", 21: "C", 22: "D",
}
