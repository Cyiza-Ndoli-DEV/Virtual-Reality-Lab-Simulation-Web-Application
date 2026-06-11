import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  assertExperimentAccessibleBySession,
  teacherSubjectScopeForSession,
} from '@/lib/teacher-subject'

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || !session.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await ctx.params
    const body = (await req.json()) as Record<string, unknown>

    const existing = await prisma.experiment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    const scope = await assertExperimentAccessibleBySession(session, id)
    if (!scope.ok) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    const data: {
      title?: string
      description?: string
      learningOutcome?: string
      subjectId?: string | null
    } = {}

    if ('title' in body) {
      if (typeof body.title !== 'string') {
        return NextResponse.json({ error: 'title must be a string' }, { status: 400 })
      }
      const t = body.title.trim()
      if (!t) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
      }
      data.title = t
    }

    if ('description' in body) {
      if (typeof body.description !== 'string') {
        return NextResponse.json({ error: 'description must be a string' }, { status: 400 })
      }
      const d = body.description.trim()
      if (!d) {
        return NextResponse.json({ error: 'Description cannot be empty' }, { status: 400 })
      }
      data.description = d
    }

    if ('learningOutcome' in body) {
      if (typeof body.learningOutcome !== 'string') {
        return NextResponse.json({ error: 'learningOutcome must be a string' }, { status: 400 })
      }
      const lo = body.learningOutcome.trim()
      if (!lo) {
        return NextResponse.json(
          { error: 'Learning outcome cannot be empty' },
          { status: 400 }
        )
      }
      data.learningOutcome = lo
    }

    const teacherSubjectId = await teacherSubjectScopeForSession(session)

    if ('subjectId' in body && !teacherSubjectId) {
      if (body.subjectId === null) {
        data.subjectId = null
      } else if (typeof body.subjectId === 'string') {
        const sid = body.subjectId.trim()
        if (!sid) {
          return NextResponse.json({ error: 'Subject cannot be empty' }, { status: 400 })
        }
        const sub = await prisma.subject.findUnique({ where: { id: sid } })
        if (!sub) {
          return NextResponse.json({ error: 'Subject not found' }, { status: 400 })
        }
        data.subjectId = sid
      } else {
        return NextResponse.json({ error: 'subjectId must be a string or null' }, { status: 400 })
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'Provide title, description, learningOutcome, and/or subjectId' },
        { status: 400 }
      )
    }

    const updated = await prisma.experiment.update({
      where: { id },
      data,
      include: {
        subject: { select: { id: true, code: true, name: true, status: true } },
      },
    })

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      learningOutcome: updated.learningOutcome,
      steps: updated.steps,
      createdAt: updated.createdAt.toISOString(),
      subjectId: updated.subjectId,
      subject: updated.subject,
    })
  } catch (e) {
    console.error('[PATCH /api/admin/experiments/:id]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || !session.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await ctx.params

    const existing = await prisma.experiment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    const scope = await assertExperimentAccessibleBySession(session, id)
    if (!scope.ok) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.wrongStepLog.deleteMany({
        where: { session: { experimentId: id } },
      })
      await tx.experimentSession.deleteMany({ where: { experimentId: id } })
      await tx.quizAttempt.deleteMany({
        where: { quiz: { experimentId: id } },
      })
      await tx.quiz.deleteMany({ where: { experimentId: id } })
      await tx.report.deleteMany({ where: { experimentId: id } })
      await tx.experimentReportAssignment.deleteMany({ where: { experimentId: id } })
      await tx.questionnaireSubmission.deleteMany({
        where: { questionnaire: { experimentId: id } },
      })
      await tx.experimentQuestionnaire.deleteMany({ where: { experimentId: id } })
      await tx.experiment.delete({ where: { id } })
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/admin/experiments/:id]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
