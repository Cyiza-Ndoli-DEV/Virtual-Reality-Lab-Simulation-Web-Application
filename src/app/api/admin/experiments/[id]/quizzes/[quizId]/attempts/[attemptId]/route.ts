import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { assertQuizAccessible } from '@/lib/quiz-access'
import type { QuizAttemptDetailDto } from '@/lib/quiz'
import {
  experimentGradeLimits,
  loadStudentExperimentGradeBreakdown,
  marksFromQuizPercentage,
  resolveQuizAttemptMarks,
} from '@/lib/experiment-grading'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; quizId: string; attemptId: string }> }
) {
  try {
    const session = await auth()
    const { quizId, attemptId } = await ctx.params
    const access = await assertQuizAccessible(session, quizId)
    if (!access.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: access.status })
    }

    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, quizId },
      include: {
        student: { select: { id: true, name: true } },
        quiz: {
          select: {
            experimentId: true,
            experiment: {
              select: {
                gradeQuizMax: true,
                quizzes: { where: { isPublished: true }, select: { id: true } },
              },
            },
          },
        },
        quizAnswers: {
          include: {
            question: { include: { options: true } },
            selectedOption: true,
          },
        },
      },
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    const limits = experimentGradeLimits(attempt.quiz.experiment)
    const publishedQuizCount = attempt.quiz.experiment.quizzes.length
    const { marksAwarded, marksMax } = resolveQuizAttemptMarks({
      percentage: attempt.percentage,
      marksAwarded: attempt.marksAwarded,
      marksMax: attempt.marksMax,
      experimentQuizMax: limits.gradeQuizMax,
      publishedQuizCount,
    })
    const gradeBreakdown = await loadStudentExperimentGradeBreakdown(
      attempt.studentId,
      attempt.quiz.experimentId
    )

    const detail: QuizAttemptDetailDto & {
      marksAwarded: number
      marksMax: number
      suggestedMarks: number
      gradeBreakdown: typeof gradeBreakdown
    } = {
      id: attempt.id,
      studentId: attempt.studentId,
      studentName: attempt.student.name,
      score: attempt.score,
      totalPoints: attempt.totalPoints,
      percentage: attempt.percentage,
      passed: attempt.passed,
      attemptedAt: attempt.attemptedAt.toISOString(),
      marksAwarded,
      marksMax,
      suggestedMarks: marksFromQuizPercentage(attempt.percentage, marksMax),
      gradeBreakdown,
      answers: attempt.quizAnswers.map((a) => {
        const correct = a.question.options.find((o) => o.isCorrect)
        return {
          questionId: a.questionId,
          questionText: a.question.questionText,
          questionType: a.question.questionType,
          points: a.question.points,
          selectedOptionId: a.selectedOptionId,
          selectedOptionText: a.selectedOption?.optionText ?? null,
          correctOptionText: correct?.optionText ?? null,
          isCorrect: a.isCorrect,
        }
      }),
    }

    return NextResponse.json(detail)
  } catch (e) {
    console.error('[GET .../attempts/:attemptId]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; quizId: string; attemptId: string }> }
) {
  return NextResponse.json(
    {
      error:
        'Quiz marks are calculated automatically when students submit. Edit report marks instead.',
    },
    { status: 405 }
  )
}
