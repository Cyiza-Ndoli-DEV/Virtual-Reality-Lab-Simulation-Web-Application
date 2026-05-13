import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session || !session.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await prisma.experimentSession.findMany({
      take: 80,
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        passed: true,
        student: { select: { name: true, email: true, role: true } },
        experiment: { select: { title: true } },
      },
    })

    const items = rows.map((r) => ({
      id: r.id,
      at: r.startedAt.toISOString(),
      userName: r.student.name,
      userEmail: r.student.email,
      userRole: r.student.role,
      experimentTitle: r.experiment.title,
      status: r.completedAt
        ? r.passed
          ? ('Completed' as const)
          : ('Ended' as const)
        : ('In progress' as const),
    }))

    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
