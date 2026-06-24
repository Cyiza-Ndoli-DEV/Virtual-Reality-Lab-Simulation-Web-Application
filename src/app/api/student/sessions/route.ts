import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireRegisterStudentsAccess, STUDENT_ROLE_CODE } from '@/lib/api-auth'
import prisma from '@/lib/prisma'
import { serializeExperimentSession } from '@/lib/session-api'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestedStudentId = request.nextUrl.searchParams
      .get('studentId')
      ?.trim() || session.user.id

    const isSelfRequest = requestedStudentId === session.user.id

    if (!isSelfRequest) {
      const access = await requireRegisterStudentsAccess(session)
      if (!access.ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
      }
    } else if (!session.user.canAccessStudent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const student = await prisma.user.findFirst({
      where: { id: requestedStudentId, role: STUDENT_ROLE_CODE },
      select: { id: true, name: true, email: true },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const rows = await prisma.experimentSession.findMany({
      where: { studentId: requestedStudentId },
      orderBy: { startedAt: 'desc' },
      include: {
        student: { select: { id: true, name: true, email: true } },
        experiment: { select: { id: true, title: true } },
      },
    })

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
      sessions: rows.map(serializeExperimentSession),
    })
  } catch (error) {
    console.error('[GET /api/student/sessions]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
