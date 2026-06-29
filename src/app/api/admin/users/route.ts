import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireFeature } from '@/lib/api-auth'
import prisma from '@/lib/prisma'
import { normalizeRoleCode, requireRoleDefinitionCode } from '@/lib/user-role-code'
import { TEACHER_ROLE_CODE, validateSubjectId } from '@/lib/teacher-subject'
import { normalizeUsername, validateUsername } from '@/lib/password-policy'
import { STUDENT_ROLE_CODE } from '@/lib/api-auth'
import { createUserWithWelcomeEmail } from '@/lib/user-registration'
import type { Prisma } from '@prisma/client'

function roleLabelForCode(code: string): string {
  if (code === STUDENT_ROLE_CODE) return 'student'
  if (code === TEACHER_ROLE_CODE) return 'educator'
  if (code === 'ADMIN') return 'administrator'
  return code.toLowerCase().replace(/_/g, ' ')
}

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

function userListSelect() {
  return {
    id: true,
    name: true,
    email: true,
    username: true,
    role: true,
    subjectId: true,
    subject: { select: { id: true, code: true, name: true } },
    createdAt: true,
    _count: { select: { sessions: true } },
  } as const
}

function buildWhere(
  search: string,
  role: string
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {}
  if (role && role !== 'all') where.role = role
  const q = search.trim()
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { username: { contains: q } },
    ]
  }
  return where
}

// GET users (paginated by default; ?all=true for full list e.g. CSV export)
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const access = await requireFeature(session, 'admin.users')
    if (!access.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
    }

    const params = req.nextUrl.searchParams
    const all = params.get('all') === 'true'
    const search = params.get('search') ?? ''
    const role = params.get('role') ?? 'all'
    const where = buildWhere(search, role)
    const select = userListSelect()

    if (all) {
      const users = await prisma.user.findMany({
        where,
        select,
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(users)
    }

    const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(params.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    )
    const skip = (page - 1) * pageSize

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({ users, total, page, pageSize })
  } catch {
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
    const { name, email, role } = body
    const usernameRaw =
      typeof body.username === 'string' ? body.username.trim() : ''
    const subjectIdRaw =
      typeof body.subjectId === 'string' ? body.subjectId.trim() : ''

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 })
    }

    const roleCode = normalizeRoleCode(role)
    if (!roleCode) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    let username: string | null = null
    if (roleCode === STUDENT_ROLE_CODE) {
      const usernameError = validateUsername(usernameRaw)
      if (usernameError) {
        return NextResponse.json({ error: usernameError }, { status: 400 })
      }
      username = normalizeUsername(usernameRaw)
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

    const existing = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } })
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    if (username) {
      const existingUsername = await prisma.user.findUnique({ where: { username } })
      if (existingUsername) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
      }
    }

    let created: Awaited<ReturnType<typeof createUserWithWelcomeEmail>>
    try {
      created = await createUserWithWelcomeEmail({
        name: String(name),
        email: String(email),
        role: roleCode,
        username,
        subjectId,
        createdById: access.session.user.id,
        roleLabel: roleLabelForCode(roleCode),
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not create user'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: created.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        subjectId: true,
        subject: { select: { id: true, code: true, name: true } },
      },
    })

    return NextResponse.json({ ...user, emailSent: created.emailSent })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
