import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireFeature } from '@/lib/api-auth'
import prisma from '@/lib/prisma'
import { APP_FEATURE_KEYS } from '@/lib/app-features'
import { replacePermissionsFromRoleCode } from '@/lib/sync-role-permissions'

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, '_')
}

export async function GET() {
  try {
    const session = await auth()
    const access = await requireFeature(session, 'admin.users')
    if (!access.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
    }

    const [definitions, userCounts] = await Promise.all([
      prisma.roleDefinition.findMany({
        orderBy: [{ isSystem: 'desc' }, { code: 'asc' }],
        include: {
          permissions: true,
        },
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { _all: true },
      }),
    ])

    const countByEnum = Object.fromEntries(
      userCounts.map((r) => [r.role, r._count._all])
    ) as Record<string, number>

    const rows = definitions.map((d) => {
      const allowedCount = d.permissions.filter((p) => p.allowed).length
      return {
        id: d.id,
        code: d.code,
        name: d.name,
        description: d.description,
        isSystem: d.isSystem,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        userCount: countByEnum[d.code] ?? 0,
        permissionAllowedCount: allowedCount,
        permissionTotal: APP_FEATURE_KEYS.length,
        permissions: d.permissions.map((p) => ({
          featureKey: p.featureKey,
          allowed: p.allowed,
        })),
      }
    })

    return NextResponse.json(rows)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const access = await requireFeature(session, 'admin.users')
    if (!access.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: access.status })
    }

    const body = await req.json()
    const code = normalizeCode(typeof body.code === 'string' ? body.code : '')
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description =
      typeof body.description === 'string' ? body.description.trim() : ''

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Code and name are required' },
        { status: 400 }
      )
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(code)) {
      return NextResponse.json(
        {
          error:
            'Code must start with a letter and contain only uppercase letters, digits, and underscores',
        },
        { status: 400 }
      )
    }

    const existing = await prisma.roleDefinition.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ error: 'A role with this code already exists' }, { status: 400 })
    }

    const role = await prisma.$transaction(async (tx) => {
      const created = await tx.roleDefinition.create({
        data: {
          code,
          name,
          description: description || null,
          isSystem: false,
        },
      })
      await replacePermissionsFromRoleCode(tx, created.id, created.code)
      return created
    })

    const withPerms = await prisma.roleDefinition.findUniqueOrThrow({
      where: { id: role.id },
      include: { permissions: true },
    })
    const allowedCount = withPerms.permissions.filter((p) => p.allowed).length

    return NextResponse.json({
      id: withPerms.id,
      code: withPerms.code,
      name: withPerms.name,
      description: withPerms.description,
      isSystem: withPerms.isSystem,
      createdAt: withPerms.createdAt.toISOString(),
      updatedAt: withPerms.updatedAt.toISOString(),
      userCount: 0,
      permissionAllowedCount: allowedCount,
      permissionTotal: APP_FEATURE_KEYS.length,
      permissions: withPerms.permissions.map((p) => ({
        featureKey: p.featureKey,
        allowed: p.allowed,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
