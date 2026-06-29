import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { assertExperimentQuizAdmin } from '@/lib/quiz-access'
import { parseQuizForm, quizFullInclude, serializeQuizDetail, serializeQuizListItem } from '@/lib/quiz'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id: experimentId } = await ctx.params
    const access = await assertExperimentQuizAdmin(session, experimentId)
    if (!access.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: access.status })
    }

    const quizzes = await prisma.quiz.findMany({
      where: { experimentId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { quizQuestions: true } },
      },
    })

    return NextResponse.json({
      experimentId,
      experimentTitle: access.experiment.title,
      quizzes: quizzes.map((q) => serializeQuizListItem(q)),
    })
  } catch (e) {
    console.error('[GET /api/admin/experiments/:id/quizzes]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id: experimentId } = await ctx.params
    const access = await assertExperimentQuizAdmin(session, experimentId)
    if (!access.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: access.status })
    }

    const body = await req.json()
    const form = parseQuizForm(body)
    if (!form) {
      return NextResponse.json(
        { error: 'Invalid quiz: title and pass mark (0–100) are required' },
        { status: 400 }
      )
    }

    const quiz = await prisma.quiz.create({
      data: {
        experimentId,
        title: form.title,
        description: form.description ?? '',
        passMark: form.passMark,
        timeLimit: form.timeLimit ?? null,
        attemptsAllowed: form.attemptsAllowed ?? 1,
        shuffleQuestions: form.shuffleQuestions ?? false,
        isPublished: form.isPublished ?? false,
      },
      include: quizFullInclude,
    })

    return NextResponse.json(
      serializeQuizDetail(quiz, access.experiment.title),
      { status: 201 }
    )
  } catch (e) {
    console.error('[POST /api/admin/experiments/:id/quizzes]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
