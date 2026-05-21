import prisma from './prisma'
import type { AppFeatureKey } from './app-features'
import { APP_FEATURE_KEYS } from './app-features'

export type PermissionMap = Record<AppFeatureKey, boolean>

export async function getPermissionsForRoleCode(
  code: string
): Promise<PermissionMap> {
  const def = await prisma.roleDefinition.findUnique({
    where: { code },
    select: {
      permissions: { select: { featureKey: true, allowed: true } },
    },
  })

  const base = Object.fromEntries(
    APP_FEATURE_KEYS.map((k) => [k, false])
  ) as PermissionMap

  if (!def) return base

  for (const p of def.permissions) {
    if (APP_FEATURE_KEYS.includes(p.featureKey as AppFeatureKey)) {
      base[p.featureKey as AppFeatureKey] = p.allowed
    }
  }
  return base
}

export function hasPermission(
  map: PermissionMap,
  key: AppFeatureKey
): boolean {
  return Boolean(map[key])
}
