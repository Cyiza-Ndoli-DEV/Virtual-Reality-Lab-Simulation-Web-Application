import type { Session } from 'next-auth'
import prisma from './prisma'
import { assertExperimentAccessibleBySession } from './teacher-subject'

export async function requireQuizAdmin(session: Session | null) {
  if (!session?.user.canAccessAdmin) {
    return { ok: false as const, status: 401 }
  }
  return { ok: true as const, session }
}

export async function assertQuizAccessible(
  session: Session | null,
  quizId: string
) {
  const auth = await requireQuizAdmin(session)
  if (!auth.ok) return auth

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      experimentId: true,
      experiment: { select: { title: true } },
    },
  })
  if (!quiz) return { ok: false as const, status: 404 as const }

  const scope = await assertExperimentAccessibleBySession(auth.session, quiz.experimentId)
  if (!scope.ok) return { ok: false as const, status: 404 as const }

  return {
    ok: true as const,
    session: auth.session,
    quiz,
  }
}

export async function assertExperimentQuizAdmin(
  session: Session | null,
  experimentId: string
) {
  const auth = await requireQuizAdmin(session)
  if (!auth.ok) return auth

  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    select: { id: true, title: true },
  })
  if (!experiment) return { ok: false as const, status: 404 as const }

  const scope = await assertExperimentAccessibleBySession(auth.session, experimentId)
  if (!scope.ok) return { ok: false as const, status: 404 as const }

  return { ok: true as const, session: auth.session, experiment }
}
