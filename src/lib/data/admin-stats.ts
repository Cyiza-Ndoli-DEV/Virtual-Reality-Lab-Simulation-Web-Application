import prisma from '@/lib/prisma'

export type AdminStats = {
  totalStudents: number
  totalTeachers: number
  totalSessions: number
  avgWrongSteps: number
  passRate: number
  totalUsers: number
  activeNow: number
  labCompletionPercent: number
  vrUsageHours: number
}

export async function getAdminStats(): Promise<AdminStats> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [
    totalStudents,
    totalTeachers,
    totalSessions,
    passedCount,
    sessionAgg,
    totalUsers,
    activeSessionRows,
    timeAgg,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'TEACHER' } }),
    prisma.experimentSession.count(),
    prisma.experimentSession.count({ where: { passed: true } }),
    prisma.experimentSession.aggregate({
      _avg: { wrongSteps: true },
    }),
    prisma.user.count(),
    prisma.experimentSession.groupBy({
      by: ['studentId'],
      where: { startedAt: { gte: dayAgo } },
    }),
    prisma.experimentSession.aggregate({
      _sum: { timeTaken: true },
    }),
  ])

  const avgWrongSteps = Math.round(sessionAgg._avg.wrongSteps ?? 0)
  const passRate =
    totalSessions > 0 ? Math.round((passedCount / totalSessions) * 100) : 0

  return {
    totalStudents,
    totalTeachers,
    totalSessions,
    avgWrongSteps,
    passRate,
    totalUsers,
    activeNow: activeSessionRows.length,
    labCompletionPercent: passRate,
    vrUsageHours: Math.round((timeAgg._sum.timeTaken ?? 0) / 3600),
  }
}
