import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { parseQuestionnaireConfig } from '@/lib/questionnaire'
import {
  deriveLabWorkflowStatus,
  type LabWorkflowStatus,
} from '@/lib/lab-workflow-status'
import {
  percentToGradeLabel,
  sessionProgressPercent,
  type LabStatus,
} from '@/lib/student-lab-status'

type StepJson = { step?: number }

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user.canAccessStudent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const studentId = session.user.id

    const experiments = await prisma.experiment.findMany({
      orderBy: { title: 'asc' },
      include: {
        subject: { select: { code: true, name: true, status: true } },
        questionnaire: {
          select: { id: true, title: true, sections: true },
        },
        quizzes: {
          select: {
            id: true,
            attempts: {
              where: { studentId },
              orderBy: { attemptedAt: 'desc' },
              take: 1,
              select: { score: true, totalQuestions: true },
            },
          },
        },
      },
    })

    const sessions = await prisma.experimentSession.findMany({
      where: { studentId },
      orderBy: { startedAt: 'desc' },
      include: {
        wrongStepLogs: { select: { stepNumber: true } },
      },
    })

    const sessionsByExperiment = new Map<string, typeof sessions>()
    for (const s of sessions) {
      const list = sessionsByExperiment.get(s.experimentId) ?? []
      list.push(s)
      sessionsByExperiment.set(s.experimentId, list)
    }

    const submissions = await prisma.questionnaireSubmission.findMany({
      where: {
        studentId,
        questionnaireId: {
          in: experiments
            .map((e) => e.questionnaire?.id)
            .filter((id): id is string => Boolean(id)),
        },
      },
      select: {
        questionnaireId: true,
        submittedAt: true,
        reviewStatus: true,
      },
    })

    const submissionByQuestionnaire = new Map(
      submissions.map((s) => [
        s.questionnaireId,
        {
          submittedAt: s.submittedAt.toISOString(),
          reviewStatus: s.reviewStatus,
        },
      ])
    )

    let totalTimeSeconds = 0
    let completedPracticals = 0
    const gradePercents: number[] = []

    const labs = experiments.map((e) => {
      const q = e.questionnaire
      const config = q
        ? parseQuestionnaireConfig({ title: q.title, sections: q.sections })
        : null
      const hasQuestionnaire = Boolean(config)
      const sub = q ? submissionByQuestionnaire.get(q.id) : undefined
      const submittedAt = sub?.submittedAt ?? null
      const workflowStatus: LabWorkflowStatus = deriveLabWorkflowStatus({
        hasQuestionnaire,
        submittedAt,
        reviewStatus: sub?.reviewStatus ?? null,
      })

      const expSessions = sessionsByExperiment.get(e.id) ?? []
      const activeSession = expSessions.find((s) => s.completedAt === null)
      const latestCompleted = expSessions.find((s) => s.completedAt !== null)

      if (latestCompleted) {
        completedPracticals += 1
        totalTimeSeconds += latestCompleted.timeTaken
      }

      const quizAttempt = e.quizzes[0]?.attempts[0]
      let gradeLabel: string | null = null
      let gradePercent: number | null = null
      if (quizAttempt && quizAttempt.totalQuestions > 0) {
        gradePercent = Math.round(
          (quizAttempt.score / quizAttempt.totalQuestions) * 100
        )
        gradeLabel = percentToGradeLabel(gradePercent)
        gradePercents.push(gradePercent)
      }

      const steps = Array.isArray(e.steps) ? (e.steps as StepJson[]) : []
      const stepCount = steps.length > 0 ? steps.length : 5

      let status: LabStatus = 'available'
      let activeSessionId: string | null = null
      let progressPercent = 0
      let unlocksAt: string | null = null

      if (e.subject?.status === 'INACTIVE') {
        status = 'locked'
      } else if (activeSession) {
        status = 'active'
        activeSessionId = activeSession.id
        const highestStep = activeSession.wrongStepLogs.reduce(
          (max, log) => Math.max(max, log.stepNumber),
          0
        )
        progressPercent = sessionProgressPercent(
          stepCount,
          highestStep,
          activeSession.passed
        )
      } else if (latestCompleted) {
        status = 'completed'
        progressPercent = 100
      }

      return {
        id: e.id,
        title: e.title,
        description: e.description,
        subject: e.subject
          ? { code: e.subject.code, name: e.subject.name }
          : null,
        status,
        hasQuestionnaire,
        submittedAt,
        workflowStatus,
        reviewStatus: sub?.reviewStatus ?? null,
        activeSessionId,
        progressPercent,
        gradeLabel,
        gradePercent,
        unlocksAt,
      }
    })

    const averageGradePercent =
      gradePercents.length > 0
        ? Math.round(
            gradePercents.reduce((a, b) => a + b, 0) / gradePercents.length
          )
        : null

    return NextResponse.json({
      stats: {
        completedPracticals,
        timeInVRSeconds: totalTimeSeconds,
        averageGradePercent,
        topPercentileLabel:
          averageGradePercent !== null && averageGradePercent >= 85
            ? 'Top 10%'
            : null,
      },
      experiments: labs,
    })
  } catch (e) {
    console.error('[GET /api/student/experiments]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
