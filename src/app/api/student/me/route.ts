import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  getStudentProfileStats,
  studentPractitionerLevel,
} from '@/lib/student-profile-stats'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user.canAccessStudent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [user, stats] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { sessions: true } },
        },
      }),
      getStudentProfileStats(session.user.id),
    ])

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const level = studentPractitionerLevel(user._count.sessions)

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      portalLabel: 'STUDENT',
      practitionerLevel: level,
      practitionerSubtitle: `Lvl ${level} Practitioner`,
      stats,
    })
  } catch (e) {
    console.error('[GET /api/student/me]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user.canAccessStudent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id: session.user.id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name, email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { sessions: true } },
      },
    })

    const stats = await getStudentProfileStats(user.id)
    const level = studentPractitionerLevel(user._count.sessions)

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      portalLabel: 'STUDENT',
      practitionerLevel: level,
      practitionerSubtitle: `Lvl ${level} Practitioner`,
      stats,
    })
  } catch (e) {
    console.error('[PATCH /api/student/me]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
