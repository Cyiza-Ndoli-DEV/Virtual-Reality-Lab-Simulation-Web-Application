import prisma from '@/lib/prisma'

export const DEFAULT_GRADE_QUIZ_MAX = 30
export const DEFAULT_GRADE_REPORT_MAX = 70

export type GradeComponentKey = 'quiz' | 'report'

export type GradeComponent = {
  key: GradeComponentKey
  label: string
  awarded: number | null
  max: number
  graded: boolean
}

export type FinalGradeBreakdown = {
  components: GradeComponent[]
  totalAwarded: number
  totalMax: number
  gradedMax: number
  percentage: number | null
  isComplete: boolean
}

export type ExperimentGradeLimits = {
  gradeQuizMax: number
  gradeReportMax: number
}

export function experimentGradeLimits(experiment: {
  gradeQuizMax?: number | null
  gradeReportMax?: number | null
}): ExperimentGradeLimits {
  return {
    gradeQuizMax: experiment.gradeQuizMax ?? DEFAULT_GRADE_QUIZ_MAX,
    gradeReportMax: experiment.gradeReportMax ?? DEFAULT_GRADE_REPORT_MAX,
  }
}

export function parseMarksAwarded(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null
  return n
}

export function validateMarksAwarded(awarded: number, max: number): string | null {
  if (awarded < 0) return 'Marks cannot be negative'
  if (awarded > max) return `Marks cannot exceed ${max}`
  return null
}

export function marksFromQuizPercentage(percentage: number, max: number): number {
  const clamped = Math.max(0, Math.min(100, percentage))
  return Math.round((clamped / 100) * max)
}

export function quizMarksMaxPerAttempt(
  experimentQuizMax: number,
  publishedQuizCount: number
): number {
  if (publishedQuizCount <= 0) return experimentQuizMax
  return Math.max(1, Math.round(experimentQuizMax / publishedQuizCount))
}

/** Marks for a quiz attempt — uses stored value or derives from percentage. */
export function resolveQuizAttemptMarks(input: {
  percentage: number
  marksAwarded: number | null
  marksMax: number | null
  experimentQuizMax: number
  publishedQuizCount: number
}): { marksAwarded: number; marksMax: number } {
  const marksMax =
    input.marksMax ??
    quizMarksMaxPerAttempt(input.experimentQuizMax, input.publishedQuizCount)
  const marksAwarded =
    input.marksAwarded ?? marksFromQuizPercentage(input.percentage, marksMax)
  return { marksAwarded, marksMax }
}

export function computeFinalGrade(input: {
  hasQuiz: boolean
  hasReport: boolean
  limits: ExperimentGradeLimits
  quizAwarded: number | null
  quizGraded: boolean
  reportAwarded: number | null
  reportGraded: boolean
}): FinalGradeBreakdown {
  const components: GradeComponent[] = []

  if (input.hasQuiz) {
    components.push({
      key: 'quiz',
      label: 'Quiz (auto-scored)',
      awarded: input.quizGraded ? input.quizAwarded : null,
      max: input.limits.gradeQuizMax,
      graded: input.quizGraded,
    })
  }

  if (input.hasReport) {
    components.push({
      key: 'report',
      label: 'Written report',
      awarded: input.reportGraded ? input.reportAwarded : null,
      max: input.limits.gradeReportMax,
      graded: input.reportGraded,
    })
  }

  const totalMax = components.reduce((sum, c) => sum + c.max, 0)
  const gradedComponents = components.filter((c) => c.graded)
  const gradedMax = gradedComponents.reduce((sum, c) => sum + c.max, 0)
  const totalAwarded = gradedComponents.reduce(
    (sum, c) => sum + (c.awarded ?? 0),
    0
  )
  const isComplete =
    components.length > 0 && components.every((component) => component.graded)
  const percentage =
    isComplete && totalMax > 0
      ? Math.round((totalAwarded / totalMax) * 100)
      : gradedMax > 0
        ? Math.round((totalAwarded / gradedMax) * 100)
        : null

  return {
    components,
    totalAwarded,
    totalMax,
    gradedMax,
    percentage,
    isComplete,
  }
}

export async function loadStudentExperimentGradeBreakdown(
  studentId: string,
  experimentId: string
): Promise<FinalGradeBreakdown | null> {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    select: {
      gradeQuizMax: true,
      gradeReportMax: true,
      reportAssignment: { select: { id: true } },
      quizzes: {
        where: { isPublished: true },
        select: {
          id: true,
          attempts: {
            where: { studentId },
            orderBy: { attemptedAt: 'desc' },
            take: 1,
            select: {
              marksAwarded: true,
              marksMax: true,
              percentage: true,
            },
          },
        },
      },
    },
  })

  if (!experiment) return null

  const limits = experimentGradeLimits(experiment)
  const hasQuiz = experiment.quizzes.length > 0
  const hasReport = Boolean(experiment.reportAssignment)
  const publishedQuizCount = experiment.quizzes.length

  let quizAwarded: number | null = null
  let quizGraded = false
  if (hasQuiz) {
    const latestAttempts = experiment.quizzes
      .map((quiz) => quiz.attempts[0])
      .filter((attempt): attempt is NonNullable<typeof attempt> => Boolean(attempt))

    quizGraded =
      latestAttempts.length === publishedQuizCount && publishedQuizCount > 0

    if (quizGraded) {
      quizAwarded = latestAttempts.reduce((sum, attempt) => {
        const { marksAwarded } = resolveQuizAttemptMarks({
          percentage: attempt.percentage,
          marksAwarded: attempt.marksAwarded,
          marksMax: attempt.marksMax,
          experimentQuizMax: limits.gradeQuizMax,
          publishedQuizCount,
        })
        return sum + marksAwarded
      }, 0)
    } else if (latestAttempts.length > 0) {
      quizAwarded = latestAttempts.reduce((sum, attempt) => {
        const { marksAwarded } = resolveQuizAttemptMarks({
          percentage: attempt.percentage,
          marksAwarded: attempt.marksAwarded,
          marksMax: attempt.marksMax,
          experimentQuizMax: limits.gradeQuizMax,
          publishedQuizCount,
        })
        return sum + marksAwarded
      }, 0)
    }
  }

  let reportAwarded: number | null = null
  let reportGraded = false
  if (hasReport) {
    const report = await prisma.report.findUnique({
      where: { studentId_experimentId: { studentId, experimentId } },
      select: { marksAwarded: true },
    })
    reportGraded = report?.marksAwarded !== null
    reportAwarded = report?.marksAwarded ?? null
  }

  return computeFinalGrade({
    hasQuiz,
    hasReport,
    limits,
    quizAwarded,
    quizGraded,
    reportAwarded,
    reportGraded,
  })
}
