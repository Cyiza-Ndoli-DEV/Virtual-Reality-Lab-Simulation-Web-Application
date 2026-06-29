import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { assertQuizAccessible } from '@/lib/quiz-access'
import { parseQuizForm, quizFullInclude, serializeQuizDetail } from '@/lib/quiz'

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

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: quizFullInclude,
    })
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    return NextResponse.json(
      serializeQuizDetail(quiz, access.quiz.experiment.title)
    )
  } catch (e) {
    console.error('[GET /api/admin/experiments/:id/quizzes/:quizId]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
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
    const data: Record<string, unknown> = {}

    if ('title' in body || 'passMark' in body || 'description' in body) {
      const form = parseQuizForm({ ...body, title: body.title ?? 'placeholder', passMark: body.passMark ?? 0 })
      if ('title' in body) {
        const title = typeof body.title === 'string' ? body.title.trim() : ''
        if (!title) {
          return NextResponse.json({ error: 'Title is required' }, { status: 400 })
        }
        data.title = title
      }
      if ('description' in body && typeof body.description === 'string') {
        data.description = body.description.trim()
      }
      if ('passMark' in body) {
        if (!form || form.passMark < 0 || form.passMark > 100) {
          return NextResponse.json({ error: 'Pass mark must be 0–100' }, { status: 400 })
        }
        data.passMark = form.passMark
      }
    }

    if ('timeLimit' in body) {
      if (body.timeLimit === null || body.timeLimit === '') {
        data.timeLimit = null
      } else {
        const tl = Number(body.timeLimit)
        if (!Number.isFinite(tl) || tl <= 0) {
          return NextResponse.json({ error: 'Time limit must be positive' }, { status: 400 })
        }
        data.timeLimit = Math.round(tl)
      }
    }

    if ('attemptsAllowed' in body) {
      const aa = Number(body.attemptsAllowed)
      if (!Number.isFinite(aa) || aa < 1) {
        return NextResponse.json({ error: 'Attempts allowed must be at least 1' }, { status: 400 })
      }
      data.attemptsAllowed = Math.round(aa)
    }

    if ('shuffleQuestions' in body) {
      data.shuffleQuestions = Boolean(body.shuffleQuestions)
    }

    if ('isPublished' in body) {
      data.isPublished = Boolean(body.isPublished)
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const quiz = await prisma.quiz.update({
      where: { id: quizId },
      data,
      include: quizFullInclude,
    })

    return NextResponse.json(
      serializeQuizDetail(quiz, access.quiz.experiment.title)
    )
  } catch (e) {
    console.error('[PATCH /api/admin/experiments/:id/quizzes/:quizId]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    await prisma.quiz.delete({ where: { id: quizId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/admin/experiments/:id/quizzes/:quizId]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
