import { NextRequest, NextResponse } from 'next/server'
import { SubjectStatus } from '@prisma/client'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

function parseStatus(raw: unknown): SubjectStatus | null {
  if (raw === 'ACTIVE' || raw === 'INACTIVE') return raw
  return null
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || !session.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await ctx.params
    const body = (await req.json()) as Record<string, unknown>

    const existing = await prisma.subject.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    const data: { name?: string; description?: string | null; status?: SubjectStatus } = {}

    if ('name' in body) {
      if (typeof body.name !== 'string') {
        return NextResponse.json({ error: 'name must be a string' }, { status: 400 })
      }
      const n = body.name.trim()
      if (!n) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      data.name = n
    }

    if ('description' in body) {
      if (typeof body.description === 'string') {
        const d = body.description.trim()
        data.description = d.length ? d : null
      } else if (body.description === null) {
        data.description = null
      } else if (body.description !== undefined) {
        return NextResponse.json(
          { error: 'description must be a string or null' },
          { status: 400 }
        )
      }
    }

    if ('status' in body) {
      const s = parseStatus(body.status)
      if (!s) {
        return NextResponse.json(
          { error: 'status must be ACTIVE or INACTIVE' },
          { status: 400 }
        )
      }
      data.status = s
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'Provide name, description, and/or status to update' },
        { status: 400 }
      )
    }

    const updated = await prisma.subject.update({
      where: { id },
      data,
    })

    return NextResponse.json({
      id: updated.id,
      code: updated.code,
      name: updated.name,
      status: updated.status,
      description: updated.description,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || !session.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await ctx.params

    const existing = await prisma.subject.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    await prisma.subject.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
