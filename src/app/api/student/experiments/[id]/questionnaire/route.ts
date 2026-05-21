import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { parseQuestionnaireConfig, validateAnswers } from '@/lib/questionnaire'

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

    const questionnaire = await prisma.experimentQuestionnaire.findUnique({
      where: { experimentId },
    })
    if (!questionnaire) {
      return NextResponse.json(
        { error: 'No questionnaire has been set up for this experiment yet' },
        { status: 404 }
      )
    }

    const config = parseQuestionnaireConfig({
      title: questionnaire.title,
      sections: questionnaire.sections,
    })
    if (!config) {
      return NextResponse.json({ error: 'Questionnaire configuration is invalid' }, { status: 500 })
    }

    const submission = await prisma.questionnaireSubmission.findUnique({
      where: {
        studentId_questionnaireId: {
          studentId,
          questionnaireId: questionnaire.id,
        },
      },
    })

    const submittedAt = submission?.submittedAt.toISOString() ?? null

    return NextResponse.json({
      experiment,
      questionnaireId: questionnaire.id,
      config,
      submitted: Boolean(submission),
      submittedAt,
      reviewStatus: submission?.reviewStatus ?? null,
      answers: submission?.answers ?? null,
    })
  } catch (e) {
    console.error('[GET /api/student/experiments/:id/questionnaire]', e)
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

    const questionnaire = await prisma.experimentQuestionnaire.findUnique({
      where: { experimentId },
    })
    if (!questionnaire) {
      return NextResponse.json(
        { error: 'No questionnaire has been set up for this experiment yet' },
        { status: 404 }
      )
    }

    const config = parseQuestionnaireConfig({
      title: questionnaire.title,
      sections: questionnaire.sections,
    })
    if (!config) {
      return NextResponse.json({ error: 'Questionnaire configuration is invalid' }, { status: 500 })
    }

    const existing = await prisma.questionnaireSubmission.findUnique({
      where: {
        studentId_questionnaireId: {
          studentId,
          questionnaireId: questionnaire.id,
        },
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'You have already submitted this questionnaire' },
        { status: 409 }
      )
    }

    const vrCompleted = await prisma.experimentSession.findFirst({
      where: {
        studentId,
        experimentId,
        completedAt: { not: null },
      },
      select: { id: true },
    })
    if (!vrCompleted) {
      return NextResponse.json(
        {
          error:
            'Mark the virtual practical complete on the lab page before submitting the questionnaire.',
        },
        { status: 400 }
      )
    }

    const validated = validateAnswers(config, body.answers)
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const sessionId =
      typeof body.sessionId === 'string' && body.sessionId.trim()
        ? body.sessionId.trim()
        : undefined

    if (sessionId) {
      const labSession = await prisma.experimentSession.findFirst({
        where: { id: sessionId, studentId, experimentId },
      })
      if (!labSession) {
        return NextResponse.json({ error: 'Invalid lab session' }, { status: 400 })
      }
    }

    const submission = await prisma.questionnaireSubmission.create({
      data: {
        studentId,
        questionnaireId: questionnaire.id,
        sessionId: sessionId ?? null,
        answers: validated.data,
      },
    })

    return NextResponse.json({
      id: submission.id,
      submittedAt: submission.submittedAt.toISOString(),
    })
  } catch (e) {
    console.error('[POST /api/student/experiments/:id/questionnaire]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
