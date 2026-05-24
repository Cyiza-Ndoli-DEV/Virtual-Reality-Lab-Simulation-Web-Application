import { getRoleData } from './role-data'

/** Which app areas this role code may open (from `RolePermission` + feature keys). */
export async function accessFlagsForRoleCode(code: string) {
  const { flags } = await getRoleData(code)
  return flags
}

export type PortalAccessFlags = {
  canAccessAdmin: boolean
  canAccessTeacher: boolean
  canAccessStudent: boolean
}

/** Short label for the header / profile (matches prior UI copy). */
export function portalLabelFromAccessFlags(
  flags: PortalAccessFlags,
  roleCode?: string
): string {
  if (flags.canAccessAdmin) return 'SUPERUSER'
  if (flags.canAccessTeacher) return 'EDUCATOR'
  if (flags.canAccessStudent) return 'STUDENT'
  if (roleCode) return roleCode
  return 'USER'
}
