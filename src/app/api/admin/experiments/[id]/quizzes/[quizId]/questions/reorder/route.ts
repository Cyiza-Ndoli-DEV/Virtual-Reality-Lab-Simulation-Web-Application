import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { assertQuizAccessible } from '@/lib/quiz-access'
import { parseReorder } from '@/lib/quiz'

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
    const questionIds = parseReorder(body)
    if (!questionIds) {
      return NextResponse.json({ error: 'questionIds array required' }, { status: 400 })
    }

    const existing = await prisma.quizQuestion.findMany({
      where: { quizId },
      select: { id: true },
    })
    if (existing.length !== questionIds.length) {
      return NextResponse.json({ error: 'Question list mismatch' }, { status: 400 })
    }
    const idSet = new Set(existing.map((q) => q.id))
    if (questionIds.some((id) => !idSet.has(id))) {
      return NextResponse.json({ error: 'Invalid question id in list' }, { status: 400 })
    }

    await prisma.$transaction(
      questionIds.map((id, index) =>
        prisma.quizQuestion.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[POST .../questions/reorder]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
