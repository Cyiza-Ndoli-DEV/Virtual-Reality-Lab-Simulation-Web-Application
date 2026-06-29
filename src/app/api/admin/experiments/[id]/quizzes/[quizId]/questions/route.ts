import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { assertQuizAccessible } from '@/lib/quiz-access'
import { parseQuestionInput, quizFullInclude } from '@/lib/quiz'

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

    const questions = await prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { displayOrder: 'asc' },
      include: { options: { orderBy: { id: 'asc' } } },
    })

    return NextResponse.json({ questions })
  } catch (e) {
    console.error('[GET .../questions]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; quizId: string }> }
) {
  try {
    const session = await auth()
    const { quizId } = await ctx.params
    const access = await assertQuizAccessible(session, quizId)
    if (!access.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: access.status })
    }

    const body = await req.json()
    const parsed = parseQuestionInput(body)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid question payload' }, { status: 400 })
    }

    const maxOrder = await prisma.quizQuestion.aggregate({
      where: { quizId },
      _max: { displayOrder: true },
    })
    const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1

    const question = await prisma.quizQuestion.create({
      data: {
        quizId,
        questionText: parsed.questionText,
        questionType: parsed.questionType,
        points: parsed.points,
        displayOrder,
        options: {
          create: parsed.options.map((o) => ({
            optionText: o.optionText,
            isCorrect: o.isCorrect,
          })),
        },
      },
      include: { options: { orderBy: { id: 'asc' } } },
    })

    return NextResponse.json({ question }, { status: 201 })
  } catch (e) {
    console.error('[POST .../questions]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
