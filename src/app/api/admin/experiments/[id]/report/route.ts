import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  emptyReportAssignment,
  parseReportAssignment,
} from '@/lib/lab-report'
import { assertExperimentAccessibleBySession } from '@/lib/teacher-subject'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: experimentId } = await ctx.params
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
      select: { id: true, title: true },
    })
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    const scope = await assertExperimentAccessibleBySession(session, experimentId)
    if (!scope.ok) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    const row = await prisma.experimentReportAssignment.findUnique({
      where: { experimentId },
    })

    if (!row) {
      return NextResponse.json({
        experimentId,
        experimentTitle: experiment.title,
        configured: false,
        assignment: emptyReportAssignment(),
      })
    }

    return NextResponse.json({
      experimentId,
      experimentTitle: experiment.title,
      configured: true,
      assignmentId: row.id,
      updatedAt: row.updatedAt.toISOString(),
      assignment: {
        title: row.title,
        instructions: row.instructions,
      },
    })
  } catch (e) {
    console.error('[GET /api/admin/experiments/:id/report]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: experimentId } = await ctx.params
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
      select: { id: true, title: true },
    })
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    const scope = await assertExperimentAccessibleBySession(session, experimentId)
    if (!scope.ok) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    const body = await req.json()
    const assignment = parseReportAssignment(body.assignment ?? body)
    if (!assignment) {
      return NextResponse.json(
        {
          error:
            'Invalid report assignment: title and instructions for students are required',
        },
        { status: 400 }
      )
    }

    const row = await prisma.experimentReportAssignment.upsert({
      where: { experimentId },
      create: {
        experimentId,
        title: assignment.title,
        instructions: assignment.instructions,
      },
      update: {
        title: assignment.title,
        instructions: assignment.instructions,
      },
    })

    return NextResponse.json({
      experimentId,
      experimentTitle: experiment.title,
      configured: true,
      assignmentId: row.id,
      updatedAt: row.updatedAt.toISOString(),
      assignment,
    })
  } catch (e) {
    console.error('[PUT /api/admin/experiments/:id/report]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
