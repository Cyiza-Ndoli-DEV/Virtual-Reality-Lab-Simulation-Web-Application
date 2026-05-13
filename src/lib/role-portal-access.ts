import prisma from './prisma'

/** Which app areas this role code may open (from `RolePermission` + feature keys). */
export async function accessFlagsForRoleCode(code: string) {
  const def = await prisma.roleDefinition.findUnique({
    where: { code },
    select: {
      permissions: { select: { featureKey: true, allowed: true } },
    },
  })
  if (!def) {
    return {
      canAccessAdmin: code === 'ADMIN',
      canAccessTeacher: code === 'TEACHER',
      canAccessStudent: code === 'STUDENT',
    }
  }
  const allowed = new Set(
    def.permissions.filter((p) => p.allowed).map((p) => p.featureKey)
  )
  return {
    canAccessAdmin: allowed.has('admin.portal'),
    canAccessTeacher: allowed.has('teacher.portal'),
    canAccessStudent: allowed.has('student.portal'),
  }
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
