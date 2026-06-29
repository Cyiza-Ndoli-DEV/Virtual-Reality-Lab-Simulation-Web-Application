import prisma from '@/lib/prisma'

export const DEFAULT_GRADE_QUIZ_MAX = 30
export const DEFAULT_GRADE_QUESTIONNAIRE_MAX = 35
export const DEFAULT_GRADE_REPORT_MAX = 35

export type GradeComponentKey = 'quiz' | 'questionnaire' | 'report'

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
  gradeQuestionnaireMax: number
  gradeReportMax: number
}

export function experimentGradeLimits(experiment: {
  gradeQuizMax?: number | null
  gradeQuestionnaireMax?: number | null
  gradeReportMax?: number | null
}): ExperimentGradeLimits {
  return {
    gradeQuizMax: experiment.gradeQuizMax ?? DEFAULT_GRADE_QUIZ_MAX,
    gradeQuestionnaireMax:
      experiment.gradeQuestionnaireMax ?? DEFAULT_GRADE_QUESTIONNAIRE_MAX,
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

export function computeFinalGrade(input: {
  hasQuiz: boolean
  hasQuestionnaire: boolean
  hasReport: boolean
  limits: ExperimentGradeLimits
  quizAwarded: number | null
  quizGraded: boolean
  questionnaireAwarded: number | null
  questionnaireGraded: boolean
  reportAwarded: number | null
  reportGraded: boolean
}): FinalGradeBreakdown {
  const components: GradeComponent[] = []

  if (input.hasQuiz) {
    components.push({
      key: 'quiz',
      label: 'Quiz',
      awarded: input.quizGraded ? input.quizAwarded : null,
      max: input.limits.gradeQuizMax,
      graded: input.quizGraded,
    })
  }

  if (input.hasQuestionnaire) {
    components.push({
      key: 'questionnaire',
      label: 'Questionnaire',
      awarded: input.questionnaireGraded ? input.questionnaireAwarded : null,
      max: input.limits.gradeQuestionnaireMax,
      graded: input.questionnaireGraded,
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
      gradeQuestionnaireMax: true,
      gradeReportMax: true,
      questionnaire: { select: { id: true } },
      reportAssignment: { select: { id: true } },
      quizzes: {
        where: { isPublished: true },
        select: {
          id: true,
          attempts: {
            where: { studentId },
            select: { marksAwarded: true, marksMax: true },
          },
        },
      },
    },
  })

  if (!experiment) return null

  const limits = experimentGradeLimits(experiment)
  const hasQuiz = experiment.quizzes.length > 0
  const hasQuestionnaire = Boolean(experiment.questionnaire)
  const hasReport = Boolean(experiment.reportAssignment)

  const quizAttempts = experiment.quizzes.flatMap((quiz) => quiz.attempts)
  const quizzesWithAttempts = experiment.quizzes.filter((quiz) => quiz.attempts.length > 0)
  const gradedQuizAttempts = quizAttempts.filter(
    (attempt) => attempt.marksAwarded !== null
  )
  const quizGraded =
    quizzesWithAttempts.length > 0 &&
    quizzesWithAttempts.every((quiz) =>
      quiz.attempts.some((attempt) => attempt.marksAwarded !== null)
    )
  const quizAwarded = quizGraded
    ? gradedQuizAttempts.reduce((sum, attempt) => sum + (attempt.marksAwarded ?? 0), 0)
    : gradedQuizAttempts.length > 0
      ? gradedQuizAttempts.reduce((sum, attempt) => sum + (attempt.marksAwarded ?? 0), 0)
      : null

  let questionnaireAwarded: number | null = null
  let questionnaireGraded = false
  if (hasQuestionnaire && experiment.questionnaire) {
    const submission = await prisma.questionnaireSubmission.findUnique({
      where: {
        studentId_questionnaireId: {
          studentId,
          questionnaireId: experiment.questionnaire.id,
        },
      },
      select: { marksAwarded: true },
    })
    questionnaireGraded = submission?.marksAwarded !== null
    questionnaireAwarded = submission?.marksAwarded ?? null
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
    hasQuestionnaire,
    hasReport,
    limits,
    quizAwarded,
    quizGraded,
    questionnaireAwarded,
    questionnaireGraded,
    reportAwarded,
    reportGraded,
  })
}
