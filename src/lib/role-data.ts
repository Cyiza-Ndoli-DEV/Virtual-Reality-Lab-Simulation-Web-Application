import prisma from './prisma'
import type { AppFeatureKey } from './app-features'
import { APP_FEATURE_KEYS } from './app-features'
import type { PermissionMap } from './portal-permissions'
import type { PortalAccessFlags } from './role-portal-access'

type RoleData = {
  permissions: PermissionMap
  flags: PortalAccessFlags
}

const cache = new Map<string, { data: RoleData; at: number }>()
const TTL_MS = 60_000

function defaultFlagsForCode(code: string): PortalAccessFlags {
  return {
    canAccessAdmin: code === 'ADMIN',
    canAccessTeacher: code === 'TEACHER',
    canAccessStudent: code === 'STUDENT',
  }
}

function buildPermissionMap(
  rows: { featureKey: string;  allowed: boolean }[]
): PermissionMap {
  const base = Object.fromEntries(
    APP_FEATURE_KEYS.map((k) => [k, false])
  ) as PermissionMap

  for (const p of rows) {
    if (APP_FEATURE_KEYS.includes(p.featureKey as AppFeatureKey)) {
      base[p.featureKey as AppFeatureKey] = p.allowed
    }
  }
  return base
}

function flagsFromPermissions(permissions: PermissionMap): PortalAccessFlags {
  return {
    canAccessAdmin: permissions['admin.portal'],
    canAccessTeacher: permissions['teacher.portal'],
    canAccessStudent: permissions['student.portal'],
  }
}

/** Single cached DB read for portal flags + permission map. */
export async function getRoleData(code: string): Promise<RoleData> {
  const hit = cache.get(code)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data

  const def = await prisma.roleDefinition.findUnique({
    where: { code },
    select: {
      permissions: { select: { featureKey: true, allowed: true } },
    },
  })

  const data: RoleData = def
    ? (() => {
        const permissions = buildPermissionMap(def.permissions)
        return {
          permissions,
          flags: flagsFromPermissions(permissions),
        }
      })()
    : {
        permissions: Object.fromEntries(
          APP_FEATURE_KEYS.map((k) => [k, false])
        ) as PermissionMap,
        flags: defaultFlagsForCode(code),
      }

  cache.set(code, { data, at: Date.now() })
  return data
}

export function invalidateRoleData(code?: string) {
  if (code) cache.delete(code)
  else cache.clear()
}
