import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [totalStudents, totalTeachers, totalSessions, sessions] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.experimentSession.count(),
      prisma.experimentSession.findMany({
        select: { wrongSteps: true, passed: true }
      }),
    ])

    const avgWrongSteps = sessions.length
      ? Math.round(sessions.reduce((a, s) => a + s.wrongSteps, 0) / sessions.length)
      : 0

    const passRate = sessions.length
      ? Math.round((sessions.filter(s => s.passed).length / sessions.length) * 100)
      : 0

    return NextResponse.json({
      totalStudents,
      totalTeachers,
      totalSessions,
      avgWrongSteps,
      passRate,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}