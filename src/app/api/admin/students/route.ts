import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireRegisterStudentsAccess, STUDENT_ROLE_CODE } from '@/lib/api-auth'
import prisma from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { requireRoleDefinitionCode } from '@/lib/user-role-code'

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

    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

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

    const hashedPassword = await hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        password: hashedPassword,
        role: STUDENT_ROLE_CODE,
        createdById: session!.user!.id,
      },
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      _count: { sessions: 0 },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
