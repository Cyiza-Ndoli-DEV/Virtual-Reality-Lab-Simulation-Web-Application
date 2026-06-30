import prisma from '@/lib/prisma'
import { hasCompletedPreVrQuestionnaire } from '@/lib/pre-vr-questionnaire'

/** Mark the student's VR lab as finished (web self-report or close an open session). */
export async function completeVirtualPracticalForStudent(
  studentId: string,
  experimentId: string
) {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    select: { id: true, subject: { select: { status: true } } },
  })

  if (!experiment) {
    return { ok: false as const, status: 404, error: 'Experiment not found' }
  }

  if (experiment.subject?.status === 'INACTIVE') {
    return { ok: false as const, status: 403, error: 'This lab is not available' }
  }

  const preVrReady = await hasCompletedPreVrQuestionnaire(studentId, experimentId)
  if (!preVrReady) {
    return {
      ok: false as const,
      status: 400,
      error:
        'Complete the pre-lab briefing on the web portal before starting or marking the virtual practical.',
    }
  }

  const sessions = await prisma.experimentSession.findMany({
    where: { studentId, experimentId },
    orderBy: { startedAt: 'desc' },
  })

  const active = sessions.find((s) => s.completedAt === null)
  const alreadyCompleted = sessions.some((s) => s.completedAt !== null)

  if (alreadyCompleted && !active) {
    const latest = sessions.find((s) => s.completedAt !== null)!
    return {
      ok: true as const,
      sessionId: latest.id,
      alreadyCompleted: true,
    }
  }

  const now = new Date()

  if (active) {
    const updated = await prisma.experimentSession.update({
      where: { id: active.id },
      data: {
        completedAt: now,
        passed: true,
      },
    })
    return {
      ok: true as const,
      sessionId: updated.id,
      alreadyCompleted: false,
    }
  }

  const created = await prisma.experimentSession.create({
    data: {
      studentId,
      experimentId,
      startedAt: now,
      completedAt: now,
      passed: true,
      timeTaken: 0,
      wrongSteps: 0,
    },
  })

  return {
    ok: true as const,
    sessionId: created.id,
    alreadyCompleted: false,
  }
}
