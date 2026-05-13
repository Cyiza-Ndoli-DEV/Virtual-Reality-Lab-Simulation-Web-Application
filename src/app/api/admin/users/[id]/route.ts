import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { normalizeRoleCode, requireRoleDefinitionCode } from '@/lib/user-role-code'
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

    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id },
      data: { name, email, role: roleCode },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
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
    if (!session || !session.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await ctx.params
    if (id === session.user.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}