import type { AppFeatureKey } from './app-features'
import { getRoleData } from './role-data'

export type PermissionMap = Record<AppFeatureKey, boolean>

export async function getPermissionsForRoleCode(
  code: string
): Promise<PermissionMap> {
  const { permissions } = await getRoleData(code)
  return permissions
}

export function hasPermission(
  map: PermissionMap,
  key: AppFeatureKey
): boolean {
  return Boolean(map[key])
}
