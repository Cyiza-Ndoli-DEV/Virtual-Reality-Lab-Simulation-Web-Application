import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireRegisterStudentsAccess, STUDENT_ROLE_CODE } from '@/lib/api-auth'
import { deleteUserAccount } from '@/lib/delete-user'
import prisma from '@/lib/prisma'

async function getStudentOr404(id: string) {
  return prisma.user.findFirst({
    where: { id, role: STUDENT_ROLE_CODE },
    select: { id: true, role: true },
  })
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const access = await requireRegisterStudentsAccess(session)
    if (!access.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
    }

    const { id } = await ctx.params
    const target = await getStudentOr404(id)
    if (!target) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id },
      data: { name, email, role: STUDENT_ROLE_CODE },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { sessions: true } },
      },
    })

    return NextResponse.json(user)
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
    const access = await requireRegisterStudentsAccess(session)
    if (!access.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
    }

    const { id } = await ctx.params
    if (id === session!.user!.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    const target = await getStudentOr404(id)
    if (!target) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    await deleteUserAccount(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/admin/students/:id]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
