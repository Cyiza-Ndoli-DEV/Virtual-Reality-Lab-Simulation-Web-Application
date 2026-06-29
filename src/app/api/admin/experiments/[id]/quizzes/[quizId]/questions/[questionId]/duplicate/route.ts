import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { assertQuizAccessible } from '@/lib/quiz-access'

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; quizId: string; questionId: string }> }
) {
  try {
    const session = await auth()
    const { quizId, questionId } = await ctx.params
    const access = await assertQuizAccessible(session, quizId)
    if (!access.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: access.status })
    }

    const source = await prisma.quizQuestion.findFirst({
      where: { id: questionId, quizId },
      include: { options: true },
    })
    if (!source) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const maxOrder = await prisma.quizQuestion.aggregate({
      where: { quizId },
      _max: { displayOrder: true },
    })
    const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1

    const question = await prisma.quizQuestion.create({
      data: {
        quizId,
        questionText: `${source.questionText} (copy)`,
        questionType: source.questionType,
        points: source.points,
        displayOrder,
        options: {
          create: source.options.map((o) => ({
            optionText: o.optionText,
            isCorrect: o.isCorrect,
          })),
        },
      },
      include: { options: { orderBy: { id: 'asc' } } },
    })

    return NextResponse.json({ question }, { status: 201 })
  } catch (e) {
    console.error('[POST .../questions/:questionId/duplicate]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
