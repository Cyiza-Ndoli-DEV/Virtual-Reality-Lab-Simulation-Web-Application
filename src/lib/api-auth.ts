import type { Session } from 'next-auth'
import type { AppFeatureKey } from './app-features'
import { getPermissionsForRoleCode } from './portal-permissions'

export async function requirePortalUser(session: Session | null) {
  if (!session?.user?.id) return { ok: false as const, status: 401 }
  if (!session.user.canAccessAdmin) {
    return { ok: false as const, status: 401 }
  }
  return { ok: true as const, session, role: session.user.role }
}

export async function requireFeature(
  session: Session | null,
  feature: AppFeatureKey
) {
  const base = await requirePortalUser(session)
  if (!base.ok) return base

  const perms = await getPermissionsForRoleCode(base.role)
  if (!perms[feature]) {
    return { ok: false as const, status: 403 }
  }
  return { ok: true as const, session: base.session, permissions: perms }
}

/** Student questionnaire submissions — teachers and admins with teacher.reports. */
export async function requireStudentWorkAccess(session: Session | null) {
  if (!session?.user?.id) return { ok: false as const, status: 401 }

  const role = session.user.role
  const perms = await getPermissionsForRoleCode(role)

  const allowed =
    (session.user.canAccessAdmin && perms['admin.portal']) ||
    (session.user.canAccessTeacher && perms['teacher.reports'])

  if (!allowed) return { ok: false as const, status: 401 }
  return { ok: true as const, session, permissions: perms }
}

/** List or register student accounts only (educators). */
export async function requireRegisterStudentsAccess(session: Session | null) {
  if (!session?.user?.id) return { ok: false as const, status: 401 }

  const role = session.user.role
  const perms = await getPermissionsForRoleCode(role)

  const allowed =
    perms['admin.users'] ||
    ((session.user.canAccessAdmin || session.user.canAccessTeacher) &&
      perms['teacher.registerStudents'])

  if (!allowed) return { ok: false as const, status: 401 }
  return { ok: true as const, session, permissions: perms, isFullAdmin: perms['admin.users'] }
}

export const STUDENT_ROLE_CODE = 'STUDENT'
