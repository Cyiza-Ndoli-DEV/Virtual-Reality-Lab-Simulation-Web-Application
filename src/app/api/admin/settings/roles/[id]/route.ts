import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireFeature } from '@/lib/api-auth'
import prisma from '@/lib/prisma'
import {
  replacePermissionsFromClientMap,
  sanitizePermissionPayload,
} from '@/lib/sync-role-permissions'
import { APP_FEATURE_KEYS } from '@/lib/app-features'

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, '_')
}

async function buildRoleDto(id: string) {
  const [d, userCounts] = await Promise.all([
    prisma.roleDefinition.findUniqueOrThrow({
      where: { id },
      include: { permissions: true },
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    }),
  ])

  const countByEnum = Object.fromEntries(
    userCounts.map((r) => [r.role, r._count._all])
  ) as Record<string, number>

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
}

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
    const body = (await req.json()) as Record<string, unknown>

    const hasMeta =
      'name' in body || 'description' in body || 'code' in body
    const hasPerms = 'permissions' in body && body.permissions !== undefined

    if (!hasMeta && !hasPerms) {
      return NextResponse.json(
        { error: 'Provide permissions and/or name, description, or code to update' },
        { status: 400 }
      )
    }

    const existing = await prisma.roleDefinition.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (hasMeta) {
      const data: { name?: string; description?: string | null; code?: string } = {}

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

      if ('code' in body && typeof body.code !== 'string') {
        return NextResponse.json({ error: 'code must be a string' }, { status: 400 })
      }

      if (typeof body.code === 'string') {
        if (existing.isSystem) {
          return NextResponse.json(
            { error: 'Built-in role codes cannot be changed' },
            { status: 400 }
          )
        }
        const next = normalizeCode(body.code)
        if (!next) {
          return NextResponse.json({ error: 'Code cannot be empty' }, { status: 400 })
        }
        if (!/^[A-Z][A-Z0-9_]*$/.test(next)) {
          return NextResponse.json(
            {
              error:
                'Code must start with a letter and use only uppercase letters, digits, and underscores',
            },
            { status: 400 }
          )
        }
        if (next !== existing.code) {
          const clash = await prisma.roleDefinition.findFirst({
            where: { code: next, NOT: { id } },
          })
          if (clash) {
            return NextResponse.json(
              { error: 'Another role already uses this code' },
              { status: 400 }
            )
          }
        }
        data.code = next
      }

      if (Object.keys(data).length > 0) {
        await prisma.roleDefinition.update({
          where: { id },
          data,
        })
      }
    }

    if (hasPerms) {
      const map = sanitizePermissionPayload(body)
      if (!map) {
        return NextResponse.json(
          { error: 'permissions must be an object of feature keys to booleans' },
          { status: 400 }
        )
      }
      const full: Record<string, boolean> = {}
      for (const key of APP_FEATURE_KEYS) {
        full[key] = !!map[key]
      }
      await replacePermissionsFromClientMap(prisma, id, full)
    }

    const dto = await buildRoleDto(id)
    return NextResponse.json(dto)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
