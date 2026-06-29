import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { serializeQuizListItem } from '@/lib/quiz'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user.canAccessStudent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: experimentId } = await ctx.params

    const quizzes = await prisma.quiz.findMany({
      where: { experimentId, isPublished: true },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { quizQuestions: true } } },
    })

    return NextResponse.json({
      quizzes: quizzes.map((q) => serializeQuizListItem(q)),
    })
  } catch (e) {
    console.error('[GET /api/student/experiments/:id/quizzes]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
