import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { assertQuizAccessible } from '@/lib/quiz-access'
import type { QuizAttemptDetailDto } from '@/lib/quiz'
import {
  experimentGradeLimits,
  loadStudentExperimentGradeBreakdown,
  marksFromQuizPercentage,
  parseMarksAwarded,
  quizMarksMaxPerAttempt,
  validateMarksAwarded,
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
    const marksMax =
      attempt.marksMax ??
      quizMarksMaxPerAttempt(
        limits.gradeQuizMax,
        attempt.quiz.experiment.quizzes.length
      )
    const gradeBreakdown = await loadStudentExperimentGradeBreakdown(
      attempt.studentId,
      attempt.quiz.experimentId
    )

    const detail: QuizAttemptDetailDto & {
      marksAwarded: number | null
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
      marksAwarded: attempt.marksAwarded,
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
  req: NextRequest,
  ctx: { params: Promise<{ id: string; quizId: string; attemptId: string }> }
) {
  try {
    const session = await auth()
    const { quizId, attemptId } = await ctx.params
    const access = await assertQuizAccessible(session, quizId)
    if (!access.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: access.status })
    }

    const body = await req.json()
    const marksRaw = body.marksAwarded
    const useSuggested = body.useSuggestedMarks === true

    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, quizId },
      include: {
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
      },
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    const limits = experimentGradeLimits(attempt.quiz.experiment)
    const marksMax = quizMarksMaxPerAttempt(
      limits.gradeQuizMax,
      attempt.quiz.experiment.quizzes.length
    )

    let marksAwarded: number | null = null
    if (useSuggested) {
      marksAwarded = marksFromQuizPercentage(attempt.percentage, marksMax)
    } else if (marksRaw !== undefined) {
      marksAwarded = parseMarksAwarded(marksRaw)
      if (marksRaw !== null && marksAwarded === null) {
        return NextResponse.json({ error: 'Invalid marksAwarded' }, { status: 400 })
      }
      if (marksAwarded !== null) {
        const markError = validateMarksAwarded(marksAwarded, marksMax)
        if (markError) {
          return NextResponse.json({ error: markError }, { status: 400 })
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Provide marksAwarded or useSuggestedMarks' },
        { status: 400 }
      )
    }

    const updated = await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        marksAwarded,
        marksMax,
        marksAwardedAt: marksAwarded !== null ? new Date() : null,
        marksAwardedById: marksAwarded !== null ? session!.user!.id : null,
      },
    })

    const gradeBreakdown = await loadStudentExperimentGradeBreakdown(
      updated.studentId,
      attempt.quiz.experimentId
    )

    return NextResponse.json({
      id: updated.id,
      marksAwarded: updated.marksAwarded,
      marksMax: updated.marksMax,
      gradeBreakdown,
    })
  } catch (e) {
    console.error('[PATCH .../attempts/:attemptId]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
