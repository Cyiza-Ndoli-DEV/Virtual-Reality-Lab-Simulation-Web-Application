import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { validateReportContent } from '@/lib/lab-report'

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
    const studentId = session.user.id

    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
      select: { id: true, title: true, description: true },
    })
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    const assignment = await prisma.experimentReportAssignment.findUnique({
      where: { experimentId },
    })
    if (!assignment) {
      return NextResponse.json(
        { error: 'No lab report has been assigned for this experiment yet' },
        { status: 404 }
      )
    }

    const report = await prisma.report.findUnique({
      where: {
        studentId_experimentId: { studentId, experimentId },
      },
    })

    return NextResponse.json({
      experiment,
      assignmentId: assignment.id,
      assignment: {
        title: assignment.title,
        instructions: assignment.instructions,
      },
      submitted: Boolean(report),
      submittedAt: report?.submittedAt.toISOString() ?? null,
      reviewStatus: report?.reviewStatus ?? null,
      reviewedAt: report?.reviewedAt?.toISOString() ?? null,
      teacherFeedback: report?.teacherFeedback ?? null,
      content: report?.content ?? null,
    })
  } catch (e) {
    console.error('[GET /api/student/experiments/:id/report]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user.canAccessStudent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: experimentId } = await ctx.params
    const studentId = session.user.id
    const body = await req.json()

    const assignment = await prisma.experimentReportAssignment.findUnique({
      where: { experimentId },
    })
    if (!assignment) {
      return NextResponse.json(
        { error: 'No lab report has been assigned for this experiment yet' },
        { status: 404 }
      )
    }

    const existing = await prisma.report.findUnique({
      where: {
        studentId_experimentId: { studentId, experimentId },
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'You have already submitted your lab report' },
        { status: 409 }
      )
    }

    const vrCompleted = await prisma.experimentSession.findFirst({
      where: {
        studentId,
        experimentId,
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      select: { id: true },
    })
    if (!vrCompleted) {
      return NextResponse.json(
        {
          error:
            'Complete the virtual practical in VR (or mark it complete on the lab page) before submitting your report.',
        },
        { status: 400 }
      )
    }

    const validated = validateReportContent(body.content)
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const sessionId =
      typeof body.sessionId === 'string' && body.sessionId.trim()
        ? body.sessionId.trim()
        : vrCompleted.id

    if (sessionId) {
      const labSession = await prisma.experimentSession.findFirst({
        where: { id: sessionId, studentId, experimentId },
      })
      if (!labSession) {
        return NextResponse.json({ error: 'Invalid lab session' }, { status: 400 })
      }
    }

    const report = await prisma.report.create({
      data: {
        studentId,
        experimentId,
        assignmentId: assignment.id,
        content: validated.data,
        sessionId: sessionId ?? null,
      },
    })

    return NextResponse.json({
      id: report.id,
      submittedAt: report.submittedAt.toISOString(),
    })
  } catch (e) {
    console.error('[POST /api/student/experiments/:id/report]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
