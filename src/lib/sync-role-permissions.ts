import type { Prisma, PrismaClient } from '@prisma/client'
import {
  APP_FEATURE_KEYS,
  defaultPermissionMapForRoleCode,
  isValidFeatureKey,
} from './app-features'

type DbClient = PrismaClient | Prisma.TransactionClient

/** Replace all feature rows for a role using built-in defaults for known codes (else all denied). */
export async function replacePermissionsFromRoleCode(
  prisma: DbClient,
  roleDefinitionId: string,
  code: string
) {
  const map = defaultPermissionMapForRoleCode(code)
  await prisma.rolePermission.deleteMany({ where: { roleDefinitionId } })
  await prisma.rolePermission.createMany({
    data: APP_FEATURE_KEYS.map((featureKey) => ({
      roleDefinitionId,
      featureKey,
      allowed: map[featureKey] ?? false,
    })),
  })
}

export async function replacePermissionsFromClientMap(
  prisma: DbClient,
  roleDefinitionId: string,
  incoming: Record<string, boolean>
) {
  await prisma.rolePermission.deleteMany({ where: { roleDefinitionId } })
  await prisma.rolePermission.createMany({
    data: APP_FEATURE_KEYS.map((featureKey) => ({
      roleDefinitionId,
      featureKey,
      allowed: !!incoming[featureKey],
    })),
  })
}

export function sanitizePermissionPayload(
  body: unknown
): Record<string, boolean> | null {
  if (!body || typeof body !== 'object') return null
  const raw = (body as { permissions?: unknown }).permissions
  if (!raw || typeof raw !== 'object') return null
  const out: Record<string, boolean> = {}
  for (const key of Object.keys(raw as object)) {
    if (!isValidFeatureKey(key)) continue
    out[key] = Boolean((raw as Record<string, unknown>)[key])
  }
  return out
}
