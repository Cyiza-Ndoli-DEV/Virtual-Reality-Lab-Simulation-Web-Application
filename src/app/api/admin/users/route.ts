import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireFeature } from '@/lib/api-auth'
import prisma from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { normalizeRoleCode, requireRoleDefinitionCode } from '@/lib/user-role-code'
import { TEACHER_ROLE_CODE, validateSubjectId } from '@/lib/teacher-subject'

// GET all users
export async function GET() {
  try {
    const session = await auth()
    const access = await requireFeature(session, 'admin.users')
    if (!access.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subjectId: true,
        subject: { select: { id: true, code: true, name: true } },
        createdAt: true,
        _count: {
          select: { sessions: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new user
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const access = await requireFeature(session, 'admin.users')
    if (!access.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
    }

    const body = await req.json()
    const { name, email, password, role } = body
    const subjectIdRaw =
      typeof body.subjectId === 'string' ? body.subjectId.trim() : ''

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const roleCode = normalizeRoleCode(role)
    if (!roleCode) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    const roleDef = await requireRoleDefinitionCode(roleCode)
    if (!roleDef) {
      return NextResponse.json(
        { error: 'Unknown role. Create it under Settings → Roles first.' },
        { status: 400 }
      )
    }

    let subjectId: string | null = null
    if (roleCode === TEACHER_ROLE_CODE) {
      if (!subjectIdRaw) {
        return NextResponse.json(
          { error: 'Subject is required for educators' },
          { status: 400 }
        )
      }
      const subject = await validateSubjectId(subjectIdRaw)
      if (!subject) {
        return NextResponse.json({ error: 'Invalid or inactive subject' }, { status: 400 })
      }
      subjectId = subject.id
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const hashedPassword = await hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: roleCode,
        subjectId,
        createdById: session.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subjectId: true,
        subject: { select: { id: true, code: true, name: true } },
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}