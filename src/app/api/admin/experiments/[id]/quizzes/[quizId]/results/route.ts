import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { assertQuizAccessible } from '@/lib/quiz-access'
import { computeQuizStats, type QuizAttemptListItem } from '@/lib/quiz'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; quizId: string }> }
) {
  try {
    const session = await auth()
    const { quizId } = await ctx.params
    const access = await assertQuizAccessible(session, quizId)
    if (!access.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: access.status })
    }

    const [quiz, attempts] = await Promise.all([
      prisma.quiz.findUnique({
        where: { id: quizId },
        select: { id: true, title: true, passMark: true },
      }),
      prisma.quizAttempt.findMany({
        where: { quizId },
        orderBy: { attemptedAt: 'desc' },
        include: {
          student: { select: { id: true, name: true } },
        },
      }),
    ])

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const stats = computeQuizStats(attempts)
    const rows: QuizAttemptListItem[] = attempts.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      studentName: a.student.name,
      score: a.score,
      totalPoints: a.totalPoints,
      percentage: a.percentage,
      passed: a.passed,
      attemptedAt: a.attemptedAt.toISOString(),
    }))

    return NextResponse.json({
      quiz: { id: quiz.id, title: quiz.title, passMark: quiz.passMark },
      stats,
      attempts: rows,
    })
  } catch (e) {
    console.error('[GET .../results]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
