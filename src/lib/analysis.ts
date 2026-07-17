/**
 * AI grade-reason analysis: eligibility and shared types.
 *
 * "낮은 등급" = 크레디뷰 숫자등급 17 이상 (CCC+ · CCC · CCC- · CC · C · D —
 * C계열 등급 이하). Adjust LOW_GRADE_THRESHOLD to widen/narrow the target set.
 */
export const LOW_GRADE_THRESHOLD = 17

export function isLowGrade(numGrade: number | null | undefined): boolean {
  return numGrade !== null && numGrade !== undefined && numGrade >= LOW_GRADE_THRESHOLD
}

export interface GradeAnalysis {
  no_req: string
  model: string
  analysis: string
  created_at: string
}
