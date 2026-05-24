import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { parseQuestionnaireConfig } from '@/lib/questionnaire'
import { requireStudentWorkAccess } from '@/lib/api-auth'
import { teacherSubjectScopeForSession } from '@/lib/teacher-subject'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const access = await requireStudentWorkAccess(session)
    if (!access.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
    }

    const { id } = await ctx.params
    const teacherSubjectId = await teacherSubjectScopeForSession(session)

    const row = await prisma.questionnaireSubmission.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, name: true, email: true } },
        questionnaire: {
          select: {
            id: true,
            title: true,
            sections: true,
            experiment: {
              select: {
                id: true,
                title: true,
                subject: { select: { code: true, name: true } },
                subjectId: true,
              },
            },
          },
        },
      },
    })

    if (!row) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if (
      teacherSubjectId &&
      row.questionnaire.experiment.subjectId !== teacherSubjectId
    ) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const config = parseQuestionnaireConfig({
      title: row.questionnaire.title,
      sections: row.questionnaire.sections,
    })

    return NextResponse.json({
      id: row.id,
      submittedAt: row.submittedAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewStatus: row.reviewStatus,
      student: row.student,
      experiment: {
        id: row.questionnaire.experiment.id,
        title: row.questionnaire.experiment.title,
        subject: row.questionnaire.experiment.subject,
      },
      questionnaireTitle: config?.title ?? row.questionnaire.title,
      answers: row.answers,
      config,
    })
  } catch (e) {
    console.error('[GET /api/admin/student-work/:id]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const access = await requireStudentWorkAccess(session)
    if (!access.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
    }

    const { id } = await ctx.params
    const body = await req.json()

    if (body.reviewStatus !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Only reviewStatus COMPLETED is supported' },
        { status: 400 }
      )
    }

    const teacherSubjectId = await teacherSubjectScopeForSession(session)

    const existing = await prisma.questionnaireSubmission.findUnique({
      where: { id },
      include: {
        questionnaire: { select: { experiment: { select: { subjectId: true } } } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }
    if (
      teacherSubjectId &&
      existing.questionnaire.experiment.subjectId !== teacherSubjectId
    ) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.questionnaireSubmission.update({
      where: { id },
      data: {
        reviewStatus: 'COMPLETED',
        reviewedAt: new Date(),
        reviewedById: session!.user!.id,
      },
    })

    return NextResponse.json({
      id: updated.id,
      reviewStatus: updated.reviewStatus,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
    })
  } catch (e) {
    console.error('[PATCH /api/admin/student-work/:id]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
