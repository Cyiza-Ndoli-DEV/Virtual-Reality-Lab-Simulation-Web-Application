import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { teacherSubjectScopeForSession } from '@/lib/teacher-subject'

const defaultSteps = [
  { step: 1, title: 'Setup', description: 'Follow lab safety and equipment instructions.' },
] as const

export async function GET() {
  try {
    const session = await auth()
    if (!session || !session.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teacherSubjectId = await teacherSubjectScopeForSession(session)

    const rows = await prisma.experiment.findMany({
      where: teacherSubjectId ? { subjectId: teacherSubjectId } : undefined,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        subject: { select: { id: true, code: true, name: true, status: true } },
      },
    })

    return NextResponse.json(
      rows.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        learningOutcome: e.learningOutcome,
        createdAt: e.createdAt.toISOString(),
        subjectId: e.subjectId,
        subject: e.subject,
      }))
    )
  } catch (e) {
    console.error('[GET /api/admin/experiments]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || !session.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const learningOutcome =
      typeof body.learningOutcome === 'string' ? body.learningOutcome.trim() : ''
    const teacherSubjectId = await teacherSubjectScopeForSession(session)
    let subjectId = typeof body.subjectId === 'string' ? body.subjectId.trim() : ''
    if (teacherSubjectId) {
      subjectId = teacherSubjectId
    }

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      )
    }
    if (!learningOutcome) {
      return NextResponse.json(
        { error: 'Learning outcome is required' },
        { status: 400 }
      )
    }
    if (!subjectId) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } })
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 400 })
    }

    const created = await prisma.experiment.create({
      data: {
        title,
        description,
        learningOutcome,
        subjectId,
        steps: [...defaultSteps],
      },
      include: {
        subject: { select: { id: true, code: true, name: true, status: true } },
      },
    })

    return NextResponse.json({
      id: created.id,
      title: created.title,
      description: created.description,
      learningOutcome: created.learningOutcome,
      steps: created.steps,
      createdAt: created.createdAt.toISOString(),
      subjectId: created.subjectId,
      subject: created.subject,
    })
  } catch (e) {
    console.error('[POST /api/admin/experiments]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
