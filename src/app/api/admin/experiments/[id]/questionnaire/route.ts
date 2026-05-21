import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  emptyQuestionnaireConfig,
  parseQuestionnaireConfig,
  type QuestionnaireConfig,
} from '@/lib/questionnaire'
import { assertExperimentAccessibleBySession } from '@/lib/teacher-subject'

function configFromRow(row: {
  title: string
  sections: unknown
}): QuestionnaireConfig | null {
  return parseQuestionnaireConfig({ title: row.title, sections: row.sections })
}

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

    const row = await prisma.experimentQuestionnaire.findUnique({
      where: { experimentId },
    })

    if (!row) {
      return NextResponse.json({
        experimentId,
        experimentTitle: experiment.title,
        configured: false,
        config: emptyQuestionnaireConfig(),
      })
    }

    const config = configFromRow(row)
    return NextResponse.json({
      experimentId,
      experimentTitle: experiment.title,
      configured: true,
      questionnaireId: row.id,
      updatedAt: row.updatedAt.toISOString(),
      config: config ?? emptyQuestionnaireConfig(),
    })
  } catch (e) {
    console.error('[GET /api/admin/experiments/:id/questionnaire]', e)
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
    const config = parseQuestionnaireConfig(body.config ?? body)
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid questionnaire: title and at least one valid section are required' },
        { status: 400 }
      )
    }

    const row = await prisma.experimentQuestionnaire.upsert({
      where: { experimentId },
      create: {
        experimentId,
        title: config.title,
        sections: config.sections,
      },
      update: {
        title: config.title,
        sections: config.sections,
      },
    })

    return NextResponse.json({
      experimentId,
      experimentTitle: experiment.title,
      configured: true,
      questionnaireId: row.id,
      updatedAt: row.updatedAt.toISOString(),
      config,
    })
  } catch (e) {
    console.error('[PUT /api/admin/experiments/:id/questionnaire]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
