import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { parseQuestionnaireConfig } from '@/lib/questionnaire'
import { deriveLabWorkflowStatus } from '@/lib/lab-workflow-status'
import { deriveLabProgress } from '@/lib/questionnaire-display'
import { areAllQuizzesFinished } from '@/lib/lab-progress-steps'
import { serializeStudentQuizSummary } from '@/lib/quiz'
import {
  loadStudentExperimentGradeBreakdown,
} from '@/lib/experiment-grading'
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
          where: { isPublished: true },
          orderBy: { createdAt: 'asc' },
          include: {
            _count: { select: { quizQuestions: true } },
            attempts: {
              where: { studentId },
              orderBy: { attemptedAt: 'desc' },
              select: {
                score: true,
                totalPoints: true,
                percentage: true,
                passed: true,
                attemptedAt: true,
              },
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
      marksAwarded: number | null
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
          marksAwarded: true,
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
      marksAwarded: number | null
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
          marksAwarded: true,
        },
      })
    }

    const reportSubmittedAtIso = reportRow?.submittedAt.toISOString() ?? null
    const reportWorkflowStatus = deriveLabWorkflowStatus({
      hasQuestionnaire: hasReportAssignment,
      submittedAt: reportSubmittedAtIso,
      reviewStatus: reportRow?.reviewStatus ?? null,
      requireReviewForComplete: true,
    })

    const submittedAtIso = submission?.submittedAt.toISOString() ?? null
    const workflowStatus = deriveLabWorkflowStatus({
      hasQuestionnaire,
      submittedAt: submittedAtIso,
      reviewStatus: submission?.reviewStatus ?? null,
      requireReviewForComplete: false,
    })

    const quizSummaries = experiment.quizzes
      .filter((q) => q._count.quizQuestions > 0)
      .map((q) => serializeStudentQuizSummary(q))

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
      hasQuizzes: quizSummaries.length > 0,
      quizzesCompleted: areAllQuizzesFinished(quizSummaries),
      hasFinalGrade: false,
    })

    const gradeBreakdown = await loadStudentExperimentGradeBreakdown(
      studentId,
      experimentId
    )
    const finalGradePercent = gradeBreakdown?.isComplete
      ? gradeBreakdown.percentage
      : null
    const finalGradeLabel =
      finalGradePercent !== null ? percentToGradeLabel(finalGradePercent) : null

    if (gradeBreakdown?.isComplete) {
      labProgress.finalGrade = 'completed'
    } else if (
      gradeBreakdown &&
      gradeBreakdown.components.some((component) => component.graded)
    ) {
      labProgress.finalGrade = 'pending'
    }

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
      hasQuizzes: quizSummaries.length > 0,
      quizzes: quizSummaries,
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
            marksAwarded: submission?.marksAwarded ?? null,
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
            marksAwarded: reportRow?.marksAwarded ?? null,
            content: reportRow?.content ?? null,
          }
        : null,
      gradeLabel: finalGradeLabel,
      gradePercent: finalGradePercent,
      gradeBreakdown,
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
