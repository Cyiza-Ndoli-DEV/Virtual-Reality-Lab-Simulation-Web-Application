import { NextRequest, NextResponse } from 'next/server'
import { SubjectStatus } from '@prisma/client'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

function normalizeSubjectCode(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_-]+/g, '')
}

function parseStatus(raw: unknown): SubjectStatus | null {
  if (raw === 'ACTIVE' || raw === 'INACTIVE') return raw
  return null
}

export async function GET() {
  try {
    const session = await auth()
    if (!session || !session.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await prisma.subject.findMany({
      orderBy: [{ code: 'asc' }],
    })

    return NextResponse.json(
      rows.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        status: s.status,
        description: s.description,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || !session.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const code = normalizeSubjectCode(typeof body.code === 'string' ? body.code : '')
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description =
      typeof body.description === 'string' ? body.description.trim() : ''
    const status = parseStatus(body.status) ?? SubjectStatus.ACTIVE

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Subject code and name are required' },
        { status: 400 }
      )
    }
    if (code.length > 40) {
      return NextResponse.json(
        { error: 'Subject code must be at most 40 characters' },
        { status: 400 }
      )
    }
    if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(code)) {
      return NextResponse.json(
        {
          error:
            'Code must start with a letter or digit and use only letters, digits, hyphens, and underscores',
        },
        { status: 400 }
      )
    }

    const existing = await prisma.subject.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json(
        { error: 'A subject with this code already exists' },
        { status: 400 }
      )
    }

    const created = await prisma.subject.create({
      data: {
        code,
        name,
        description: description ? description : null,
        status,
      },
    })

    return NextResponse.json({
      id: created.id,
      code: created.code,
      name: created.name,
      status: created.status,
      description: created.description,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
