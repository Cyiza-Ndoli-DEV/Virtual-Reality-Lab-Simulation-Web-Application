import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
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

    const row = await prisma.report.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, name: true, email: true } },
        assignment: { select: { title: true, instructions: true } },
        experiment: {
          select: {
            id: true,
            title: true,
            subjectId: true,
            gradeReportMax: true,
            subject: { select: { code: true, name: true } },
          },
        },
        session: {
          select: {
            timeTaken: true,
            wrongSteps: true,
            passed: true,
            completedAt: true,
          },
        },
      },
    })

    if (!row) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (teacherSubjectId && row.experiment.subjectId !== teacherSubjectId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const limits = experimentGradeLimits(row.experiment)
    const gradeBreakdown = await loadStudentExperimentGradeBreakdown(
      row.studentId,
      row.experimentId
    )

    return NextResponse.json({
      id: row.id,
      submittedAt: row.submittedAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewStatus: row.reviewStatus,
      marksAwarded: row.marksAwarded,
      marksMax: row.marksMax ?? limits.gradeReportMax,
      content: row.content,
      teacherFeedback: row.teacherFeedback,
      feedbackAt: row.feedbackAt?.toISOString() ?? null,
      student: row.student,
      experiment: {
        id: row.experiment.id,
        title: row.experiment.title,
        subject: row.experiment.subject,
      },
      assignment: row.assignment,
      vrSession: row.session
        ? {
            timeTaken: row.session.timeTaken,
            wrongSteps: row.session.wrongSteps,
            passed: row.session.passed,
            completedAt: row.session.completedAt?.toISOString() ?? null,
          }
        : null,
      gradeBreakdown,
    })
  } catch (e) {
    console.error('[GET /api/admin/reports/:id]', e)
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
    const teacherSubjectId = await teacherSubjectScopeForSession(session)

    const existing = await prisma.report.findUnique({
      where: { id },
      include: {
        experiment: {
          select: { subjectId: true, gradeReportMax: true },
        },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }
    if (
      teacherSubjectId &&
      existing.experiment.subjectId !== teacherSubjectId
    ) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const reviewStatus = body.reviewStatus
    const teacherFeedback =
      typeof body.teacherFeedback === 'string'
        ? body.teacherFeedback.trim() || null
        : undefined
    const marksRaw = body.marksAwarded

    if (
      reviewStatus !== 'COMPLETED' &&
      reviewStatus !== undefined &&
      teacherFeedback === undefined &&
      marksRaw === undefined
    ) {
      return NextResponse.json(
        { error: 'Provide reviewStatus COMPLETED, teacherFeedback, and/or marksAwarded' },
        { status: 400 }
      )
    }

    const now = new Date()
    const marksMax = experimentGradeLimits(existing.experiment).gradeReportMax
    const data: {
      reviewStatus?: 'COMPLETED'
      reviewedAt?: Date
      reviewedById?: string
      teacherFeedback?: string | null
      feedbackAt?: Date | null
      marksAwarded?: number | null
      marksMax?: number
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
    }

    if (reviewStatus === 'COMPLETED') {
      data.reviewStatus = 'COMPLETED'
      data.reviewedAt = now
      data.reviewedById = session!.user!.id
    }
    if (teacherFeedback !== undefined) {
      data.teacherFeedback = teacherFeedback
      data.feedbackAt = teacherFeedback ? now : null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const updated = await prisma.report.update({
      where: { id },
      data,
    })

    const gradeBreakdown = await loadStudentExperimentGradeBreakdown(
      updated.studentId,
      updated.experimentId
    )

    return NextResponse.json({
      id: updated.id,
      reviewStatus: updated.reviewStatus,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      teacherFeedback: updated.teacherFeedback,
      feedbackAt: updated.feedbackAt?.toISOString() ?? null,
      marksAwarded: updated.marksAwarded,
      marksMax: updated.marksMax,
      gradeBreakdown,
    })
  } catch (e) {
    console.error('[PATCH /api/admin/reports/:id]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
