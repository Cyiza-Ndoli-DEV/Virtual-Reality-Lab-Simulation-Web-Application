import type { QuizQuestionType } from '@prisma/client'

export type QuizOptionInput = {
  id?: string
  optionText: string
  isCorrect: boolean
}

export type QuizQuestionInput = {
  id?: string
  questionText: string
  questionType: QuizQuestionType
  points: number
  displayOrder: number
  options: QuizOptionInput[]
}

export type QuizFormInput = {
  title: string
  description?: string
  passMark: number
  timeLimit?: number | null
  attemptsAllowed?: number
  shuffleQuestions?: boolean
  isPublished?: boolean
}

export type QuizListItem = {
  id: string
  title: string
  description: string
  passMark: number
  timeLimit: number | null
  attemptsAllowed: number
  shuffleQuestions: boolean
  isPublished: boolean
  questionCount: number
  createdAt: string
  updatedAt: string
}

export type QuizQuestionDto = {
  id: string
  questionText: string
  questionType: QuizQuestionType
  points: number
  displayOrder: number
  options: {
    id: string
    optionText: string
    isCorrect: boolean
  }[]
}

export type QuizDetailDto = QuizListItem & {
  experimentId: string
  experimentTitle: string
  questions: QuizQuestionDto[]
}

export type QuizStatsDto = {
  totalAttempts: number
  averageScore: number
  highestScore: number
  lowestScore: number
  passRate: number
}

export type QuizAttemptListItem = {
  id: string
  studentId: string
  studentName: string
  score: number
  totalPoints: number
  percentage: number
  passed: boolean
  attemptedAt: string
}

export type QuizAttemptDetailDto = QuizAttemptListItem & {
  answers: {
    questionId: string
    questionText: string
    questionType: QuizQuestionType
    points: number
    selectedOptionId: string | null
    selectedOptionText: string | null
    correctOptionText: string | null
    isCorrect: boolean
  }[]
}

export function parseQuizForm(body: unknown): QuizFormInput | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>

  const title = typeof b.title === 'string' ? b.title.trim() : ''
  if (!title) return null

  const passMarkRaw = b.passMark
  const passMark =
    typeof passMarkRaw === 'number'
      ? passMarkRaw
      : typeof passMarkRaw === 'string'
        ? Number(passMarkRaw)
        : NaN
  if (!Number.isFinite(passMark) || passMark < 0 || passMark > 100) return null

  const description =
    typeof b.description === 'string' ? b.description.trim() : ''

  let timeLimit: number | null = null
  if (b.timeLimit !== undefined && b.timeLimit !== null && b.timeLimit !== '') {
    const tl =
      typeof b.timeLimit === 'number'
        ? b.timeLimit
        : typeof b.timeLimit === 'string'
          ? Number(b.timeLimit)
          : NaN
    if (!Number.isFinite(tl) || tl <= 0) return null
    timeLimit = Math.round(tl)
  }

  let attemptsAllowed = 1
  if (b.attemptsAllowed !== undefined) {
    const aa =
      typeof b.attemptsAllowed === 'number'
        ? b.attemptsAllowed
        : typeof b.attemptsAllowed === 'string'
          ? Number(b.attemptsAllowed)
          : NaN
    if (!Number.isFinite(aa) || aa < 1) return null
    attemptsAllowed = Math.round(aa)
  }

  return {
    title,
    description,
    passMark: Math.round(passMark),
    timeLimit,
    attemptsAllowed,
    shuffleQuestions: Boolean(b.shuffleQuestions),
    isPublished: Boolean(b.isPublished),
  }
}

export function parseQuestionInput(body: unknown): Omit<QuizQuestionInput, 'displayOrder'> | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>

  const questionText = typeof b.questionText === 'string' ? b.questionText.trim() : ''
  if (!questionText) return null

  const questionType =
    b.questionType === 'MCQ' || b.questionType === 'TRUE_FALSE'
      ? b.questionType
      : null
  if (!questionType) return null

  const pointsRaw = b.points
  const points =
    pointsRaw === undefined
      ? 1
      : typeof pointsRaw === 'number'
        ? pointsRaw
        : typeof pointsRaw === 'string'
          ? Number(pointsRaw)
          : NaN
  if (!Number.isFinite(points) || points < 1) return null

  if (!Array.isArray(b.options)) return null
  const options: QuizOptionInput[] = []
  for (const raw of b.options) {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const optionText = typeof o.optionText === 'string' ? o.optionText.trim() : ''
    if (!optionText) return null
    options.push({
      id: typeof o.id === 'string' ? o.id : undefined,
      optionText,
      isCorrect: Boolean(o.isCorrect),
    })
  }

  const minOptions = questionType === 'MCQ' ? 4 : 2
  const maxOptions = questionType === 'MCQ' ? 4 : 2
  if (options.length < minOptions || options.length > maxOptions) return null

  const correctCount = options.filter((o) => o.isCorrect).length
  if (correctCount !== 1) return null

  return {
    questionText,
    questionType,
    points: Math.round(points),
    options,
  }
}

export function parseReorder(body: unknown): string[] | null {
  if (!body || typeof body !== 'object') return null
  const ids = (body as Record<string, unknown>).questionIds
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) return null
  return ids as string[]
}

export function computeQuizStats(
  attempts: { percentage: number; passed: boolean }[]
): QuizStatsDto {
  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: 0,
    }
  }

  const percentages = attempts.map((a) => a.percentage)
  const passedCount = attempts.filter((a) => a.passed).length

  return {
    totalAttempts: attempts.length,
    averageScore: Math.round(
      percentages.reduce((sum, p) => sum + p, 0) / percentages.length
    ),
    highestScore: Math.max(...percentages),
    lowestScore: Math.min(...percentages),
    passRate: Math.round((passedCount / attempts.length) * 100),
  }
}

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export const quizQuestionInclude = {
  options: { orderBy: { id: 'asc' as const } },
} as const

export const quizFullInclude = {
  quizQuestions: {
    orderBy: { displayOrder: 'asc' as const },
    include: quizQuestionInclude,
  },
} as const

type QuizWithQuestions = {
  id: string
  experimentId: string
  title: string
  description: string
  passMark: number
  timeLimit: number | null
  attemptsAllowed: number
  shuffleQuestions: boolean
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
  quizQuestions: {
    id: string
    questionText: string
    questionType: QuizQuestionType
    points: number
    displayOrder: number
    options: { id: string; optionText: string; isCorrect: boolean }[]
  }[]
}

export function serializeQuizListItem(
  quiz: Omit<QuizWithQuestions, 'quizQuestions'> & { _count?: { quizQuestions: number }; quizQuestions?: unknown[] }
): QuizListItem {
  const questionCount =
    quiz._count?.quizQuestions ??
    (Array.isArray(quiz.quizQuestions) ? quiz.quizQuestions.length : 0)

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    passMark: quiz.passMark,
    timeLimit: quiz.timeLimit,
    attemptsAllowed: quiz.attemptsAllowed,
    shuffleQuestions: quiz.shuffleQuestions,
    isPublished: quiz.isPublished,
    questionCount,
    createdAt: quiz.createdAt.toISOString(),
    updatedAt: quiz.updatedAt.toISOString(),
  }
}

export function serializeQuizDetail(
  quiz: QuizWithQuestions,
  experimentTitle: string
): QuizDetailDto {
  return {
    ...serializeQuizListItem(quiz),
    experimentId: quiz.experimentId,
    experimentTitle,
    questions: quiz.quizQuestions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      points: q.points,
      displayOrder: q.displayOrder,
      options: q.options.map((o) => ({
        id: o.id,
        optionText: o.optionText,
        isCorrect: o.isCorrect,
      })),
    })),
  }
}

export type StudentQuizSummary = QuizListItem & {
  attemptsUsed: number
  latestAttempt: {
    percentage: number
    passed: boolean
    attemptedAt: string
  } | null
  canAttempt: boolean
}

export function serializeStudentQuizSummary(
  quiz: Omit<QuizWithQuestions, 'quizQuestions'> & {
    _count?: { quizQuestions: number }
    quizQuestions?: unknown[]
    attempts: {
      percentage: number
      passed: boolean
      attemptedAt: Date
    }[]
  }
): StudentQuizSummary {
  const attemptsUsed = quiz.attempts.length
  const latest = quiz.attempts[0]
  return {
    ...serializeQuizListItem(quiz),
    attemptsUsed,
    latestAttempt: latest
      ? {
          percentage: latest.percentage,
          passed: latest.passed,
          attemptedAt: latest.attemptedAt.toISOString(),
        }
      : null,
    canAttempt: attemptsUsed < quiz.attemptsAllowed,
  }
}

export function serializeStudentQuiz(
  quiz: QuizWithQuestions,
  revealAnswers: boolean
) {
  const questions = quiz.quizQuestions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    questionType: q.questionType,
    points: q.points,
    displayOrder: q.displayOrder,
    options: q.options.map((o) => ({
      id: o.id,
      optionText: o.optionText,
      ...(revealAnswers ? { isCorrect: o.isCorrect } : {}),
    })),
  }))

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    passMark: quiz.passMark,
    timeLimit: quiz.timeLimit,
    attemptsAllowed: quiz.attemptsAllowed,
    shuffleQuestions: quiz.shuffleQuestions,
    questions,
  }
}
