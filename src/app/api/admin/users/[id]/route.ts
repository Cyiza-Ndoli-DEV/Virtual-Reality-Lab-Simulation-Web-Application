import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireFeature } from '@/lib/api-auth'
import { deleteUserAccount } from '@/lib/delete-user'
import prisma from '@/lib/prisma'
import { normalizeRoleCode, requireRoleDefinitionCode } from '@/lib/user-role-code'
import { TEACHER_ROLE_CODE, validateSubjectId } from '@/lib/teacher-subject'
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const access = await requireFeature(session, 'admin.users')
    if (!access.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
    }

    const { id } = await ctx.params
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const roleCode = normalizeRoleCode(body.role)
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

    const subjectIdRaw =
      typeof body.subjectId === 'string' ? body.subjectId.trim() : ''
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

    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id },
      data: { name, email, role: roleCode, subjectId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subjectId: true,
        subject: { select: { id: true, code: true, name: true } },
        createdAt: true,
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
    const access = await requireFeature(session, 'admin.users')
    if (!access.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
    }

    const { id } = await ctx.params
    if (id === session!.user!.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    await deleteUserAccount(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[DELETE /api/admin/users/:id]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}