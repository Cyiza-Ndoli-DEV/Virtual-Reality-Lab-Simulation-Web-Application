import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { quizFullInclude } from '@/lib/quiz'

type SubmitBody = {
  answers?: { questionId: string; selectedOptionId: string }[]
}

export async function POST(
  req: NextRequest,
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
      return NextResponse.json({ error: 'Quiz has no questions' }, { status: 400 })
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

    const body = (await req.json()) as SubmitBody
    if (!Array.isArray(body.answers)) {
      return NextResponse.json({ error: 'answers array required' }, { status: 400 })
    }

    const questionMap = new Map(quiz.quizQuestions.map((q) => [q.id, q]))
    const answerRows: {
      questionId: string
      selectedOptionId: string | null
      isCorrect: boolean
    }[] = []

    for (const q of quiz.quizQuestions) {
      const submitted = body.answers.find((a) => a.questionId === q.id)
      const selectedOptionId = submitted?.selectedOptionId ?? null
      let isCorrect = false

      if (selectedOptionId) {
        const option = q.options.find((o) => o.id === selectedOptionId)
        if (option) isCorrect = option.isCorrect
      }

      answerRows.push({ questionId: q.id, selectedOptionId, isCorrect })
    }

    const score = answerRows.reduce((sum, row, index) => {
      const q = questionMap.get(row.questionId)!
      return sum + (row.isCorrect ? q.points : 0)
    }, 0)

    const totalPoints = quiz.quizQuestions.reduce((sum, q) => sum + q.points, 0)
    const percentage =
      totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0
    const passed = percentage >= quiz.passMark

    const attempt = await prisma.quizAttempt.create({
      data: {
        studentId,
        quizId,
        score,
        totalPoints,
        percentage,
        passed,
        answers: body.answers,
        quizAnswers: {
          create: answerRows.map((row) => ({
            questionId: row.questionId,
            selectedOptionId: row.selectedOptionId,
            isCorrect: row.isCorrect,
          })),
        },
      },
      select: {
        id: true,
        score: true,
        totalPoints: true,
        percentage: true,
        passed: true,
        attemptedAt: true,
      },
    })

    return NextResponse.json({
      attempt: {
        ...attempt,
        attemptedAt: attempt.attemptedAt.toISOString(),
      },
      passMark: quiz.passMark,
    })
  } catch (e) {
    console.error('[POST .../quizzes/:quizId/submit]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
