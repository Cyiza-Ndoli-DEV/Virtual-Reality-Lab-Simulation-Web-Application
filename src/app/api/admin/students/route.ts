import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireRegisterStudentsAccess, STUDENT_ROLE_CODE } from '@/lib/api-auth'
import prisma from '@/lib/prisma'
import { requireRoleDefinitionCode } from '@/lib/user-role-code'
import { normalizeUsername, validateUsername } from '@/lib/password-policy'
import { createUserWithWelcomeEmail } from '@/lib/user-registration'

export async function GET() {
  try {
    const session = await auth()
    const access = await requireRegisterStudentsAccess(session)
    if (!access.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
    }

    const students = await prisma.user.findMany({
      where: { role: STUDENT_ROLE_CODE },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(students)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const access = await requireRegisterStudentsAccess(session)
    if (!access.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
    }

    const { name, email, username: usernameRaw } = await req.json()

    if (!name || !email || !usernameRaw) {
      return NextResponse.json(
        { error: 'Name, email, and username are required' },
        { status: 400 }
      )
    }

    const usernameError = validateUsername(String(usernameRaw))
    if (usernameError) {
      return NextResponse.json({ error: usernameError }, { status: 400 })
    }
    const username = normalizeUsername(String(usernameRaw))

    const roleDef = await requireRoleDefinitionCode(STUDENT_ROLE_CODE)
    if (!roleDef) {
      return NextResponse.json(
        { error: 'Student role is not configured. Contact an administrator.' },
        { status: 500 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } })
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } })
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
    }

    let created: Awaited<ReturnType<typeof createUserWithWelcomeEmail>>
    try {
      created = await createUserWithWelcomeEmail({
        name: String(name),
        email: String(email),
        role: STUDENT_ROLE_CODE,
        username,
        createdById: session!.user!.id,
        roleLabel: 'student',
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not register student'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const user = created.user

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      _count: { sessions: 0 },
      emailSent: created.emailSent,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
