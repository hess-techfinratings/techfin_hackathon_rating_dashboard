/**
 * Rule-based risk flags (필터링 사유), derived deterministically from the
 * financial statements — same rule family as the legacy report's FS filter
 * codes (F01~F04 등). Complements the AI narrative with auditable rules.
 */

export interface RiskFlag {
  code: string
  label: string
}

interface YearAmounts {
  get: (acctCd: string, year: string) => number | null
}

const CD = {
  단기차입금: "111519",
  유동부채: "116000",
  부채총계: "118000",
  자본금: "118100",
  자본총계: "118900",
  매출액: "121000",
  당기순이익: "129000",
}

export function computeRiskFlags(
  { get }: YearAmounts,
  years: string[]
): RiskFlag[] {
  const flags: RiskFlag[] = []
  const latest = years[years.length - 1]
  const prev = years.length > 1 ? years[years.length - 2] : null

  const equity = get(CD.자본총계, latest)
  const capital = get(CD.자본금, latest)
  if (equity !== null && equity < 0) {
    flags.push({ code: "F01", label: "완전자본잠식 (자본총계 음수)" })
  } else if (equity !== null && capital !== null && capital > 0 && equity < capital) {
    flags.push({ code: "F01-P", label: "부분자본잠식 (자본총계 < 자본금)" })
  }

  const niLatest = get(CD.당기순이익, latest)
  const niPrev = prev ? get(CD.당기순이익, prev) : null
  if (niLatest !== null && niPrev !== null && niLatest < 0 && niPrev < 0) {
    flags.push({ code: "F02", label: "2년 연속 당기순손실" })
  }

  const debt = get(CD.부채총계, latest)
  const shortTermBorrowing = get(CD.단기차입금, latest)
  if (
    debt !== null && debt > 0 &&
    shortTermBorrowing !== null && shortTermBorrowing / debt > 0.5
  ) {
    flags.push({ code: "F03", label: "단기차입금이 부채총계의 50% 초과" })
  }

  const revLatest = get(CD.매출액, latest)
  const revPrev = prev ? get(CD.매출액, prev) : null
  if (revLatest !== null && revPrev !== null && revPrev > 0 && revLatest < revPrev * 0.4) {
    flags.push({ code: "F04", label: "전년 대비 매출액 60% 이상 감소" })
  }

  return flags
}
