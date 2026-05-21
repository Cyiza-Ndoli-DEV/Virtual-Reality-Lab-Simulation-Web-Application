/**
 * Application features permissions can gate (UI + future API checks).
 * Keys are stable identifiers stored in `RolePermission.featureKey`.
 */
export const APP_FEATURES = [
  { key: 'admin.portal', label: 'Admin portal', group: 'Administration' },
  { key: 'admin.users', label: 'Manage users', group: 'Administration' },
  { key: 'admin.experiments', label: 'Manage experiments', group: 'Administration' },
  { key: 'admin.reports', label: 'View all reports', group: 'Administration' },
  { key: 'admin.settings', label: 'Settings & roles', group: 'Administration' },
  { key: 'teacher.portal', label: 'Teacher portal', group: 'Teaching' },
  { key: 'teacher.reports', label: 'Review student reports', group: 'Teaching' },
  {
    key: 'teacher.registerStudents',
    label: 'Register students',
    group: 'Teaching',
  },
  { key: 'student.portal', label: 'Student portal', group: 'Learning' },
  { key: 'student.labs', label: 'VR labs & quizzes', group: 'Learning' },
] as const

export type AppFeatureKey = (typeof APP_FEATURES)[number]['key']

export const APP_FEATURE_KEYS = APP_FEATURES.map((f) => f.key) as AppFeatureKey[]

/** Default matrix when seeding built-in roles (codes must match `RoleDefinition.code`). */
export function defaultPermissionMapForRoleCode(
  code: string
): Record<AppFeatureKey, boolean> {
  const none = Object.fromEntries(
    APP_FEATURE_KEYS.map((k) => [k, false])
  ) as Record<AppFeatureKey, boolean>

  if (code === 'ADMIN') {
    return Object.fromEntries(APP_FEATURE_KEYS.map((k) => [k, true])) as Record<
      AppFeatureKey,
      boolean
    >
  }
  if (code === 'TEACHER') {
    return {
      ...none,
      'admin.portal': true,
      'admin.experiments': true,
      'admin.reports': true,
      'teacher.portal': true,
      'teacher.reports': true,
      'teacher.registerStudents': true,
    }
  }
  if (code === 'STUDENT') {
    return {
      ...none,
      'student.portal': true,
      'student.labs': true,
    }
  }
  return none
}

export function isValidFeatureKey(key: string): key is AppFeatureKey {
  return (APP_FEATURE_KEYS as readonly string[]).includes(key)
}
