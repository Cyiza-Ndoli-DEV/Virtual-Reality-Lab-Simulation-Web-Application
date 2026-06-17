import type { Session } from 'next-auth'

type PortalUser = Session['user'] | undefined

/** Default dashboard for this user (ignores password-change state). */
export function portalHomePath(user: PortalUser): string | null {
  if (!user?.id) return null
  if (user.canAccessAdmin) return '/admin/dashboard'
  if (user.canAccessTeacher) return '/admin/student-work'
  if (user.canAccessStudent) return '/student/dashboard'
  return null
}

export function isChangePasswordPage(pathname: string): boolean {
  return (
    pathname === '/admin/account/change-password' ||
    pathname === '/student/account/change-password'
  )
}

export function isPasswordChangeApiPath(pathname: string): boolean {
  return pathname === '/api/account/password'
}

export function isAvatarApiPath(pathname: string): boolean {
  return pathname === '/api/account/avatar'
}

/** Default destination after sign-in. */
export function defaultPortalPath(user: PortalUser): string | null {
  return portalHomePath(user)
}

export function isAuthApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/auth')
}

export function isUnityApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/unity')
}

export function isProtectedApiPath(pathname: string): boolean {
  return (
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/student') ||
    pathname.startsWith('/api/teacher')
  )
}

export function isPublicPagePath(pathname: string): boolean {
  return pathname === '/login'
}

/** Relative in-app path only (blocks open redirects). */
export function safeCallbackUrl(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
  if (raw === '/login' || raw.startsWith('/login?')) return null
  return raw
}
