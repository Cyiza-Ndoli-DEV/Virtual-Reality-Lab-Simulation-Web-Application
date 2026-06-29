import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { quizFullInclude, serializeStudentQuiz, shuffleArray } from '@/lib/quiz'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; quizId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user.canAccessStudent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: experimentId, quizId } = await ctx.params
    const studentId = session.user.id

    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, experimentId, isPublished: true },
      include: quizFullInclude,
    })

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    if (quiz.quizQuestions.length === 0) {
      return NextResponse.json({ error: 'Quiz has no questions' }, { status: 404 })
    }

    const attemptCount = await prisma.quizAttempt.count({
      where: { quizId, studentId },
    })
    if (attemptCount >= quiz.attemptsAllowed) {
      return NextResponse.json(
        { error: 'Maximum attempts reached for this quiz' },
        { status: 403 }
      )
    }

    let payload = serializeStudentQuiz(quiz, false)
    if (quiz.shuffleQuestions) {
      payload = {
        ...payload,
        questions: shuffleArray(payload.questions),
      }
    }

    return NextResponse.json({
      quiz: payload,
      attemptsUsed: attemptCount,
      attemptsAllowed: quiz.attemptsAllowed,
    })
  } catch (e) {
    console.error('[GET /api/student/experiments/:id/quizzes/:quizId]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
