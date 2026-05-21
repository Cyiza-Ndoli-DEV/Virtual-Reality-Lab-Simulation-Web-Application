import type { Session } from 'next-auth'
import prisma from './prisma'

export const TEACHER_ROLE_CODE = 'TEACHER'

/** Subject scope for the signed-in educator; null means no filter (full admin). */
export async function teacherSubjectScopeForSession(
  session: Session | null
): Promise<string | null> {
  if (!session?.user?.id || session.user.role !== TEACHER_ROLE_CODE) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subjectId: true },
  })

  return user?.subjectId ?? null
}

export async function validateSubjectId(subjectId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, status: 'ACTIVE' },
    select: { id: true, code: true, name: true },
  })
  return subject
}

export async function assertExperimentAccessibleBySession(
  session: Session | null,
  experimentId: string
): Promise<{ ok: true } | { ok: false }> {
  const teacherSubjectId = await teacherSubjectScopeForSession(session)
  if (!teacherSubjectId) return { ok: true }

  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    select: { subjectId: true },
  })
  if (!experiment || experiment.subjectId !== teacherSubjectId) {
    return { ok: false }
  }
  return { ok: true }
}
