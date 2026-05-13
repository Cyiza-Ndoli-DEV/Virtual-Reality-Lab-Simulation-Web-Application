import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session || !session.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [
      totalStudents,
      totalTeachers,
      totalSessions,
      sessions,
      totalUsers,
      activeSessionRows,
      timeAgg,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.experimentSession.count(),
      prisma.experimentSession.findMany({
        select: { wrongSteps: true, passed: true },
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

    const avgWrongSteps = sessions.length
      ? Math.round(sessions.reduce((a, s) => a + s.wrongSteps, 0) / sessions.length)
      : 0

    const passRate = sessions.length
      ? Math.round((sessions.filter(s => s.passed).length / sessions.length) * 100)
      : 0

    const vrUsageHours = Math.round((timeAgg._sum.timeTaken ?? 0) / 3600)
    const activeNow = activeSessionRows.length

    return NextResponse.json({
      totalStudents,
      totalTeachers,
      totalSessions,
      avgWrongSteps,
      passRate,
      totalUsers,
      activeNow,
      labCompletionPercent: passRate,
      vrUsageHours,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}