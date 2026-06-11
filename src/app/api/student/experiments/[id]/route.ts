import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { parseQuestionnaireConfig } from '@/lib/questionnaire'
import { deriveLabWorkflowStatus } from '@/lib/lab-workflow-status'
import { deriveLabProgress } from '@/lib/questionnaire-display'
import {
  percentToGradeLabel,
  sessionProgressPercent,
  type LabStatus,
} from '@/lib/student-lab-status'

type StepJson = { step?: number }

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
      include: {
        subject: { select: { code: true, name: true, status: true } },
        questionnaire: {
          select: { id: true, title: true, sections: true },
        },
        reportAssignment: {
          select: { id: true, title: true, instructions: true },
        },
        quizzes: {
          select: {
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

    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    const sessions = await prisma.experimentSession.findMany({
      where: { studentId, experimentId },
      orderBy: { startedAt: 'desc' },
      include: { wrongStepLogs: { select: { stepNumber: true } } },
    })

    const activeSession = sessions.find((s) => s.completedAt === null)
    const latestCompleted = sessions.find((s) => s.completedAt !== null)
    const vrCompleted = Boolean(latestCompleted)
    const vrActive = Boolean(activeSession)

    const q = experiment.questionnaire
    const config = q
      ? parseQuestionnaireConfig({ title: q.title, sections: q.sections })
      : null
    const hasQuestionnaire = Boolean(config)

    let submission: {
      submittedAt: Date
      answers: unknown
      reviewStatus: 'PENDING' | 'COMPLETED'
      reviewedAt: Date | null
    } | null = null

    if (q) {
      const row = await prisma.questionnaireSubmission.findUnique({
        where: {
          studentId_questionnaireId: {
            studentId,
            questionnaireId: q.id,
          },
        },
        select: {
          submittedAt: true,
          answers: true,
          reviewStatus: true,
          reviewedAt: true,
        },
      })
      if (row) submission = row
    }

    const hasReportAssignment = Boolean(experiment.reportAssignment)
    let reportRow: {
      submittedAt: Date
      content: string
      reviewStatus: 'PENDING' | 'COMPLETED'
      reviewedAt: Date | null
      teacherFeedback: string | null
    } | null = null

    if (hasReportAssignment) {
      reportRow = await prisma.report.findUnique({
        where: {
          studentId_experimentId: { studentId, experimentId },
        },
        select: {
          submittedAt: true,
          content: true,
          reviewStatus: true,
          reviewedAt: true,
          teacherFeedback: true,
        },
      })
    }

    const reportSubmittedAtIso = reportRow?.submittedAt.toISOString() ?? null
    const reportWorkflowStatus = deriveLabWorkflowStatus({
      hasQuestionnaire: hasReportAssignment,
      submittedAt: reportSubmittedAtIso,
      reviewStatus: reportRow?.reviewStatus ?? null,
    })

    const submittedAtIso = submission?.submittedAt.toISOString() ?? null
    const workflowStatus = deriveLabWorkflowStatus({
      hasQuestionnaire,
      submittedAt: submittedAtIso,
      reviewStatus: submission?.reviewStatus ?? null,
    })

    const quizAttempt = experiment.quizzes[0]?.attempts[0]
    let gradeLabel: string | null = null
    let gradePercent: number | null = null
    if (quizAttempt && quizAttempt.totalQuestions > 0) {
      gradePercent = Math.round(
        (quizAttempt.score / quizAttempt.totalQuestions) * 100
      )
      gradeLabel = percentToGradeLabel(gradePercent)
    }

    const steps = Array.isArray(experiment.steps) ? (experiment.steps as StepJson[]) : []
    const stepCount = steps.length > 0 ? steps.length : 5

    let status: LabStatus = 'available'
    let progressPercent = 0

    if (experiment.subject?.status === 'INACTIVE') {
      status = 'locked'
    } else if (activeSession) {
      status = 'active'
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

    const labProgress = deriveLabProgress({
      vrCompleted,
      vrActive,
      questionnaireSubmitted: Boolean(submission),
      questionnaireReviewed: submission?.reviewStatus === 'COMPLETED',
      hasQuestionnaire,
      reportSubmitted: Boolean(reportRow),
      reportReviewed: reportRow?.reviewStatus === 'COMPLETED',
      hasReportAssignment,
      hasFinalGrade: gradePercent !== null,
    })

    const vrSession = activeSession ?? latestCompleted

    return NextResponse.json({
      experiment: {
        id: experiment.id,
        title: experiment.title,
        description: experiment.description,
        subject: experiment.subject
          ? { code: experiment.subject.code, name: experiment.subject.name }
          : null,
      },
      status,
      progressPercent,
      hasQuestionnaire,
      hasReportAssignment,
      workflowStatus,
      reportWorkflowStatus,
      questionnaire: config
        ? {
            title: config.title,
            config,
            submitted: Boolean(submission),
            submittedAt: submittedAtIso,
            reviewStatus: submission?.reviewStatus ?? null,
            reviewedAt: submission?.reviewedAt?.toISOString() ?? null,
            answers: submission?.answers ?? null,
          }
        : null,
      report: experiment.reportAssignment
        ? {
            title: experiment.reportAssignment.title,
            instructions: experiment.reportAssignment.instructions,
            submitted: Boolean(reportRow),
            submittedAt: reportSubmittedAtIso,
            reviewStatus: reportRow?.reviewStatus ?? null,
            reviewedAt: reportRow?.reviewedAt?.toISOString() ?? null,
            teacherFeedback: reportRow?.teacherFeedback ?? null,
            content: reportRow?.content ?? null,
          }
        : null,
      gradeLabel,
      gradePercent,
      labProgress,
      activeSessionId: activeSession?.id ?? null,
      vrSession: vrSession
        ? {
            id: vrSession.id,
            timeTaken: vrSession.timeTaken,
            wrongSteps: vrSession.wrongSteps,
            passed: vrSession.passed,
            startedAt: vrSession.startedAt.toISOString(),
            completedAt: vrSession.completedAt?.toISOString() ?? null,
          }
        : null,
    })
  } catch (e) {
    console.error('[GET /api/student/experiments/:id]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
