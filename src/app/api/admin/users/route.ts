import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireFeature } from '@/lib/api-auth'
import prisma from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { normalizeRoleCode, requireRoleDefinitionCode } from '@/lib/user-role-code'
import { TEACHER_ROLE_CODE, validateSubjectId } from '@/lib/teacher-subject'
import type { Prisma } from '@prisma/client'

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

function userListSelect() {
  return {
    id: true,
    name: true,
    email: true,
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
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
