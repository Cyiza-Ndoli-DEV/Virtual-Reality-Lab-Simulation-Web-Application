import prisma from '@/lib/prisma'
import {
  deriveLabWorkflowStatus,
  type LabWorkflowStatus,
} from '@/lib/lab-workflow-status'
import {
  loadStudentExperimentGradeBreakdown,
} from '@/lib/experiment-grading'
import {
  percentToGradeLabel,
  sessionProgressPercent,
  type LabStatus,
} from '@/lib/student-lab-status'
import type { DashboardStats } from '@/components/student/stats-bar'

type StepJson = { step?: number }

export type StudentLabData = {
  id: string
  title: string
  description: string
  subject: { code: string; name: string } | null
  status: LabStatus
  hasQuestionnaire: boolean
  submittedAt: string | null
  workflowStatus: LabWorkflowStatus
  reviewStatus: string | null
  activeSessionId: string | null
  progressPercent: number
  gradeLabel: string | null
  gradePercent: number | null
  unlocksAt: string | null
}

export type StudentExperimentsPayload = {
  stats: DashboardStats
  experiments: StudentLabData[]
}

export async function getStudentExperiments(
  studentId: string
): Promise<StudentExperimentsPayload> {
  const [experiments, sessions, submissions] = await Promise.all([
    prisma.experiment.findMany({
      orderBy: { title: 'asc' },
      include: {
        subject: { select: { code: true, name: true, status: true } },
        questionnaire: { select: { id: true } },
      },
    }),
    prisma.experimentSession.findMany({
      where: { studentId },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        experimentId: true,
        completedAt: true,
        timeTaken: true,
        passed: true,
        wrongStepLogs: { select: { stepNumber: true } },
      },
    }),
    prisma.questionnaireSubmission.findMany({
      where: { studentId },
      select: {
        questionnaireId: true,
        submittedAt: true,
        reviewStatus: true,
      },
    }),
  ])

  const finalGrades = await Promise.all(
    experiments.map((experiment) =>
      loadStudentExperimentGradeBreakdown(studentId, experiment.id).catch(
        () => null
      )
    )
  )

  const sessionsByExperiment = new Map<string, typeof sessions>()
  for (const s of sessions) {
    const list = sessionsByExperiment.get(s.experimentId) ?? []
    list.push(s)
    sessionsByExperiment.set(s.experimentId, list)
  }

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

  const labs = experiments.map((e, index) => {
    const hasQuestionnaire = Boolean(e.questionnaire)
    const qId = e.questionnaire?.id
    const sub = qId ? submissionByQuestionnaire.get(qId) : undefined
    const submittedAt = sub?.submittedAt ?? null
    const workflowStatus = deriveLabWorkflowStatus({
      hasQuestionnaire,
      submittedAt,
      reviewStatus: sub?.reviewStatus ?? null,
      requireReviewForComplete: false,
    })

    const expSessions = sessionsByExperiment.get(e.id) ?? []
    const activeSession = expSessions.find((s) => s.completedAt === null)
    const latestCompleted = expSessions.find((s) => s.completedAt !== null)

    if (latestCompleted) {
      completedPracticals += 1
      totalTimeSeconds += latestCompleted.timeTaken
    }

    const breakdown = finalGrades[index]
    const gradePercent =
      breakdown?.isComplete && breakdown.percentage !== null
        ? breakdown.percentage
        : null
    const gradeLabel =
      gradePercent !== null ? percentToGradeLabel(gradePercent) : null
    if (gradePercent !== null) {
      gradePercents.push(gradePercent)
    }

    const steps = Array.isArray(e.steps) ? (e.steps as StepJson[]) : []
    const stepCount = steps.length > 0 ? steps.length : 5

    let status: LabStatus = 'available'
    let activeSessionId: string | null = null
    let progressPercent = 0
    const unlocksAt: string | null = null

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

  return {
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
  }
}
