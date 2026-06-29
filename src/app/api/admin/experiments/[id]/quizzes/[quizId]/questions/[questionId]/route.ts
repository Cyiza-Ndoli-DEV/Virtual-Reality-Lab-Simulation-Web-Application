import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { assertQuizAccessible } from '@/lib/quiz-access'
import { parseQuestionInput } from '@/lib/quiz'

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; quizId: string; questionId: string }> }
) {
  try {
    const session = await auth()
    const { quizId, questionId } = await ctx.params
    const access = await assertQuizAccessible(session, quizId)
    if (!access.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: access.status })
    }

    const existing = await prisma.quizQuestion.findFirst({
      where: { id: questionId, quizId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = parseQuestionInput(body)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid question payload' }, { status: 400 })
    }

    const question = await prisma.$transaction(async (tx) => {
      await tx.quizOption.deleteMany({ where: { questionId } })
      return tx.quizQuestion.update({
        where: { id: questionId },
        data: {
          questionText: parsed.questionText,
          questionType: parsed.questionType,
          points: parsed.points,
          options: {
            create: parsed.options.map((o) => ({
              optionText: o.optionText,
              isCorrect: o.isCorrect,
            })),
          },
        },
        include: { options: { orderBy: { id: 'asc' } } },
      })
    })

    return NextResponse.json({ question })
  } catch (e) {
    console.error('[PATCH .../questions/:questionId]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    const existing = await prisma.quizQuestion.findFirst({
      where: { id: questionId, quizId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.quizQuestion.delete({ where: { id: questionId } })
      const remaining = await tx.quizQuestion.findMany({
        where: { quizId },
        orderBy: { displayOrder: 'asc' },
      })
      await Promise.all(
        remaining.map((q, index) =>
          tx.quizQuestion.update({
            where: { id: q.id },
            data: { displayOrder: index },
          })
        )
      )
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE .../questions/:questionId]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
