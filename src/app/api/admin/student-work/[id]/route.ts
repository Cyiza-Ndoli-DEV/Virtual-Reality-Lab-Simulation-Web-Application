import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { parseQuestionnaireConfig } from '@/lib/questionnaire'
import { requireStudentWorkAccess } from '@/lib/api-auth'
import { teacherSubjectScopeForSession } from '@/lib/teacher-subject'
import {
  experimentGradeLimits,
  loadStudentExperimentGradeBreakdown,
  parseMarksAwarded,
  validateMarksAwarded,
} from '@/lib/experiment-grading'

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
                gradeQuestionnaireMax: true,
                gradeQuizMax: true,
                gradeReportMax: true,
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

    const limits = experimentGradeLimits(row.questionnaire.experiment)
    const gradeBreakdown = await loadStudentExperimentGradeBreakdown(
      row.studentId,
      row.questionnaire.experiment.id
    )

    return NextResponse.json({
      id: row.id,
      submittedAt: row.submittedAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewStatus: row.reviewStatus,
      marksAwarded: row.marksAwarded,
      marksMax: row.marksMax ?? limits.gradeQuestionnaireMax,
      student: row.student,
      experiment: {
        id: row.questionnaire.experiment.id,
        title: row.questionnaire.experiment.title,
        subject: row.questionnaire.experiment.subject,
      },
      questionnaireTitle: config?.title ?? row.questionnaire.title,
      answers: row.answers,
      config,
      gradeBreakdown,
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
    const reviewStatus = body.reviewStatus
    const marksRaw = body.marksAwarded

    if (reviewStatus === undefined && marksRaw === undefined) {
      return NextResponse.json(
        { error: 'Provide marksAwarded and/or reviewStatus COMPLETED' },
        { status: 400 }
      )
    }

    if (
      reviewStatus !== 'COMPLETED' &&
      reviewStatus !== undefined &&
      marksRaw === undefined
    ) {
      return NextResponse.json(
        { error: 'Provide marksAwarded and/or reviewStatus COMPLETED' },
        { status: 400 }
      )
    }

    const teacherSubjectId = await teacherSubjectScopeForSession(session)

    const existing = await prisma.questionnaireSubmission.findUnique({
      where: { id },
      include: {
        questionnaire: {
          select: {
            experimentId: true,
            experiment: {
              select: {
                subjectId: true,
                gradeQuestionnaireMax: true,
              },
            },
          },
        },
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

    const marksMax = experimentGradeLimits(existing.questionnaire.experiment)
      .gradeQuestionnaireMax
    const data: {
      reviewStatus?: 'COMPLETED'
      reviewedAt?: Date
      reviewedById?: string
      marksAwarded?: number | null
      marksMax?: number
      scoredAt?: Date
    } = {}

    if (marksRaw !== undefined) {
      const marksAwarded = parseMarksAwarded(marksRaw)
      if (marksRaw !== null && marksAwarded === null) {
        return NextResponse.json({ error: 'Invalid marksAwarded' }, { status: 400 })
      }
      if (marksAwarded !== null) {
        const markError = validateMarksAwarded(marksAwarded, marksMax)
        if (markError) {
          return NextResponse.json({ error: markError }, { status: 400 })
        }
      }
      data.marksAwarded = marksAwarded
      data.marksMax = marksMax
      data.scoredAt = marksAwarded !== null ? new Date() : undefined
    }

    if (reviewStatus === 'COMPLETED') {
      data.reviewStatus = 'COMPLETED'
      data.reviewedAt = new Date()
      data.reviewedById = session!.user!.id
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const updated = await prisma.questionnaireSubmission.update({
      where: { id },
      data,
    })

    const gradeBreakdown = await loadStudentExperimentGradeBreakdown(
      updated.studentId,
      existing.questionnaire.experimentId
    )

    return NextResponse.json({
      id: updated.id,
      reviewStatus: updated.reviewStatus,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      marksAwarded: updated.marksAwarded,
      marksMax: updated.marksMax,
      gradeBreakdown,
    })
  } catch (e) {
    console.error('[PATCH /api/admin/student-work/:id]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
