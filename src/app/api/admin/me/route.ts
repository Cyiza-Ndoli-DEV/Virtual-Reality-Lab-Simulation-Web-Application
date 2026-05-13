import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  accessFlagsForRoleCode,
  portalLabelFromAccessFlags,
} from '@/lib/role-portal-access'

/** Current signed-in user (admin portal) for the profile screen. */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const flags = await accessFlagsForRoleCode(user.role)
    const portalLabel = portalLabelFromAccessFlags(flags, user.role)

    return NextResponse.json({
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      portalLabel,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
