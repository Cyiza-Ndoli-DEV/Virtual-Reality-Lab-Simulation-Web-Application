export type LetterGradeBand = {
  min: number
  letter: string
  gradePoint: number
  interpretation: string
}

/** Institutional letter-grade scale (percent → letter, GPA point, interpretation). */
export const LETTER_GRADE_BANDS: readonly LetterGradeBand[] = [
  { min: 90, letter: 'A+', gradePoint: 5, interpretation: 'Exceptional' },
  { min: 80, letter: 'A', gradePoint: 5, interpretation: 'Excellent' },
  { min: 75, letter: 'B+', gradePoint: 4.5, interpretation: 'Very Good' },
  { min: 70, letter: 'B', gradePoint: 4, interpretation: 'Good' },
  { min: 65, letter: 'C+', gradePoint: 3.5, interpretation: 'Fairly Good' },
  { min: 60, letter: 'C', gradePoint: 3, interpretation: 'Fair' },
  { min: 55, letter: 'D+', gradePoint: 2.5, interpretation: 'Pass' },
  { min: 50, letter: 'D', gradePoint: 2, interpretation: 'Marginal Pass' },
  { min: 45, letter: 'E', gradePoint: 1.5, interpretation: 'Marginal Fail' },
  { min: 40, letter: 'E-', gradePoint: 1, interpretation: 'Clear Fail' },
  { min: 0, letter: 'F', gradePoint: 0, interpretation: 'Bad Fail' },
] as const

export type LetterGradeInfo = {
  letter: string
  gradePoint: number
  interpretation: string
  percent: number
}

export function letterGradeFromPercent(percent: number): LetterGradeInfo {
  const rounded = Math.round(Math.max(0, Math.min(100, percent)))
  const band =
    LETTER_GRADE_BANDS.find((entry) => rounded >= entry.min) ??
    LETTER_GRADE_BANDS[LETTER_GRADE_BANDS.length - 1]

  return {
    letter: band.letter,
    gradePoint: band.gradePoint,
    interpretation: band.interpretation,
    percent: rounded,
  }
}

/** Display label e.g. `C+ (65%)`. */
export function percentToGradeLabel(percent: number): string {
  const { letter, percent: rounded } = letterGradeFromPercent(percent)
  return `${letter} (${rounded}%)`
}
